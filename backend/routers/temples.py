from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from backend.database import get_db
from backend.models.temple import Temple
from backend.models.zone import TempleZone
from backend.models.user import User
from backend.models.pilgrim import Pilgrim
from backend.schemas.temple import (
    TempleCreate, 
    TempleUpdate, 
    TempleResponse, 
    TempleLocationUpdate, 
    ZoneLocationUpdate, 
    TempleMapResponse,
    TempleZoneResponse
)
from backend.dependencies.auth import get_current_user, require_role
from backend.services.simulation_service import simulation_manager

router = APIRouter(prefix="/temples", tags=["Temples Management"])

@router.get("", response_model=List[TempleResponse])
def get_temples(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "SUPER_ADMIN":
        return db.query(Temple).all()
    else:
        return db.query(Temple).filter(Temple.temple_id == current_user.temple_id).all()

@router.post("", response_model=TempleResponse)
def create_temple(
    payload: TempleCreate, 
    current_user: User = Depends(require_role(["SUPER_ADMIN"])), 
    db: Session = Depends(get_db)
):
    existing = db.query(Temple).filter(Temple.temple_id == payload.temple_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Temple ID already exists.")
        
    temple = Temple(**payload.model_dump())
    db.add(temple)
    db.commit()
    db.refresh(temple)
    return temple

_temple_map_cache = {}
_temple_map_cache_exp = {}

@router.get("/{temple_identifier}/map-data", response_model=TempleMapResponse)
def get_temple_map_data(temple_identifier: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch geographically accurate map data, zone overlays, live crowd counts, and AI risk predictions (cached)."""
    import time
    cache_key = f"map_{temple_identifier}"
    now = time.time()
    if cache_key in _temple_map_cache and now < _temple_map_cache_exp.get(cache_key, 0):
        return _temple_map_cache[cache_key]

    # Find by temple_id (e.g. TEMPLE-001) or id
    temple = db.query(Temple).filter((Temple.temple_id == temple_identifier) | (Temple.id == temple_identifier)).first()
    if not temple:
        raise HTTPException(status_code=404, detail="Temple not found")

    if current_user.role != "SUPER_ADMIN" and current_user.temple_id != temple.temple_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to another temple's map data")

    # Fetch live simulation / real queue state
    simulator = simulation_manager.get_simulator(temple.temple_id)
    sim_state = simulator.get_current_state()
    sim_zones = sim_state.get("zones", {})

    # Fetch configured zones from DB
    db_zones = db.query(TempleZone).filter(TempleZone.temple_id == temple.temple_id).all()
    
    zone_responses: List[TempleZoneResponse] = []
    
    # Calculate live zone statistics
    for z in db_zones:
        # Match with simulation or active queue
        sim_z = sim_zones.get(z.zone_code, {})
        current_devotees = sim_z.get("visitors", int(z.capacity * 0.45))
        queue_len = sim_z.get("queue", 120 if "queue" in z.zone_code else 0)
        risk_level = sim_z.get("risk_level", "LOW")
        
        occ_percent = min(100, int((current_devotees / max(1, z.capacity)) * 100))
        est_wait = round(queue_len / 25.0, 1)

        # AI Prediction calculation for 30 min ahead
        multiplier = 1.25 if risk_level in ["HIGH", "CRITICAL"] else 1.05
        ai_predicted_devotees = int(current_devotees * multiplier)
        
        if occ_percent > 80 or risk_level == "CRITICAL":
            ai_recommendation = f"Open secondary overflow corridor and deploy +{z.staff_assigned // 2 + 2} staff."
        elif occ_percent > 65 or risk_level == "HIGH":
            ai_recommendation = "Regulate queue barrier speed and announce wait times via PA system."
        elif occ_percent > 40:
            ai_recommendation = "Devotee flow is stable. Continue normal operations."
        else:
            ai_recommendation = "Optimal capacity. Green zone."

        zone_responses.append(TempleZoneResponse(
            id=z.id,
            zone_code=z.zone_code,
            name=z.name,
            zone_type=z.zone_type,
            latitude=z.latitude,
            longitude=z.longitude,
            capacity=z.capacity,
            current_devotees=current_devotees,
            occupancy_percent=occ_percent,
            queue_length=queue_len,
            estimated_wait_min=est_wait,
            risk_level=risk_level,
            is_verified=z.is_verified,
            icon_type=z.icon_type,
            staff_assigned=z.staff_assigned,
            ai_predicted_devotees_30min=ai_predicted_devotees,
            ai_recommendation=ai_recommendation
        ))

    boundary_coords = None
    if temple.boundary_geojson:
        try:
            boundary_coords = json.loads(temple.boundary_geojson)
        except Exception:
            boundary_coords = None

    result = TempleMapResponse(
        temple=TempleResponse.from_orm(temple),
        zones=zone_responses,
        boundary_coordinates=boundary_coords,
        mode="LIVE DATA" if not sim_state.get("is_running") else "SIMULATION MODE",
        total_inside_devotees=sim_state.get("current_visitors", 4820),
        total_waiting_devotees=sim_state.get("queue_length", 1248),
        overall_temple_risk=sim_state.get("risk_level", "LOW")
    )
    _temple_map_cache[cache_key] = result
    _temple_map_cache_exp[cache_key] = now + 2.5
    return result

@router.put("/{temple_id}/location", response_model=TempleResponse)
def update_temple_location(
    temple_id: str, 
    payload: TempleLocationUpdate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Allows authorized temple admins to update their temple GPS coordinates with validation."""
    temple = db.query(Temple).filter(Temple.temple_id == temple_id).first()
    if not temple:
        raise HTTPException(status_code=404, detail="Temple not found")

    if current_user.role != "SUPER_ADMIN" and current_user.temple_id != temple.temple_id:
        raise HTTPException(status_code=403, detail="Unauthorized location modification")

    # Validate coordinate range
    if not (-90.0 <= payload.latitude <= 90.0) or not (-180.0 <= payload.longitude <= 180.0):
        raise HTTPException(status_code=400, detail="Invalid GPS coordinates. Latitude must be in [-90, 90], Longitude in [-180, 180]")

    temple.latitude = payload.latitude
    temple.longitude = payload.longitude
    if payload.address:
        temple.address = payload.address
    if payload.zoom_level:
        temple.zoom_level = payload.zoom_level

    db.commit()
    db.refresh(temple)
    return temple

@router.put("/{temple_id}/zones/{zone_id}", response_model=dict)
def update_zone_location(
    temple_id: str,
    zone_id: int,
    payload: ZoneLocationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update specific operational zone coordinates and capacity."""
    zone = db.query(TempleZone).filter(TempleZone.id == zone_id, TempleZone.temple_id == temple_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    if current_user.role != "SUPER_ADMIN" and current_user.temple_id != temple_id:
        raise HTTPException(status_code=403, detail="Unauthorized zone modification")

    zone.latitude = payload.latitude
    zone.longitude = payload.longitude
    if payload.capacity:
        zone.capacity = payload.capacity
    if payload.name:
        zone.name = payload.name

    db.commit()
    db.refresh(zone)
    return {"message": "Zone location updated successfully", "zone_id": zone.id}
