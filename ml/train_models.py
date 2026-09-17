import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor

from ml.preprocessing import TempleDataPreprocessor
from ml.evaluate_models import (
    evaluate_regression_model,
    evaluate_classification_model,
    extract_feature_importances
)
from ml.anomaly_detection import CrowdAnomalyDetector

def train_all_models():
    print("[1/5] Loading or generating temple crowd dataset...")
    csv_path = os.path.join("data", "temple_crowd_dataset.csv")
    if not os.path.exists(csv_path):
        from ml.generate_dataset import generate_synthetic_dataset
        generate_synthetic_dataset(output_path=csv_path)
    df = pd.read_csv(csv_path)
        
    print(f"[DATASET LOADED] {len(df)} rows found.")
    
    print("[2/5] Preprocessing and Feature Engineering...")
    preprocessor = TempleDataPreprocessor()
    X_scaled, feature_names = preprocessor.fit_transform(df)
    
    # Target variables
    y_visitor_count = df["visitor_count"].values
    y_crowd_level = df["crowd_level"].values
    y_risk_level = df["risk_level"].values
    y_waiting_time = df["waiting_time"].values
    
    # Train / Test split (80% train, 20% test)
    X_train, X_test, y_vis_train, y_vis_test, y_crw_train, y_crw_test, y_rsk_train, y_rsk_test, y_wt_train, y_wt_test = train_test_split(
        X_scaled, y_visitor_count, y_crowd_level, y_risk_level, y_waiting_time,
        test_size=0.2, random_state=42, shuffle=False
    )
    
    os.makedirs("models", exist_ok=True)
    
    metrics = {}
    feature_importances = {}
    
    # -------------------------------------------------------------
    # 1. Crowd Regressor (Visitor Count)
    # -------------------------------------------------------------
    print("[3/5] Training Crowd Regressor (Visitor Count)...")
    crowd_reg = RandomForestRegressor(n_estimators=120, max_depth=16, random_state=42, n_jobs=-1)
    crowd_reg.fit(X_train, y_vis_train)
    
    vis_metrics = evaluate_regression_model(crowd_reg, X_test, y_vis_test)
    metrics["crowd_regressor"] = vis_metrics
    feature_importances["crowd_regressor"] = extract_feature_importances(crowd_reg, feature_names)
    joblib.dump(crowd_reg, os.path.join("models", "crowd_regressor.pkl"))
    print(f"   -> Crowd Regressor R²: {vis_metrics['R2']}, MAE: {vis_metrics['MAE']}")
    
    # -------------------------------------------------------------
    # 2. Crowd Classifier (LOW, MODERATE, HIGH, CRITICAL)
    # -------------------------------------------------------------
    print("Training Crowd Level Classifier...")
    crowd_clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    crowd_clf.fit(X_train, y_crw_train)
    
    crowd_labels = ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    crw_metrics = evaluate_classification_model(crowd_clf, X_test, y_crw_test, labels=crowd_labels)
    metrics["crowd_classifier"] = crw_metrics
    feature_importances["crowd_classifier"] = extract_feature_importances(crowd_clf, feature_names)
    joblib.dump(crowd_clf, os.path.join("models", "crowd_classifier.pkl"))
    print(f"   -> Crowd Classifier Accuracy: {crw_metrics['Accuracy']}, F1: {crw_metrics['F1_Score']}")
    
    # -------------------------------------------------------------
    # 3. Risk Classifier (LOW, MEDIUM, HIGH, CRITICAL)
    # -------------------------------------------------------------
    print("Training Risk Classifier...")
    risk_clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    risk_clf.fit(X_train, y_rsk_train)
    
    risk_labels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    rsk_metrics = evaluate_classification_model(risk_clf, X_test, y_rsk_test, labels=risk_labels)
    metrics["risk_classifier"] = rsk_metrics
    feature_importances["risk_classifier"] = extract_feature_importances(risk_clf, feature_names)
    joblib.dump(risk_clf, os.path.join("models", "risk_classifier.pkl"))
    print(f"   -> Risk Classifier Accuracy: {rsk_metrics['Accuracy']}, F1: {rsk_metrics['F1_Score']}")
    
    # -------------------------------------------------------------
    # 4. Waiting Time Model
    # -------------------------------------------------------------
    print("Training Waiting Time Model...")
    wt_reg = GradientBoostingRegressor(n_estimators=120, learning_rate=0.08, max_depth=6, random_state=42)
    wt_reg.fit(X_train, y_wt_train)
    
    wt_metrics = evaluate_regression_model(wt_reg, X_test, y_wt_test)
    metrics["waiting_time_model"] = wt_metrics
    feature_importances["waiting_time_model"] = extract_feature_importances(wt_reg, feature_names)
    joblib.dump(wt_reg, os.path.join("models", "waiting_time_model.pkl"))
    print(f"   -> Waiting Time Model R²: {wt_metrics['R2']}, MAE: {wt_metrics['MAE']}")
    
    # -------------------------------------------------------------
    # 5. Anomaly Detector (Isolation Forest)
    # -------------------------------------------------------------
    print("Training Anomaly Detector (Isolation Forest)...")
    anomaly_detector = CrowdAnomalyDetector(contamination=0.03, random_state=42)
    anomaly_detector.fit(X_scaled)
    joblib.dump(anomaly_detector, os.path.join("models", "anomaly_model.pkl"))
    metrics["anomaly_model"] = {
        "contamination": 0.03,
        "n_estimators": 100,
        "status": "Trained and Active"
    }
    
    # -------------------------------------------------------------
    # 6. Save Preprocessing Pipeline
    # -------------------------------------------------------------
    joblib.dump(preprocessor, os.path.join("models", "preprocessing_pipeline.pkl"))
    
    # -------------------------------------------------------------
    # 7. Save Metrics & Feature Importance JSONs
    # -------------------------------------------------------------
    print("[4/5] Saving Evaluation Metrics & Feature Importance JSONs...")
    with open(os.path.join("models", "model_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
        
    with open(os.path.join("models", "feature_importance.json"), "w") as f:
        json.dump(feature_importances, f, indent=2)
        
    print("[5/5] MODEL TRAINING & SAVING COMPLETED SUCCESSFULLY!")
    return metrics

if __name__ == "__main__":
    train_all_models()
