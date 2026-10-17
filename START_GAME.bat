@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title MC Block Launch
set "MC_LAUNCH_OPEN=--open"
if /i "%~1"=="--no-open" set "MC_LAUNCH_OPEN="
echo MC Block Launch - Starting game. Keep this window open.
if exist "%~dp0runtime\node.exe" goto bundled
where node >nul 2>nul
if errorlevel 1 goto trypy
node -e "require('http')" >nul 2>nul
if not errorlevel 1 goto systemnode
:trypy
where py >nul 2>nul
if errorlevel 1 goto trypython
py -3 -c "import http.server" >nul 2>nul
if not errorlevel 1 goto pylauncher
:trypython
for %%P in (python.exe) do set "MC_PYTHON=%%~$PATH:P"
if not defined MC_PYTHON goto missing
set "MC_PYTHON_CHECK=%MC_PYTHON:\WindowsApps\=%"
if not "%MC_PYTHON_CHECK%"=="%MC_PYTHON%" goto missing
"%MC_PYTHON%" -c "import http.server" >nul 2>nul
if not errorlevel 1 goto systempython
:missing
echo.
echo [START FAILED] No working Node.js or Python was found.
echo Please download the Windows player package and extract the entire ZIP.
echo The player package includes runtime\node.exe. Do not open index.html directly.
if exist "%~dp0scripts\launcher-help.txt" type "%~dp0scripts\launcher-help.txt"
echo.
pause
exit /b 1
:bundled
echo Using bundled runtime.
"%~dp0runtime\node.exe" "%~dp0scripts\serve.cjs" %MC_LAUNCH_OPEN%
goto stopped
:systemnode
node "%~dp0scripts\serve.cjs" %MC_LAUNCH_OPEN%
goto stopped
:pylauncher
py -3 "%~dp0scripts\serve.py" %MC_LAUNCH_OPEN%
goto stopped
:systempython
"%MC_PYTHON%" "%~dp0scripts\serve.py" %MC_LAUNCH_OPEN%
:stopped
set "MC_LAUNCH_EXIT=%errorlevel%"
echo.
echo Server stopped. If the game did not open, capture the error above.
pause
exit /b %MC_LAUNCH_EXIT%
