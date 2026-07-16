# 새 PC에서 일용할 양식 쓰기 (체크리스트)

다음 주 본가 PC처럼 **다른 컴퓨터**에서 다시 세팅할 때 이 파일만 보면 됩니다.

## OneDrive만으로 되는 것 / 안 되는 것

| OneDrive로 따라옴 | PC마다 다시 설치 |
|------------------|------------------|
| `0VibeCoding\daily-bread` 앱 코드 | Git |
| `daily-bread\일용할양식` 묵상·성경 데이터 | Node.js |
| 이 안내 파일·`*.bat` 스크립트 | Rust (cargo) |
| | Visual Studio C++ Build Tools |

→ **데이터·코드는 OneDrive**, **도구는 PC마다 `install-deps.bat`**.

## 본가 PC 도착 후 (권장 순서)

### 0) OneDrive 로그인

같은 Microsoft 계정으로 OneDrive가 `0VibeCoding\daily-bread` 를 받을 때까지 기다립니다.

### 1) Git이 없으면 먼저 설치 (중요)

winget 조용한 설치는 **프로그레스 끝(MB 꽉 찬 뒤)에서 자주 멈춥니다.**  
그럴 땐 winget을 포기하고 브라우저로 설치하세요.

1. https://git-scm.com/download/win  
2. **64-bit Git for Windows Setup** 실행  
3. **Next만 눌러** 기본값으로 설치  
4. PowerShell / Cursor **전부 닫았다가** 다시 열기  
5. 확인:

```powershell
git --version
```

### 2) 폴더로 이동 + 최신 코드

```powershell
cd $env:OneDrive\0VibeCoding\daily-bread
git status
git fetch
git checkout cursor/daily-bread-app-a456
git pull
```

#### 자주 막히는 경우

**`install-deps.bat` 이 없다**  
→ 아직 예전 브랜치입니다. 위 `git checkout cursor/daily-bread-app-a456` 를 하세요.

**`Your local changes ... package-lock.json would be overwritten`**  
→ 아래 한 줄 후 다시 checkout:

```powershell
git checkout -- package-lock.json
git checkout cursor/daily-bread-app-a456
```

**폴더 자체가 없다 (첫 clone)**  

```powershell
cd $env:OneDrive\0VibeCoding
git clone https://github.com/mra9099git/yong.git daily-bread
cd daily-bread
git checkout cursor/daily-bread-app-a456
```

### 3) 도구 설치 (없는 것만)

```powershell
.\install-deps.bat
```

- 이미 있는 Git / Node 는 `[건너뜀]`
- 없는 Rust / C++ Build Tools 만 설치
- C++ Build Tools 는 **십여 분** 걸릴 수 있음 → 끝날 때까지 기다림

끝나면 **Cursor·PowerShell 전부 닫았다가** 다시 엽니다. (PATH 반영)

### 4) 점검 후 실행

```powershell
cd $env:OneDrive\0VibeCoding\daily-bread
.\check-tools.bat
.\실행.bat
```

## 오늘(2026-07-16) 이 PC에서 겪은 것 → 다음에 피하기

1. **`git` 인식 안 됨** → Git 미설치. winget silent 말고 **git-scm.com** 또는 winget `--interactive`  
2. **winget이 `█ 3.16 MB / 3.16 MB` 에서 멈춤** → 정상 진행이 아님. `Ctrl+C` 후 브라우저 설치  
3. **`git pull` 해도 `install-deps.bat` 없음** → `main`/예전 브랜치에 있음. **`cursor/daily-bread-app-a456` 로 checkout**  
4. **checkout 막힘 (`package-lock.json`)** → `git checkout -- package-lock.json` 후 다시 checkout  
5. **설치 직후 `cargo`/`git` 인식 안 됨** → 터미널·Cursor를 새로 열지 않아서. **창 전부 종료 후 재실행**  
6. **데이터 위치** → `%OneDrive%\0VibeCoding\daily-bread\일용할양식` (앱과 같은 폴더)

## 현재 작업 상태 (메모)

- 작업 브랜치: `cursor/daily-bread-app-a456`
- 앱/데이터 루트: `%OneDrive%\0VibeCoding\daily-bread` (사용자 이름은 PC마다 다름)
- 묵상 데이터(`일용할양식\`)는 Git에 올리지 않음

나중에 `main`에 병합되면 checkout 브랜치 이름만 `main`으로 바꾸면 됩니다.

> 이 저장소가 **Public**이면 폴더 구조 안내도 공개됩니다.  
> 개인용만 쓰려면 GitHub에서 저장소를 **Private**으로 바꾸세요.

## 막히면

`check-tools.bat` 전체 출력, 또는 빨간 에러 문장을 그대로 복사해 두면 이어서 해결하기 쉽습니다.
