# 일용할 양식 (Daily Bread)

매일 성경 묵상(일용할 양식)을 기록하는 Tauri 2 데스크톱 앱입니다.

여러 PC에서 같은 기록·성경 DB를 쓰도록 **OneDrive `0VibeCoding\daily-bread`** 한 폴더에 앱과 데이터를 함께 둡니다.

## 폴더 구조

```
%OneDrive%\0VibeCoding\daily-bread\
  src\  src-tauri\  package.json …   ← 앱 코드 (Git)
  일용할양식\                         ← 데이터 (Git 제외, OneDrive만)
    양식\2026\2026-07-11.md
    성경\개역개정\마태복음.json
```

예시: `C:\Users\mra90\OneDrive\0VibeCoding\daily-bread`

> 예전에 `문서\일용할양식` 또는 `0VibeCoding\일용할양식`에 둔 데이터가 있으면  
> `daily-bread\일용할양식`으로 옮기면 됩니다.

## 기술 스택

- **Tauri 2** + 바닐라 HTML/CSS/JS (빌드 도구 없음, `window.__TAURI__` 사용)
- 데이터: `daily-bread\일용할양식` (`OneDrive` 환경변수 기준 절대 경로)

## 이 PC에 처음 설치

1. [Node.js LTS](https://nodejs.org), [Rust](https://rustup.rs), Visual Studio Build Tools(C++ 워크로드) 설치
2. OneDrive에 `0VibeCoding` 폴더가 있는지 확인
3. 앱 코드 clone:

```bat
cd %OneDrive%\0VibeCoding
git clone https://github.com/mra9099git/yong.git daily-bread
cd daily-bread
git checkout cursor/daily-bread-app-a456
```

4. 도구 점검: `check-tools.bat` 더블클릭
5. 실행: `실행.bat` 또는

```bash
npm install
npm run tauri dev
```

Windows에서 `npm run tauri build`로 설치 파일을 만들 수 있습니다.

### 하루치 마크다운 형식

```markdown
---
date: 2026-07-11
passage: 마태복음 1:1-24
key_verse: 마태복음 1:7-8
book: 마태복음
---

## 해석
(붙여넣은 해설)

## 나의 묵상
(내가 쓴 소감)
```

- `passage`는 장을 넘는 범위 가능: `마태복음 1:18-2:5`
- `key_verse`는 단일 절 또는 범위 (`1:7-8`) 모두 지원
- 메모장·옵시디언 등으로 직접 열어 편집 가능

### 성경 JSON 형식 (개역개정)

책별 파일, 절 단위 저장:

```json
{
  "1": {
    "1": "태초에 하나님이 천지를 창조하시니라",
    "2": "땅이 혼돈하고..."
  },
  "2": {
    "1": "..."
  }
}
```

저장 시 `.tmp` 파일에 먼저 쓴 뒤 교체하여 손상을 방지합니다.

## 코드 구조

```
src/
  index.html        화면 뼈대
  styles.css
  main.js           이벤트 연결·화면 갱신
  storage.js        마크다운·성경 JSON 읽기/쓰기
  versePicker.js    책→장→절 범위 선택
  bibleText.js      본문 조회·입력 모드·요절 강조
  bibleUtils.js     구절 범위 유틸·경로 상수
  nltApi.js         NLT API (api.nlt.to)
  sidebar.js        달력·필터·목록·삭제
  bibleData.json    66권 장별 절 수 + 한/영 책 이름
  bibleData.js      런타임 로드용 성경 메타데이터
  tauriApi.js       Tauri 바닐라 JS API 접근
```

## NLT API

- 온라인일 때만 NLT 토글 사용 가능
- 익명 접근: 50절/요청, 500회/일 ([api.nlt.to](https://api.nlt.to/))
- NLT 본문은 로컬에 저장하지 않음 (라이선스)

## UI 설정 저장

칸 비율·사이드바 너비·성경 칸 접힘·창 크기·NLT 토글은 `localStorage`에 저장됩니다.
(PC마다 UI 배치는 따로 저장됩니다. 묵상/성경 데이터만 OneDrive로 공유됩니다.)

## 라이선스

개인 묵상 기록용 프로젝트입니다.
