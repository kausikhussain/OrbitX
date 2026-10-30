@echo off
setlocal
title ECLIPTARA — Space Intelligence Observatory

echo ==================================================
echo   ECLIPTARA — SPACE INTELLIGENCE OBSERVATORY
echo ==================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in your PATH.
    echo Node.js 18 or higher is required to run the local workstation server.
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js runtime detected.
echo Starting local workstation server on http://localhost:4173...
echo.

start "" "http://localhost:4173"
node server.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to start server.
    pause
)

