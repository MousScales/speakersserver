@echo off
echo ========================================
echo   Starting Speakers Server
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting Token Server on port 3001...
start cmd /k "node token-server.js"

timeout /t 2 /nobreak >nul

echo Starting HTTP Server on port 8000...
start cmd /k "python -m http.server 8000"

echo.
echo ========================================
echo   Servers Started!
echo ========================================
echo   Frontend: http://localhost:8000
echo   Token Server: http://localhost:3001
echo ========================================
echo.
echo Press any key to stop all servers...
pause >nul

taskkill /F /FI "WINDOWTITLE eq *token-server.js*"
taskkill /F /FI "WINDOWTITLE eq *http.server 8000*"

