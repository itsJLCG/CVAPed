$ErrorActionPreference = "Continue"
$backendDir = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  CVAPed Backend Bootstrap" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

function Test-Command {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-PythonVersion {
    $output = & python --version 2>&1
    if ($output -match "Python (\d+)\.(\d+)") {
        return [PSCustomObject]@{ Major = [int]$Matches[1]; Minor = [int]$Matches[2]; Raw = $output }
    }
    return $null
}

function Install-ViaWinget {
    param([string]$PackageId, [string]$DisplayUrl)
    if (Test-Command "winget") {
        Write-Host "  Attempting: winget install $PackageId" -ForegroundColor Yellow
        winget install $PackageId --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Installation initiated. Please restart your terminal and re-run npm start." -ForegroundColor Green
            exit 0
        }
    }
    Write-Host "  Please install manually from: $DisplayUrl" -ForegroundColor Red
    Write-Host "  Ensure it is added to your PATH, then re-run npm start." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n[1/6] Checking Python 3.10+..." -ForegroundColor Yellow

$pythonOk = $false
if (Test-Command "python") {
    $pyInfo = Get-PythonVersion
    if ($pyInfo) {
        if ($pyInfo.Major -gt 3 -or ($pyInfo.Major -eq 3 -and $pyInfo.Minor -ge 10)) {
            Write-Host "  OK: $($pyInfo.Raw)" -ForegroundColor Green
            $pythonOk = $true
        } else {
            Write-Host "  FAIL: $($pyInfo.Raw) (need 3.10+)" -ForegroundColor Red
        }
    }
}
if (-not $pythonOk) {
    Install-ViaWinget -PackageId "Python.Python.3.12" -DisplayUrl "https://www.python.org/downloads/"
}

Write-Host "`n[2/6] Checking configuration files..." -ForegroundColor Yellow

$envPath = Join-Path $backendDir ".env"
if (Test-Path $envPath) {
    Write-Host "  OK: backend/.env" -ForegroundColor Green
} else {
    Write-Host "  WARN: backend/.env not found" -ForegroundColor Red
    $examplePath = Join-Path $backendDir ".env.example"
    if (Test-Path $examplePath) {
        Write-Host "        Copy .env.example -> .env and fill in required values" -ForegroundColor Yellow
    }
}

$firebaseJson = Get-ChildItem -Path $backendDir -Filter "cvaped-fa8b2-*.json" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($firebaseJson) {
    Write-Host "  OK: $($firebaseJson.Name)" -ForegroundColor Green
} else {
    Write-Host "  WARN: Firebase service account JSON not found in backend/" -ForegroundColor Red
}

Write-Host "`n[3/6] Setting up Python virtual environment..." -ForegroundColor Yellow

$venvDir = Join-Path $backendDir "venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$venvPip = Join-Path $venvDir "Scripts\pip.exe"

if (Test-Path $venvPython) {
    Write-Host "  OK: venv already exists" -ForegroundColor Green
} else {
    Write-Host "  Creating venv..." -ForegroundColor Yellow
    Push-Location $backendDir
    & python -m venv venv
    Pop-Location
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Failed to create venv" -ForegroundColor Red
        exit 1
    }
    Write-Host "  OK: venv created" -ForegroundColor Green
}

Write-Host "`n[4/6] Installing Python dependencies..." -ForegroundColor Yellow

$requirementsFile = Join-Path $backendDir "requirements.txt"
& $venvPip install -r $requirementsFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: pip install failed" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: pip install complete" -ForegroundColor Green

Write-Host "`n[5/6] Applying Python 3.10 compatibility patches..." -ForegroundColor Yellow

$frozendictDir = & $venvPython -c "import frozendict; import os; print(os.path.dirname(frozendict.__file__))" 2>$null
if ($frozendictDir) {
    $frozendictInit = Join-Path $frozendictDir "__init__.py"
    if (Test-Path $frozendictInit) {
        $content = Get-Content $frozendictInit -Raw
        if ($content -match 'collections\.Mapping') {
            Write-Host "  Patching frozendict for Python 3.10 compatibility..." -ForegroundColor Yellow
            $content = $content -replace '^import collections\s*$', "import collections`r`nimport collections.abc"
            $content = $content -replace 'collections\.Mapping', 'collections.abc.Mapping'
            Set-Content -Path $frozendictInit -Value $content -NoNewline
            Write-Host "  OK: frozendict patched" -ForegroundColor Green
        } else {
            Write-Host "  OK: frozendict already compatible" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  OK: frozendict not found, skipping patch" -ForegroundColor Green
}

Write-Host "`n[6/6] Starting Flask server..." -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

Push-Location $backendDir
& $venvPython app.py
Pop-Location
