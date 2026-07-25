@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo ========================================
echo  일용할 양식 — 최신 코드 받기 (git pull)
echo ========================================
echo.
echo 폴더: %CD%
echo.

if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
if exist "%LocalAppData%\Programs\Git\cmd\git.exe" set "PATH=%LocalAppData%\Programs\Git\cmd;%PATH%"

where git >nul 2>&1
if errorlevel 1 (
  echo [오류] Git이 없습니다.
  echo   https://git-scm.com/download/win 에서 설치한 뒤
  echo   이 창을 닫고 다시 실행하세요.
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('git --version') do echo [OK] %%v
echo.

rem 작업 브랜치로 맞춘 뒤 pull (로컬 package-lock 충돌은 안전하게 되돌림)
set "BRANCH=cursor/daily-bread-app-a456"

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [오류] 여기가 Git 저장소가 아닙니다.
  echo   새PC설치.md 의 clone 안내를 먼저 따라 주세요.
  echo.
  pause
  exit /b 1
)

echo 원격 정보 가져오는 중...
git fetch origin
if errorlevel 1 (
  echo [오류] git fetch 실패. 인터넷 / GitHub 로그인을 확인해 주세요.
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%b in ('git branch --show-current 2^>nul') do set "CUR=%%b"
echo 현재 브랜치: !CUR!
echo 목표 브랜치: %BRANCH%
echo.

if /I not "!CUR!"=="%BRANCH%" (
  echo 브랜치 전환 중...
  git checkout -- package-lock.json 2>nul
  git checkout "%BRANCH%"
  if errorlevel 1 (
    echo 로컬에 브랜치가 없으면 원격에서 만듭니다...
    git checkout -B "%BRANCH%" "origin/%BRANCH%"
    if errorlevel 1 (
      echo [오류] 브랜치 전환 실패.
      echo   로컬 변경이 있으면 저장해 두었는지 확인해 주세요.
      echo.
      pause
      exit /b 1
    )
  )
)

echo 최신 코드 받는 중...
git pull --ff-only origin "%BRANCH%"
if errorlevel 1 (
  echo.
  echo [!] 빠른 병합(pull)에 실패했습니다. 재시도합니다...
  git checkout -- package-lock.json 2>nul
  git pull origin "%BRANCH%"
  if errorlevel 1 (
    echo [오류] git pull 실패.
    echo   메시지 전체를 복사해 두었다가 물어보면 됩니다.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo ========================================
echo  업데이트 완료
echo ========================================
echo.
echo 다음: 개발실행.bat  더블클릭
echo.
pause
endlocal
