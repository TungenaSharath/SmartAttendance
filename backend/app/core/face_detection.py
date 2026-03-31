"""
Face detection using RetinaFace via InsightFace.
Wrapper that delegates to the original face_detection module.
"""

import sys
import os

# Add the original project root to path so we can import the original module
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

# Re-export everything from the original module
from face_detection import init_detector, detect_faces, draw_detections
