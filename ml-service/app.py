from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import json
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from typing import List, Optional
import os
import traceback

# ------------------ Load model, scaler, and feature columns ------------------ #
def load_best_model():
    """Load the best available model from your files"""
    try:
        # Check which model files are available
        available_models = []
        
        if os.path.exists("rf_model.pkl"):
            rf_model = joblib.load("rf_model.pkl")
            available_models.append(("Random Forest", rf_model))
            print("✅ Random Forest model found")
            
        if os.path.exists("log_model.pkl"):
            log_model = joblib.load("log_model.pkl")
            available_models.append(("Logistic Regression", log_model))
            print("✅ Logistic Regression model found")
            
        # Fallback to model.pkl if it exists
        if os.path.exists("model.pkl"):
            model = joblib.load("model.pkl")
            available_models.append(("Main Model", model))
            print("✅ Main model found")
            
        if not available_models:
            print("❌ No model files found")
            return None, None, None, None
            
        # Use Random Forest if available, otherwise use the first available
        selected_model = None
        model_name = "Unknown"
        for name, model in available_models:
            if "Random Forest" in name:
                selected_model = model
                model_name = name
                break
        
        if selected_model is None:
            model_name, selected_model = available_models[0]
            
        # Load scaler and features
        if not os.path.exists("scaler.pkl"):
            print("❌ scaler.pkl not found")
            return None, None, None, None
            
        if not os.path.exists("features.pkl"):
            print("❌ features.pkl not found")
            return None, None, None, None
            
        scaler = joblib.load("scaler.pkl")
        features = joblib.load("features.pkl")
        
        # Load model info if available
        model_info = None
        if os.path.exists("model_info.pkl"):
            model_info = joblib.load("model_info.pkl")
            print("✅ Model info loaded")
        
        print(f"✅ Using {model_name}")
        print(f"✅ Expected features: {len(features)}")
        print(f"✅ Feature names: {features[:5]}..." if len(features) > 5 else f"✅ Feature names: {features}")
        
        return selected_model, scaler, features, model_info
        
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        traceback.print_exc()
        return None, None, None, None

# Load the models
model, scaler, feature_columns, model_info = load_best_model()


# ------------------ Load Phase 2 artifacts (regressor, clustering, association rules) ------------------ #
def load_auxiliary_models():
    aux = {
        "dt_regressor": None,
        "kmeans_model": None,
        "kmeans_scaler": None,
        "kmeans_features": None,
        "cluster_profiles": None,
        "association_rules": None,
    }
    try:
        if os.path.exists("dt_regressor.pkl"):
            aux["dt_regressor"] = joblib.load("dt_regressor.pkl")
            print("✅ Decision Tree Regressor found")
        if os.path.exists("kmeans_model.pkl"):
            aux["kmeans_model"] = joblib.load("kmeans_model.pkl")
            aux["kmeans_scaler"] = joblib.load("kmeans_scaler.pkl")
            aux["kmeans_features"] = joblib.load("kmeans_features.pkl")
            print("✅ K-Means model found")
        if os.path.exists("cluster_profiles.json"):
            with open("cluster_profiles.json") as f:
                aux["cluster_profiles"] = json.load(f)
            print("✅ Cluster profiles found")
        if os.path.exists("association_rules.json"):
            with open("association_rules.json") as f:
                aux["association_rules"] = json.load(f)
            print("✅ Association rules found")
    except Exception as e:
        print(f"❌ Error loading auxiliary models: {e}")
        traceback.print_exc()
    return aux


aux_models = load_auxiliary_models()

# ------------------ FastAPI app setup ------------------ #
app = FastAPI(title="Student Depression Prediction API")

# Enable CORS for multiple ports including 5174
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5001",
        "http://127.0.0.1:5001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ Input Schema ------------------ #
class StudentData(BaseModel):
    responses: List


class TrendData(BaseModel):
    scores: List[float]
    dates: Optional[List[str]] = None

