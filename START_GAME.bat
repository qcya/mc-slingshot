@echo off
chcp 65001 >nul
cd /d "%~dp0"
title MC Block Launch
echo MC方块弹射 - 请保留此窗口，关闭窗口会停止服务。
where node >nul 2>nul
if %errorlevel%==0 (
  node scripts\serve.cjs --open
  goto end
)
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 scripts\serve.py --open
) else (
  python scripts\serve.py --open
)
:end
pause
