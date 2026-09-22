import os
import sys
import json
import pandas as pd
import numpy as np

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.abspath("."))

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

print("=" * 75)
print("📊 1. TEMPLE CROWD DATASET EXPLORATION & METRICS")
print("=" * 75)

dataset_path = os.path.join("data", "temple_crowd_dataset.csv")
df = pd.read_csv(dataset_path)

print(f"Dataset File: {dataset_path}")
print(f"Total Records: {len(df):,} hourly telemetry rows (1 full year of continuous 24/7 monitoring)")
print(f"Total Feature Dimensions: {df.shape[1]} features\n")

print("📋 Feature Schema & Data Types:")
for idx, col in enumerate(df.columns, 1):
    print(f"  {idx:2d}. {col:25s} | dtype: {str(df[col].dtype):10s} | Sample: {df[col].iloc[0]}")

print("\n📈 Statistical Summary (Key Numerical Telemetry):")
stats = df[['visitor_count', 'entry_rate', 'exit_rate', 'queue_length', 'waiting_time', 'temperature', 'rainfall', 'number_of_open_gates', 'staff_available']].describe().round(2)
print(stats.to_string())

print("\n🛕 Festival Type Distribution:")
for fest, count in df['festival_type'].value_counts().items():
    pct = (count / len(df)) * 100
    print(f"  • {fest:35s} : {count:5d} hours ({pct:5.2f}%)")

print("\n👥 Crowd Level Class Balance:")
for cl, count in df['crowd_level'].value_counts().items():
    pct = (count / len(df)) * 100
    print(f"  • {cl:12s} : {count:5d} records ({pct:5.2f}%)")

print("\n🛡️ Safety Risk Level Balance:")
for rsk, count in df['risk_level'].value_counts().items():
    pct = (count / len(df)) * 100
    print(f"  • {rsk:12s} : {count:5d} records ({pct:5.2f}%)")

print("\n" + "=" * 75)
print("🚀 2. TRAINING & EVALUATING ML MODELS ON 8,760 ROWS (80% TRAIN / 20% TEST)")
print("=" * 75)

import ml.train_models
ml.train_models.train_all_models()

print("\n" + "=" * 75)
print("🧠 3. INFERENCE ACROSS REAL-WORLD OPERATIONAL SCENARIOS")
print("=" * 75)

from backend.services.ml_service import ml_service

scenarios = [
    {
        'name': 'Scenario 1: Normal Weekday Morning (08:00 AM)',
        'description': 'Regular morning darshan with standard 4-gate operation and steady flow',
        'payload': {
            'hour': 8, 'day_of_week': 1, 'month': 3, 'is_weekend': 0, 'is_festival': 0,
            'festival_type': 'None', 'temperature': 26.5, 'rainfall': 0.0,
            'entry_rate': 35, 'exit_rate': 28, 'queue_length': 60,
            'number_of_open_gates': 4, 'staff_available': 15
        }
    },
    {
        'name': 'Scenario 2: Weekend Evening Surge (Saturday 06:30 PM)',
        'description': 'High family & tourist footfall during evening Aarti',
        'payload': {
            'hour': 18, 'day_of_week': 5, 'month': 4, 'is_weekend': 1, 'is_festival': 0,
            'festival_type': 'None', 'temperature': 30.2, 'rainfall': 0.0,
            'entry_rate': 95, 'exit_rate': 60, 'queue_length': 480,
            'number_of_open_gates': 5, 'staff_available': 25
        }
    },
    {
        'name': 'Scenario 3: Maha Shivratri Festive Influx (Special Tithi Peak)',
        'description': 'Massive pilgrimage influx across state borders; capacity threshold reached',
        'payload': {
            'hour': 19, 'day_of_week': 4, 'month': 2, 'is_weekend': 0, 'is_festival': 1,
            'festival_type': 'Maha Shivratri', 'temperature': 24.0, 'rainfall': 0.0,
            'entry_rate': 180, 'exit_rate': 85, 'queue_length': 1450,
            'number_of_open_gates': 6, 'staff_available': 45
        }
    },
    {
        'name': 'Scenario 4: Heavy Monsoon Rain Afternoon (Reduced Inflow)',
        'description': 'Monsoon rainfall impacting corridor footfall and arrival velocity',
        'payload': {
            'hour': 14, 'day_of_week': 3, 'month': 7, 'is_weekend': 0, 'is_festival': 0,
            'festival_type': 'None', 'weather': 'Heavy Rain', 'temperature': 23.5, 'rainfall': 45.0,
            'entry_rate': 12, 'exit_rate': 18, 'queue_length': 20,
            'number_of_open_gates': 3, 'staff_available': 12
        }
    },
    {
        'name': 'Scenario 5: Sudden Chokepoint Anomaly (Stampede Risk Trigger)',
        'description': 'Unregulated influx with only 2 gates open and insufficient staff',
        'payload': {
            'hour': 10, 'day_of_week': 6, 'month': 10, 'is_weekend': 1, 'is_festival': 1,
            'festival_type': 'Navratri Start', 'temperature': 29.0, 'rainfall': 0.0,
            'entry_rate': 240, 'exit_rate': 30, 'queue_length': 2100,
            'number_of_open_gates': 2, 'staff_available': 8
        }
    }
]

for sc in scenarios:
    res = ml_service.predict(sc['payload'])
    print("\n" + "=" * 75)
    print(f"📌 {sc['name']}")
    print(f"   Context: {sc['description']}")
    print("-" * 75)
    print(f"   🔮 Predicted Visitor Count: {res['predicted_visitor_count']:,} devotees")
    print(f"   👥 Crowd Density Level:     {res['predicted_crowd_level']}")
    print(f"   🛡️ Safety Risk Level:       {res['predicted_risk_level']}")
    print(f"   ⏱️ Estimated Darshan Wait:  {res['predicted_waiting_time']} minutes")
    anomaly_tag = "🚨 YES - ANOMALOUS SURGE DETECTED" if res['is_anomaly'] else "✅ NO - NORMAL STATISTICAL FLOW"
    print(f"   ⚠️ Stampede Hazard Anomaly: {anomaly_tag} (Score: {res['anomaly_score']})")
    print(f"   🤖 AI Operational Action:   {res['recommendations'][0]}")

print("\n" + "=" * 75)
print("📊 4. FEATURE IMPORTANCE WEIGHT DISTRIBUTION")
print("=" * 75)
feat_imp = ml_service.feature_importance.get("crowd_regressor", [])
for item in feat_imp[:10]:
    bar_len = int(item['importance'] * 50)
    bar = "█" * bar_len + "░" * (50 - bar_len)
    print(f"  • {item['feature']:26s} : {item['importance']*100:5.2f}% | {bar}")

print("\n" + "=" * 75)
print("✨ COMPLETE MODEL & DATASET RUN COMPLETED SUCCESSFULLY!")
print("=" * 75)
