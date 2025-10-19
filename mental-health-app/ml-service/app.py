from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
from typing import List
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
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ Input Schema ------------------ #
class StudentData(BaseModel):
    responses: List

# ------------------ Helper functions ------------------ #
def preprocess_student_data(responses):
    """Convert raw responses to model-ready features"""
    try:
        print(f"Processing {len(responses)} responses: {responses}")
        
        # Map responses to expected format based on your training data
        raw_data = {
            'id': responses[0] if len(responses) > 0 else 'student123',
            'Gender': responses[1] if len(responses) > 1 else 'Male',
            'Age': float(responses[2]) if len(responses) > 2 and str(responses[2]).strip() else 20.0,
            'City': responses[3] if len(responses) > 3 else 'Unknown',
            'Profession': responses[4] if len(responses) > 4 else 'Student',
            'Academic Pressure': float(responses[5]) if len(responses) > 5 and str(responses[5]).strip() else 1.0,
            'Work Pressure': float(responses[6]) if len(responses) > 6 and str(responses[6]).strip() else 1.0,
            'CGPA': float(responses[7]) if len(responses) > 7 and str(responses[7]).strip() else 3.0,
            'Study Satisfaction': float(responses[8]) if len(responses) > 8 and str(responses[8]).strip() else 2.0,
            'Job Satisfaction': float(responses[9]) if len(responses) > 9 and str(responses[9]).strip() else 2.0,
            'Sleep Duration': float(responses[10]) if len(responses) > 10 and str(responses[10]).strip() else 7.0,
            'Dietary Habits': responses[11] if len(responses) > 11 else 'Average',
            'Degree': responses[12] if len(responses) > 12 else 'Bachelor',
            'Have you ever had suicidal thoughts ?': responses[13] if len(responses) > 13 else 'No',
            'Work/Study Hours': float(responses[14]) if len(responses) > 14 and str(responses[14]).strip() else 8.0,
            'Financial Stress': responses[15] if len(responses) > 15 else 'No',
            'Family History of Mental Illness': responses[16] if len(responses) > 16 else 'No'
        }

        print("Raw data created:", {k: v for k, v in raw_data.items() if k != 'id'})

        # Create DataFrame
        df = pd.DataFrame([raw_data])

        # Handle Dietary Habits encoding properly
        if 'Dietary Habits' in df.columns:
            dietary_mapping = {'Healthy': 2, 'Average': 1, 'Unhealthy': 0}
            df['Dietary Habits'] = df['Dietary Habits'].map(dietary_mapping).fillna(1)

        # Encode categorical features (same as in your training)
        cat_cols = ['Gender', 'City', 'Profession', 'Degree',
                    'Have you ever had suicidal thoughts ?',
                    'Family History of Mental Illness', 'Financial Stress']
        
        # Remove columns that don't exist or are already numeric
        cat_cols = [col for col in cat_cols if col in df.columns and df[col].dtype == 'object']
        
        if cat_cols:
            df_encoded = pd.get_dummies(df, columns=cat_cols, drop_first=True)
        else:
            df_encoded = df.copy()

        print(f"After encoding, columns: {list(df_encoded.columns)}")

        # Align with training features
        for col in feature_columns:
            if col not in df_encoded.columns:
                df_encoded[col] = 0
                print(f"Added missing feature: {col}")

        # Select only the features used in training (in the correct order)
        X = df_encoded[feature_columns]
        
        print("Feature shape after alignment:", X.shape)
        print("First few feature values:", dict(list(X.iloc[0].items())[:5]))

        return X.values

    except Exception as e:
        print(f"Preprocessing error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Preprocessing failed: {str(e)}")

def get_detailed_analysis(probability, prediction, is_critical=False, override_reasons=None):
    """Provide detailed mental health analysis"""
    
    # Special handling for emergency/high-risk cases
    if is_critical or probability >= 0.9:
        risk_level = "CRITICAL RISK"
        risk_color = "darkred"
        description = "IMMEDIATE PROFESSIONAL INTERVENTION REQUIRED. This assessment indicates severe mental health concerns that require urgent attention."
    elif probability >= 0.29:
        risk_level = "Low Risk"
        risk_color = "green"
        description = "You appear to be managing your mental health well."
    elif probability > 0.26:
        risk_level = "Moderate Risk"
        risk_color = "yellow"
        description = "You may be experiencing some mental health challenges that warrant attention."
    else:
        risk_level = "High Risk"
        risk_color = "red"
        description = "You may be experiencing significant mental health challenges."

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
        
        result = {
            "success": True,
            "prediction": prediction,
            "probability": float(probability),
            "analysis": analysis,
            "safety_override": high_risk_override
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

@app.get("/health")
async def health_check():
    health_status = {
        "status": "healthy" if model is not None else "degraded",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
        "features_count": len(feature_columns) if feature_columns else 0,
        "model_type": type(model).__name__ if model else "None",
        "safety_overrides": "enabled"
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
    print("🌐 Starting server on http://0.0.0.0:5001")
    uvicorn.run(app, host="0.0.0.0", port=5001, reload=True)