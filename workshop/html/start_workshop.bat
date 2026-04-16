@echo off
chcp 65001 >nul 2>&1
title BMS Workshop Hub - Live Server

echo.
echo  ==========================================
echo    BMS Workshop Hub - Live Server
echo  ==========================================
echo.

cd /d "%~dp0"

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found!
    echo  Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Show Node version
for /f "tokens=*" %%v in ('node -v') do echo  Node.js : %%v
echo.

:: Find available port
set PORT=7714

echo  Starting server...
echo  Workshop Hub : http://localhost:%PORT%/index_workshop.html
echo  Press Ctrl+C to stop
echo  ==========================================
echo.

:: Open browser
start "" "http://localhost:%PORT%/index_workshop.html"

:: Start live-server
npx -y live-server --port=%PORT% --no-browser --quiet

pause
