"""
Face recognition — matches detected face embeddings against subject-scoped
student database using vectorized cosine similarity, and marks attendance.
Optimized with in-memory subject embedding cache and fast matrix operations.
"""

from typing import Dict, List, Tuple, Optional, Set
import numpy as np
import cv2

import database as db
from face_detection import detect_faces, draw_detections
from config import SIMILARITY_THRESHOLD

# ── In-Memory Caches ──────────────────────────────────────────────────
_EMBEDDING_CACHE: Dict[int, Tuple[np.ndarray, List[dict]]] = {}
_MARKED_STUDENTS_CACHE: Dict[int, Set[int]] = {}


def clear_embedding_cache(subject_id: Optional[int] = None):
    """Invalidate cached embeddings for a specific subject or clear all."""
    global _EMBEDDING_CACHE
    if subject_id is None:
        _EMBEDDING_CACHE.clear()
    elif subject_id in _EMBEDDING_CACHE:
        del _EMBEDDING_CACHE[subject_id]


def clear_session_marked_cache(session_id: Optional[int] = None):
    """Clear in-memory marked attendance cache for a session."""
    global _MARKED_STUDENTS_CACHE
    if session_id is None:
        _MARKED_STUDENTS_CACHE.clear()
    elif session_id in _MARKED_STUDENTS_CACHE:
        del _MARKED_STUDENTS_CACHE[session_id]


def _get_subject_embeddings_cached(subject_id: int) -> Tuple[np.ndarray, List[dict]]:
    """
    Fetches embeddings for a subject and caches a normalized 2D numpy matrix
    alongside metadata for sub-millisecond dot-product similarity matching.
    """
    if subject_id in _EMBEDDING_CACHE:
        return _EMBEDDING_CACHE[subject_id]

    raw_embeddings = db.get_embeddings_by_subject(subject_id)
    if not raw_embeddings:
        empty_matrix = np.empty((0, 512), dtype=np.float32)
        _EMBEDDING_CACHE[subject_id] = (empty_matrix, [])
        return _EMBEDDING_CACHE[subject_id]

    gallery_list = []
    metadata_list = []
    for se in raw_embeddings:
        emb = se["embedding"].astype(np.float32)
        norm = np.linalg.norm(emb)
        if norm > 0:
            emb = emb / norm
        gallery_list.append(emb)
        metadata_list.append({
            "student_id": se["student_id"],
            "student_code": se["student_code"],
            "name": se["name"]
        })

    gallery_matrix = np.vstack(gallery_list)
    _EMBEDDING_CACHE[subject_id] = (gallery_matrix, metadata_list)
    return _EMBEDDING_CACHE[subject_id]


def identify_face_fast(query_embedding: Optional[np.ndarray],
                       subject_id: int,
                       threshold: float = SIMILARITY_THRESHOLD) -> dict:
    """
    Fast matrix dot-product face identification using cached gallery embeddings.
    """
    if query_embedding is None:
        return {"student_db_id": None, "student_code": "", "name": "Unknown",
                "confidence": 0.0, "matched": False}

    gallery_matrix, metadata = _get_subject_embeddings_cached(subject_id)
    if gallery_matrix.shape[0] == 0:
        return {"student_db_id": None, "student_code": "", "name": "Unknown",
                "confidence": 0.0, "matched": False}

    # L2 normalize query
    query_emb = query_embedding.astype(np.float32)
    norm = np.linalg.norm(query_emb)
    if norm > 0:
        query_norm = query_emb / norm
    else:
        query_norm = query_emb

    # Dot product cosine similarity: (N, 512) @ (512,) -> (N,)
    scores = np.dot(gallery_matrix, query_norm)

    best_idx = int(np.argmax(scores))
    best_score = float(scores[best_idx])

    if best_score >= threshold:
        se = metadata[best_idx]
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
                  threshold: float = SIMILARITY_THRESHOLD,
                  fast_mode: bool = True) -> dict:
    """
    Full recognition pipeline on a single frame, scoped to a subject.
    """
    detections = detect_faces(image, fast_mode=fast_mode)

    names = []
    enriched = []
    for det in detections:
        result = identify_face_fast(det["embedding"], subject_id, threshold)
        det.update(result)
        names.append(f'{result["name"]} ({result["confidence"]:.0%})'
                     if result["matched"] else "Unknown")
        
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
                               threshold: float = SIMILARITY_THRESHOLD,
                               fast_mode: bool = True) -> dict:
    """
    Detect all faces, identify them against subject's students, and mark attendance.
    Utilizes in-memory session caches to skip duplicate DB writes.
    """
    result = process_frame(image, subject_id, threshold, fast_mode=fast_mode)
    marked = []
    unknown_count = 0

    # Ensure session marked cache is warm
    if session_id not in _MARKED_STUDENTS_CACHE:
        existing_attendance = db.get_attendance(session_id)
        _MARKED_STUDENTS_CACHE[session_id] = {
            a["student_id"] for a in existing_attendance if a["status"] == "Present"
        }

    session_set = _MARKED_STUDENTS_CACHE[session_id]

    for det in result["detections"]:
        if det.get("matched"):
            student_id = det["student_db_id"]
            if student_id in session_set:
                newly = False
            else:
                newly = db.mark_attendance(session_id, student_id, det["confidence"])
                if newly:
                    session_set.add(student_id)

            marked.append({
                "student_id": student_id,
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
