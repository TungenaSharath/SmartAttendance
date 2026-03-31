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
    _app = FaceAnalysis(name=MODEL_PACK, providers=["CPUExecutionProvider"])
    _app.prepare(ctx_id=-1, det_size=DET_SIZE)
    return _app


def detect_faces(image: np.ndarray) -> list[dict]:
    """
    Detect all faces in an image.

    Args:
        image: BGR numpy array (as from cv2.imread)

    Returns:
        List of dicts, each with:
            - bbox: [x1, y1, x2, y2]
            - score: detection confidence
            - landmarks: 5 keypoints (2 eyes, nose, 2 mouth corners)
            - aligned_face: 112×112 aligned crop (ready for embedding)
            - embedding: 512-d normalised embedding
    """
    app = init_detector()
    faces = app.get(image)

    results = []
    for face in faces:
        if face.det_score < DETECTION_CONFIDENCE:
            continue
        results.append({
            "bbox": face.bbox.astype(int).tolist(),
            "score": float(face.det_score),
            "landmarks": face.kps.astype(int).tolist() if face.kps is not None else None,
            "aligned_face": face.normed_embedding is not None,  # boolean flag
            "embedding": face.normed_embedding,  # 512-d vector or None
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
