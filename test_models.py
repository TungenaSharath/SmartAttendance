"""
Test script -- Run each InsightFace model SEPARATELY and display individual output.
Uses webcam to capture a frame, then processes it through each model independently.

Models in buffalo_l:
  1. SCRFD (det_10g)     -- Face Detection
  2. ArcFace (w600k_r50) -- Face Recognition (512-d embeddings)
  3. GenderAge           -- Age & Gender estimation

Usage:
    python test_models.py
"""

import os
import sys
import time
import cv2
import numpy as np

# Force UTF-8 for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import MODEL_PACK, DET_SIZE, DETECTION_CONFIDENCE

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_output")
os.makedirs(OUTPUT_DIR, exist_ok=True)


# =====================================================================
#  UTILITY
# =====================================================================

def capture_from_webcam():
    """Capture a single frame from the default webcam."""
    print("\n[CAM] Opening webcam...")
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[ERROR] Could not open webcam!")
        sys.exit(1)

    # Let the camera warm up
    time.sleep(1)

    # Try GUI mode first, fall back to headless auto-capture
    try:
        print("[CAM] Press SPACE to capture, Q to quit...")
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[ERROR] Failed to read frame!")
                break
            cv2.imshow("Webcam - Press SPACE to capture", frame)
            key = cv2.waitKey(1) & 0xFF
            if key == ord(' '):
                print("[OK] Frame captured!")
                cap.release()
                cv2.destroyAllWindows()
                return frame
            elif key == ord('q'):
                cap.release()
                cv2.destroyAllWindows()
                print("[CANCEL] Capture cancelled.")
                sys.exit(0)
    except cv2.error:
        # No GUI available -- auto-capture
        print("[CAM] No GUI available, auto-capturing frame...")
        for _ in range(10):
            ret, frame = cap.read()
            time.sleep(0.1)
        if ret and frame is not None:
            print("[OK] Frame auto-captured!")
            cap.release()
            return frame
        print("[ERROR] Failed to capture frame!")

    cap.release()
    try:
        cv2.destroyAllWindows()
    except cv2.error:
        pass
    sys.exit(1)


def print_separator(title):
    """Print a styled separator."""
    width = 70
    print("\n" + "=" * width)
    print("  " + title)
    print("=" * width)


def print_face_box(label, items):
    """Print face results in a nice box."""
    max_key = max(len(k) for k in items.keys())
    print("  +-- {} {}".format(label, "-" * (50 - len(label))))
    for k, v in items.items():
        print("  |  {:<{}} : {}".format(k, max_key, v))
    print("  +" + "-" * 55)


# =====================================================================
#  MODEL 1: SCRFD -- Face Detection
# =====================================================================

