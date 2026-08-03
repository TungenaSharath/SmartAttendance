"""
Face detection using RetinaFace via InsightFace.
Detects faces, returns bounding boxes, landmarks, and detection scores.
"""

import numpy as np
import cv2
from insightface.app import FaceAnalysis
from config import MODEL_PACK, DET_SIZE, DETECTION_CONFIDENCE


# Module-level singleton
_app: FaceAnalysis | None = None


def init_detector() -> FaceAnalysis:
    """Initialize the InsightFace face analysis pipeline (detection + recognition)."""
    global _app
    if _app is not None:
        return _app
    # Enable CPU execution provider with optimized multi-threading
    providers = [("CPUExecutionProvider", {
        "intra_op_num_threads": 4,
        "inter_op_num_threads": 2
    })]
    try:
        _app = FaceAnalysis(name=MODEL_PACK, providers=providers)
    except Exception:
        _app = FaceAnalysis(name=MODEL_PACK, providers=["CPUExecutionProvider"])
    _app.prepare(ctx_id=-1, det_size=DET_SIZE)
    return _app


def detect_faces(image: np.ndarray, fast_mode: bool = False) -> list[dict]:
    """
    Detect all faces in an image.

    Args:
        image: BGR numpy array (as from cv2.imread)
        fast_mode: If True, resizes frame for rapid video detection while maintaining accuracy.

    Returns:
        List of dicts with bbox, score, landmarks, embedding.
    """
    app = init_detector()
    
    scale = 1.0
    proc_img = image
    if fast_mode:
        h, w = image.shape[:2]
        max_dim = max(h, w)
        if max_dim > 640:
            scale = 640.0 / max_dim
            proc_img = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LINEAR)
            
    faces = app.get(proc_img)

    results = []
    for face in faces:
        if face.det_score < DETECTION_CONFIDENCE:
            continue
            
        bbox = face.bbox
        landmarks = face.kps
        if scale != 1.0:
            bbox = bbox / scale
            if landmarks is not None:
                landmarks = landmarks / scale

        results.append({
            "bbox": bbox.astype(int).tolist(),
            "score": float(face.det_score),
            "landmarks": landmarks.astype(int).tolist() if landmarks is not None else None,
            "aligned_face": face.normed_embedding is not None,
            "embedding": face.normed_embedding,
            "age": getattr(face, "age", None),
            "gender": getattr(face, "gender", None),
        })

    return results


def draw_detections(image: np.ndarray, detections: list[dict],
                    names: list[str] | None = None) -> np.ndarray:
    """Draw bounding boxes and optional names on the image."""
    img = image.copy()
    for i, det in enumerate(detections):
        x1, y1, x2, y2 = det["bbox"]
        color = (0, 255, 0) if names and names[i] != "Unknown" else (0, 0, 255)
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
        label = names[i] if names else f'{det["score"]:.2f}'
        # Background for text
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
        cv2.rectangle(img, (x1, y1 - th - 10), (x1 + tw, y1), color, -1)
        cv2.putText(img, label, (x1, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    return img
