@echo off
title CraftShield Runner
echo ===================================================
echo             Launching CraftShield App
echo ===================================================
echo.

echo [1/2] Starting FastAPI Backend Server...
start "CraftShield Backend" cmd /k "cd BackEnd && call venv\Scripts\activate && uvicorn app.main:app --reload"

echo [2/2] Starting React-Vite Frontend Dev Server...
start "CraftShield Frontend" cmd /k "cd FrontEnd && npm run dev"

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
