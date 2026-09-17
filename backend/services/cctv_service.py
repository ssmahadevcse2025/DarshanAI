import cv2
import numpy as np
import time
import threading
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
            _shared_yolo_model = None
    return _shared_yolo_model


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
        self.entry_rate = 35  # people / min
        self.exit_rate = 22   # people / min
        self.fps = 15.0
        self.risk_level = "LOW"
        self.density_percent = 0.0

        self.last_frame_time = time.time()
        self.frame_count = 0
        self.track_history = {}

        # Synthetic crowd simulation state
        self.simulated_people = []
        self._init_synthetic_crowd()

        # Video capture & thread management
        self.cap = None
        self.active_resolved_url = None
        self.lock = threading.Lock()
        self.stop_event = threading.Event()
        self.capture_thread = None

        self.cached_raw_frame = None
        self.cached_annotated_frame = None

        # Shared YOLOv8 detector
        self.yolo_model = get_shared_detector()

        # If initialized with an external source, start worker
        if self.source_type in ["YOUTUBE", "WEBCAM", "LIVE_CCTV"]:
            self._start_capture_worker()

    def _init_synthetic_crowd(self):
        base_count = 28 if "queue" in self.zone_code else 18
        self.simulated_people = []
        for i in range(base_count):
            self.simulated_people.append({
                "id": i + 101,
                "x": float(np.random.randint(50, 580)),
                "y": float(np.random.randint(80, 420)),
                "vx": float(np.random.uniform(-1.5, 2.0)),
                "vy": float(np.random.uniform(-0.8, 0.8)),
                "h": float(np.random.randint(45, 75)),
                "w": float(np.random.randint(22, 36)),
                "color": (
                    int(np.random.randint(180, 255)),
                    int(np.random.randint(120, 200)),
                    int(np.random.randint(50, 100))
                )
            })

    def _resolve_youtube_url(self, yt_url: str) -> Optional[str]:
        try:
            import yt_dlp
            ydl_opts = {
                "format": "bestvideo[height<=720]/bestvideo/best",
                "quiet": True,
                "no_warnings": True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(yt_url, download=False)
                if "url" in info:
                    return info["url"]
                if "formats" in info and len(info["formats"]) > 0:
                    return info["formats"][-1]["url"]
        except Exception as err:
            print(f"[CCTV ENGINE] yt-dlp resolution error for {yt_url}: {err}")
        return None

    def _start_capture_worker(self):
        self._stop_capture_worker()
        self.stop_event.clear()
        self.capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.capture_thread.start()

    def _stop_capture_worker(self):
        self.stop_event.set()
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None

    def _capture_loop(self):
        resolved_source = None
        if self.source_type == "YOUTUBE":
            target_url = self.stream_url or "https://www.youtube.com/watch?v=DJsHe1tDpg8"
            resolved_source = self._resolve_youtube_url(target_url)
        elif self.source_type == "WEBCAM":
            resolved_source = 0
        elif self.source_type == "LIVE_CCTV":
            resolved_source = self.stream_url

        if resolved_source is None and self.source_type != "WEBCAM":
            print(f"[CCTV ENGINE] Could not resolve source for {self.camera_id}. Falling back to TEST_VIDEO.")
            self.source_type = "TEST_VIDEO"
            return

        self.cap = cv2.VideoCapture(resolved_source)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        last_infer_time = 0
        while not self.stop_event.is_set():
            if not self.cap or not self.cap.isOpened():
                time.sleep(1.0)
                continue

            ret, frame = self.cap.read()
            if not ret or frame is None:
                # Reconnect attempt
                time.sleep(1.0)
                if self.source_type == "YOUTUBE":
                    resolved_source = self._resolve_youtube_url(self.stream_url or "https://www.youtube.com/watch?v=DJsHe1tDpg8")
                    if resolved_source:
                        self.cap = cv2.VideoCapture(resolved_source)
                        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                continue

            # Resize if excessively large for fast, smooth web streaming
            h, w = frame.shape[:2]
            if w > 1280:
                frame = cv2.resize(frame, (1280, 720))

            raw_copy = frame.copy()
            annotated = frame.copy()

            # Run YOLOv8 detection roughly 10-15 times per second
            now = time.time()
            devotee_count = self.person_count
            if now - last_infer_time > 0.07:
                last_infer_time = now
                if self.yolo_model:
                    try:
                        results = self.yolo_model.predict(annotated, classes=[0], conf=0.35, verbose=False)
                        detections = results[0].boxes
                        devotee_count = len(detections)

                        # Set status level and color scheme based on crowd density
                        if devotee_count > 40:
                            status_text = "HIGH CONGESTION"
                            theme_color = (95, 42, 255)  # Amber / Red alert (BGR)
                        elif devotee_count > 20:
                            status_text = "MODERATE DENSITY"
                            theme_color = (0, 214, 255)  # Yellow caution (BGR)
                        else:
                            status_text = "NORMAL FLOW"
                            theme_color = (255, 210, 0)  # Cyan / Blue normal (BGR)

                        for box in detections:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            conf = float(box.conf[0])
                            cv2.rectangle(annotated, (x1, y1), (x2, y2), theme_color, 2)
                            label = f"Devotee {conf:.2f}"
                            cv2.putText(
                                annotated,
                                label,
                                (x1, max(y1 - 6, 15)),
                                cv2.FONT_HERSHEY_SIMPLEX,
                                0.5,
                                theme_color,
                                2,
                                cv2.LINE_AA
                            )

                        # Top telemetry dashboard banner
                        cv2.rectangle(annotated, (0, 0), (annotated.shape[1], 55), (13, 20, 36), -1)
                        cv2.line(annotated, (0, 55), (annotated.shape[1], 55), theme_color, 2)

                        # Metrics text overlay
                        cv2.putText(
                            annotated,
                            f"DEVOTEES IN FRAME: {devotee_count}",
                            (20, 36),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.75,
                            (255, 255, 255),
                            2,
                            cv2.LINE_AA
                        )
                        cv2.putText(
                            annotated,
                            f"STATUS: {status_text}",
                            (400, 36),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.65,
                            theme_color,
                            2,
                            cv2.LINE_AA
                        )
                        cv2.putText(
                            annotated,
                            f"FPS: {self.fps:.1f}",
                            (annotated.shape[1] - 140, 36),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.6,
                            (180, 180, 180),
                            1,
                            cv2.LINE_AA
                        )

                        self.person_count = devotee_count
                        self.density_percent = min(100.0, round((self.person_count / max(1, self.capacity)) * 100, 1))
                        self.risk_level = "CRITICAL" if self.density_percent > 85 else "HIGH" if self.density_percent > 70 else "MODERATE" if self.density_percent > 50 else "LOW"
                    except Exception as infer_err:
                        print(f"[CCTV INFERENCE ERROR] {infer_err}")

            with self.lock:
                self.cached_raw_frame = raw_copy
                self.cached_annotated_frame = annotated

            time.sleep(0.04)

    def _generate_synthetic_frames(self):
        """Generates synthetic temple corridor frames for simulation mode."""
        width, height = 640, 480

        # Base clean temple-style background
        raw_frame = np.zeros((height, width, 3), dtype=np.uint8)
        raw_frame[:, :] = (240, 246, 249)

        # Floor grid lines & corridor barriers
        cv2.line(raw_frame, (0, 120), (width, 120), (200, 215, 225), 1)
        cv2.line(raw_frame, (0, 240), (width, 240), (200, 215, 225), 1)
        cv2.line(raw_frame, (0, 360), (width, 360), (200, 215, 225), 1)

        # Queue Corridor Guidelines (Gold & Maroon)
        cv2.line(raw_frame, (80, 60), (80, 440), (39, 155, 197), 2)
        cv2.line(raw_frame, (280, 60), (280, 440), (47, 29, 107), 2)
        cv2.line(raw_frame, (480, 60), (480, 440), (39, 155, 197), 2)

        # Move simulated people on the raw frame
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

            # Draw person silhouette on RAW frame (clean visual, no AI overlays)
            cv2.circle(raw_frame, (x + w // 2, y + 8), 7, p["color"], -1)
            cv2.circle(raw_frame, (x + w // 2, y + 8), 7, (47, 29, 107), 1)
            cv2.rectangle(raw_frame, (x + 2, y + 16), (x + w - 2, y + h), p["color"], -1)

        # Create annotated frame copy
        annotated_frame = raw_frame.copy()

        # Entry & Exit virtual detection tripwires on annotated frame
        cv2.line(annotated_frame, (10, 200), (200, 200), (0, 180, 0), 2)
        cv2.putText(annotated_frame, "ENTRY TRIPWIRE", (15, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 140, 0), 1)

        cv2.line(annotated_frame, (440, 320), (630, 320), (0, 0, 220), 2)
        cv2.putText(annotated_frame, "EXIT TRIPWIRE", (450, 310), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 180), 1)

        self.person_count = len(detected_boxes)
        self.density_percent = min(100.0, round((self.person_count / max(1, self.capacity)) * 100, 1))

        if self.density_percent > 85.0:
            self.risk_level = "CRITICAL"
            box_color = (0, 0, 220)
        elif self.density_percent > 70.0:
            self.risk_level = "HIGH"
            box_color = (0, 140, 255)
        elif self.density_percent > 50.0:
            self.risk_level = "MODERATE"
            box_color = (0, 214, 255)
        else:
            self.risk_level = "LOW"
            box_color = (0, 180, 0)

        # Draw bounding boxes and person badges on annotated frame
        for x, y, w, h, pid in detected_boxes:
            cv2.rectangle(annotated_frame, (x, y), (x + w, y + h), box_color, 2)
            cv2.putText(annotated_frame, f"P {pid}", (x, y - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (47, 29, 107), 1)

        now = time.time()
        dt = now - self.last_frame_time
        self.last_frame_time = now
        self.fps = round(1.0 / max(0.001, dt), 1)

        # Annotated frame top banner
        cv2.rectangle(annotated_frame, (0, 0), (width, 42), (47, 29, 107), -1)
        cv2.putText(annotated_frame, f"{self.camera_id} - {self.name.upper()}", (12, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (39, 155, 197), 1)
        cv2.putText(annotated_frame, f"SOURCE: {self.source_type} | FPS: {self.fps} | 720p", (12, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (220, 220, 220), 1)

        cv2.circle(annotated_frame, (width - 65, 20), 5, (0, 220, 0), -1)
        cv2.putText(annotated_frame, "LIVE", (width - 52, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 240, 0), 2)

        # Annotated frame bottom HUD
        cv2.rectangle(annotated_frame, (0, height - 36), (width, height), (30, 20, 15), -1)
        cv2.putText(annotated_frame, f"PERSON COUNT: {self.person_count}", (12, height - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        cv2.putText(annotated_frame, f"DENSITY: {self.density_percent}%", (210, height - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        cv2.putText(annotated_frame, f"RISK: {self.risk_level}", (410, height - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.45, box_color, 2)

        return raw_frame, annotated_frame

    def generate_frame(self, overlay: bool = True) -> np.ndarray:
        """Returns either the raw unannotated frame (overlay=False) or annotated frame with YOLO detection (overlay=True)."""
        if self.source_type in ["YOUTUBE", "WEBCAM", "LIVE_CCTV"]:
            with self.lock:
                if overlay and self.cached_annotated_frame is not None:
                    return self.cached_annotated_frame
                elif not overlay and self.cached_raw_frame is not None:
                    return self.cached_raw_frame

        # Fallback or TEST_VIDEO mode
        raw, annotated = self._generate_synthetic_frames()
        return annotated if overlay else raw

    def get_analytics(self) -> dict:
        return {
            "camera_id": self.camera_id,
            "temple_id": self.temple_id,
            "name": self.name,
            "zone_code": self.zone_code,
            "source_type": self.source_type,
            "stream_url": self.stream_url,
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


class CCTVManager:
    def __init__(self):
        self.cameras: Dict[str, CameraStreamProcessor] = {}
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
            cam._stop_capture_worker()
            cam.source_type = source_type
            cam.stream_url = stream_url
            cam.status = "ONLINE"
            if source_type in ["YOUTUBE", "WEBCAM", "LIVE_CCTV"]:
                cam._start_capture_worker()
            return True
        return False


cctv_manager = CCTVManager()
