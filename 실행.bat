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
  if exist "%USERPROFILE%\.cargo\bin\cargo.exe" (
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
  )
)
where cargo >nul 2>&1
if errorlevel 1 (
  echo [오류] Rust의 cargo가 없습니다. ^(지금 보신 "program not found" 원인^)
  echo.
  echo   제가 이 Windows PC에 직접 설치할 수는 없습니다.
  echo   대신 자동 설치 스크립트를 실행해 주세요:
  echo.
  echo   → install-deps.bat  더블클릭
  echo.
  echo   끝나면 Cursor/터미널을 모두 닫았다가 다시 열고
  echo   check-tools.bat → 실행.bat 순서로 진행하세요.
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
