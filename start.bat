@echo off
setlocal
title SmartAttendance Startup Engine

cls
echo =====================================================================
echo           🚀 SMARTATTENDANCE - ONE-CLICK STARTUP ENGINE
echo =====================================================================
echo.
echo  [1/3] Seeding demo pilot data...
python seed_pilot.py --institution "CBIT Engineering College" --teacher "Prof. Sharma" --subject "Computer Vision & AI"

echo.
echo  [2/3] Starting FastAPI AI Backend (Port 8000)...
start "SmartAttendance-Backend" cmd /k "python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo.
echo  [3/3] Starting Vite React Frontend (Port 5173)...
start "SmartAttendance-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =====================================================================
echo  ✨ SUCCESS! Both Backend & Frontend are running in separate windows.
echo =====================================================================
echo.
echo  🌐 Frontend App  : http://localhost:5173
echo  ⚙️  Backend API   : http://localhost:8000/api/health
echo.
echo  🔑 DEMO LOGIN CREDENTIALS:
echo     - Teacher ID : FAC2026
echo     - Password   : password123
echo.
echo =====================================================================
echo.
echo  Opening http://localhost:5173 in your default browser now...
timeout /t 3 >nul
start http://localhost:5173
echo.
echo  Press any key to exit this window (Server windows will keep running).
pause >nul
