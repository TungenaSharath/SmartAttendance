"""
Central configuration for the SmartAttendance System.
All tunable parameters — paths, thresholds, model settings — live here.
"""

import os
import secrets

# ── Paths ─────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
REPORT_DIR = os.path.join(BASE_DIR, "reports")
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")
DB_PATH = os.path.join(DATA_DIR, "attendance.db")

# Ensure directories exist
for d in [DATA_DIR, UPLOAD_DIR, REPORT_DIR]:
    os.makedirs(d, exist_ok=True)

# ── Model Settings ────────────────────────────────────────────────────
MODEL_PACK = os.environ.get("ARCFACE_MODEL", "buffalo_l")
DET_SIZE = (640, 640)

# ── Recognition Thresholds ────────────────────────────────────────────
SIMILARITY_THRESHOLD = float(os.environ.get("SIM_THRESHOLD", "0.45"))
DETECTION_CONFIDENCE = float(os.environ.get("DET_CONFIDENCE", "0.5"))

# ── Registration ──────────────────────────────────────────────────────
MIN_REGISTRATION_IMAGES = 1
MAX_REGISTRATION_IMAGES = 10

# ── Authentication ────────────────────────────────────────────────────
_jwt_secret_file = os.path.join(DATA_DIR, ".jwt_secret")

def _get_jwt_secret():
    """Load or create a persistent JWT secret so tokens survive restarts."""
    if os.environ.get("JWT_SECRET"):
        return os.environ["JWT_SECRET"]
    if os.path.exists(_jwt_secret_file):
        with open(_jwt_secret_file, "r") as f:
            return f.read().strip()
    secret = secrets.token_hex(32)
    with open(_jwt_secret_file, "w") as f:
        f.write(secret)
    return secret

JWT_SECRET = _get_jwt_secret()
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# ── Roles ─────────────────────────────────────────────────────────────
ROLES = ["ADMIN", "HOD", "TEACHER"]
DEFAULT_ROLE = "TEACHER"

# ── Server ────────────────────────────────────────────────────────────
HOST = "0.0.0.0"
PORT = 8000
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
