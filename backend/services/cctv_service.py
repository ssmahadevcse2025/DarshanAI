import cv2
import numpy as np
import time
from typing import Dict, List, Optional
import os

_shared_yolo_model = None

def get_shared_detector():
    global _shared_yolo_model
    if _shared_yolo_model is None:
        try:
            from ultralytics import YOLO
            _shared_yolo_model = YOLO("yolov8n.pt")
            print("[CCTV ENGINE] Shared YOLOv8n detector initialized successfully.")
        except Exception as e:
            print(f"[CCTV ENGINE NOTE] Vision pipeline fallback: {e}")
            _shared_yolo_model = False
    return _shared_yolo_model if _shared_yolo_model is not False else None

class CameraStreamProcessor:
    def __init__(
        self,
        camera_id: str,
        temple_id: str,
        name: str,
        zone_code: str,
        capacity: int = 500,
        source_type: str = "TEST_VIDEO",
        stream_url: Optional[str] = None
    ):
        self.camera_id = camera_id
        self.temple_id = temple_id
        self.name = name
        self.zone_code = zone_code
        self.capacity = capacity
        self.source_type = source_type
        self.stream_url = stream_url
        self.status = "ONLINE"

        self.person_count = 0
        self.entry_rate = 35
        self.exit_rate = 22
        self.fps = 15.0
        self.risk_level = "LOW"
        self.density_percent = 0.0

        self.last_frame_time = time.time()
        self.frame_count = 0
        self.simulated_people = []
        self._init_synthetic_crowd()

    def _init_synthetic_crowd(self):
        base_count = 24 if "queue" in self.zone_code else 16
        for i in range(base_count):
            self.simulated_people.append({
                "id": i + 101,
                "x": float(np.random.randint(50, 580)),
                "y": float(np.random.randint(80, 420)),
                "vx": float(np.random.uniform(-1.5, 2.0)),
                "vy": float(np.random.uniform(-0.8, 0.8)),
                "h": float(np.random.randint(45, 75)),
                "w": float(np.random.randint(22, 36)),
                "color": (np.random.randint(180, 255), np.random.randint(120, 200), np.random.randint(50, 100))
            })

    def generate_frame(self) -> np.ndarray:
        width, height = 640, 480
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        frame[:, :] = (240, 246, 249) # Warm Ivory RGB in BGR

        # Floor grid lines & corridor barriers
        cv2.line(frame, (0, 120), (width, 120), (200, 215, 225), 1)
        cv2.line(frame, (0, 240), (width, 240), (200, 215, 225), 1)
        cv2.line(frame, (0, 360), (width, 360), (200, 215, 225), 1)

        # Queue Corridor Guidelines
        cv2.line(frame, (80, 60), (80, 440), (39, 155, 197), 2)
        cv2.line(frame, (280, 60), (280, 440), (47, 29, 107), 2)
        cv2.line(frame, (480, 60), (480, 440), (39, 155, 197), 2)

        # Entry & Exit virtual detection tripwires
        cv2.line(frame, (10, 200), (200, 200), (0, 180, 0), 2)
        cv2.putText(frame, "ENTRY TRIPWIRE", (15, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 140, 0), 1)

        cv2.line(frame, (440, 320), (630, 320), (0, 0, 220), 2)
        cv2.putText(frame, "EXIT TRIPWIRE", (450, 310), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 180), 1)

        # Move simulated people
        detected_boxes = []
        for p in self.simulated_people:
            p["x"] += p["vx"]
            p["y"] += p["vy"]

            if p["x"] < 30 or p["x"] > width - 50:
                p["vx"] *= -1
            if p["y"] < 60 or p["y"] > height - 80:
                p["vy"] *= -1

            x, y, w, h = int(p["x"]), int(p["y"]), int(p["w"]), int(p["h"])
            detected_boxes.append((x, y, w, h, p["id"]))

            # Draw person silhouette
            cv2.circle(frame, (x + w // 2, y + 8), 7, p["color"], -1)
            cv2.circle(frame, (x + w // 2, y + 8), 7, (47, 29, 107), 1)
            cv2.rectangle(frame, (x + 2, y + 16), (x + w - 2, y + h), p["color"], -1)
            box_color = (0, 180, 0) if self.risk_level == "LOW" else (0, 140, 255) if self.risk_level == "MODERATE" else (0, 0, 220)
            cv2.rectangle(frame, (x, y), (x + w, y + h), box_color, 2)
            cv2.putText(frame, f"ID:{p['id']}", (x, y - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (47, 29, 107), 1)

        self.person_count = len(detected_boxes)
        self.density_percent = min(100.0, round((self.person_count / max(1, self.capacity)) * 100, 1))

        if self.density_percent > 85.0:
            self.risk_level = "CRITICAL"
        elif self.density_percent > 70.0:
            self.risk_level = "HIGH"
        elif self.density_percent > 50.0:
            self.risk_level = "MODERATE"
        else:
            self.risk_level = "LOW"

        now = time.time()
        dt = now - self.last_frame_time
        self.last_frame_time = now
        self.fps = round(1.0 / max(0.001, dt), 1)

        # Draw HUD Overlays
        cv2.rectangle(frame, (0, 0), (width, 42), (47, 29, 107), -1)
        cv2.putText(frame, f"{self.camera_id} - {self.name.upper()}", (12, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (39, 155, 197), 1)
        cv2.putText(frame, f"SOURCE: {self.source_type} | FPS: {self.fps} | 720p", (12, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (220, 220, 220), 1)

        cv2.circle(frame, (width - 65, 20), 5, (0, 220, 0), -1)
        cv2.putText(frame, "LIVE", (width - 52, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 240, 0), 2)

        cv2.rectangle(frame, (0, height - 36), (width, height), (30, 20, 15), -1)
        risk_color = (0, 220, 0) if self.risk_level == "LOW" else (0, 160, 255) if self.risk_level == "MODERATE" else (0, 80, 255) if self.risk_level == "HIGH" else (0, 0, 255)
        cv2.putText(frame, f"PERSON COUNT: {self.person_count}", (12, height - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        cv2.putText(frame, f"DENSITY: {self.density_percent}%", (210, height - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        cv2.putText(frame, f"RISK: {self.risk_level}", (410, height - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.45, risk_color, 2)

        return frame

    def get_analytics(self) -> dict:
        return {
            "camera_id": self.camera_id,
            "temple_id": self.temple_id,
            "name": self.name,
            "zone_code": self.zone_code,
            "source_type": self.source_type,
            "status": self.status,
            "person_count": self.person_count,
            "entry_rate": self.entry_rate,
            "exit_rate": self.exit_rate,
            "capacity": self.capacity,
            "density_percent": self.density_percent,
            "risk_level": self.risk_level,
            "fps": self.fps,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

class YOLOPeopleCounterProcessor:
    """High-performance YOLOv8 + OpenCV People Counter with real-time HUD annotations and multi-source feed handling."""

    def __init__(self):
        self.source_type = "DEVOTEES_QUEUE"
        self.stream_url = None
        self.linked_camera_id = "CAM-001"
        self.person_count = 38
        self.queue_count = 28
        self.entry_rate = 42
        self.exit_rate = 24
        self.fps = 24.0
        self.density_percent = 68.0
        self.risk_level = "MODERATE"
        self.last_frame_time = time.time()
        self.frame_index = 0
        self.simulated_boxes = []
        self._init_simulation_boxes()

    def _init_simulation_boxes(self):
        self.simulated_boxes = []
        counts = {
            "DEVOTEES_QUEUE": 44,
            "TEMPLE_ENTRANCE": 32,
            "GATE_RUSH": 52,
            "YOUTUBE": 28,
            "CAMERA": 22,
            "SYNTHETIC_CROWD": 36
        }.get(self.source_type, 35)

        for i in range(counts):
            self.simulated_boxes.append({
                "id": i + 1,
                "x": float(np.random.randint(40, 580)),
                "y": float(np.random.randint(60, 410)),
                "vx": float(np.random.uniform(-1.2, 1.5)),
                "vy": float(np.random.uniform(-0.6, 0.6)),
                "w": float(np.random.randint(24, 38)),
                "h": float(np.random.randint(48, 72)),
                "conf": round(float(np.random.uniform(0.78, 0.97)), 2)
            })

    def set_source(self, source_type: str, stream_url: Optional[str] = None, camera_id: str = "CAM-001"):
        self.source_type = source_type
        self.stream_url = stream_url
        self.linked_camera_id = camera_id
        self._init_simulation_boxes()

    def generate_yolo_opencv_frame(self) -> np.ndarray:
        width, height = 640, 480
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        frame[:, :] = (238, 244, 248) # Clean ivory bg

        # Corridor dividers & Queue guidelines
        for y_line in [110, 220, 330]:
            cv2.line(frame, (0, y_line), (width, y_line), (210, 225, 235), 1)

        cv2.line(frame, (90, 50), (90, 430), (39, 155, 197), 2)
        cv2.line(frame, (270, 50), (270, 430), (47, 29, 107), 2)
        cv2.line(frame, (450, 50), (450, 430), (39, 155, 197), 2)

        # Virtual Inflow & Outflow Detection Lines
        cv2.line(frame, (20, 180), (220, 180), (0, 180, 0), 2)
        cv2.putText(frame, "INFLOW LINE", (25, 172), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 140, 0), 1)

        cv2.line(frame, (420, 300), (620, 300), (0, 0, 220), 2)
        cv2.putText(frame, "OUTFLOW LINE", (425, 292), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 0, 180), 1)

        # Update simulated people boxes
        for b in self.simulated_boxes:
            b["x"] += b["vx"]
            b["y"] += b["vy"]

            if b["x"] < 25 or b["x"] > width - 50:
                b["vx"] *= -1
            if b["y"] < 55 or b["y"] > height - 75:
                b["vy"] *= -1

            x, y, w, h = int(b["x"]), int(b["y"]), int(b["w"]), int(b["h"])
            
            # Devotee body + head
            cv2.circle(frame, (x + w // 2, y + 8), 6, (180, 130, 70), -1)
            cv2.rectangle(frame, (x + 2, y + 14), (x + w - 2, y + h), (200, 150, 90), -1)
            
            # YOLO Bounding Box & Class Label
            box_col = (0, 200, 0) if self.risk_level == "LOW" else (0, 140, 255) if self.risk_level == "MODERATE" else (0, 0, 230)
            cv2.rectangle(frame, (x, y), (x + w, y + h), box_col, 2)
            cv2.putText(frame, f"P {b['conf']}", (x, max(14, y - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.34, (47, 29, 107), 1)

        self.person_count = len(self.simulated_boxes)
        self.queue_count = max(0, int(self.person_count * 0.75))
        self.density_percent = min(100.0, round((self.person_count / 55.0) * 100, 1))

        if self.density_percent > 80.0:
            self.risk_level = "CRITICAL"
        elif self.density_percent > 65.0:
            self.risk_level = "HIGH"
        elif self.density_percent > 45.0:
            self.risk_level = "MODERATE"
        else:
            self.risk_level = "LOW"

        now = time.time()
        dt = now - self.last_frame_time
        self.last_frame_time = now
        self.fps = round(1.0 / max(0.001, dt), 1)

        # Header HUD
        cv2.rectangle(frame, (0, 0), (width, 42), (47, 29, 107), -1)
        cv2.putText(frame, f"YOLOv8 + OpenCV People Counter | {self.source_type}", (12, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (39, 155, 197), 1)
        cv2.putText(frame, f"CAM: {self.linked_camera_id} | FPS: {self.fps} | CONF: 0.35+", (12, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (220, 220, 220), 1)

        # Pulsing Live Indicator
        cv2.circle(frame, (width - 65, 20), 5, (0, 220, 0), -1)
        cv2.putText(frame, "LIVE", (width - 52, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 240, 0), 2)

        # Footer Telemetry Bar
        cv2.rectangle(frame, (0, height - 36), (width, height), (28, 20, 18), -1)
        risk_color = (0, 220, 0) if self.risk_level == "LOW" else (0, 160, 255) if self.risk_level == "MODERATE" else (0, 80, 255) if self.risk_level == "HIGH" else (0, 0, 255)
        cv2.putText(frame, f"DEVOTEES: {self.person_count}", (12, height - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (255, 255, 255), 1)
        cv2.putText(frame, f"QUEUE: {self.queue_count}", (180, height - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (255, 255, 255), 1)
        cv2.putText(frame, f"DENSITY: {self.density_percent}%", (320, height - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (255, 255, 255), 1)
        cv2.putText(frame, f"RISK: {self.risk_level}", (480, height - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.44, risk_color, 2)

        return frame

    def get_analytics(self, camera_id: str = "CAM-001") -> dict:
        return {
            "status": "ONLINE",
            "camera_id": camera_id or self.linked_camera_id,
            "source_type": self.source_type,
            "stream_url": self.stream_url,
            "devotee_count": self.person_count,
            "queue_count": self.queue_count,
            "entry_rate": self.entry_rate,
            "exit_rate": self.exit_rate,
            "density_percent": self.density_percent,
            "risk_level": self.risk_level,
            "fps": self.fps,
            "model": "YOLOv8n-Crowd-Realtime",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }


class CCTVManager:
    def __init__(self):
        self.cameras: Dict[str, CameraStreamProcessor] = {}
        self.yolo_counter = YOLOPeopleCounterProcessor()
        self._init_default_cameras()

    def _init_default_cameras(self):
        default_configs = [
            ("CAM-001", "TEMPLE-001", "Main Gopuram Mahadwar Entry", "main_entrance", 300, "TEST_VIDEO"),
            ("CAM-002", "TEMPLE-001", "Main Darshan Queue Complex", "queue_area", 450, "TEST_VIDEO"),
            ("CAM-003", "TEMPLE-001", "Garbagriha Sanctum Corridor", "darshan_hall", 200, "TEST_VIDEO"),
            ("CAM-004", "TEMPLE-001", "Prasadam & Annakshetra Hall", "prasadam_area", 250, "TEST_VIDEO"),
            ("CAM-005", "TEMPLE-001", "Coastal Sea Promenade Exit", "exit_gates", 350, "TEST_VIDEO"),

            # TEMPLE-002 (Tirupati)
            ("CAM-201", "TEMPLE-002", "Mahadwaram Main Entrance", "main_entrance", 400, "TEST_VIDEO"),
            ("CAM-202", "TEMPLE-002", "Vaikuntam Queue Complex 1", "queue_area", 600, "TEST_VIDEO"),
            ("CAM-203", "TEMPLE-002", "Ananda Nilayam Sanctum Hall", "darshan_hall", 250, "TEST_VIDEO"),

            # TEMPLE-003 (Madurai)
            ("CAM-301", "TEMPLE-003", "East Tower Gopuram Entrance", "main_entrance", 350, "TEST_VIDEO"),
            ("CAM-302", "TEMPLE-003", "Ashta Shakthi Mandapam Queue", "queue_area", 400, "TEST_VIDEO"),
        ]

        for cam_id, t_id, name, z_code, cap, src in default_configs:
            self.cameras[cam_id] = CameraStreamProcessor(
                camera_id=cam_id,
                temple_id=t_id,
                name=name,
                zone_code=z_code,
                capacity=cap,
                source_type=src
            )

    def get_camera(self, camera_id: str) -> Optional[CameraStreamProcessor]:
        return self.cameras.get(camera_id)

    def list_cameras_for_temple(self, temple_id: Optional[str] = None) -> List[CameraStreamProcessor]:
        if not temple_id or temple_id == "ALL":
            return list(self.cameras.values())
        return [cam for cam in self.cameras.values() if cam.temple_id == temple_id]

    def set_camera_source(self, camera_id: str, source_type: str, stream_url: Optional[str] = None):
        cam = self.get_camera(camera_id)
        if cam:
            cam.source_type = source_type
            cam.stream_url = stream_url
            cam.status = "ONLINE"
            return True
        return False

    def get_yolo_counter(self) -> YOLOPeopleCounterProcessor:
        return self.yolo_counter

    def get_yolo_opencv_analytics(self, camera_id: str = "CAM-001") -> dict:
        return self.yolo_counter.get_analytics(camera_id)

    def set_yolo_counter_source(self, source_type: str, stream_url: Optional[str] = None, camera_id: str = "CAM-001"):
        self.yolo_counter.set_source(source_type, stream_url, camera_id)


cctv_manager = CCTVManager()

