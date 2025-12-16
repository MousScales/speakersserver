@echo off
title Speakers Server - Local Development

echo ================================================
echo   SPEAKERS SERVER - Local Development Setup
echo ================================================
echo.

:: Check if config.js exists
if not exist "config.js" (
    echo [ERROR] config.js not found!
    echo.
    echo Please create config.js from config.example.js:
    echo   1. Copy config.example.js to config.js
    echo   2. Add your Supabase credentials
    echo.
    pause
    exit /b 1
)

:: Check if token-server.js exists
if not exist "token-server.js" (
    echo [ERROR] token-server.js not found!
    echo.
    echo Please create token-server.js from token-server.example.js:
    echo   1. Copy token-server.example.js to token-server.js
    echo   2. Add your LiveKit API credentials
    echo.
    pause
    exit /b 1
)

:: Check if .env exists
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo This is optional but recommended.
    echo See env.example for template.
    echo.
)

:: Temporarily rename config.production.js to use config.js
if exist "config.production.js" (
    echo [INFO] Detected config.production.js - will use local config.js instead
)

echo Starting servers...
echo.
echo [1/2] Starting LiveKit Token Server on http://localhost:3001
echo [2/2] Starting Frontend Server on http://localhost:8000
echo.
echo ================================================
echo   Servers are starting...
echo   Frontend: http://localhost:8000
echo   Token Server: http://localhost:3001
echo ================================================
echo.
echo Press Ctrl+C to stop all servers
echo.

:: Start both servers
start "LiveKit Token Server" cmd /k "node token-server.js"
timeout /t 2 /nobreak >nul
start "Frontend Server" cmd /k "python -m http.server 8000"

echo.
echo Servers started successfully!
echo Check the new terminal windows for server output.
echo.
pause

