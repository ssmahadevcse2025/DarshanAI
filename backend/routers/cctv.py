from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import cv2
import time

from backend.database import get_db
from backend.models.user import User
from backend.models.cctv import CCTVCamera, LiveCrowdMeasurement
from backend.dependencies.auth import get_current_user
from backend.services.cctv_service import cctv_manager
from backend.services.ml_prediction_service import ml_multi_predictor

router = APIRouter(prefix="/cctv", tags=["CCTV Crowd Intelligence"])

@router.get("/cameras")
def get_cameras(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List CCTV cameras for the authenticated user's temple."""
    temple_id = None if current_user.role == "SUPER_ADMIN" else current_user.temple_id
    cams = cctv_manager.list_cameras_for_temple(temple_id)
    return [cam.get_analytics() for cam in cams]

def _generate_mjpeg_stream(camera_id: str, overlay: bool = True):
    cam = cctv_manager.get_camera(camera_id)
    if not cam:
        return
    while True:
        frame = cam.generate_frame(overlay=overlay)
        if frame is None:
            time.sleep(0.05)
            continue
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if not ret:
            continue
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.05)  # ~20 FPS transmission

@router.get("/cameras/{camera_id}/stream")
def stream_camera(camera_id: str, mode: str = Query("detection", pattern="^(detection|raw)$")):
    """Real-time MJPEG live video feed (detection with HUD or raw unannotated)."""
    cam = cctv_manager.get_camera(camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    overlay = (mode == "detection")
    return StreamingResponse(
        _generate_mjpeg_stream(camera_id, overlay=overlay),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/cameras/{camera_id}/raw-stream")
def raw_stream_camera(camera_id: str):
    """Real-time raw MJPEG feed without bounding box overlays."""
    cam = cctv_manager.get_camera(camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return StreamingResponse(
        _generate_mjpeg_stream(camera_id, overlay=False),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/cameras/{camera_id}/detection-stream")
def detection_stream_camera(camera_id: str):
    """Real-time detection MJPEG feed with people count and YOLO bounding boxes."""
    cam = cctv_manager.get_camera(camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return StreamingResponse(
        _generate_mjpeg_stream(camera_id, overlay=True),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/cameras/{camera_id}/analytics")
def get_camera_analytics(
    camera_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch current aggregated computer vision analytics for a specific camera."""
    cam = cctv_manager.get_camera(camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    if current_user.role != "SUPER_ADMIN" and current_user.temple_id != cam.temple_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to another temple's camera")

    analytics = cam.get_analytics()
    
    # Store measurement record in database
    measurement = LiveCrowdMeasurement(
        temple_id=cam.temple_id,
        zone_code=cam.zone_code,
        camera_id=cam.camera_id,
        person_count=cam.person_count,
        entry_rate=cam.entry_rate,
        exit_rate=cam.exit_rate,
        density_percent=cam.density_percent,
        risk_level=cam.risk_level
    )
    db.add(measurement)
    db.commit()

    return analytics

@router.put("/cameras/{camera_id}/source")
def update_camera_source(
    camera_id: str,
    source_type: str = Query(..., pattern="^(LIVE_CCTV|WEBCAM|TEST_VIDEO|YOUTUBE)$"),
    stream_url: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Switch camera input between YouTube Live, RTSP, Local Webcam, and Test Video."""
    success = cctv_manager.set_camera_source(camera_id, source_type, stream_url)
    if not success:
        raise HTTPException(status_code=404, detail="Camera not found")
    return {"message": f"Camera source updated to {source_type}", "camera_id": camera_id}

@router.get("/predictions")
def get_cctv_predictions(
    camera_id: Optional[str] = "CAM-002",
    current_user: User = Depends(get_current_user)
):
    """Generate +15m, +30m, and +60m ML crowd predictions from live CCTV telemetry."""
    cam = cctv_manager.get_camera(camera_id)
    if not cam:
        cam = cctv_manager.get_camera("CAM-001")
    
    current_crowd = cam.person_count * 12 if cam else 320 # Scaled across temple compound
    entry_rate = cam.entry_rate if cam else 45
    exit_rate = cam.exit_rate if cam else 25
    queue_len = int(current_crowd * 0.4)

    return ml_multi_predictor.predict_multi_horizon(
        current_crowd=current_crowd,
        entry_rate=entry_rate,
        exit_rate=exit_rate,
        queue_len=queue_len,
        temple_capacity=18000
    )

@router.post("/detection")
def ingest_edge_detection(
    payload: dict,
    db: Session = Depends(get_db)
):
    """External Edge AI CCTV Detection Ingestion endpoint."""
    temple_id = payload.get("temple_id", "TEMPLE-001")
    zone_code = payload.get("zone_code", "main_entrance")
    camera_id = payload.get("camera_id", "EDGE-01")
    person_count = payload.get("person_count", 0)
    entry_rate = payload.get("entry_rate", 0)
    exit_rate = payload.get("exit_rate", 0)
    density = payload.get("density_percent", 0.0)
    risk = payload.get("risk_level", "LOW")

    measurement = LiveCrowdMeasurement(
        temple_id=temple_id,
        zone_code=zone_code,
        camera_id=camera_id,
        person_count=person_count,
        entry_rate=entry_rate,
        exit_rate=exit_rate,
        density_percent=density,
        risk_level=risk
    )
    db.add(measurement)
    db.commit()

    return {"status": "SUCCESS", "ingested_records": 1}
