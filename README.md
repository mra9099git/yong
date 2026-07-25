# 일용할 양식 (Daily Bread)

매일 성경 묵상과 성경 본문을 기록하는 Tauri 2 데스크톱 앱입니다.

> [!IMPORTANT]
> Cursor에서는 반드시 **OneDrive 밖의 로컬 Git 저장소**를 엽니다.
> `OneDrive\0VibeCoding\DailyBread`는 앱 데이터와 배포 파일용이며 개발 프로젝트가 아닙니다.
> Cursor가 항상 읽는 보호 규칙은 [`.cursor/rules/daily-bread-layout.mdc`](./.cursor/rules/daily-bread-layout.mdc)에 있습니다.

## 저장 구조

앱과 데이터는 분리합니다.

```text
각 PC 로컬
  설치된 일용할 양식 앱
  개발용 소스, .git, node_modules, src-tauri\target

OneDrive\0VibeCoding\DailyBread
  데이터\
    양식\
    성경\
  설치파일\
  일용할양식 시작.cmd
  다른PC에서 설치하기.md
```

`node_modules`, `.git`, `src-tauri\target`은 OneDrive에 넣지 않습니다. 특히 `target`은 개발 실행 중 수천 개의 파일이 계속 바뀌므로 OneDrive 동기화 지연의 원인이 됩니다.

## 일반 사용자

OneDrive의 `0VibeCoding\DailyBread\일용할양식 시작.cmd`를 실행합니다. 앱이 이 PC에 설치되어 있으면 바로 실행하고, 없으면 `설치파일`의 정식 설치 프로그램을 엽니다.

다른 PC 설치 방법은 [`새PC설치.md`](./새PC설치.md)를 참고합니다.

## 개발자

앱 소스를 OneDrive 밖에 둔 뒤 다음을 사용합니다.

다른 PC에서도 GitHub 저장소를 바탕화면 같은 로컬 폴더에 clone하고, clone한 폴더를 Cursor에서 엽니다. OneDrive 폴더를 Cursor 작업 폴더로 열지 않습니다.

```powershell
npm install
.\개발실행.bat
```

정식 NSIS 설치파일:

```powershell
npm run build
```

자세한 구조와 배포 절차는 [`유지보수_AI용.md`](./유지보수_AI용.md)를 참고합니다.

## 데이터 형식

묵상 기록:

```text
%OneDrive%\0VibeCoding\DailyBread\데이터\양식\<연도>\<날짜>.md
```

```markdown
---
date: 2026-07-11
passage: 마태복음 1:1-24
key_verse: 마태복음 1:7-8
book: 마태복음
---

## 해석
(해설)

## 나의 묵상
(묵상)
```

성경 데이터:

```text
%OneDrive%\0VibeCoding\DailyBread\데이터\성경\개역개정\<책이름>.json
```

책별로 장과 절을 JSON 객체에 저장합니다. 저장할 때 임시 파일을 사용한 뒤 교체하여 파일 손상 가능성을 줄입니다.

## 주요 소스

```text
src/
  index.html
  styles.css
  main.js
  storage.js
  versePicker.js
  bibleText.js
  bibleUtils.js
  nltApi.js
  sidebar.js
  bibleData.json
  bibleData.js
  tauriApi.js

src-tauri/
  src/lib.rs
  capabilities/default.json
  tauri.conf.json
```

UI 배치는 PC별 `localStorage`에 저장하고, 묵상·성경 데이터만 OneDrive로 공유합니다.
