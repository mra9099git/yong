@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 데이터 위치: %%OneDrive%%\0VibeCoding\일용할양식
if defined OneDrive (
  echo           → %OneDrive%\0VibeCoding\일용할양식
) else (
  echo [경고] OneDrive 환경변수가 없습니다. OneDrive 로그인 후 다시 실행하세요.
)

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
