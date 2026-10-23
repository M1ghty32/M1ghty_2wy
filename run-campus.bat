@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".tools\godot\Godot_v4.3-stable_win64.exe" (
  echo Godot ÒýÇæ²»´æÔÚ£º.tools\godot\
  pause
  exit /b 1
)
start "" ".tools\godot\Godot_v4.3-stable_win64.exe" --path "city-twin\godot" --resolution 1600x900
