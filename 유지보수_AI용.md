# 일용할 양식 유지보수 안내

이 문서는 다른 PC나 다른 AI가 프로젝트를 이어서 관리할 때 사용하는 기술 메모입니다.

## 핵심 원칙

- 앱 소스와 빌드 파일은 OneDrive 밖에 둔다.
- OneDrive에는 사용자 데이터, 정식 설치파일, 일반 사용자 안내서만 둔다.
- 일반 사용 시 `npm run tauri dev`를 실행하지 않는다.
- `src-tauri\target`, `node_modules`, `.git`을 OneDrive에 복사하지 않는다.
- Cursor에서는 OneDrive 폴더가 아니라 OneDrive 밖의 로컬 Git 저장소만 연다.
- Cursor 프로젝트 규칙 `.cursor\rules\daily-bread-layout.mdc`를 유지한다.

## 경로

- 동기화 데이터: `%OneDrive%\0VibeCoding\DailyBread\데이터`
- 로컬 소스 예시: `%USERPROFILE%\Desktop\daily-bread`
- 묵상 기록: `데이터\양식\<연도>\<날짜>.md`
- 성경 데이터: `데이터\성경\개역개정\<책이름>.json`

앱은 `OneDrive`, `OneDriveConsumer`, `OneDriveCommercial` 환경변수를 순서대로 확인한다. 실제 데이터 경로는 Rust의 `src-tauri\src\lib.rs`에서 결정하고, 같은 경로를 Tauri FS 플러그인의 런타임 범위에 재귀적으로 추가한다.

## 새 개발 PC

GitHub의 `cursor/daily-bread-app-a456` 브랜치를 개발 기준본으로 사용한다.

네트워크 또는 Git 사용이 어려울 때를 위한 소스 사본은 다음 ZIP에 보관한다.

```text
%OneDrive%\0VibeCoding\DailyBread\유지보수용\일용할양식_소스_0.1.1.zip
```

이 ZIP을 OneDrive 밖의 바탕화면 같은 로컬 폴더에 풀고 `npm install`을 실행한다. ZIP에는 `.git`, `node_modules`, `src-tauri\target`, 사용자 데이터가 들어 있지 않다. 다만 일반적인 개발은 ZIP보다 GitHub에서 clone하는 방식을 우선한다.

GitHub에서 시작해야 할 때:

```powershell
git clone https://github.com/mra9099git/yong.git daily-bread
cd daily-bread
git checkout cursor/daily-bread-app-a456
npm install
```

clone한 `daily-bread` 폴더를 Cursor에서 연다. `%OneDrive%\0VibeCoding\DailyBread` 폴더는 Cursor 개발 프로젝트로 열지 않는다.

Windows에서 Rust와 Visual Studio C++ Build Tools도 필요하다. 저장소의 `install-deps.bat`과 `check-tools.bat`을 사용할 수 있다.

## 개발 실행

```powershell
.\개발실행.bat
```

`DEV`를 입력해야 개발 실행이 시작된다. 개발 실행은 `src-tauri\target`을 크게 만들고 지속적으로 수정하므로 반드시 OneDrive 밖에서 실행한다.

## 정식 설치파일 빌드

```powershell
npm run build
```

NSIS 설치파일은 보통 다음에 생성된다.

```text
src-tauri\target\release\bundle\nsis\*-setup.exe
```

빌드가 성공하면 설치파일 하나만 OneDrive의 `0VibeCoding\DailyBread\설치파일`로 복사한다. `target` 폴더 전체를 복사하지 않는다.

## 배포 확인

1. 설치파일을 실행한다.
2. 바탕화면 또는 시작 메뉴 바로가기로 앱을 실행한다.
3. `%OneDrive%\0VibeCoding\DailyBread\데이터`의 기존 묵상과 성경이 표시되는지 확인한다.
4. 시험 기록을 저장하고 앱을 재실행해 유지되는지 확인한다.
5. `일용할양식 시작.cmd`가 설치된 앱을 찾아 실행하는지 확인한다.

## 삭제 가능 항목

다음은 사용자 데이터가 아니며 필요하면 다시 생성된다.

- `node_modules`
- `src-tauri\target`
- `src-tauri\gen`

`.gitignore`는 설정 파일이고 `.git`은 버전 기록이므로 무조건적인 찌꺼기 삭제 대상으로 취급하지 않는다. 다만 둘 다 OneDrive에는 두지 않는다.