# ------------------ Helper functions ------------------ #
# `responses` is a positional array (kept for backward compatibility with the
# existing safety-override indices below):
#  [0]=id [1]=Gender [2]=Age [3]=City [4]=Profession [5]=Academic Pressure
#  [6]=Work Pressure [7]=CGPA [8]=Study Satisfaction [9]=Job Satisfaction
#  [10]=Sleep Duration [11]=Dietary Habits [12]=Degree [13]=Suicidal thoughts
#  [14]=Work/Study Hours [15]=Financial Stress [16]=Family History
#
# IMPORTANT: rf_model.pkl / log_model.pkl / scaler.pkl / features.pkl were
# retrained (see train_all_models.py) on exactly 12 features: Age, Academic
# Pressure, Work Pressure, CGPA, Study Satisfaction, Job Satisfaction, Sleep
# Duration, Work/Study Hours, an engineered "Total Pressure" (Academic + Work),
# and one-hot Dietary Habits. This function used to build a 110-feature vector
# (Gender/City/Profession/Degree/Financial-Stress/Family-History dummies) that
# didn't match what the model was actually fit on — every prediction silently
# hit a scikit-learn shape mismatch and fell back to a hardcoded low-risk
# guess. Fixed to build exactly the 12 features the model expects.
def build_classifier_features(responses):
    def _f(i, default):
        return float(responses[i]) if len(responses) > i and str(responses[i]).strip() else default

    age = _f(2, 20.0)
    academic_pressure = _f(5, 1.0)
    work_pressure = _f(6, 1.0)
    cgpa = _f(7, 7.0)
    study_satisfaction = _f(8, 2.0)
    job_satisfaction = _f(9, 0.0)
    sleep_duration = _f(10, 7.0)
    dietary_habits = str(responses[11]).strip() if len(responses) > 11 else "Moderate"
    work_study_hours = _f(14, 8.0)
    total_pressure = academic_pressure + work_pressure

    return {
        "Age": age,
        "Academic Pressure": academic_pressure,
        "Work Pressure": work_pressure,
        "CGPA": cgpa,
        "Study Satisfaction": study_satisfaction,
        "Job Satisfaction": job_satisfaction,
        "Sleep Duration": sleep_duration,
        "Work/Study Hours": work_study_hours,
        "Total Pressure": total_pressure,
        "Dietary Habits_Moderate": 1 if dietary_habits == "Moderate" else 0,
        "Dietary Habits_Others": 1 if dietary_habits == "Others" else 0,
        "Dietary Habits_Unhealthy": 1 if dietary_habits == "Unhealthy" else 0,
    }


def preprocess_student_data(responses):
    """Convert raw responses to the model's actual 12-feature contract."""
    try:
        row = build_classifier_features(responses)
        df = pd.DataFrame([row])
        X = df[feature_columns]
        return X.values
    except Exception as e:
        print(f"Preprocessing error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Preprocessing failed: {str(e)}")


def build_cluster_features(responses):
    """K-Means was fit on a different, curated feature set than the classifier."""

    def _f(i, default):
        return float(responses[i]) if len(responses) > i and str(responses[i]).strip() else default

    return {
        "Academic Pressure": _f(5, 1.0),
        "CGPA": _f(7, 7.0),
        "Study Satisfaction": _f(8, 2.0),
        "Sleep Duration": _f(10, 7.0),
        "Work/Study Hours": _f(14, 8.0),
        "Financial Stress": _f(15, 1.0),
    }

