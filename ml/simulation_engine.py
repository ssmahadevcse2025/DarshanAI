import os
import time
import math
import random
import numpy as np

class TempleSimulationEngine:
    def __init__(self, temple_id="TEMPLE-001", temple_capacity=18000):
        self.temple_id = temple_id
        self.capacity = temple_capacity
        self.is_running = False
        self.speed = 10
        self.scenario = "NORMAL_DAY"
        self.simulated_hour = 8
        self.simulated_minute = 0
        self.tick_count = 0
        
        # Base operational state
        self.visitor_count = 4200
        self.entry_rate = 1400
        self.exit_rate = 1200
        self.queue_length = 1248 # 100% Devotee Queue Count
        self.open_gates = 5
        self.staff_available = 35
        self.avg_service_time = 2.4
        self.weather = "Clear"
        self.temperature = 28.5
        self.rainfall = 0.0
        self.incidents = 0
        
        # Initial zones
        self.zones = self._initialize_zones()

    def _initialize_zones(self):
        return {
            "main_entrance": {"name": "Main Entrance", "capacity": 3000, "visitors": 1200, "queue": 400, "entry_rate": 600, "exit_rate": 500, "risk_level": "LOW"},
            "queue_area": {"name": "Queue Complex", "capacity": 4500, "visitors": 1800, "queue": 350, "entry_rate": 500, "exit_rate": 450, "risk_level": "LOW"},
            "darshan_hall": {"name": "Darshan Hall", "capacity": 2500, "visitors": 950, "queue": 100, "entry_rate": 450, "exit_rate": 430, "risk_level": "LOW"},
            "prasadam_area": {"name": "Prasadam Counter", "capacity": 2000, "visitors": 450, "queue": 80, "entry_rate": 300, "exit_rate": 310, "risk_level": "LOW"},
            "exit_gates": {"name": "Exit Plaza", "capacity": 2000, "visitors": 300, "queue": 20, "entry_rate": 430, "exit_rate": 440, "risk_level": "LOW"},
            "parking_lot": {"name": "Parking Area", "capacity": 5000, "visitors": 1500, "queue": 50, "entry_rate": 200, "exit_rate": 180, "risk_level": "LOW"},
            "medical_center": {"name": "Medical Aid Station", "capacity": 100, "visitors": 12, "queue": 2, "entry_rate": 5, "exit_rate": 4, "risk_level": "LOW"}
        }

    def set_scenario(self, scenario_name):
        valid = ["NORMAL_DAY", "WEEKEND", "HOLIDAY", "FESTIVAL", "HEAVY_RAIN", "CROWD_SURGE", "EMERGENCY"]
        if scenario_name in valid:
            self.scenario = scenario_name
            self._apply_scenario_effects()
            return True
        return False

    def set_speed(self, speed_val):
        if speed_val in [1, 5, 10, 30, 60]:
            self.speed = speed_val
            return True
        return False

    def start(self):
        self.is_running = True

    def pause(self):
        self.is_running = False

    def reset(self):
        self.is_running = False
        self.simulated_hour = 8
        self.simulated_minute = 0
        self.tick_count = 0
        self.scenario = "NORMAL_DAY"
        self.visitor_count = 4200
        self.incidents = 0
        self.zones = self._initialize_zones()

    def _apply_scenario_effects(self):
        if self.scenario == "FESTIVAL":
            self.visitor_count = int(self.capacity * 0.85)
            self.entry_rate = 2800
            self.queue_length = 3200
            self.open_gates = 8
            self.staff_available = 55
        elif self.scenario == "CROWD_SURGE":
            self.visitor_count = int(self.capacity * 0.95)
            self.entry_rate = 3400
            self.queue_length = 4100
            self.open_gates = 4
            self.staff_available = 40
        elif self.scenario == "EMERGENCY":
            self.visitor_count = int(self.capacity * 1.05)
            self.entry_rate = 4000
            self.queue_length = 4800
            self.open_gates = 3
            self.incidents = 3
        elif self.scenario == "HEAVY_RAIN":
            self.weather = "Heavy Rain"
            self.rainfall = 25.0
            self.entry_rate = 800
            self.queue_length = 1400
        elif self.scenario == "WEEKEND":
            self.visitor_count = int(self.capacity * 0.65)
            self.entry_rate = 1900
            self.queue_length = 1850

    def tick(self):
        if not self.is_running:
            return self.get_current_state()
            
        self.tick_count += 1
        self.simulated_minute += 1
        if self.simulated_minute >= 60:
            self.simulated_minute = 0
            self.simulated_hour = (self.simulated_hour + 1) % 24

        hour = self.simulated_hour
        is_peak = (7 <= hour <= 11) or (16 <= hour <= 20)
        
        multiplier = 1.3 if is_peak else 0.8
        if self.scenario == "FESTIVAL":
            multiplier *= 1.8
        elif self.scenario == "CROWD_SURGE":
            multiplier *= 2.2
        elif self.scenario == "EMERGENCY":
            multiplier *= 2.5
        elif self.scenario == "HEAVY_RAIN":
            multiplier *= 0.6
            
        net_change = random.randint(-40, 60) + int(10 * math.sin(self.tick_count / 5.0) * multiplier)
        self.visitor_count = max(200, self.visitor_count + net_change)
        
        self.entry_rate = int(max(100, (self.visitor_count * 0.35) + random.randint(-50, 50)))
        self.exit_rate = int(max(80, (self.visitor_count * 0.32) + random.randint(-40, 40)))
        
        gate_capacity = self.open_gates * 400
        bottleneck = max(0, self.entry_rate - gate_capacity)
        self.queue_length = int(max(100, (self.visitor_count * 0.29) + bottleneck + random.randint(-30, 30)))

        # Update Zone Dynamics
        tot_vis = self.visitor_count
        self.zones["main_entrance"]["visitors"] = int(tot_vis * 0.25)
        self.zones["queue_area"]["visitors"] = int(tot_vis * 0.35)
        self.zones["darshan_hall"]["visitors"] = int(tot_vis * 0.18)
        self.zones["prasadam_area"]["visitors"] = int(tot_vis * 0.10)
        self.zones["exit_gates"]["visitors"] = int(tot_vis * 0.07)
        self.zones["parking_lot"]["visitors"] = int(tot_vis * 0.04)

        for zk, zval in self.zones.items():
            density_ratio = zval["visitors"] / float(zval["capacity"])
            if density_ratio > 0.90:
                zval["risk_level"] = "CRITICAL"
            elif density_ratio > 0.75:
                zval["risk_level"] = "HIGH"
            elif density_ratio > 0.50:
                zval["risk_level"] = "MODERATE"
            else:
                zval["risk_level"] = "LOW"

        return self.get_current_state()

    def get_current_state(self):
        payload = {
            "hour": self.simulated_hour,
            "day_of_week": 5 if self.scenario in ["WEEKEND", "FESTIVAL"] else 2,
            "month": 10,
            "is_weekend": 1 if self.scenario == "WEEKEND" else 0,
            "is_holiday": 1 if self.scenario in ["HOLIDAY", "FESTIVAL"] else 0,
            "is_festival": 1 if self.scenario == "FESTIVAL" else 0,
            "festival_type": "Navratri Start" if self.scenario == "FESTIVAL" else "None",
            "special_event": 1 if self.scenario in ["FESTIVAL", "CROWD_SURGE"] else 0,
            "weather": self.weather,
            "temperature": self.temperature,
            "rainfall": self.rainfall,
            "previous_hour_visitors": max(100, int(self.visitor_count * 0.95)),
            "previous_day_visitors": 45000 if self.scenario == "FESTIVAL" else 18000,
            "entry_rate": self.entry_rate,
            "exit_rate": self.exit_rate,
            "queue_length": self.queue_length,
            "number_of_open_gates": self.open_gates,
            "staff_available": self.staff_available,
            "average_service_time": self.avg_service_time
        }

        # Run ML Inference via shared singleton ml_service
        try:
            from backend.services.ml_service import ml_service
            ml_res = ml_service.predict(payload)
            pred_visitors = ml_res.get("predicted_visitor_count", int(self.visitor_count * 1.1))
            pred_crowd_level = ml_res.get("predicted_crowd_level", "MODERATE")
            pred_risk_level = ml_res.get("predicted_risk_level", "MEDIUM")
            pred_waiting_time = ml_res.get("predicted_waiting_time", round(self.queue_length / 40.0, 1))
            is_anomaly = ml_res.get("is_anomaly", False)
            anomaly_score = ml_res.get("anomaly_score", 0.12)
        except Exception as e:
            pred_visitors = int(self.visitor_count * 1.1)
            pred_crowd_level = "HIGH" if self.visitor_count > 7000 else "MODERATE"
            pred_risk_level = "HIGH" if self.queue_length > 1500 else "MEDIUM"
            pred_waiting_time = round(self.queue_length / 40.0, 1)
            is_anomaly, anomaly_score = False, 0.12

        ai_recommendation = self._generate_ai_recommendation(
            pred_crowd_level, pred_risk_level, self.queue_length, self.open_gates, self.staff_available, is_anomaly
        )

        # 100% Devotee Unified Queue Category Breakdown (Sum = queue_length)
        tot_q = self.queue_length
        cat_breakdown = {
            "General Darshan": int(tot_q * 0.65),
            "Special Darshan": int(tot_q * 0.15),
            "VIP": int(tot_q * 0.05),
            "Senior Citizen": int(tot_q * 0.06),
            "Divyang": int(tot_q * 0.02),
            "Children / Family": int(tot_q * 0.05),
            "Medical / Emergency": int(tot_q * 0.01),
            "Other": tot_q - (int(tot_q * 0.65) + int(tot_q * 0.15) + int(tot_q * 0.05) + int(tot_q * 0.06) + int(tot_q * 0.02) + int(tot_q * 0.05) + int(tot_q * 0.01))
        }

        # 8 Status Lifecycle Breakdown
        status_breakdown = {
            "WAITING": int(tot_q * 0.70),
            "CALLED": int(tot_q * 0.08),
            "SERVING": int(tot_q * 0.06),
            "IN_DARSHAN": int(tot_q * 0.12),
            "COMPLETED": int(tot_q * 0.02),
            "SKIPPED": int(tot_q * 0.01),
            "CANCELLED": 0,
            "EXITED": int(tot_q * 0.01)
        }

        return {
            "temple_id": self.temple_id,
            "simulated_time": f"{self.simulated_hour:02d}:{self.simulated_minute:02d}",
            "is_running": self.is_running,
            "speed": self.speed,
            "scenario": self.scenario,
            "current_visitors": self.visitor_count,
            "predicted_visitors": pred_visitors,
            "crowd_level": pred_crowd_level,
            "risk_level": pred_risk_level,
            "waiting_time": pred_waiting_time,
            "entry_rate": self.entry_rate,
            "exit_rate": self.exit_rate,
            "queue_length": tot_q, # 100% Devotees
            "category_breakdown": cat_breakdown,
            "status_breakdown": status_breakdown,
            "anti_starvation_ratio": "4 General : 2 Special : 1 VIP/Senior/Divyang",
            "open_gates": self.open_gates,
            "staff_available": self.staff_available,
            "is_anomaly": is_anomaly,
            "anomaly_score": anomaly_score,
            "incidents": self.incidents,
            "ai_recommendation": ai_recommendation,
            "zones": self.zones
        }

    def _generate_ai_recommendation(self, crowd_level, risk_level, queue_len, open_gates, staff, is_anomaly):
        recs = []
        if is_anomaly:
            recs.append("🚨 ANOMALY DETECTED: Sudden queue accumulation or gate bottleneck detected. Immediate staff dispatch recommended.")
        
        if risk_level == "CRITICAL":
            recs.append(f"⛔ Action Required: Halt new entrance entries. Open all available backup gates ({open_gates + 2}). Deploy 15 additional security personnel to Queue Complex.")
        elif risk_level == "HIGH":
            recs.append(f"⚠️ Action Required: Open 2 additional queue counters and stagger batch entry. Increase staff deployment from {staff} to {staff + 10}.")
        elif risk_level == "MEDIUM":
            recs.append("ℹ️ Recommendation: Monitor queue growth closely. Ensure all exit gates remain clear of obstructions.")
        else:
            recs.append("✅ Operations Normal: Crowd density and queue flow are within safe thresholds.")
            
        if queue_len > 2000:
            recs.append("⏳ High Wait Time Alert: Activate express darshan queue line and distribute drinking water bottles to pilgrims in Queue Complex.")

        return recs
