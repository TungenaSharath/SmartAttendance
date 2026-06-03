@echo off
setlocal
title Smart Attendance Server

:: Find dynamically active IPv4 Address
for /f "tokens=14" %%i in ('ipconfig ^| findstr /i "IPv4"') do set LOCAL_IP=%%i

echo.
echo ========================================================
echo        SMART ATTENDANCE SYSTEM - STARTUP SCRIPT
echo ========================================================
echo.
echo Please leave this black window open. If you close it, 
echo the Attendance System will stop working.
echo.
echo --------------------------------------------------------
echo To open the system on your LAPTOP browser, click here:
echo -^> https://localhost:8000
echo.
echo To open the system on your PHONE browser (Same WiFi):
echo -^> https://%LOCAL_IP%:8000
echo --------------------------------------------------------
echo.
echo Starting the server now and opening browser...

:: Open user's default web browser
start https://localhost:8000

:: Run the FastAPI Uvicorn Server (Multi-Role Platform)
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --ssl-certfile ../certs/cert.pem --ssl-keyfile ../certs/key.pem

pause
