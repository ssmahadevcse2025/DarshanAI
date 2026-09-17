import sys
import cv2
import time
import yt_dlp
from ultralytics import YOLO

# Target YouTube Live URL (Temple feed, public camera, or live stream)
TARGET_YOUTUBE_URL = "https://www.youtube.com/watch?v=DJsHe1tDpg8"


def extract_live_stream_url(youtube_url: str) -> str:
    """Uses yt-dlp to extract the underlying HLS (.m3u8) video URL."""
    ydl_opts = {
        "format": "bestvideo[height<=720]/bestvideo/best",
        "quiet": True,
        "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=False)
        # Check direct URL or first format
        if "url" in info:
            return info["url"]
        elif "formats" in info and len(info["formats"]) > 0:
            return info["formats"][-1]["url"]
        raise ValueError("Could not extract stream URL from YouTube metadata.")



def main():
    target_url = sys.argv[1] if len(sys.argv) > 1 else TARGET_YOUTUBE_URL
    print(f"Resolving live stream URL for: {target_url}...")
    try:
        stream_url = extract_live_stream_url(target_url)
    except Exception as e:
        print(f"Failed to resolve YouTube live URL ({e}).")
        return

    # Load YOLOv8 nano (lightweight for CPU/GPU real-time processing)
    model = YOLO("yolov8n.pt")

    # Open stream with OpenCV
    cap = cv2.VideoCapture(stream_url)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize internal frame latency

    if not cap.isOpened():
        print("Error: Could not open stream.")
        return

    print("Stream connected. Press 'q' to quit.")

    fps_time = time.time()
    frame_count = 0
    fps = 0.0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("Stream ended or buffering... Attempting reconnect.")
            time.sleep(2)
            stream_url = extract_live_stream_url(TARGET_YOUTUBE_URL)
            cap = cv2.VideoCapture(stream_url)
            continue

        frame_count += 1

        # Calculate display FPS every 10 frames
        if frame_count % 10 == 0:
            current_time = time.time()
            fps = 10 / (current_time - fps_time)
            fps_time = current_time

        # Run inference: filter strictly to class 0 ('person')
        results = model.predict(frame, classes=[0], conf=0.35, verbose=False)
        detections = results[0].boxes
        devotee_count = len(detections)

        # Set status level and HUD color scheme based on crowd density
        if devotee_count > 40:
            status_text = "HIGH CONGESTION"
            theme_color = (95, 42, 255)  # Red / Amber alert (BGR)
        elif devotee_count > 20:
            status_text = "MODERATE DENSITY"
            theme_color = (0, 214, 255)  # Yellow caution (BGR)
        else:
            status_text = "NORMAL FLOW"
            theme_color = (255, 210, 0)  # Cyan / Blue normal (BGR)

        # Draw detected person bounding boxes
        for box in detections:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            confidence = float(box.conf[0])

            # Draw box and corner highlight
            cv2.rectangle(frame, (x1, y1), (x2, y2), theme_color, 2)
            label = f"P {confidence:.2f}"
            cv2.putText(
                frame,
                label,
                (x1, max(y1 - 6, 12)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                theme_color,
                1,
                cv2.LINE_AA,
            )

        # Render top telemetry dashboard banner
        cv2.rectangle(frame, (0, 0), (frame.shape[1], 55), (13, 20, 36), -1)
        cv2.line(frame, (0, 55), (frame.shape[1], 55), theme_color, 2)

        # Metrics text overlay
        cv2.putText(
            frame,
            f"DEVOTEES IN FRAME: {devotee_count}",
            (20, 35),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.75,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )
        cv2.putText(
            frame,
            f"STATUS: {status_text}",
            (380, 35),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            theme_color,
            2,
            cv2.LINE_AA,
        )
        cv2.putText(
            frame,
            f"FPS: {fps:.1f}",
            (frame.shape[1] - 140, 35),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (180, 180, 180),
            1,
            cv2.LINE_AA,
        )

        cv2.imshow("DarshanAI - Live CCTV Crowd Stream", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
