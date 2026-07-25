$ErrorActionPreference = 'Stop'

# Helper used by "일용할양식 시작.cmd".
function Get-DailyBreadExecutable {
    $names = @('daily-bread.exe', '일용할 양식.exe')
    $candidates = [System.Collections.Generic.List[string]]::new()

    $registryPatterns = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
    )

    foreach ($pattern in $registryPatterns) {
        $entries = Get-ItemProperty -Path $pattern -ErrorAction SilentlyContinue |
            Where-Object {
                $_.DisplayName -eq '일용할 양식' -or
                $_.PSChildName -eq 'com.dailybread.app'
            }

        foreach ($entry in $entries) {
            if ($entry.InstallLocation) {
                $installLocation = ([string]$entry.InstallLocation).Trim().Trim('"')
                foreach ($name in $names) {
                    $candidates.Add((Join-Path $installLocation $name))
                }
            }

            if ($entry.DisplayIcon) {
                $iconPath = [string]$entry.DisplayIcon
                if ($iconPath -match '^\s*"?(?<path>.+?\.exe)"?(?:,\d+)?\s*$') {
                    $candidates.Add($Matches.path)
                }
            }
        }
    }

    $localRoots = @(
        (Join-Path $env:LOCALAPPDATA '일용할 양식'),
        (Join-Path $env:LOCALAPPDATA 'Programs\일용할 양식'),
        (Join-Path $env:LOCALAPPDATA 'Programs\DailyBread')
    )

    foreach ($root in $localRoots) {
        foreach ($name in $names) {
            $candidates.Add((Join-Path $root $name))
        }
    }

    foreach ($candidate in $candidates | Select-Object -Unique) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    return $null
}

$executable = Get-DailyBreadExecutable
if ($executable) {
    Start-Process -FilePath $executable
    exit 0
}

$installerDir = Join-Path $PSScriptRoot '설치파일'
$installer = Get-ChildItem -LiteralPath $installerDir -Filter '*-setup.exe' -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $installer) {
    throw "설치파일을 찾을 수 없습니다: $installerDir"
}

Write-Host '이 컴퓨터에는 일용할 양식 앱이 설치되어 있지 않습니다.'
Write-Host '설치 화면을 엽니다. 기본 설정 그대로 설치해 주세요.'
Start-Process -FilePath $installer.FullName -Wait

$executable = Get-DailyBreadExecutable
if ($executable) {
    Start-Process -FilePath $executable
    exit 0
}

Write-Host ''
Write-Host '설치는 끝났지만 실행파일 위치를 자동으로 확인하지 못했습니다.'
Write-Host '바탕화면 또는 시작 메뉴의 "일용할 양식"을 실행해 주세요.'
Read-Host 'Enter를 누르면 창을 닫습니다'
exit 0
