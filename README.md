# DARSHANAI – AI-Powered Multi-Temple Crowd Intelligence & Safety Management System

> **Tagline:** *Predict. Prevent. Protect.*

DARSHANAI is an end-to-end Machine Learning and IoT operational simulation system designed for temple authorities to monitor, predict, and manage pilgrim crowd conditions in real-time.

---

## 🌟 Key Architecture & Highlights

- **Genuine ML Pipeline**: Built on a 1-year historical dataset (8,760 hourly records) with diurnal curves, festival surges, weather impacts, and gate bottlenecks. Trains 5 scikit-learn models (Crowd Regressor, Crowd Classifier, Risk Classifier, Waiting Time Model, and Isolation Forest Anomaly Detector).
- **Multi-Tenant Data Isolation**: Complete tenant isolation for multiple temples (`TEMPLE-001`, `TEMPLE-002`, `TEMPLE-003`). Every API and WebSocket validates the JWT token and extracts `temple_id` server-side—preventing cross-tenant data leaks.
- **Role-Based Access Control (RBAC)**: Support for 7 distinct staff roles (`SUPER_ADMIN`, `TEMPLE_ADMIN`, `MANAGER`, `SECURITY`, `MEDICAL`, `RECEPTIONIST`, `VOLUNTEER`).
- **Real-Time Operations Simulator**: Simulation clock with adjustable speed multipliers (1x to 60x), preset scenarios (*Normal Day, Weekend, Holiday, Festival, Heavy Rain, Crowd Surge, Emergency*), zone mechanics, and live ML inference streaming via WebSockets.
- **Command-Center React Frontend**: Dark navy command center dashboard with Recharts analytics, Leaflet GIS zone map, live AI recommendation feed, pilgrim token queue management, safety alerts, and ML model performance metrics.

---

## 🏗️ Technology Stack

- **Frontend**: React.js, Vite, JavaScript, React Router DOM v6, Axios, Bootstrap 5, Recharts, React Leaflet, Leaflet, Lucide React icons.
- **Backend**: Python 3.12, FastAPI, Uvicorn, SQLAlchemy ORM, Pydantic v2, PyJWT, Bcrypt, WebSockets, SQLite (default dev DB).
- **Machine Learning**: Pandas, NumPy, Scikit-Learn, Joblib, Isolation Forest.

---

## 📊 Machine Learning Model Evaluation Summary

| Model | Target Variable | Algorithm | Key Metric | Metric Value |
|---|---|---|---|---|
| **Crowd Regressor** | `visitor_count` | RandomForestRegressor | R² Score / MAE | **0.9891** / 82.01 visitors |
| **Crowd Classifier** | `crowd_level` (LOW, MODERATE, HIGH, CRITICAL) | RandomForestClassifier | Accuracy / F1 | **97.55%** / 0.9754 |
| **Risk Classifier** | `risk_level` (LOW, MEDIUM, HIGH, CRITICAL) | RandomForestClassifier | Accuracy / F1 | **98.00%** / 0.9800 |
| **Waiting Time Model** | `waiting_time` (minutes) | GradientBoostingRegressor | R² Score / MAE | **0.9865** / 3.31 mins |
| **Anomaly Detector** | Crowd Surges & Gate Failures | Isolation Forest | Contamination | **0.03 (Trained & Active)** |

*Empirical metrics saved in `models/model_metrics.json` and feature importances in `models/feature_importance.json`.*

---

## 🚀 Quickstart Guide

### 🔄 Team Collaboration & Pulling Latest Changes

Whenever starting a work session or collaborating with team members (especially in **Antigravity**):

```bash
# Option 1: 1-Click Windows Batch Script (Double-click in Explorer or run in terminal)
.\pull_latest.bat

# Option 2: PowerShell script
.\pull_latest.ps1

# Option 3: npm script from repository root
npm run pull

# Option 4: Linux / macOS / Git Bash
./pull_latest.sh
```

> **Antigravity Users:** Workspace configuration in [`AGENTS.md`](./AGENTS.md) is pre-configured to ensure Antigravity checks and pulls the latest team updates on session startup.

### 1. Installation & Environment Setup

```bash
# Navigate to repository root
cd dharshan-ai

# Install Backend Python dependencies
pip install -r requirements.txt
```

### 2. Dataset Generation & Model Training

```bash
# Generate 8,760 hourly historical records
python ml/generate_dataset.py

# Train all 5 ML models and evaluate performance
python -m ml.train_models
```

### 3. Start Backend Server

```bash
# Run FastAPI server on port 8000
python -m uvicorn backend.main:app --reload --port 8000
```
*API Documentation available at: `http://localhost:8000/docs`*

### 4. Start Frontend Dashboard

```bash
cd frontend

# Install Node dependencies
npm install

# Launch Vite Dev Server
npm run dev
```
*Frontend running at: `http://localhost:5173`*

---

## 🔑 Demo Login Credentials

| Role | Temple Tenant | Email | Password |
|---|---|---|---|
| **Super Admin** | Platform Global | `superadmin@darshanai.com` | `SuperAdmin123!` |
| **Temple Admin** | Sri Somnath Temple (`TEMPLE-001`) | `admin@temple001.com` | `TempleAdmin123!` |
| **Operations Manager** | Sri Somnath Temple (`TEMPLE-001`) | `manager@temple001.com` | `Manager123!` |
| **Security Officer** | Sri Somnath Temple (`TEMPLE-001`) | `security@temple001.com` | `Security123!` |
| **Medical Lead** | Sri Somnath Temple (`TEMPLE-001`) | `medical@temple001.com` | `Medical123!` |
| **Receptionist** | Sri Somnath Temple (`TEMPLE-001`) | `reception@temple001.com` | `Reception123!` |
| **Volunteer Lead** | Sri Somnath Temple (`TEMPLE-001`) | `volunteer@temple001.com` | `Volunteer123!` |
| **Temple Admin (Tirupati)** | Sri Venkateswara Temple (`TEMPLE-002`) | `admin@temple002.com` | `TempleAdmin123!` |

---

## 🔁 Complete Demonstration Flow

1. Open `http://localhost:5173/login`.
2. Select **Temple Admin (Sri Somnath Temple)** or click quick autofill.
3. Observe live KPI stat cards (Visitors, Predicted Visitors, Crowd Level, Risk, Waiting Time, Anomalies).
4. Navigate to **Simulation** or use the top control toolbar on the Dashboard:
   - Click **START** (Set speed to **30x**).
   - Select **Festival Rush** or **Uncontrolled Crowd Surge** scenario.
5. Watch real-time crowd dynamics:
   - ML model predicts incoming visitor spike.
   - Crowd Level transitions to **HIGH / CRITICAL**.
   - Safety Risk model flags bottleneck.
   - Isolation Forest Anomaly detector triggers alert.
   - **AI Action Recommendation** updates dynamically.
6. Open **Temple GIS Map** to see zone markers change color (Green -> Yellow -> Orange -> Red).
7. Navigate to **ML Performance** page to view actual empirical metrics (R², MAE, Accuracy, Confusion Matrix, Feature Importance).
8. Logout and log in as **Tirupati Temple Admin (`TEMPLE-002`)** to confirm complete tenant data isolation.
