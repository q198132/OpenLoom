@echo off
chcp 65001 >nul
title OpenLoom

echo ========================================
echo   OpenLoom - Web IDE
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Starting backend and frontend...
start /b cmd /c "npm run dev"

echo [2/2] Waiting for server to start...
timeout /t 5 /nobreak >nul

echo.
echo Opening browser at http://localhost:5173
start http://localhost:5173

echo.
echo OpenLoom is running. Press Ctrl+C to stop.
echo.

cmd /k
