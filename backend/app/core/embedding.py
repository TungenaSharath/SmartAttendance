"""
ArcFace embedding generation wrapper.
Delegates to the original embedding module.
"""

import sys
import os

_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from embedding import get_embedding, compute_embedding_from_image, compute_average_embedding
