@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================
echo  일용할 양식 — 필수 도구 자동 설치
echo ========================================
echo.
echo Node.js / Rust / C++ Build Tools 를 설치합니다.
echo 관리자 권한이 필요할 수 있습니다. 잠시 기다려 주세요.
echo.

cd /d "%~dp0"
set FAIL=0

where winget >nul 2>&1
if errorlevel 1 (
  echo [안내] winget이 없습니다. Rust는 직접 다운로드로 설치합니다.
  set HAS_WINGET=0
) else (
  set HAS_WINGET=1
  echo [OK] winget 사용 가능
)

echo.
echo --- 1/3 Node.js ---
where node >nul 2>&1
if errorlevel 1 (
  if "!HAS_WINGET!"=="1" (
    echo Node.js LTS 설치 중...
    winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
      echo [X] Node.js 설치 실패 — https://nodejs.org 에서 직접 설치해 주세요.
      set FAIL=1
    ) else (
      echo [OK] Node.js 설치 요청 완료
    )
  ) else (
    echo [X] Node.js 없음. https://nodejs.org 에서 LTS를 설치해 주세요.
    start "" "https://nodejs.org"
    set FAIL=1
  )
) else (
  for /f "delims=" %%v in ('node -v') do echo [OK] 이미 설치됨: Node.js %%v
)

echo.
echo --- 2/3 Rust (cargo) ---
where cargo >nul 2>&1
if errorlevel 1 (
  if "!HAS_WINGET!"=="1" (
    echo Rustup 설치 중...
    winget install -e --id Rustlang.Rustup --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
      echo winget 실패 → rustup-init 직접 다운로드로 재시도합니다...
      call :InstallRustupDirect
    ) else (
      echo [OK] Rustup 설치 요청 완료
    )
  ) else (
    call :InstallRustupDirect
  )
) else (
  for /f "delims=" %%v in ('cargo --version') do echo [OK] 이미 설치됨: %%v
)

echo.
echo --- 3/3 Visual Studio C++ Build Tools ---
if "!HAS_WINGET!"=="1" (
  echo C++ Build Tools 설치 중 ^(시간이 꽤 걸릴 수 있습니다^)...
  winget install -e --id Microsoft.VisualStudio.2022.BuildTools --accept-package-agreements --accept-source-agreements --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
  if errorlevel 1 (
    echo [!] Build Tools 자동 설치 실패 가능.
    echo     https://visualstudio.microsoft.com/visual-cpp-build-tools/ 에서
    echo     "Desktop development with C++" 를 설치해 주세요.
  ) else (
    echo [OK] Build Tools 설치 요청 완료
  )
) else (
  echo [!] winget 없음 — Build Tools는 수동 설치가 필요합니다.
  echo     https://visualstudio.microsoft.com/visual-cpp-build-tools/
  start "" "https://visualstudio.microsoft.com/visual-cpp-build-tools/"
)

echo.
echo ========================================
echo  설치 요청이 끝났습니다.
echo ========================================
echo.
echo ★ 중요: Cursor와 모든 터미널/CMD 창을 완전히 닫았다가
echo   다시 연 다음, 이 폴더에서 아래를 실행하세요.
echo.
echo   1^) check-tools.bat
echo   2^) 실행.bat
echo.
if "!FAIL!"=="1" (
  echo 일부 항목은 수동 설치가 필요할 수 있습니다.
)
pause
endlocal
exit /b 0

:InstallRustupDirect
echo rustup-init.exe 다운로드 중...
set "RUSTUP=%TEMP%\rustup-init.exe"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { Invoke-WebRequest -Uri 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe' -OutFile '%RUSTUP%'; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  echo [X] 다운로드 실패. https://rustup.rs 를 엽니다.
  start "" "https://rustup.rs"
  set FAIL=1
  exit /b 1
)
echo rustup 기본 설치 실행 중...
"%RUSTUP%" -y
if errorlevel 1 (
  echo [X] rustup 설치 실패
  set FAIL=1
  exit /b 1
)
echo [OK] rustup 설치 완료
rem 현재 창 PATH에 cargo 반영 시도
if exist "%USERPROFILE%\.cargo\bin\cargo.exe" (
  set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
)
exit /b 0