def get_detailed_analysis(probability, prediction, is_critical=False, override_reasons=None):
    """Provide detailed mental health analysis"""
    
    # Special handling for emergency/high-risk cases.
    # `probability` is P(Depression=1) — higher probability must mean higher risk.
    # (Previously inverted: >=0.29 was labeled "Low Risk" and <=0.26 was labeled
    # "High Risk", the exact opposite of what the probability means. Invisible
    # in practice because /predict used to always return a hardcoded
    # probability=0.3 fallback, which this inverted logic bucketed as "Low Risk"
    # regardless of the actual input — see preprocess_student_data's docstring.)
    if is_critical or probability >= 0.9:
        risk_level = "CRITICAL RISK"
        risk_color = "darkred"
        description = "IMMEDIATE PROFESSIONAL INTERVENTION REQUIRED. This assessment indicates severe mental health concerns that require urgent attention."
    elif probability >= 0.6:
        risk_level = "High Risk"
        risk_color = "red"
        description = "You may be experiencing significant mental health challenges."
    elif probability >= 0.35:
        risk_level = "Moderate Risk"
        risk_color = "yellow"
        description = "You may be experiencing some mental health challenges that warrant attention."
    else:
        risk_level = "Low Risk"
        risk_color = "green"
        description = "You appear to be managing your mental health well."

    # Detailed suggestions based on risk level
    suggestions = {
        "CRITICAL RISK": [
            "CALL 911 or go to your nearest emergency room immediately",
            "Contact the National Suicide Prevention Lifeline: 988",
            "Do not leave the person alone - stay with them or have someone stay with them",
            "Remove any potential means of self-harm from the environment",
            "Contact a mental health crisis team or mobile crisis unit",
            "Inform trusted family members or friends immediately"
        ],
        "Low Risk": [
            "Continue maintaining healthy sleep patterns (7-9 hours per night)",
            "Keep up with regular physical activity and social connections",
            "Practice stress management techniques like meditation or deep breathing",
            "Maintain a balanced diet and stay hydrated",
            "Keep a journal to track your mood and identify patterns"
        ],
        "Moderate Risk": [
            "Consider speaking with a mental health counselor or therapist",
            "Reach out to trusted friends, family members, or support groups",
            "Prioritize self-care activities that bring you joy and relaxation",
            "Consider stress reduction techniques like mindfulness or yoga",
            "Evaluate your workload and academic pressures - consider adjustments if possible",
            "Maintain regular sleep and eating schedules"
        ],
        "High Risk": [
            "Seek professional mental health support immediately",
            "Contact your healthcare provider or a mental health crisis line",
            "Inform trusted family members or friends about how you're feeling",
            "Consider campus counseling services if you're a student",
            "Avoid isolation - stay connected with your support network",
            "If having thoughts of self-harm, contact emergency services or crisis helpline immediately"
        ]
    }

    # Professional resources
    resources = {
        "crisis_lines": [
            "National Suicide Prevention Lifeline: 988",
            "Crisis Text Line: Text HOME to 741741",
            "SAMHSA National Helpline: 1-800-662-4357",
            "International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/"
        ],
        "online_resources": [
            "Mental Health America: mhanational.org",
            "National Alliance on Mental Illness: nami.org",
            "Psychology Today Therapist Finder: psychologytoday.com",
            "Crisis Text Line: crisistextline.org"
        ]
    }

    analysis = {
        "risk_level": risk_level,
        "risk_color": risk_color,
        "description": description,
        "probability_percentage": round(probability * 100, 1),
        "prediction": int(prediction),
        "suggestions": suggestions.get(risk_level, suggestions["Moderate Risk"]),
        "professional_resources": resources,
        "next_steps": get_next_steps(risk_level)
    }
    
    # Add emergency information for critical cases
    if is_critical and override_reasons:
        analysis["emergency_notice"] = "IMMEDIATE ATTENTION REQUIRED"
        analysis["override_reason"] = override_reasons
        analysis["safety_message"] = "This assessment has been flagged for immediate professional attention due to critical risk indicators."
    
    return analysis

def get_next_steps(risk_level):
    """Get specific next steps based on risk level"""
    steps = {
        "CRITICAL RISK": [
            "IMMEDIATE ACTION: Call 911 or go to emergency room",
            "Contact crisis helpline: 988 (National Suicide Prevention Lifeline)",
            "Do not delay - seek help within the next hour",
            "Have someone stay with you until professional help arrives"
        ],
        "Low Risk": [
            "Continue current positive mental health practices",
            "Regular self-check-ins monthly",
            "Maintain healthy lifestyle habits"
        ],
        "Moderate Risk": [
            "Schedule appointment with counselor within 2 weeks",
            "Start daily mindfulness or meditation practice",
            "Reduce stressors where possible",
            "Increase social support activities"
        ],
        "High Risk": [
            "Seek professional help within 24-48 hours",
            "Create a safety plan with trusted person",
            "Remove access to means of self-harm if applicable",
            "Consider intensive outpatient programs or immediate counseling"
        ]
    }
    return steps.get(risk_level, steps["Moderate Risk"])

