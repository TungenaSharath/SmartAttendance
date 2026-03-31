@echo off
title Smart Attendance Server
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
echo -^> https://192.168.31.234:8000
echo --------------------------------------------------------
echo.
echo Starting the server now...
echo.

:: Run the FastAPI Uvicorn Server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --ssl-certfile certs/cert.pem --ssl-keyfile certs/key.pem

:: If the server crashes or stops, keep the window open to show the error
pause
