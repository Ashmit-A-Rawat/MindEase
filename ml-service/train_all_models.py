# train_all_models.py
#
# Rebuilds the full model set from scratch, consistently.
#
# IMPORTANT CONTEXT: the pre-existing rf_model.pkl/log_model.pkl were fit on 12
# features (Age, Academic/Work Pressure, CGPA, Study/Job Satisfaction, Sleep
# Duration, Work/Study Hours, an engineered "Total Pressure", and one-hot Dietary
# Habits) — but the serving code in app.py's preprocess_student_data() built an
# entirely different 110-feature vector (matching an orphaned features.pkl /
# scaler.pkl / model.pkl from a separate, abandoned experiment with City/Profession/
# Degree/Financial-Stress/Gender dummies). Every live /predict call was hitting a
# scikit-learn shape mismatch, silently caught by the endpoint's own try/except,
# and always returning a hardcoded low-risk fallback. This script retrains RF +
# LogReg cleanly on the correct, smaller feature set and overwrites the artifacts
# so the pipeline is internally consistent end to end. app.py's
# preprocess_student_data() is rewritten to match.
import json
import re
import warnings

import joblib
import numpy as np
import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
    silhouette_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeRegressor
from sklearn.utils.class_weight import compute_class_weight

warnings.filterwarnings("ignore")

RAW = pd.read_csv("student_depression.csv")
print(f"Loaded {RAW.shape[0]} rows, {RAW.shape[1]} columns")
data = RAW.copy()
data["Depression"] = data["Depression"].astype(int)


def extract_hours(s):
    if pd.isna(s):
        return np.nan
    match = re.search(r"(\d+(\.\d+)?)", str(s))
    return float(match.group(1)) if match else np.nan


data["Sleep Duration"] = data["Sleep Duration"].apply(extract_hours)
data["Sleep Duration"].fillna(data["Sleep Duration"].median(), inplace=True)

data["Financial Stress"] = pd.to_numeric(data["Financial Stress"], errors="coerce")
data["Financial Stress"].fillna(data["Financial Stress"].median(), inplace=True)

data["Total Pressure"] = data["Academic Pressure"] + data["Work Pressure"]

dietary_dummies = pd.get_dummies(data["Dietary Habits"], prefix="Dietary Habits", drop_first=True)

# ------------------ 1. Classifier feature set (matches what actually gets served) ------------------ #
CLASSIFIER_FEATURES = [
    "Age", "Academic Pressure", "Work Pressure", "CGPA", "Study Satisfaction",
    "Job Satisfaction", "Sleep Duration", "Work/Study Hours", "Total Pressure",
] + list(dietary_dummies.columns)

X = pd.concat([data[CLASSIFIER_FEATURES[:9]], dietary_dummies], axis=1)
y = data["Depression"]
print(f"\nClassifier feature set ({len(X.columns)}): {list(X.columns)}")

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
X_scaled_df = pd.DataFrame(X_scaled, columns=X.columns)

class_weights = compute_class_weight("balanced", classes=np.unique(y), y=y)
class_weight_dict = dict(zip(np.unique(y), class_weights))

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled_df, y, test_size=0.2, random_state=42, stratify=y
)

log_model = LogisticRegression(max_iter=1000, random_state=42, class_weight=class_weight_dict)
log_model.fit(X_train, y_train)
log_pred = log_model.predict(X_test)
log_proba = log_model.predict_proba(X_test)[:, 1]

# n_estimators=200 with unlimited depth produced a 177MB pickle — over GitHub's
# 100MB push limit. max_depth=15 keeps individual trees bounded (12 features
# don't need unlimited depth to split meaningfully) with negligible accuracy loss.
rf_model = RandomForestClassifier(
    n_estimators=100, max_depth=15, random_state=42, class_weight=class_weight_dict
)
rf_model.fit(X_train, y_train)
rf_pred = rf_model.predict(X_test)
rf_proba = rf_model.predict_proba(X_test)[:, 1]

def clf_metrics(y_true, y_pred, y_proba):
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred),
        "recall": recall_score(y_true, y_pred),
        "f1": f1_score(y_true, y_pred),
        "roc_auc": roc_auc_score(y_true, y_proba),
    }

log_metrics = clf_metrics(y_test, log_pred, log_proba)
rf_metrics = clf_metrics(y_test, rf_pred, rf_proba)
print(f"\nLogistic Regression: {log_metrics}")
print(f"Random Forest:       {rf_metrics}")

