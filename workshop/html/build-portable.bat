@echo off
chcp 65001 >nul 2>&1
title BMS Workshop - Build Portable

echo.
echo  ==========================================
echo    Build BMS Workshop Portable
echo  ==========================================
echo.

cd /d "%~dp0"

set DIST=dist\BMS-Workshop
set VER=1.0.0

:: Clean
if exist dist rmdir /S /Q dist
mkdir "%DIST%"

echo  Copying files...

:: Copy HTML files
for %%f in (*.html) do copy "%%f" "%DIST%\" >nul

:: Copy server files
copy server.js "%DIST%\" >nul
copy launcher.js "%DIST%\" >nul
copy package.json "%DIST%\" >nul

:: Copy node_modules (only pg)
xcopy node_modules "%DIST%\node_modules" /E /I /Q >nul

:: Create start batch
(
echo @echo off
echo chcp 65001 ^>nul 2^>^&1
echo title BMS Workshop v%VER%
echo cd /d "%%~dp0"
echo.
echo :: Check Node.js
echo where node ^>nul 2^>^&1
echo if %%errorlevel%% neq 0 ^(
echo     echo  [ERROR] Node.js not found!
echo     echo  Please install Node.js from https://nodejs.org
echo     pause
echo     exit /b 1
echo ^)
echo.
echo :: Set PG defaults
echo set PG_HOST=localhost
echo set PG_PORT=5432
echo set PG_DATABASE=hosxp_05463
echo set PG_USER=sa
echo set PG_PASSWORD=sa
echo set API_PORT=7714
echo.
echo node launcher.js
echo pause
) > "%DIST%\BMS-Workshop.bat"

:: Count files
set /a count=0
for %%f in (%DIST%\*) do set /a count+=1
for /f %%a in ('dir /S /A-D /B "%DIST%\node_modules" 2^>nul ^| find /c /v ""') do set modules=%%a

echo.
echo  ==========================================
echo    Build Complete!
echo  ==========================================
echo.
echo  Output : %DIST%\
echo  Files  : %count% app files + %modules% module files
echo.
echo  To distribute:
echo    1. Zip the "%DIST%" folder
echo    2. User needs Node.js installed
echo    3. Double-click BMS-Workshop.bat to start
echo.
pause
