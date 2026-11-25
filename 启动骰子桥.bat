@echo off
chcp 65001 >nul
title COC Dice Bridge
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found in PATH.
  echo Install Node.js, or run bridge.js with the full path to node.exe
  pause
  exit /b 1
)
echo Starting bridge ... keep this window OPEN while playing.
echo.
node bridge.js
echo.
echo Bridge stopped. Press any key to close.
pause >nul
