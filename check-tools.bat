@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================
echo  일용할 양식 — 도구 / OneDrive 점검
echo ========================================
echo.

set FAIL=0

where node >nul 2>&1
if errorlevel 1 (
  echo [X] Node.js 없음  — https://nodejs.org 에서 LTS 설치
  set FAIL=1
) else (
  for /f "delims=" %%v in ('node -v') do echo [OK] Node.js %%v
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [X] npm 없음
  set FAIL=1
) else (
  for /f "delims=" %%v in ('npm -v') do echo [OK] npm %%v
)

where rustc >nul 2>&1
if errorlevel 1 (
  echo [X] Rust(rustc) 없음  — https://rustup.rs 에서 설치
  set FAIL=1
) else (
  for /f "delims=" %%v in ('rustc --version') do echo [OK] %%v
)

where cargo >nul 2>&1
if errorlevel 1 (
  echo [X] cargo 없음
  set FAIL=1
) else (
  for /f "delims=" %%v in ('cargo --version') do echo [OK] %%v
)

echo.
echo --- OneDrive / 폴더 ---

if defined OneDrive (
  echo [OK] OneDrive=%OneDrive%
  set "OD=%OneDrive%"
) else if defined OneDriveConsumer (
  echo [OK] OneDriveConsumer=%OneDriveConsumer%
  set "OD=%OneDriveConsumer%"
) else (
  echo [X] OneDrive 환경변수 없음 — OneDrive 로그인 필요
  set FAIL=1
  set "OD=%USERPROFILE%\OneDrive"
)

set "VIBE=%OD%\0VibeCoding"
set "APP=%VIBE%\daily-bread"
set "DATA=%VIBE%\일용할양식"

if exist "%VIBE%\" (
  echo [OK] 앱 작업 폴더 상위: %VIBE%
) else (
  echo [!] 없음: %VIBE%  — 폴더를 만들면 됩니다
)

if exist "%APP%\" (
  echo [OK] 앱 코드: %APP%
) else (
  echo [!] 없음: %APP%  — 여기에 저장소를 clone 하세요
)

if exist "%DATA%\" (
  echo [OK] 데이터: %DATA%
) else (
  echo [!] 없음: %DATA%  — 앱 첫 실행 시 자동 생성됩니다
)

echo.
if "!FAIL!"=="1" (
  echo 결과: 설치가 필요한 항목이 있습니다.
) else (
  echo 결과: 기본 도구는 준비된 것 같습니다.
  echo 다음: %APP% 에서 npm install ^& npm run tauri dev
  echo       또는 실행.bat
)

echo.
pause
endlocal