joblib.dump(rf_model, "rf_model.pkl")
joblib.dump(log_model, "log_model.pkl")
joblib.dump(scaler, "scaler.pkl")
joblib.dump(list(X.columns), "features.pkl")

model_info = {
    "model_type": "Random Forest",
    "accuracy": rf_metrics["accuracy"],
    "features_count": len(X.columns),
    "class_weights": {str(k): float(v) for k, v in class_weight_dict.items()},
    "feature_names": list(X.columns),
}
joblib.dump(model_info, "model_info.pkl")

# ------------------ 2. Decision Tree Regressor: continuous 0-100 risk score ------------------ #
# No ground-truth continuous severity score exists in the source data — this
# distills the now-correctly-fit Random Forest's predicted probability into a
# small, interpretable regressor that serves a smooth 0-100 score directly.
print("\n--- Decision Tree Regressor (risk score distillation) ---")
risk_target = rf_model.predict_proba(X_scaled_df)[:, 1] * 100
Xr_train, Xr_test, yr_train, yr_test = train_test_split(
    X_scaled_df, risk_target, test_size=0.2, random_state=42
)
dt_regressor = DecisionTreeRegressor(max_depth=8, min_samples_leaf=20, random_state=42)
dt_regressor.fit(Xr_train, yr_train)
yr_pred = dt_regressor.predict(Xr_test)

mae = mean_absolute_error(yr_test, yr_pred)
mse = mean_squared_error(yr_test, yr_pred)
rmse = np.sqrt(mse)
r2 = r2_score(yr_test, yr_pred)
n, p = Xr_test.shape
adj_r2 = 1 - (1 - r2) * (n - 1) / (n - p - 1)
print(f"MAE={mae:.3f}  MSE={mse:.3f}  RMSE={rmse:.3f}  R2={r2:.4f}  AdjR2={adj_r2:.4f}")
joblib.dump(dt_regressor, "dt_regressor.pkl")

# ------------------ 3. K-Means: student risk/behavior segments ------------------ #
# Uses a curated numeric feature set (not the classifier's scaled/engineered one)
# so clusters are interpretable in terms of raw lifestyle factors. Work Pressure
# and Job Satisfaction are excluded: this population is ~99.97% students with
# Profession="Student", so both columns are ~0 for nearly every row (they're
# meant for the "working professional" rows in the original combined dataset,
# which barely exist here) — near-zero variance after scaling destabilized
# K-Means into a degenerate single-cluster solution at k=2.
print("\n--- K-Means clustering ---")
CLUSTER_FEATURES = [
    "Academic Pressure", "CGPA", "Study Satisfaction",
    "Sleep Duration", "Work/Study Hours", "Financial Stress",
]
Xc = data[CLUSTER_FEATURES].copy()
cluster_scaler = StandardScaler()
Xc_scaled = cluster_scaler.fit_transform(Xc)
Xc_scaled_df = pd.DataFrame(Xc_scaled, columns=CLUSTER_FEATURES)

best_k, best_score, best_model = None, -1, None
for k in range(2, 7):
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(Xc_scaled_df)
    score = silhouette_score(Xc_scaled_df, labels, sample_size=5000, random_state=42)
    print(f"k={k}  silhouette={score:.4f}")
    if score > best_score:
        best_k, best_score, best_model = k, score, km

kmeans_model = best_model
cluster_labels = kmeans_model.predict(Xc_scaled_df)
print(f"Selected k={best_k} (silhouette={best_score:.4f})")

profile_df = Xc.copy()
profile_df["cluster"] = cluster_labels
profile_df["Depression"] = y.values
overall_means = profile_df.drop(columns=["cluster"]).mean(numeric_only=True)

