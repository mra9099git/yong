@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 데이터 위치: %%OneDrive%%\0VibeCoding\daily-bread\일용할양식
if defined OneDrive (
  echo           → %OneDrive%\0VibeCoding\daily-bread\일용할양식
) else (
  echo [경고] OneDrive 환경변수가 없습니다. OneDrive 로그인 후 다시 실행하세요.
)
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [오류] Node.js가 없습니다.
  echo   1^) https://nodejs.org 에서 LTS 설치
  echo   2^) 설치 후 Cursor/터미널을 모두 닫았다가 다시 열고 이 파일을 실행하세요.
  echo.
  pause
  exit /b 1
)

where cargo >nul 2>&1
if errorlevel 1 (
  echo [오류] Rust의 cargo가 없습니다. ^(지금 보신 "program not found" 원인^)
  echo.
  echo   설치 방법:
  echo   1^) https://rustup.rs 접속
  echo   2^) "rustup-init.exe" 다운로드 후 실행
  echo   3^) 기본값 그대로 Enter로 설치
  echo   4^) 설치 중 Visual Studio / C++ Build Tools 안내가 나오면 같이 설치
  echo   5^) 설치가 끝나면 Cursor와 터미널을 모두 종료했다가 다시 실행
  echo   6^) 이 폴더에서 check-tools.bat 로 확인 후 다시 실행.bat
  echo.
  echo   또는 이 폴더의 install-rust.bat 을 실행해도 됩니다.
  echo.
  pause
  exit /b 1
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
  echo cargo / Visual Studio C++ Build Tools가 필요한지 check-tools.bat 결과를 확인해 주세요.
)

pause
