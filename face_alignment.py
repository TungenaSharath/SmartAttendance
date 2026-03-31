"""
Face alignment using 5-point landmarks.
Applies an affine transformation to normalise face orientation and scale
to a standard 112×112 template used by ArcFace.
"""

import cv2
import numpy as np
from skimage import transform as trans  # scikit-image is pulled in by insightface


# Standard ArcFace 112×112 alignment template (5 landmarks)
ARCFACE_DST = np.array([
    [38.2946, 51.6963],
    [73.5318, 51.5014],
    [56.0252, 71.7366],
    [41.5493, 92.3655],
    [70.7299, 92.2041],
], dtype=np.float32)


def align_face(image: np.ndarray, landmarks: np.ndarray,
               output_size: tuple[int, int] = (112, 112)) -> np.ndarray:
    """
    Align a face using a similarity transform based on 5-point landmarks.

    Args:
        image: BGR numpy array
        landmarks: Shape (5, 2) — left_eye, right_eye, nose, left_mouth, right_mouth
        output_size: Target crop size (default 112×112 for ArcFace)

    Returns:
        Aligned face crop as numpy array
    """
    landmarks = np.array(landmarks, dtype=np.float32)

    tform = trans.SimilarityTransform()
    tform.estimate(landmarks, ARCFACE_DST)
    M = tform.params[:2]

    aligned = cv2.warpAffine(image, M, output_size, borderValue=0)
    return aligned


def align_face_simple(image: np.ndarray, landmarks: np.ndarray,
                      output_size: tuple[int, int] = (112, 112)) -> np.ndarray:
    """
    Simpler alignment using only eye positions (fallback).
    Rotates and scales so that the eyes are level.
    """
    landmarks = np.array(landmarks, dtype=np.float32)
    left_eye = landmarks[0]
    right_eye = landmarks[1]

    # Angle between eyes
    dy = right_eye[1] - left_eye[1]
    dx = right_eye[0] - left_eye[0]
    angle = np.degrees(np.arctan2(dy, dx))

    # Center between eyes
    eyes_center = ((left_eye[0] + right_eye[0]) / 2,
                   (left_eye[1] + right_eye[1]) / 2)

    # Desired distance between eyes in output (roughly 35% of output width)
    desired_dist = output_size[0] * 0.35
    actual_dist = np.sqrt(dx ** 2 + dy ** 2)
    scale = desired_dist / actual_dist if actual_dist > 0 else 1.0

    M = cv2.getRotationMatrix2D(eyes_center, angle, scale)
    # Adjust translation so face is centered
    M[0, 2] += output_size[0] / 2 - eyes_center[0]
    M[1, 2] += output_size[1] * 0.4 - eyes_center[1]

    aligned = cv2.warpAffine(image, M, output_size, borderValue=0)
    return aligned
