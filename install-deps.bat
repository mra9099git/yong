@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================
echo  일용할 양식 — 필수 도구 자동 설치
echo ========================================
echo.
echo 이미 있는 도구는 건너뛰고, 없는 것만 설치합니다.
echo 관리자 권한이 필요할 수 있습니다.
echo.

cd /d "%~dp0"
set FAIL=0
set DID_INSTALL=0

where winget >nul 2>&1
if errorlevel 1 (
  echo [안내] winget이 없습니다. 일부 항목은 수동 설치가 필요합니다.
  set HAS_WINGET=0
) else (
  set HAS_WINGET=1
  echo [OK] winget 사용 가능
)

echo.
echo --- 1/4 Git ---
call :EnsureGitInPath
where git >nul 2>&1
if errorlevel 1 (
  echo 없음 → Git 설치 창을 엽니다.
  echo   ^(winget 조용한 설치는 프로그레스 끝에서 자주 멈추므로 GUI로 설치합니다^)
  echo   설치 창이 뜨면 Next를 눌러 기본값으로 끝까지 설치하세요.
  echo.
  if "!HAS_WINGET!"=="1" (
    winget install -e --id Git.Git --source winget --interactive --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
      echo winget 실패 → 공식 다운로드 페이지를 엽니다.
      start "" "https://git-scm.com/download/win"
      set FAIL=1
    ) else (
      echo [OK] Git 설치 요청 완료
      set DID_INSTALL=1
      call :EnsureGitInPath
    )
  ) else (
    start "" "https://git-scm.com/download/win"
    echo [!] 다운로드 페이지에서 64-bit Git for Windows Setup 을 설치하세요.
    set FAIL=1
  )
) else (
  for /f "delims=" %%v in ('git --version') do echo [건너뜀] 이미 설치됨: %%v
)

echo.
echo --- 2/4 Node.js ---
where node >nul 2>&1
if errorlevel 1 (
  if "!HAS_WINGET!"=="1" (
    echo 없음 → Node.js LTS 설치 중...
    winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
      echo [X] Node.js 설치 실패 — https://nodejs.org 에서 직접 설치해 주세요.
      set FAIL=1
    ) else (
      echo [OK] Node.js 설치 요청 완료
      set DID_INSTALL=1
    )
  ) else (
    echo [X] Node.js 없음. https://nodejs.org 에서 LTS를 설치해 주세요.
    start "" "https://nodejs.org"
    set FAIL=1
  )
) else (
  for /f "delims=" %%v in ('node -v') do echo [건너뜀] 이미 설치됨: Node.js %%v
)

echo.
echo --- 3/4 Rust (cargo) ---
if exist "%USERPROFILE%\.cargo\bin\cargo.exe" (
  set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
)
where cargo >nul 2>&1
if errorlevel 1 (
  if "!HAS_WINGET!"=="1" (
    echo 없음 → Rustup 설치 중...
    winget install -e --id Rustlang.Rustup --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
      echo winget 실패 → rustup-init 직접 다운로드로 재시도합니다...
      call :InstallRustupDirect
    ) else (
      echo [OK] Rustup 설치 요청 완료
      set DID_INSTALL=1
    )
  ) else (
    call :InstallRustupDirect
  )
) else (
  for /f "delims=" %%v in ('cargo --version') do echo [건너뜀] 이미 설치됨: %%v
)

echo.
echo --- 4/4 Visual Studio C++ Build Tools ---
call :HasCppTools
if "!HAS_CPP!"=="1" (
  echo [건너뜀] 이미 설치됨: C++ Build Tools / Visual Studio C++
) else (
  if "!HAS_WINGET!"=="1" (
    echo 없음 → C++ Build Tools 설치 중 ^(시간이 꽤 걸릴 수 있습니다^)...
    winget install -e --id Microsoft.VisualStudio.2022.BuildTools --accept-package-agreements --accept-source-agreements --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
    if errorlevel 1 (
      echo [!] Build Tools 자동 설치 실패 가능.
      echo     https://visualstudio.microsoft.com/visual-cpp-build-tools/ 에서
      echo     "Desktop development with C++" 를 설치해 주세요.
      set FAIL=1
    ) else (
      echo [OK] Build Tools 설치 요청 완료
      set DID_INSTALL=1
    )
  ) else (
    echo [!] winget 없음 — Build Tools는 수동 설치가 필요합니다.
    echo     https://visualstudio.microsoft.com/visual-cpp-build-tools/
    start "" "https://visualstudio.microsoft.com/visual-cpp-build-tools/"
    set FAIL=1
  )
)

echo.
echo ========================================
if "!DID_INSTALL!"=="0" if "!FAIL!"=="0" (
  echo  결과: 필요한 도구가 모두 이미 있습니다. 추가 설치 없음.
) else if "!FAIL!"=="1" (
  echo  결과: 일부 항목은 수동 설치가 필요할 수 있습니다.
) else (
  echo  결과: 없던 도구 설치 요청이 끝났습니다.
)
echo ========================================
echo.
if "!DID_INSTALL!"=="1" (
  echo ★ 새로 설치한 경우: Cursor와 모든 터미널/CMD/PowerShell 창을
  echo   완전히 닫았다가 다시 연 다음 진행하세요.
  echo.
)
echo   다음: check-tools.bat  →  개발실행.bat
echo.
pause
endlocal
exit /b 0

:EnsureGitInPath
if exist "%ProgramFiles%\Git\cmd\git.exe" (
  set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
)
if exist "%LocalAppData%\Programs\Git\cmd\git.exe" (
  set "PATH=%LocalAppData%\Programs\Git\cmd;%PATH%"
)
exit /b 0

:HasCppTools
set HAS_CPP=0
if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" (
  for /f "delims=" %%i in ('"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2^>nul') do (
    if not "%%i"=="" set HAS_CPP=1
  )
)
if "!HAS_CPP!"=="1" exit /b 0
where link >nul 2>&1 && set HAS_CPP=1
where cl >nul 2>&1 && set HAS_CPP=1
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
set DID_INSTALL=1
if exist "%USERPROFILE%\.cargo\bin\cargo.exe" (
  set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
)
exit /b 0
