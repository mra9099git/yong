$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

Write-Host ''
Write-Host '이 파일은 앱을 사용하는 파일이 아니라 개발자용 빌드 파일입니다.'
Write-Host '실행하면 src-tauri\target에 수 GB의 빌드 캐시가 다시 생성됩니다.'
Write-Host '평소 사용은 바탕화면의 "일용할 양식" 바로가기를 눌러 주세요.'
Write-Host ''

$confirmation = Read-Host '정말 개발 모드로 실행하려면 DEV를 입력하세요'
if ($confirmation -cne 'DEV') {
    Write-Host '개발 실행을 취소했습니다.'
    exit 0
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js를 찾을 수 없습니다. install-deps.bat을 먼저 실행해 주세요.'
}

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    $cargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
    if (Test-Path -LiteralPath (Join-Path $cargoBin 'cargo.exe')) {
        $env:PATH = "$cargoBin;$env:PATH"
    }
}

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    throw 'Rust cargo를 찾을 수 없습니다. install-deps.bat을 먼저 실행해 주세요.'
}

if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules'))) {
    Write-Host 'node_modules가 없어 npm install을 실행합니다.'
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) {
        throw 'npm install에 실패했습니다.'
    }
}

Write-Host '일용할 양식 개발 모드를 시작합니다.'
& npm.cmd run tauri dev
if ($LASTEXITCODE -ne 0) {
    throw '개발 모드 실행 중 오류가 발생했습니다.'
}