def run_detection(image):
    """
    Run ONLY the detection model (SCRFD).
    Returns detected face objects, annotated image, and time taken.
    """
    from insightface.app import FaceAnalysis

    print_separator("MODEL 1: SCRFD -- Face Detection")
    print("  Input image size: {}x{}".format(image.shape[1], image.shape[0]))
    print("  Detection size:   {}".format(DET_SIZE))
    print("  Confidence threshold: {}".format(DETECTION_CONFIDENCE))
    print()

    # Load only the detection model
    app = FaceAnalysis(name=MODEL_PACK, providers=["CPUExecutionProvider"],
                       allowed_modules=["detection"])
    app.prepare(ctx_id=-1, det_size=DET_SIZE)

    t0 = time.time()
    faces = app.get(image)
    elapsed = (time.time() - t0) * 1000

    # Filter by confidence
    faces = [f for f in faces if f.det_score >= DETECTION_CONFIDENCE]

    print("  [TIME]  Detection time: {:.1f} ms".format(elapsed))
    print("  [FACE]  Faces detected: {}".format(len(faces)))
    print()

    # Annotate image
    annotated = image.copy()
    for i, face in enumerate(faces):
        x1, y1, x2, y2 = face.bbox.astype(int)
        score = float(face.det_score)

        # Draw bounding box
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # Draw label
        label = "Face {}: {:.1%}".format(i+1, score)
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        cv2.rectangle(annotated, (x1, y1 - th - 10), (x1 + tw + 5, y1), (0, 255, 0), -1)
        cv2.putText(annotated, label, (x1 + 2, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

        # Draw 5-point landmarks
        if face.kps is not None:
            colors = [(255, 0, 0), (0, 0, 255), (0, 255, 255), (255, 0, 255), (255, 255, 0)]
            for j, (pt, color) in enumerate(zip(face.kps.astype(int), colors)):
                cv2.circle(annotated, tuple(pt), 4, color, -1)

        # Print results
        items = {
            "Bounding Box": "[{}, {}, {}, {}]".format(x1, y1, x2, y2),
            "Box Size": "{}x{} px".format(x2-x1, y2-y1),
            "Confidence": "{:.4f} ({:.1%})".format(score, score),
            "Landmarks": "5 keypoints detected" if face.kps is not None else "None",
        }
        if face.kps is not None:
            for j, (name, pt) in enumerate(zip(
                ["Left Eye", "Right Eye", "Nose", "Left Mouth", "Right Mouth"],
                face.kps.astype(int)
            )):
                items["  > " + name] = "({}, {})".format(pt[0], pt[1])

        print_face_box("Face {}".format(i+1), items)

    # Save output
    out_path = os.path.join(OUTPUT_DIR, "1_detection.jpg")
    cv2.imwrite(out_path, annotated)
    print("\n  [SAVE] Saved: {}".format(out_path))

    return faces, annotated, elapsed


# =====================================================================
#  MODEL 2: ArcFace -- Face Recognition (Embeddings)
# =====================================================================

def run_recognition(image):
    """
    Run detection + recognition model (ArcFace) to get 512-d embeddings.
    """
    from insightface.app import FaceAnalysis

    print_separator("MODEL 2: ArcFace -- Face Recognition")
    print("  Embedding dimension: 512")
    print()

    # Load detection + recognition
    app = FaceAnalysis(name=MODEL_PACK, providers=["CPUExecutionProvider"],
                       allowed_modules=["detection", "recognition"])
    app.prepare(ctx_id=-1, det_size=DET_SIZE)

    t0 = time.time()
    faces = app.get(image)
    elapsed = (time.time() - t0) * 1000

    faces = [f for f in faces if f.det_score >= DETECTION_CONFIDENCE]

    print("  [TIME]  Recognition time: {:.1f} ms".format(elapsed))
    print("  [FACE]  Faces with embeddings: {}".format(
        sum(1 for f in faces if f.normed_embedding is not None)))
    print()

    annotated = image.copy()
    embeddings_list = []

    for i, face in enumerate(faces):
        x1, y1, x2, y2 = face.bbox.astype(int)
        emb = face.normed_embedding

        # Draw box
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (255, 165, 0), 2)

        if emb is not None:
            norm = float(np.linalg.norm(emb))
            mean_val = float(np.mean(emb))
            std_val = float(np.std(emb))
            min_val = float(np.min(emb))
            max_val = float(np.max(emb))

            label = "Face {}: emb norm={:.3f}".format(i+1, norm)
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated, (x1, y1 - th - 10), (x1 + tw + 5, y1), (255, 165, 0), -1)
            cv2.putText(annotated, label, (x1 + 2, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

            items = {
                "Embedding Shape": str(emb.shape),
                "L2 Norm": "{:.6f}".format(norm),
                "Mean": "{:.6f}".format(mean_val),
                "Std Dev": "{:.6f}".format(std_val),
                "Min / Max": "{:.4f} / {:.4f}".format(min_val, max_val),
                "First 10 values": str(np.round(emb[:10], 4).tolist()),
            }
            print_face_box("Face {} Embedding".format(i+1), items)
            embeddings_list.append(emb)
        else:
            print("  [WARN] Face {}: No embedding extracted".format(i+1))

    # If multiple faces, show pairwise similarity
    if len(embeddings_list) >= 2:
        from sklearn.metrics.pairwise import cosine_similarity
        print("\n  [SIMILARITY] Pairwise Cosine Similarity:")
        for a in range(len(embeddings_list)):
            for b in range(a + 1, len(embeddings_list)):
                sim = cosine_similarity(
                    embeddings_list[a].reshape(1, -1),
                    embeddings_list[b].reshape(1, -1)
                )[0][0]
                print("     Face {} <-> Face {}: {:.4f} ({:.1%})".format(a+1, b+1, sim, sim))

    out_path = os.path.join(OUTPUT_DIR, "2_recognition.jpg")
    cv2.imwrite(out_path, annotated)
    print("\n  [SAVE] Saved: {}".format(out_path))

    return faces, annotated, elapsed


# =====================================================================
#  MODEL 3: GenderAge -- Age & Gender Estimation
# =====================================================================

def run_genderage(image):
    """
    Run detection + genderage model for age/gender estimation.
    """
    from insightface.app import FaceAnalysis

    print_separator("MODEL 3: GenderAge -- Age & Gender Estimation")
    print()

    # Load detection + genderage
    app = FaceAnalysis(name=MODEL_PACK, providers=["CPUExecutionProvider"],
                       allowed_modules=["detection", "genderage"])
    app.prepare(ctx_id=-1, det_size=DET_SIZE)

    t0 = time.time()
    faces = app.get(image)
    elapsed = (time.time() - t0) * 1000

    faces = [f for f in faces if f.det_score >= DETECTION_CONFIDENCE]

    print("  [TIME]  GenderAge time: {:.1f} ms".format(elapsed))
    print("  [FACE]  Faces analyzed: {}".format(len(faces)))
    print()

    annotated = image.copy()

    for i, face in enumerate(faces):
        x1, y1, x2, y2 = face.bbox.astype(int)
        age = getattr(face, "age", None)
        gender = getattr(face, "gender", None)

        gender_str = "Male" if gender == 1 else "Female" if gender == 0 else "Unknown"
        gender_sym = "(M)" if gender == 1 else "(F)" if gender == 0 else "(?)"

        # Draw box with gender-colored border
        color = (255, 100, 100) if gender == 1 else (100, 100, 255) if gender == 0 else (200, 200, 200)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

        label = "{}, Age: {}".format(gender_str, age) if age is not None else "No prediction"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        cv2.rectangle(annotated, (x1, y1 - th - 10), (x1 + tw + 5, y1), color, -1)
        cv2.putText(annotated, label, (x1 + 2, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        items = {
            "Gender": "{} {} (raw={})".format(gender_sym, gender_str, gender),
            "Age": "{} years".format(age) if age is not None else "Not available",
        }
        print_face_box("Face {} Attributes".format(i+1), items)

    out_path = os.path.join(OUTPUT_DIR, "3_genderage.jpg")
    cv2.imwrite(out_path, annotated)
    print("\n  [SAVE] Saved: {}".format(out_path))

    return faces, annotated, elapsed


# =====================================================================
#  COMBINED -- All Models Together (for comparison)
# =====================================================================

def run_combined(image):
    """
    Run ALL models together (the default FaceAnalysis pipeline) for comparison.
    """
    from insightface.app import FaceAnalysis

    print_separator("COMBINED: All Models Together (Full Pipeline)")
    print()

    app = FaceAnalysis(name=MODEL_PACK, providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=DET_SIZE)

    t0 = time.time()
    faces = app.get(image)
    elapsed = (time.time() - t0) * 1000

    faces = [f for f in faces if f.det_score >= DETECTION_CONFIDENCE]

    print("  [TIME]  Combined time: {:.1f} ms".format(elapsed))
    print("  [FACE]  Total faces:   {}".format(len(faces)))
    print()

    annotated = image.copy()

    for i, face in enumerate(faces):
        x1, y1, x2, y2 = face.bbox.astype(int)
        score = float(face.det_score)
        age = getattr(face, "age", None)
        gender = getattr(face, "gender", None)
        emb = face.normed_embedding

        gender_str = "M" if gender == 1 else "F" if gender == 0 else "?"

        # Draw box
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # Draw landmarks
        if face.kps is not None:
            for pt in face.kps.astype(int):
                cv2.circle(annotated, tuple(pt), 3, (0, 255, 255), -1)

        # Label
        line1 = "Face {} ({:.0%})".format(i+1, score)
        line2 = "{}, {}y".format(gender_str, age) if age else ""
        line3 = "emb={}".format("Yes" if emb is not None else "No")
        label = "{} | {} | {}".format(line1, line2, line3)

        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(annotated, (x1, y1 - th - 10), (x1 + tw + 5, y1), (0, 255, 0), -1)
        cv2.putText(annotated, label, (x1 + 2, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

        items = {
            "Detection": "Score={:.4f}, Box=[{},{},{},{}]".format(score, x1, y1, x2, y2),
            "Recognition": "Embedding={}".format("512-d vector" if emb is not None else "None"),
            "Age/Gender": "{}, {} years".format(gender_str, age) if age else "Not available",
        }
        print_face_box("Face {} -- All Models".format(i+1), items)

    out_path = os.path.join(OUTPUT_DIR, "4_combined.jpg")
    cv2.imwrite(out_path, annotated)
    print("\n  [SAVE] Saved: {}".format(out_path))

    return faces, annotated, elapsed


# =====================================================================
#  MAIN
# =====================================================================

def main():
    print("+-----------------------------------------------------------+")
    print("|   InsightFace Model Tester -- Individual Model Output     |")
    print("|   Model Pack: %-42s|" % MODEL_PACK)
    print("+-----------------------------------------------------------+")

    # Capture from webcam
    image = capture_from_webcam()

    # Save original
    orig_path = os.path.join(OUTPUT_DIR, "0_original.jpg")
    cv2.imwrite(orig_path, image)
    print("\n  [SAVE] Original saved: {}".format(orig_path))

    # Run each model separately
    timings = {}

    _, det_img, t1 = run_detection(image)
    timings["Detection (SCRFD)"] = t1

    _, rec_img, t2 = run_recognition(image)
    timings["Recognition (ArcFace)"] = t2

    _, ga_img, t3 = run_genderage(image)
    timings["GenderAge"] = t3

    _, comb_img, t4 = run_combined(image)
    timings["Combined (All)"] = t4

    # -- Summary --
    print_separator("TIMING SUMMARY")
    total_sep = t1 + t2 + t3
    print("\n  {:<25} {:>10}".format("Model", "Time (ms)"))
    print("  " + "-" * 36)
    for name, t in timings.items():
        bar = "#" * int(t / max(timings.values()) * 20)
        print("  {:<25} {:>8.1f}ms  {}".format(name, t, bar))
    print("  " + "-" * 36)
    print("  {:<25} {:>8.1f}ms".format("Sum (separate)", total_sep))
    print("  {:<25} {:>8.1f}ms".format("Combined pipeline", t4))
    if total_sep > 0:
        ratio = total_sep / t4
        word = "slower" if total_sep > t4 else "faster"
        print("\n  Pipeline is {:.1f}x {} than combined".format(ratio, word))

    # Show all outputs side-by-side
    print("\n  [OUTPUT] All outputs saved to: {}".format(OUTPUT_DIR))
    print("     0_original.jpg     -- Original captured frame")
    print("     1_detection.jpg    -- SCRFD detection output")
    print("     2_recognition.jpg  -- ArcFace embedding output")
    print("     3_genderage.jpg    -- GenderAge output")
    print("     4_combined.jpg     -- All models combined")

    # Display in OpenCV windows (skip if no GUI)
    try:
        print("\n  [VIEW] Displaying results. Press any key to close...")

        # Resize for display
        h, w = image.shape[:2]
        scale = min(400 / w, 400 / h)
        size = (int(w * scale), int(h * scale))

        cv2.imshow("1. Detection (SCRFD)", cv2.resize(det_img, size))
        cv2.imshow("2. Recognition (ArcFace)", cv2.resize(rec_img, size))
        cv2.imshow("3. GenderAge", cv2.resize(ga_img, size))
        cv2.imshow("4. Combined", cv2.resize(comb_img, size))
        cv2.waitKey(0)
        cv2.destroyAllWindows()
    except cv2.error:
        print("\n  [INFO] No GUI available, skipping display windows.")
        print("         Open the output images from the test_output folder.")

    print("\n[DONE] All models tested successfully!")


if __name__ == "__main__":
    main()
