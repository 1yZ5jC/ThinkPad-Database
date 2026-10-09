@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js was not found in PATH.
    pause
    exit /b 1
)

echo Starting ThinkPad Database...
call npm.cmd start

set "exitCode=%errorlevel%"

if not "%exitCode%"=="0" (
    echo.
    echo [ERROR] Server failed to start.
    pause
)
endlocal
