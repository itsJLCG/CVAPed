# ========================================
# CVACare Backend - Unified Startup Script
# ========================================
# This script starts all backend services:
# - Node.js API Server (Port 5000)
# - Python Gait Analysis (Port 5001)
# - Python Therapy Exercises (Port 5002)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CVACare Backend Services" -ForegroundColor Cyan
Write-Host "  Starting 3 Services..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if we're in the backend directory
$currentDir = Get-Location
if (-not $currentDir.Path.EndsWith("backend")) {
    Write-Host "ERROR: Please run this script from the backend directory" -ForegroundColor Red
    Write-Host "Current directory: $currentDir" -ForegroundColor Yellow
    Write-Host "Run: cd backend" -ForegroundColor Yellow
    exit 1
}

# Get local IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | Select-Object -First 1).IPAddress
Write-Host "Local IP Address: $localIP" -ForegroundColor Green
Write-Host "Make sure your .env URLs match this IP!" -ForegroundColor Yellow
Write-Host ""

# Check .env file
if (Test-Path ".env") {
    $envContent = Get-Content .env -Raw
    
    if ($envContent -match "GAIT_ANALYSIS_URL=(.+)") {
        $gaitUrl = $matches[1].Trim()
        Write-Host "Current GAIT_ANALYSIS_URL: $gaitUrl" -ForegroundColor Cyan
        
        if ($gaitUrl -match "localhost") {
            Write-Host "[WARN] Using 'localhost' won't work on mobile devices!" -ForegroundColor Yellow
            Write-Host "  Update .env to: GAIT_ANALYSIS_URL=http://${localIP}:5001" -ForegroundColor Yellow
        }
    }
    
    if ($envContent -match "THERAPY_URL=(.+)") {
        $therapyUrl = $matches[1].Trim()
        Write-Host "Current THERAPY_URL: $therapyUrl" -ForegroundColor Cyan
        
        if ($therapyUrl -match "localhost") {
            Write-Host "[WARN] Using 'localhost' won't work on mobile devices!" -ForegroundColor Yellow
            Write-Host "  Update .env to: THERAPY_URL=http://${localIP}:5002" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

# Check if Python venv exists for gait-analysis
Write-Host "[1/5] Checking Gait Analysis Python environment..." -ForegroundColor Yellow
if (-not (Test-Path "gait-analysis\venv")) {
    Write-Host "[WARN] Gait venv not found. Creating it..." -ForegroundColor Yellow
    python -m venv gait-analysis\venv
    & gait-analysis\venv\Scripts\Activate.ps1
    pip install --upgrade pip
    pip install -r gait-analysis\requirements.txt
    Write-Host "[OK] Gait venv created and dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[OK] Gait venv found" -ForegroundColor Green
}
Write-Host ""

# Check if Python venv exists for therapy-exercises
Write-Host "[2/5] Checking Therapy Exercises Python environment..." -ForegroundColor Yellow
if (-not (Test-Path "therapy-exercises\venv")) {
    Write-Host "[WARN] Therapy venv not found. Creating it..." -ForegroundColor Yellow
    python -m venv therapy-exercises\venv
    & therapy-exercises\venv\Scripts\Activate.ps1
    pip install --upgrade pip
    pip install -r therapy-exercises\requirements.txt
    Write-Host "[OK] Therapy venv created and dependencies installed" -ForegroundColor Green
    Write-Host "[INFO] XGBoost Articulation Mastery Prediction installed" -ForegroundColor Cyan
} else {
    Write-Host "[OK] Therapy venv found" -ForegroundColor Green
    # Check if XGBoost ML dependencies are installed
    & therapy-exercises\venv\Scripts\Activate.ps1
    $xgboostCheck = & python -c "import xgboost; print('ok')" 2>&1
    if ($xgboostCheck -notmatch "ok") {
        Write-Host "[WARN] XGBoost ML dependencies missing. Installing..." -ForegroundColor Yellow
        pip install -r therapy-exercises\requirements.txt --quiet
        Write-Host "[OK] XGBoost dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "[OK] XGBoost ML ready for articulation predictions" -ForegroundColor Green
    }
}
Write-Host ""

# Check if axios is installed
Write-Host "[3/5] Checking Node.js dependencies..." -ForegroundColor Yellow
$axiosCheck = npm list axios 2>&1
if ($axiosCheck -match "axios@") {
    Write-Host "[OK] axios is installed" -ForegroundColor Green
} else {
    Write-Host "[WARN] axios not found. Installing..." -ForegroundColor Yellow
    npm install axios
    Write-Host "[OK] axios installed" -ForegroundColor Green
}
Write-Host ""

# Check if ports are available
Write-Host "[4/5] Checking ports..." -ForegroundColor Yellow

function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    return $connection
}

# Check port 5000
if (Test-Port 5000) {
    Write-Host "[WARN] Port 5000 is already in use" -ForegroundColor Yellow
    $response = Read-Host "  Kill the process and continue? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        $process = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        if ($process) {
            Stop-Process -Id $process -Force
            Start-Sleep -Seconds 2
            Write-Host "  [OK] Process killed" -ForegroundColor Green
        }
    } else {
        Write-Host "Exiting..." -ForegroundColor Red
        exit 1
    }
}

