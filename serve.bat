@echo off
chcp 65001 >nul
title EduApp App (relaunch) - http://localhost:8000
cd /d "%~dp0dist"
echo.
echo   EduApp App (relaunch)
echo   http://localhost:8000
echo   Do not close this window while you are viewing the site.
echo.
start "" "http://localhost:8000/"
python "%~dp0serve.py" 8000
if errorlevel 1 (
  echo.
  echo   Server did not start: Python is not installed or port 8000 is already in use.
  echo   If the site already opens at http://localhost:8000 - everything is fine.
  pause
)