cluster_profiles = []
for c in sorted(profile_df["cluster"].unique()):
    sub = profile_df[profile_df["cluster"] == c]
    means = sub.mean(numeric_only=True)
    size = len(sub)
    depression_rate = float(sub["Depression"].mean())

    tags = []
    if means["Academic Pressure"] >= overall_means["Academic Pressure"] + 0.3:
        tags.append("High Academic Pressure")
    if means["Sleep Duration"] <= overall_means["Sleep Duration"] - 0.5:
        tags.append("Poor Sleep")
    if means["Financial Stress"] >= overall_means["Financial Stress"] + 0.3:
        tags.append("Financially Stressed")
    if means["Study Satisfaction"] <= overall_means["Study Satisfaction"] - 0.3:
        tags.append("Low Study Satisfaction")

    if depression_rate >= 0.65:
        risk_tag = "High Risk"
    elif depression_rate >= 0.35:
        risk_tag = "Moderate Risk"
    else:
        risk_tag = "Low Risk / Resilient"

    label = (", ".join(tags) if tags else "Balanced Profile") + f" — {risk_tag}"

    cluster_profiles.append({
        "cluster_id": int(c),
        "label": label,
        "size": int(size),
        "size_pct": round(100 * size / len(profile_df), 1),
        "depression_rate": round(depression_rate, 3),
        "mean_academic_pressure": round(float(means["Academic Pressure"]), 2),
        "mean_cgpa": round(float(means["CGPA"]), 2),
        "mean_study_satisfaction": round(float(means["Study Satisfaction"]), 2),
        "mean_sleep_hours": round(float(means["Sleep Duration"]), 2),
        "mean_financial_stress": round(float(means["Financial Stress"]), 2),
    })

print(json.dumps(cluster_profiles, indent=2))
joblib.dump(kmeans_model, "kmeans_model.pkl")
joblib.dump(cluster_scaler, "kmeans_scaler.pkl")
joblib.dump(CLUSTER_FEATURES, "kmeans_features.pkl")
with open("cluster_profiles.json", "w") as f:
    json.dump(cluster_profiles, f, indent=2)

# ------------------ 4. Apriori: risk-factor association rules ------------------ #
print("\n--- Apriori association rule mining ---")
flags = pd.DataFrame(index=data.index)
flags["HighAcademicPressure"] = data["Academic Pressure"] >= 4
flags["HighWorkPressure"] = data["Work Pressure"] >= 4
flags["PoorSleep"] = data["Sleep Duration"] < 5
flags["LowStudySatisfaction"] = data["Study Satisfaction"] <= 2
flags["FinancialStress"] = data["Financial Stress"] >= 4
flags["FamilyHistory"] = data["Family History of Mental Illness"].astype(str).str.strip().str.lower() == "yes"
flags["SuicidalThoughts"] = data["Have you ever had suicidal thoughts ?"].astype(str).str.strip().str.lower() == "yes"
flags["HighWorkStudyHours"] = data["Work/Study Hours"] >= 10
flags["AtRisk"] = data["Depression"] == 1
flags = flags.astype(bool)

frequent_itemsets = apriori(flags, min_support=0.05, use_colnames=True)
rules = association_rules(frequent_itemsets, metric="lift", min_threshold=1.1)
rules = rules[rules["consequents"].apply(lambda s: "AtRisk" in s or "SuicidalThoughts" in s)]
rules = rules.sort_values("lift", ascending=False).head(20)


def frozenset_to_list(fs):
    return sorted(list(fs))


rules_out = [
    {
        "antecedents": frozenset_to_list(row["antecedents"]),
        "consequents": frozenset_to_list(row["consequents"]),
        "support": round(float(row["support"]), 4),
        "confidence": round(float(row["confidence"]), 4),
        "lift": round(float(row["lift"]), 4),
    }
    for _, row in rules.iterrows()
]
print(json.dumps(rules_out, indent=2))
with open("association_rules.json", "w") as f:
    json.dump(rules_out, f, indent=2)

# ------------------ 5. Consolidated evaluation report ------------------ #
full_report = {
    "logistic_regression": log_metrics,
    "random_forest": rf_metrics,
    "decision_tree_regressor": {
        "target": "RandomForest predicted risk probability * 100 (distillation, not a ground-truth label)",
        "mae": mae, "mse": mse, "rmse": rmse, "r2": r2, "adjusted_r2": adj_r2,
    },
    "kmeans": {"k": best_k, "silhouette_score": best_score, "features": CLUSTER_FEATURES},
    "apriori": {"min_support": 0.05, "min_lift": 1.1, "rule_count": len(rules_out)},
    "classifier_features": list(X.columns),
}
with open("model_info.json", "w") as f:
    json.dump(full_report, f, indent=2)

print("\n✅ All 5 models trained and saved consistently.")
print("Classifier (RF+LogReg): rf_model.pkl, log_model.pkl, scaler.pkl, features.pkl, model_info.pkl")
print("Regressor: dt_regressor.pkl")
print("Clustering: kmeans_model.pkl, kmeans_scaler.pkl, kmeans_features.pkl, cluster_profiles.json")
print("Association rules: association_rules.json")
print("Full report: model_info.json")
