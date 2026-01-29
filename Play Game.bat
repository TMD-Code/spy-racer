@echo off
echo Starting Spy Racer...
echo.
cd /d "%~dp0"

:: Check if node_modules exists, install if not
if not exist "node_modules\" (
    echo Installing dependencies...
    npm install
    echo.
)

echo The game will open in your browser at http://localhost:5173
echo Press Ctrl+C in this window to stop the server when done.
echo.
timeout /t 2 >nul
start "" http://localhost:5173
npm run dev
