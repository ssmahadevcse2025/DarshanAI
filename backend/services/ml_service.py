import os
import json
import gc
import joblib
import pandas as pd
import numpy as np

class MLService:
    def __init__(self):
        self.models_dir = "models"
        self.preprocessor = None
        self.crowd_regressor = None
        self.crowd_classifier = None
        self.risk_classifier = None
        self.waiting_time_model = None
        self.anomaly_detector = None
        self.metrics = {}
        self.feature_importance = {}
        self._is_loaded = False
        self._load_metrics_metadata()

    def _load_metrics_metadata(self):
        """Loads lightweight JSON metrics metadata without unpickling heavy model weights."""
        try:
            metrics_path = os.path.join(self.models_dir, "model_metrics.json")
            if os.path.exists(metrics_path):
                with open(metrics_path, "r") as f:
                    self.metrics = json.load(f)

            fi_path = os.path.join(self.models_dir, "feature_importance.json")
            if os.path.exists(fi_path):
                with open(fi_path, "r") as f:
                    self.feature_importance = json.load(f)
        except Exception as e:
            print(f"[ML SERVICE NOTE] Metadata load notice: {e}")

    def load_all_artifacts(self):
        """Lazy-loads ML models on demand into shared memory with fallback resilience."""
        if self._is_loaded and self.preprocessor is not None:
            return True

        try:
            prep_path = os.path.join(self.models_dir, "preprocessing_pipeline.pkl")
            if os.path.exists(prep_path):
                self.preprocessor = joblib.load(prep_path)
                self.crowd_regressor = joblib.load(os.path.join(self.models_dir, "crowd_regressor.pkl"))
                self.crowd_classifier = joblib.load(os.path.join(self.models_dir, "crowd_classifier.pkl"))
                self.risk_classifier = joblib.load(os.path.join(self.models_dir, "risk_classifier.pkl"))
                self.waiting_time_model = joblib.load(os.path.join(self.models_dir, "waiting_time_model.pkl"))
                self.anomaly_detector = joblib.load(os.path.join(self.models_dir, "anomaly_model.pkl"))
                self._load_metrics_metadata()
                self._is_loaded = True
                print("[ML SERVICE] Memory-optimized ML models successfully loaded on demand.")
                return True
        except Exception as e:
            print(f"[ML SERVICE FALLBACK] Using intelligent heuristic engine: {e}")
            self._is_loaded = False
            return False

    def free_memory(self):
        """Explicitly release model references and run GC."""
        self.preprocessor = None
        self.crowd_regressor = None
        self.crowd_classifier = None
        self.risk_classifier = None
        self.waiting_time_model = None
        self.anomaly_detector = None
        self._is_loaded = False
        gc.collect()

    def _fallback_predict(self, payload: dict) -> dict:
        """Intelligent zero-overhead heuristic crowd analytics fallback."""
        entry_rate = float(payload.get("entry_rate", 35))
        exit_rate = float(payload.get("exit_rate", 22))
        queue_len = float(payload.get("queue_length", 50))
        hour = int(payload.get("hour", 9))
        open_gates = max(1, int(payload.get("number_of_open_gates", payload.get("open_gates", 4))))
        staff = max(1, int(payload.get("staff_available", payload.get("staff_on_duty", 15))))
        is_festival = int(payload.get("is_festival", 0))

        # Heuristic visitor estimation
        base_factor = 1.4 if (7 <= hour <= 12 or 16 <= hour <= 20) else 0.8
        fest_mult = 1.8 if is_festival else 1.0
        pred_vis = int((entry_rate * 40 + queue_len * 1.5) * base_factor * fest_mult)
        pred_vis = max(120, pred_vis)

        # Risk and crowd classification
        density = min(100.0, (queue_len / (open_gates * 25.0)) * 100)
        if density > 80.0 or is_festival:
            pred_crw = "CRITICAL" if density > 90 else "HIGH"
            pred_rsk = "CRITICAL" if density > 90 else "HIGH"
        elif density > 45.0:
            pred_crw = "MODERATE"
            pred_rsk = "MEDIUM"
        else:
            pred_crw = "LOW"
            pred_rsk = "LOW"

        # Waiting time estimation
        throughput = (open_gates * 12.0) + (staff * 1.5)
        pred_wt = round(max(2.0, (queue_len / max(1.0, throughput)) * 10.0), 1)

        is_anom = bool(entry_rate > 150 or queue_len > 400)
        anom_score = -0.15 if is_anom else 0.45

        recs = self._generate_recommendations(pred_crw, pred_rsk, queue_len, is_anom)

        return {
            "predicted_visitor_count": pred_vis,
            "predicted_crowd_level": pred_crw,
            "predicted_risk_level": pred_rsk,
            "predicted_waiting_time": pred_wt,
            "is_anomaly": is_anom,
            "anomaly_score": anom_score,
            "recommendations": recs
        }

    def predict(self, payload: dict):
        if not self._is_loaded:
            loaded = self.load_all_artifacts()
            if not loaded or not self.preprocessor:
                return self._fallback_predict(payload)

        try:
            X_scaled = self.preprocessor.transform_single(payload)

            pred_vis = int(self.crowd_regressor.predict(X_scaled)[0])
            pred_crw = str(self.crowd_classifier.predict(X_scaled)[0])
            pred_rsk = str(self.risk_classifier.predict(X_scaled)[0])
            pred_wt = round(float(self.waiting_time_model.predict(X_scaled)[0]), 1)
            
            is_anom, anom_score = self.anomaly_detector.predict_anomaly(X_scaled)
            
            recs = self._generate_recommendations(pred_crw, pred_rsk, payload.get("queue_length", 0), is_anom)
            
            return {
                "predicted_visitor_count": pred_vis,
                "predicted_crowd_level": pred_crw,
                "predicted_risk_level": pred_rsk,
                "predicted_waiting_time": pred_wt,
                "is_anomaly": is_anom,
                "anomaly_score": anom_score,
                "recommendations": recs
            }
        except Exception as e:
            print(f"[ML INFERENCE FALLBACK] {e}")
            return self._fallback_predict(payload)

    def predict_batch(self, payloads: list[dict]):
        """Vectorized batch inference for thousands of devotee / operational records."""
        if not payloads:
            return []

        if not self._is_loaded:
            loaded = self.load_all_artifacts()
            if not loaded or not self.preprocessor:
                return [self._fallback_predict(p) for p in payloads]

        try:
            df = pd.DataFrame(payloads)
            X_scaled = self.preprocessor.transform(df)

            pred_vis = self.crowd_regressor.predict(X_scaled).astype(int)
            pred_crw = self.crowd_classifier.predict(X_scaled).astype(str)
            pred_rsk = self.risk_classifier.predict(X_scaled).astype(str)
            pred_wt = np.round(self.waiting_time_model.predict(X_scaled).astype(float), 1)

            results = []
            for i in range(len(payloads)):
                results.append({
                    "predicted_visitor_count": int(pred_vis[i]),
                    "predicted_crowd_level": str(pred_crw[i]),
                    "predicted_risk_level": str(pred_rsk[i]),
                    "predicted_waiting_time": float(pred_wt[i])
                })
            return results
        except Exception as e:
            print(f"[ML BATCH FALLBACK] {e}")
            return [self._fallback_predict(p) for p in payloads]

    def _generate_recommendations(self, crowd_lvl, risk_lvl, queue_len, is_anomaly):
        recs = []
        if is_anomaly:
            recs.append("🚨 Anomaly Warning: Unusual surge pattern detected. Inspect gate throughput immediately.")
        if risk_lvl in ["HIGH", "CRITICAL"]:
            recs.append("⚠️ Safety Action: Open auxiliary entry gates and activate batch queue control.")
        elif risk_lvl in ["MEDIUM", "MODERATE"]:
            recs.append("ℹ️ Operational Note: Monitor sanctum hall density and deploy standby staff.")
        else:
            recs.append("✅ Operational Status: All parameters within standard safety limits.")
        return recs

ml_service = MLService()

