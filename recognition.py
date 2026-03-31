"""
Face recognition — matches detected face embeddings against subject-scoped
student database using cosine similarity, and marks attendance.
"""

import numpy as np
import cv2
from sklearn.metrics.pairwise import cosine_similarity

import database as db
from face_detection import detect_faces, draw_detections
from embedding import get_embedding
from config import SIMILARITY_THRESHOLD


def compare_embeddings(query: np.ndarray, gallery: list[np.ndarray]) -> np.ndarray:
    if not gallery:
        return np.array([])
    query_2d = query.reshape(1, -1)
    gallery_2d = np.vstack(gallery)
    return cosine_similarity(query_2d, gallery_2d).flatten()


def identify_face(query_embedding: np.ndarray,
                  student_embeddings: list[dict],
                  threshold: float = SIMILARITY_THRESHOLD) -> dict:
    if not student_embeddings or query_embedding is None:
        return {"student_db_id": None, "student_code": "", "name": "Unknown",
                "confidence": 0.0, "matched": False}

    gallery = [se["embedding"] for se in student_embeddings]
    scores = compare_embeddings(query_embedding, gallery)

    best_idx = int(np.argmax(scores))
    best_score = float(scores[best_idx])

    if best_score >= threshold:
        se = student_embeddings[best_idx]
        return {
            "student_db_id": se["student_id"],
            "student_code": se["student_code"],
            "name": se["name"],
            "confidence": best_score,
            "matched": True,
        }
    return {"student_db_id": None, "student_code": "", "name": "Unknown",
            "confidence": best_score, "matched": False}


def _sanitize(val):
    """Convert numpy types to native Python for JSON serialization."""
    if isinstance(val, np.ndarray):
        return val.tolist()
    if isinstance(val, (np.float32, np.float64)):
        return float(val)
    if isinstance(val, (np.int32, np.int64)):
        return int(val)
    if isinstance(val, np.bool_):
        return bool(val)
    return val


def process_frame(image: np.ndarray, subject_id: int,
                  threshold: float = SIMILARITY_THRESHOLD) -> dict:
    """
    Full recognition pipeline on a single frame, scoped to a subject.
    """
    detections = detect_faces(image)
    student_embeddings = db.get_embeddings_by_subject(subject_id)

    names = []
    enriched = []
    for det in detections:
        result = identify_face(det["embedding"], student_embeddings, threshold)
        det.update(result)
        names.append(f'{result["name"]} ({result["confidence"]:.0%})'
                     if result["matched"] else "Unknown")
        # Strip non-serializable data and convert numpy types
        skip_keys = {"embedding", "aligned_face", "landmarks", "age", "gender"}
        det_clean = {k: _sanitize(v) for k, v in det.items()
                     if k not in skip_keys}
        enriched.append(det_clean)

    annotated = draw_detections(image, detections, names)

    return {
        "detections": enriched,
        "annotated_image": annotated,
        "count": len(detections),
    }


def mark_attendance_from_frame(session_id: int, subject_id: int,
                               image: np.ndarray,
                               threshold: float = SIMILARITY_THRESHOLD) -> dict:
    """
    Detect all faces, identify them against subject's students, and mark attendance.
    """
    result = process_frame(image, subject_id, threshold)
    marked = []
    unknown_count = 0

    for det in result["detections"]:
        if det.get("matched"):
            newly = db.mark_attendance(session_id, det["student_db_id"],
                                       det["confidence"])
            marked.append({
                "name": det["name"],
                "student_code": det["student_code"],
                "confidence": det["confidence"],
                "newly_marked": newly,
            })
        else:
            unknown_count += 1

    return {
        "marked": marked,
        "unknown_count": unknown_count,
        "total_faces": result["count"],
        "annotated_image": result["annotated_image"],
    }
