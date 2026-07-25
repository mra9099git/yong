# 새 PC에서 일용할 양식 사용하기

일반 사용자는 Git, Node.js, Rust를 설치할 필요가 없습니다.

## 설치

1. 같은 Microsoft 계정으로 OneDrive에 로그인합니다.
2. OneDrive의 `0VibeCoding\DailyBread` 폴더가 내려올 때까지 기다립니다.
3. `0VibeCoding\DailyBread\일용할양식 시작.cmd`를 더블클릭합니다.
4. 이 PC에 앱이 없으면 설치 화면이 열립니다.
5. 설치가 끝나면 바탕화면 또는 시작 메뉴의 `일용할 양식`을 실행합니다.

개인용 설치파일이라 Windows가 보호 경고를 표시할 수 있습니다. 파일 이름이 `일용할 양식_..._x64-setup.exe`인지 확인한 뒤 `추가 정보` → `실행`을 선택합니다.

## 파일 위치

```text
OneDrive\0VibeCoding\DailyBread\
  데이터\
    양식\
    성경\
  설치파일\
    일용할 양식_x.x.x_x64-setup.exe
  일용할양식 시작.cmd
  DailyBreadLauncher.ps1
  다른PC에서 설치하기.md
```

- 묵상과 성경 데이터만 OneDrive로 동기화됩니다.
- 앱 본체는 각 컴퓨터의 `%LOCALAPPDATA%` 아래에 설치됩니다.
- 바탕화면 바로가기는 해당 컴퓨터에만 존재합니다.
- OneDrive 안에는 `.git`, `node_modules`, `src-tauri\target` 같은 개발 폴더를 두지 않습니다.

## 실행되지 않을 때

1. OneDrive 로그인이 되어 있는지 확인합니다.
2. `0VibeCoding\DailyBread\설치파일` 안에 설치파일이 있는지 확인합니다.
3. 설치파일을 직접 실행한 뒤 바탕화면 바로가기를 사용합니다.
4. 그래도 안 되면 표시된 오류 문장을 복사해 AI에게 전달합니다.

개발·수정 방법은 로컬 앱 소스의 `유지보수_AI용.md`를 참고합니다.
