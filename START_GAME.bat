@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Starting Pixel Siege locally on http://127.0.0.1:8765
start "" "http://127.0.0.1:8765"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -m http.server 8765 --bind 127.0.0.1
) else (
  python -m http.server 8765 --bind 127.0.0.1
)
pause
