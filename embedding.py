"""
ArcFace embedding generation via InsightFace.
Produces 512-dimensional normalised embeddings for face images.
"""

import numpy as np
from face_detection import init_detector


def get_embedding(face_obj) -> np.ndarray | None:
    """
    Extract the 512-d ArcFace embedding from an InsightFace face object.
    InsightFace's FaceAnalysis pipeline already computes embeddings
    during detection (app.get()), so this is a simple accessor.

    Args:
        face_obj: A detected face dict from face_detection.detect_faces()

    Returns:
        512-d normalised numpy array, or None if unavailable
    """
    emb = face_obj.get("embedding")
    if emb is not None:
        # Ensure L2 normalisation
        norm = np.linalg.norm(emb)
        if norm > 0:
            return emb / norm
    return emb


def compute_embedding_from_image(image: np.ndarray) -> list[np.ndarray]:
    """
    Detect faces in an image and return their embeddings.
    Convenience wrapper around the detection pipeline.

    Args:
        image: BGR numpy array

    Returns:
        List of 512-d embedding vectors (one per detected face)
    """
    app = init_detector()
    faces = app.get(image)
    embeddings = []
    for face in faces:
        if face.normed_embedding is not None:
            embeddings.append(face.normed_embedding)
    return embeddings


def compute_average_embedding(embeddings: list[np.ndarray]) -> np.ndarray:
    """
    Compute and normalise the average of multiple embeddings.
    Useful for creating a robust template from multiple registration images.
    """
    if not embeddings:
        raise ValueError("No embeddings provided")
    avg = np.mean(embeddings, axis=0)
    norm = np.linalg.norm(avg)
    if norm > 0:
        avg = avg / norm
    return avg
