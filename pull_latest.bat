@echo off
setlocal
title DarshanAI - Sync Latest Changes

echo =======================================================
echo       DarshanAI - Team Repository Sync Utility        
echo =======================================================
echo.

where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed or not in PATH!
    echo Please install Git and try again.
    pause
    exit /b 1
)

echo [1/2] Fetching and syncing latest changes from GitHub (origin/main)...
git pull --autostash origin main

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to pull changes. Please check conflicts above.
    pause
    exit /b 1
)

echo.
echo [2/2] Repository is up to date! Latest commit:
git log -n 1 --oneline --decorate

echo.
echo =======================================================
echo   SUCCESS: Ready to work on DarshanAI with Antigravity!
echo =======================================================
echo.
if "%~1"=="" pause
