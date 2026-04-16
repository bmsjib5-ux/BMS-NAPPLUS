@echo off
chcp 65001 >nul 2>&1
title BMS Workshop - REST API Server

echo.
echo  ==========================================
echo    BMS Workshop - REST API Server
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

for /f "tokens=*" %%v in ('node -v') do echo  Node.js : %%v

:: Install pg module if needed
if not exist "node_modules\pg" (
    echo.
    echo  Installing pg module...
    npm install pg --save
    echo.
)

:: ==========================================
::  PostgreSQL Connection Config
::  Edit these values to match your database
:: ==========================================
set PG_HOST=localhost
set PG_PORT=5432
set PG_DATABASE=hosxp_05463
set PG_USER=sa
set PG_PASSWORD=sa

:: API Server Port
set API_PORT=7714

echo.
echo  Checking port %API_PORT%...
:: Kill any existing process on the port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%API_PORT% " ^| findstr "LISTENING"') do (
    echo  Killing existing process PID %%a on port %API_PORT%
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo  Starting server...
echo  Workshop Hub : http://localhost:%API_PORT%/index_workshop.html
echo  API Endpoint : http://localhost:%API_PORT%/api/sql
echo  PostgreSQL   : %PG_USER%@%PG_HOST%:%PG_PORT%/%PG_DATABASE%
echo  ==========================================
echo.

:: Open browser after short delay
start "" /B cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:%API_PORT%/index_workshop.html"

:: Start unified server (serves static files + API on same port)
node server.js

pause
