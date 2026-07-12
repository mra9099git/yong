@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules\" (
  echo node_modules가 없습니다. npm install을 먼저 실행합니다...
  call npm install
  if errorlevel 1 (
    echo npm install 실패
    pause
    exit /b 1
  )
)

echo 일용할 양식 앱 실행 중...
call npm run tauri dev

if errorlevel 1 (
  echo.
  echo 실행 중 오류가 발생했습니다.
)

pause
