"""
FastAPI application — REST API for the SmartAttendance Multi-Role Platform.
Mounts all module routers and serves the React frontend.
"""

import os
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Add project root to path for original face detection modules
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from app.config import HOST, PORT, CORS_ORIGINS, STATIC_DIR, TEMPLATE_DIR
from app import database as db

# Import routers
from app.auth.router import router as auth_router
from app.attendance.router import router as attendance_router
from app.attendance.staff_router import router as staff_attendance_router
from app.leave.router import router as leave_router
from app.hod.router import router as hod_router
from app.admin.router import router as admin_router
from app.analytics.router import router as analytics_router

app = FastAPI(
    title="SmartAttendance Multi-Role Platform",
    version="3.0.0",
    description="AI Face Recognition Attendance System with Teacher, HOD, and Admin portals"
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    db.init_db()
    # Lazy-load face detection model (will be loaded on first use)
    # from app.core.face_detection import init_detector
    # init_detector()


# ── Mount all routers ─────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(attendance_router)
app.include_router(staff_attendance_router)
app.include_router(leave_router)
app.include_router(hod_router)
app.include_router(admin_router)
app.include_router(analytics_router)


# ── Health check ──────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "version": "3.0.0"}


# ── Serve React frontend (production build) ───────────────────────────
_frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                              "..", "frontend", "dist")
if os.path.isdir(_frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(_frontend_dist, "assets")),
              name="frontend-assets")

    @app.get("/{full_path:path}")
    def serve_spa(request: Request, full_path: str):
        """Serve React SPA — all non-API routes return index.html."""
        # Let API routes pass through to their routers
        if full_path.startswith("api/") or full_path == "api":
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        file_path = os.path.join(_frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(_frontend_dist, "index.html"))
else:
    # Serve the legacy index.html if no React build is found
    if os.path.isdir(STATIC_DIR):
        app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    @app.get("/")
    def index():
        index_path = os.path.join(TEMPLATE_DIR, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
        return {"message": "SmartAttendance API is running. Build the React frontend for the full UI."}


# ── Run ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
