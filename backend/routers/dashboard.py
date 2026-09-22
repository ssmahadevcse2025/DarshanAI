from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.user import User
from backend.models.temple import Temple
from backend.models.alert import Alert
from backend.models.pilgrim import Pilgrim
from backend.dependencies.auth import get_current_user
from backend.services.simulation_service import simulation_manager

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

import time
from typing import Dict, Tuple, Any, Optional
from threading import Lock

class SimpleTTLCache:
    """Thread-safe, zero-overhead in-memory TTL cache to eliminate redundant DB reads."""

    def __init__(self, default_ttl_seconds: float = 2.5):
        self.default_ttl = default_ttl_seconds
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._lock = Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key in self._cache:
                expiry, val = self._cache[key]
                if time.time() < expiry:
                    return val
                else:
                    del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl: Optional[float] = None):
        with self._lock:
            ttl_seconds = ttl if ttl is not None else self.default_ttl
            self._cache[key] = (time.time() + ttl_seconds, value)

_dash_cache = SimpleTTLCache(default_ttl_seconds=2.0)

@router.get("/summary")
def get_dashboard_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Combined dashboard summary endpoint returning crowd, queue, active alerts, and AI insights in 1 HTTP call (cached)."""
    temple_id = current_user.temple_id or "TEMPLE-001"
    cache_key = f"dash_summary_{temple_id}"
    
    cached = _dash_cache.get(cache_key)
    if cached is not None:
        return cached

    temple = db.query(Temple).filter(Temple.temple_id == temple_id).first()

    
    simulator = simulation_manager.get_simulator(temple_id)
    state = simulator.get_current_state()
    
    active_alerts = db.query(Alert).filter(
        Alert.temple_id == temple_id, 
        Alert.status == "ACTIVE"
    ).all()
    
    result = {
        "temple_id": temple_id,
        "temple_name": temple.name if temple else "Sri Somnath Temple",
        "crowd": {
            "current_visitors": state["current_visitors"],
            "predicted_visitors": state["predicted_visitors"],
            "crowd_level": state["crowd_level"],
            "risk_level": state["risk_level"],
            "entry_rate": state["entry_rate"],
            "exit_rate": state["exit_rate"],
            "capacity": temple.capacity if temple else 18000
        },
        "queue": {
            "queue_length": state["queue_length"],
            "waiting_time": state["waiting_time"],
            "category_breakdown": state["category_breakdown"],
            "status_breakdown": state["status_breakdown"]
        },
        "alerts": [
            {
                "id": a.id,
                "severity": a.severity,
                "zone": a.zone,
                "description": a.description,
                "time": a.created_at.isoformat(),
                "status": a.status,
                "alert_type": a.alert_type
            } for a in active_alerts
        ],
        "ai_insights": {
            "recommendation": state["ai_recommendation"],
            "is_anomaly": state["is_anomaly"],
            "anomaly_score": state["anomaly_score"]
        },
        "simulation": {
            "time": state["simulated_time"],
            "is_running": state["is_running"],
            "speed": state["speed"],
            "scenario": state["scenario"]
        }
    }
    _dash_cache.set(cache_key, result, ttl=2.0)
    return result

@router.get("/stats")
def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cache_key = f"dash_stats_{current_user.id}_{current_user.role}_{current_user.temple_id}"
    cached = _dash_cache.get(cache_key)
    if cached is not None:
        return cached

    if current_user.role == "SUPER_ADMIN":
        total_temples = db.query(Temple).count()
        active_temples = db.query(Temple).filter(Temple.status == "ACTIVE").count()
        total_users = db.query(User).count()
        active_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").count()
        
        res = {
            "is_super_admin": True,
            "total_temples": total_temples,
            "active_temples": active_temples,
            "total_users": total_users,
            "total_alerts": active_alerts,
            "overall_system_status": "OPERATIONAL"
        }
        _dash_cache.set(cache_key, res, ttl=3.0)
        return res
    else:
        temple_id = current_user.temple_id
        temple = db.query(Temple).filter(Temple.temple_id == temple_id).first()
        if not temple:
            raise HTTPException(status_code=404, detail="Temple configuration not found")
            
        simulator = simulation_manager.get_simulator(temple_id)
        state = simulator.get_current_state()
        
        active_alerts = db.query(Alert).filter(
            Alert.temple_id == temple_id, 
            Alert.status == "ACTIVE"
        ).count()
        
        total_pilgrims = db.query(Pilgrim).filter(
            Pilgrim.temple_id == temple_id
        ).count()
        
        res = {
            "is_super_admin": False,
            "temple_id": temple.temple_id,
            "temple_name": temple.name,
            "city": temple.city,
            "capacity": temple.capacity,
            "current_visitors": state["current_visitors"],
            "predicted_visitors": state["predicted_visitors"],
            "crowd_level": state["crowd_level"],
            "risk_level": state["risk_level"],
            "waiting_time": state["waiting_time"],
            "entry_rate": state["entry_rate"],
            "exit_rate": state["exit_rate"],
            "queue_length": state["queue_length"],
            "open_gates": state["open_gates"],
            "staff_available": state["staff_available"],
            "is_anomaly": state["is_anomaly"],
            "anomaly_score": state["anomaly_score"],
            "active_alerts": active_alerts,
            "total_pilgrims": total_pilgrims,
            "ai_recommendation": state["ai_recommendation"],
            "ai_recommendations": state["ai_recommendation"],
            "simulation_scenario": state["scenario"],
            "simulation_speed": state["speed"],
            "is_simulation_running": state["is_running"],
            "simulated_time": state["simulated_time"]
        }
        _dash_cache.set(cache_key, res, ttl=2.5)
        return res
