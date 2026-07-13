@echo off
title CraftShield Runner
set "ROOT_DIR=%~dp0"
echo ===================================================
echo             Launching CraftShield App
echo ===================================================
echo.

echo [1/2] Starting FastAPI Backend Server...
start "CraftShield Backend" cmd /k "cd /d ""%ROOT_DIR%backend"" && C:\Users\assas\AppData\Local\Programs\Python\Python311\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo [2/2] Starting React-Vite Frontend Dev Server...
start "CraftShield Frontend" cmd /k "cd /d ""%ROOT_DIR%FrontEnd"" && npm run dev"

echo.
echo ===================================================
echo CraftShield is running!
echo - Backend API: http://127.0.0.1:8000
echo - Backend Swagger Docs: http://127.0.0.1:8000/docs
echo - Frontend Client Portal: http://localhost:5173
echo.
echo Close the newly opened terminal windows to stop.
echo ===================================================
pause
