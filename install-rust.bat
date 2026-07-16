@echo off
chcp 65001 >nul
echo ========================================
echo  Rust 설치 도우미
echo ========================================
echo.
echo 이 스크립트는 rustup 설치 페이지를 엽니다.
echo.
echo 설치 순서:
echo   1. 열린 페이지에서 Windows용 rustup-init.exe 다운로드
echo   2. 실행 후 기본값(1) Enter
echo   3. Visual C++ Build Tools 안내가 나오면 설치
echo   4. 끝나면 Cursor/터미널을 모두 닫고 다시 열기
echo   5. daily-bread 폴더에서 check-tools.bat 실행
echo.

start "" "https://rustup.rs"
echo 브라우저가 열렸습니다. 설치가 끝나면 아무 키나 누르세요.
pause

where cargo >nul 2>&1
if errorlevel 1 (
  echo.
  echo 아직 cargo를 찾지 못했습니다.
  echo - 설치를 끝까지 하셨는지
  echo - Cursor/PowerShell/CMD를 모두 종료한 뒤 새로 열었는지
  echo 확인해 주세요. ^(PATH는 새 창에서만 갱신됩니다^)
) else (
  echo.
  for /f "delims=" %%v in ('cargo --version') do echo [OK] %%v
  echo 이제 실행.bat 을 다시 실행하세요.
)
echo.
pause
