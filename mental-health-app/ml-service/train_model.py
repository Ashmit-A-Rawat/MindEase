# train_model.py
import pandas as pd
import numpy as np
import re
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight
import warnings

# Suppress warnings
warnings.filterwarnings('ignore')

try:
    # Load dataset
    data = pd.read_csv("student_depression.csv")
    
    print(f"Dataset loaded with shape: {data.shape}")
    print(f"Columns: {list(data.columns)}")
    
    # Check if target column exists
    if 'Depression' not in data.columns:
        raise ValueError("Target column 'Depression' not found in dataset")
    
    # Ensure target is integer
    data['Depression'] = data['Depression'].astype(int)
    
    # Analyze class distribution
    print("\nClass distribution:")
    print(data['Depression'].value_counts())
    print("Class percentages:")
    print(data['Depression'].value_counts(normalize=True) * 100)
    
    # Check for missing values
    print("\nMissing values per column:")
    print(data.isnull().sum())
    
    # Clean Sleep Duration (extract number)
    def extract_hours(s):
        if pd.isna(s):
            return np.nan
        match = re.search(r"(\d+(\.\d+)?)", str(s))
        return float(match.group(1)) if match else np.nan
    
    if 'Sleep Duration' in data.columns:
        data['Sleep Duration'] = data['Sleep Duration'].apply(extract_hours)
        data['Sleep Duration'].fillna(data['Sleep Duration'].median(), inplace=True)
    
    # Identify all categorical columns (including Dietary Habits)
    categorical_columns = []
    for col in data.columns:
        if data[col].dtype == 'object' and col not in ['id', 'Depression']:
            categorical_columns.append(col)
    
    print(f"\nCategorical columns to encode: {categorical_columns}")
    
    # Encode all categorical features
    data_encoded = pd.get_dummies(data, columns=categorical_columns, drop_first=True)
    
    # Features + Target
    # Remove non-feature columns carefully
    columns_to_drop = ['id', 'Depression']
    columns_to_drop = [col for col in columns_to_drop if col in data_encoded.columns]
    
    X = data_encoded.drop(columns=columns_to_drop, errors='ignore')
    y = data_encoded['Depression']
    
    print(f"\nFeature matrix shape: {X.shape}")
    print(f"Target vector shape: {y.shape}")
    print(f"Feature columns: {list(X.columns)[:10]}{'...' if len(X.columns) > 10 else ''}")
    
    # Check if there are any remaining string values
    for col in X.columns:
        if X[col].dtype == 'object':
            print(f"Warning: Column {col} still contains string values: {X[col].unique()}")
    
    # Compute class weights for imbalanced data
    class_weights = compute_class_weight('balanced', classes=np.unique(y), y=y)
    class_weight_dict = dict(zip(np.unique(y), class_weights))
    print(f"\nClass weights: {class_weight_dict}")
    
    # Standardize all features (now all should be numeric)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_scaled_df = pd.DataFrame(X_scaled, columns=X.columns)
    
    # Train models with stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled_df, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"\nTraining set shape: {X_train.shape}")
    print(f"Test set shape: {X_test.shape}")
    print("Training set class distribution:")
    print(y_train.value_counts())
    
    # Train Logistic Regression with class weights
    log_model = LogisticRegression(
        max_iter=1000, 
        random_state=42, 
        class_weight=class_weight_dict
    )
    log_model.fit(X_train, y_train)
    log_pred = log_model.predict(X_test)
    log_accuracy = accuracy_score(y_test, log_pred)
    
    print(f"\nLogistic Regression Accuracy: {log_accuracy:.4f}")
    
    # Train Random Forest with class weights
    rf_model = RandomForestClassifier(
        n_estimators=100, 
        random_state=42,
        class_weight=class_weight_dict
    )
    rf_model.fit(X_train, y_train)
    rf_pred = rf_model.predict(X_test)
    rf_accuracy = accuracy_score(y_test, rf_pred)
    
    print(f"Random Forest Accuracy: {rf_accuracy:.4f}")
    
    # Select best model
    if rf_accuracy >= log_accuracy:
        best_model = rf_model
        best_pred = rf_pred
        model_name = "Random Forest"
        print(f"\nSelected Random Forest as best model")
    else:
        best_model = log_model
        best_pred = log_pred
        model_name = "Logistic Regression"
        print(f"\nSelected Logistic Regression as best model")
    
    # Detailed evaluation
    print(f"\n{model_name} Classification Report:")
    print(classification_report(y_test, best_pred))
    
    print(f"\n{model_name} Confusion Matrix:")
    print(confusion_matrix(y_test, best_pred))
    
    # Feature importance analysis (if available)
    if hasattr(best_model, 'feature_importances_'):
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': best_model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print(f"\nTop 15 Most Important Features:")
        print(feature_importance.head(15))
        
        # Check if suicidal thoughts feature is in top features
        suicidal_features = feature_importance[
            feature_importance['feature'].str.contains('suicidal', case=False, na=False)
        ]
        if not suicidal_features.empty:
            print(f"\nSuicidal thoughts feature importance:")
            print(suicidal_features)
        else:
            print(f"\nWarning: No suicidal thoughts feature found in importance ranking")
    
    # Save model components
    joblib.dump(best_model, "model.pkl")
    joblib.dump(scaler, "scaler.pkl")
    joblib.dump(X.columns.tolist(), "features.pkl")
    
    # Save additional model info
    model_info = {
        'model_type': model_name,
        'accuracy': rf_accuracy if model_name == "Random Forest" else log_accuracy,
        'features_count': len(X.columns),
        'class_weights': class_weight_dict,
        'feature_names': X.columns.tolist()
    }
    joblib.dump(model_info, "model_info.pkl")
    
    print(f"\n✅ Model training completed successfully!")
    print(f"Model type: {model_name}")
    print(f"Number of features: {len(X.columns)}")
    print(f"Accuracy: {model_info['accuracy']:.4f}")
    print(f"Files saved: model.pkl, scaler.pkl, features.pkl, model_info.pkl")
    
    # Critical safety check
    print(f"\n🚨 SAFETY CHECK:")
    print(f"Please verify that suicidal ideation is properly weighted in your model.")
    print(f"The API includes safety overrides, but the model should also learn these patterns.")
    
except Exception as e:
    print(f"❌ Error occurred: {str(e)}")
    import traceback
    traceback.print_exc()
    print("Please check your dataset and try again.")