# ------------------ API Endpoints ------------------ #
@app.post("/predict")
async def predict(data: StudentData):
    try:
        print(f"\n=== NEW PREDICTION REQUEST ===")
        print(f"Received {len(data.responses)} responses: {data.responses}")
        
        # CRITICAL SAFETY CHECK: Check for suicidal thoughts first
        suicidal_thoughts = False
        if len(data.responses) > 13:
            suicidal_response = str(data.responses[13]).lower().strip()
            if suicidal_response in ['yes', 'true', '1', 'y']:
                suicidal_thoughts = True
                print("🚨 CRITICAL: Suicidal thoughts detected - overriding to high risk")
        
        # Check for other critical indicators
        high_risk_override = False
        override_reasons = []
        
        if suicidal_thoughts:
            high_risk_override = True
            override_reasons.append("Suicidal ideation reported")
        
        # Check for extreme academic/work pressure (assuming scale 1-5, >=4 is extreme)
        if len(data.responses) > 5 and isinstance(data.responses[5], (int, float)) and data.responses[5] >= 4:
            if len(data.responses) > 6 and isinstance(data.responses[6], (int, float)) and data.responses[6] >= 4:
                if not high_risk_override:  # Only add if not already critical
                    override_reasons.append("Extreme academic and work pressure")
        
        # Check for very poor sleep (less than 4 hours)
        if len(data.responses) > 10 and isinstance(data.responses[10], (int, float)) and data.responses[10] < 4:
            override_reasons.append("Severely inadequate sleep")
        
        if high_risk_override:
            # SAFETY OVERRIDE: Force critical risk classification
            prediction = 1
            probability = 0.95  # Very high probability for safety
            print(f"🚨 SAFETY OVERRIDE ACTIVATED: {', '.join(override_reasons)}")
        else:
            # Proceed with normal model prediction
            if model is None:
                print("❌ Model not loaded, using fallback")
                # Simple fallback prediction
                risk_score = sum([float(x) if isinstance(x, (int, float)) else 0.5 for x in data.responses[:10]]) / 10
                prediction = 1 if risk_score > 0.5 else 0
                probability = min(0.9, max(0.1, risk_score))
            else:
                # Preprocess the raw responses
                features = preprocess_student_data(data.responses)
                print(f"Preprocessed features shape: {features.shape}")
                
                # Scale features
                if scaler is not None:
                    features_scaled = scaler.transform(features)
                    print("Features scaled")
                else:
                    features_scaled = features
                    print("No scaler available, using raw features")
                
                # Make prediction
                try:
                    prediction = int(model.predict(features_scaled)[0])
                    model_probability = float(model.predict_proba(features_scaled)[0][1])
                    
                    # Additional safety check: if model gives low risk but we have concerning indicators
                    if prediction == 0 and len(override_reasons) > 0:
                        print(f"⚠️  Model predicted low risk but concerning indicators present: {override_reasons}")
                        probability = max(0.4, model_probability)  # Bump up probability
                    else:
                        probability = model_probability
                        
                    print(f"Model prediction: {prediction}, Probability: {probability:.3f}")
                except Exception as pred_error:
                    print(f"Model prediction failed: {pred_error}")
                    # Fallback prediction
                    prediction = 0
                    probability = 0.3
        
        # Get detailed analysis
        analysis = get_detailed_analysis(
            probability, 
            prediction, 
            is_critical=high_risk_override,
            override_reasons=override_reasons if high_risk_override else None
        )
        
        feature_importance = None
        if model is not None and hasattr(model, "feature_importances_"):
            feature_importance = sorted(
                [{"feature": f, "importance": round(float(imp), 4)}
                 for f, imp in zip(feature_columns, model.feature_importances_)],
                key=lambda x: x["importance"], reverse=True
            )[:5]

        result = {
            "success": True,
            "prediction": prediction,
            "probability": float(probability),
            "analysis": analysis,
            "safety_override": high_risk_override,
            "feature_importance": feature_importance
        }
        
        print(f"=== RETURNING RESULT ===")
        print(f"Prediction: {prediction}, Probability: {probability:.3f}, Risk: {analysis['risk_level']}")
        if high_risk_override:
            print(f"🚨 SAFETY OVERRIDE ACTIVE: {override_reasons}")
        
        return result
        
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/predict/wellness-score")
async def predict_wellness_score(data: StudentData):
    """Continuous 0-100 risk score via Decision Tree Regressor (distilled from
    the Random Forest classifier's predicted probability — see train_all_models.py
    for why there's no separate ground-truth continuous label to train against).
    Higher = higher risk, mirroring /predict's probability, just smoother."""
    if aux_models["dt_regressor"] is None or scaler is None or feature_columns is None:
        raise HTTPException(status_code=503, detail="Wellness-score model not loaded")
    try:
        features = preprocess_student_data(data.responses)
        features_scaled = scaler.transform(features)
        score = float(aux_models["dt_regressor"].predict(features_scaled)[0])
        score = max(0.0, min(100.0, score))
        return {"success": True, "wellness_score": round(score, 1)}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Wellness-score prediction failed: {str(e)}")