# Check port 5001
if (Test-Port 5001) {
    Write-Host "[WARN] Port 5001 is already in use" -ForegroundColor Yellow
    $response = Read-Host "  Kill the process and continue? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        $process = Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        if ($process) {
            Stop-Process -Id $process -Force
            Start-Sleep -Seconds 2
            Write-Host "  [OK] Process killed" -ForegroundColor Green
        }
    } else {
        Write-Host "Exiting..." -ForegroundColor Red
        exit 1
    }
}

# Check port 5002
if (Test-Port 5002) {
    Write-Host "[WARN] Port 5002 is already in use" -ForegroundColor Yellow
    $response = Read-Host "  Kill the process and continue? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        $process = Get-NetTCPConnection -LocalPort 5002 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        if ($process) {
            Stop-Process -Id $process -Force
            Start-Sleep -Seconds 2
            Write-Host "  [OK] Process killed" -ForegroundColor Green
        }
    } else {
        Write-Host "Exiting..." -ForegroundColor Red
        exit 1
    }
}
Write-Host "[OK] Ports 5000, 5001, and 5002 are available" -ForegroundColor Green
Write-Host ""

# Start services
Write-Host "[5/5] Starting services..." -ForegroundColor Yellow
Write-Host ""

# Start Python Flask service
Write-Host "  -> Starting Python Gait Analysis Service (Port 5001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
Write-Host 'Python Gait Analysis Service' -ForegroundColor Cyan
Write-Host 'Press Ctrl+C to stop' -ForegroundColor Gray
Write-Host ''
Set-Location -Path '$currentDir\gait-analysis'
& '.\venv\Scripts\Activate.ps1'
& python app.py
"@ -WindowStyle Normal

Start-Sleep -Seconds 3

# Verify Python service started
if (Test-Port 5001) {
    Write-Host "    [OK] Python service running on http://localhost:5001" -ForegroundColor Green
} else {
    Write-Host "    [WARN] Python service may not have started" -ForegroundColor Yellow
}
Write-Host ""

# Start Python Exercise Recommendation service
Write-Host "  -> Starting Python Therapy & Exercise Service (Port 5002)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
Write-Host 'Python Therapy & Exercise Recommendation Service' -ForegroundColor Cyan
Write-Host 'Press Ctrl+C to stop' -ForegroundColor Gray
Write-Host ''
Set-Location -Path '$currentDir\therapy-exercises'
& '.\venv\Scripts\Activate.ps1'
& python app.py
"@ -WindowStyle Normal

Start-Sleep -Seconds 3

# Verify Therapy & Exercise service started
if (Test-Port 5002) {
    Write-Host "    [OK] Therapy & Exercise service running on http://localhost:5002" -ForegroundColor Green
} else {
    Write-Host "    [WARN] Therapy & Exercise service may not have started" -ForegroundColor Yellow
}
Write-Host ""

# Start Node.js Express server
Write-Host "  -> Starting Node.js API Server (Port 5000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
Write-Host 'Node.js API Server' -ForegroundColor Cyan
Write-Host 'Press Ctrl+C to stop' -ForegroundColor Gray
Write-Host ''
Set-Location -Path '$currentDir'
npm run dev
"@ -WindowStyle Normal

Start-Sleep -Seconds 3

# Verify Node.js service started
if (Test-Port 5000) {
    Write-Host "    [OK] Node.js service running on http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "    [WARN] Node.js service may not have started" -ForegroundColor Yellow
}
Write-Host ""

# Success summary
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All Services Running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services are running in separate PowerShell windows:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [1] Node.js API Server" -ForegroundColor White
Write-Host "     Local: http://localhost:5000" -ForegroundColor Gray
Write-Host "     Network: http://${localIP}:5000" -ForegroundColor Gray
Write-Host ""
Write-Host "  [2] Python Gait Analysis" -ForegroundColor White
Write-Host "     Local: http://localhost:5001" -ForegroundColor Gray
Write-Host "     Network: http://${localIP}:5001" -ForegroundColor Gray
Write-Host ""
Write-Host "  [3] Python Therapy & Exercise Service" -ForegroundColor White
Write-Host "     Local: http://localhost:5002" -ForegroundColor Gray
Write-Host "     Network: http://${localIP}:5002" -ForegroundColor Gray
Write-Host "     Services: Speech Therapy + Stroke Exercise + XGBoost ML Predictions" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Quick Tests:" -ForegroundColor Yellow
Write-Host "  curl http://localhost:5000/api/gait/health" -ForegroundColor Gray
Write-Host "  curl http://localhost:5001/health" -ForegroundColor Gray
Write-Host "  curl http://localhost:5002/api/therapy/health" -ForegroundColor Gray
Write-Host "  curl http://localhost:5002/api/exercises/health" -ForegroundColor Gray
Write-Host "  curl http://localhost:5002/api/articulation/model-status" -ForegroundColor Gray
Write-Host ""
Write-Host "Mobile App Configuration:" -ForegroundColor Yellow
Write-Host "  Main API: http://${localIP}:5000" -ForegroundColor White
Write-Host "  Gait Analysis: http://${localIP}:5001" -ForegroundColor White
Write-Host "  Therapy & Exercises: http://${localIP}:5002" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop the services" -ForegroundColor DarkGray
Write-Host ""
