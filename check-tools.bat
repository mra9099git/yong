@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================
echo  일용할 양식 — 도구 / OneDrive 점검
echo ========================================
echo.

set FAIL=0

if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
if exist "%LocalAppData%\Programs\Git\cmd\git.exe" set "PATH=%LocalAppData%\Programs\Git\cmd;%PATH%"
if exist "%USERPROFILE%\.cargo\bin\cargo.exe" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

where git >nul 2>&1
if errorlevel 1 (
  echo [X] Git 없음  — install-deps.bat 실행 또는 https://git-scm.com/download/win
  set FAIL=1
) else (
  for /f "delims=" %%v in ('git --version') do echo [OK] %%v
)

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

set "APP=%~dp0"
set "DATA=%OD%\0VibeCoding\DailyBread\데이터"

if exist "%APP%\" (
  echo [OK] 로컬 앱 소스: %APP%
) else (
  echo [X] 로컬 앱 소스를 찾을 수 없습니다: %APP%
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
  echo 다음: 개발실행.bat
)

echo.
pause
endlocal