@app.post("/predict/cluster")
async def predict_cluster(data: StudentData):
    """Assigns the student to one of the K-Means risk/behavior segments."""
    if aux_models["kmeans_model"] is None:
        raise HTTPException(status_code=503, detail="Clustering model not loaded")
    try:
        row = build_cluster_features(data.responses)
        df = pd.DataFrame([row])[aux_models["kmeans_features"]]
        scaled = aux_models["kmeans_scaler"].transform(df)
        cluster_id = int(aux_models["kmeans_model"].predict(scaled)[0])
        profile = next(
            (p for p in (aux_models["cluster_profiles"] or []) if p["cluster_id"] == cluster_id),
            None,
        )
        return {"success": True, "cluster_id": cluster_id, "profile": profile}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Cluster prediction failed: {str(e)}")


@app.post("/predict/trend")
async def predict_trend(data: TrendData):
    """Fits a Linear Regression on-the-fly across a student's repeated test
    scores (no persisted model — this is per-student, computed at request time)
    and returns the trend direction and a projected next score."""
    scores = data.scores
    if len(scores) < 2:
        return {
            "success": True, "direction": "insufficient_data", "slope": None,
            "projected_next_score": scores[0] if scores else None,
        }
    X = np.arange(len(scores)).reshape(-1, 1)
    y = np.array(scores)
    reg = LinearRegression().fit(X, y)
    slope = float(reg.coef_[0])
    projected_next = float(reg.predict([[len(scores)]])[0])

    if slope > 0.5:
        direction = "worsening"
    elif slope < -0.5:
        direction = "improving"
    else:
        direction = "stable"

    return {
        "success": True,
        "slope": round(slope, 3),
        "direction": direction,
        "projected_next_score": round(projected_next, 1),
        "r_squared": round(float(reg.score(X, y)), 3),
    }


@app.get("/analysis/clusters")
async def get_clusters():
    """Population-level BI: cluster sizes and risk profiles, computed once at
    training time (see train_all_models.py), not per-request."""
    if aux_models["cluster_profiles"] is None:
        raise HTTPException(status_code=503, detail="Cluster profiles not loaded")
    return {"success": True, "clusters": aux_models["cluster_profiles"]}


@app.get("/analysis/associations")
async def get_associations():
    """Apriori-mined risk-factor association rules, computed once at training
    time over the training population."""
    if aux_models["association_rules"] is None:
        raise HTTPException(status_code=503, detail="Association rules not loaded")
    return {"success": True, "rules": aux_models["association_rules"]}


@app.get("/analysis/feature-importance")
async def get_feature_importance():
    """Global RF feature importance — a property of the trained model, not of
    any single request, so this doesn't need student input."""
    if model is None or feature_columns is None or not hasattr(model, "feature_importances_"):
        raise HTTPException(status_code=503, detail="Model not loaded")
    ranked = sorted(
        [{"feature": f, "importance": round(float(imp), 4)}
         for f, imp in zip(feature_columns, model.feature_importances_)],
        key=lambda x: x["importance"], reverse=True
    )
    return {"success": True, "feature_importance": ranked}


@app.get("/health")
async def health_check():
    health_status = {
        "status": "healthy" if model is not None else "degraded",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
        "features_count": len(feature_columns) if feature_columns else 0,
        "model_type": type(model).__name__ if model else "None",
        "safety_overrides": "enabled",
        "models": {
            "classifier": model is not None,
            "wellness_score_regressor": aux_models["dt_regressor"] is not None,
            "clustering": aux_models["kmeans_model"] is not None,
            "cluster_profiles": aux_models["cluster_profiles"] is not None,
            "association_rules": aux_models["association_rules"] is not None,
        }
    }

    if model is None:
        health_status["message"] = "Model not loaded - using fallback predictions"

    if model_info:
        health_status["model_accuracy"] = model_info.get("accuracy", "unknown")

    print("Health check:", health_status)
    return health_status

@app.get("/")
async def root():
    return {
        "message": "Student Mental Health Assessment API", 
        "status": "running",
        "model_status": "loaded" if model else "fallback",
        "safety_features": "Critical risk override enabled"
    }

# ------------------ Run server ------------------ #
if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting FastAPI ML Service...")
    print(f"📊 Model loaded: {model is not None}")
    print(f"🔧 Scaler loaded: {scaler is not None}")
    print(f"📋 Features loaded: {len(feature_columns) if feature_columns else 0}")
    print("🚨 Safety overrides: ENABLED")
    print("🌐 Starting server on http://0.0.0.0:5002")
    uvicorn.run("app:app", host="0.0.0.0", port=5002, reload=True)