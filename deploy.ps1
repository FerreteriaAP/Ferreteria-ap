# -*- coding: ascii -*-
$ROOT = "C:\Users\Administrator\ferreteria-ap"
$LOCK = "C:\deploy.lock"
$LOG  = "C:\deploy.log"

$env:PATH = "C:\Program Files\Git\cmd;" +
            "C:\Program Files\nodejs;" +
            "$env:APPDATA\npm;" +
            "$env:APPDATA\pnpm;" +
            "C:\Users\Administrator\AppData\Roaming\npm;" +
            "C:\Users\Administrator\AppData\Local\pnpm;" +
            $env:PATH

Set-Location $ROOT

if (Test-Path "C:\KILLSWITCH_ACTIVE") {
    Add-Content $LOG "[ $(Get-Date -f 'yyyy-MM-dd HH:mm:ss') ] KILLSWITCH activo."
    exit 0
}

function Start-App {
    $q = schtasks /Query /TN "FerreteriRun" 2>&1
    if ("$q" -notmatch "FerreteriRun") {
        $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
        Add-Content $LOG "[$ts] ERROR: tarea FerreteriRun no existe. Ejecutar scripts/setup-runner.ps1 primero."
        return
    }
    schtasks /Run /TN "FerreteriRun" 2>&1 | Out-Null
    Start-Sleep -Seconds 8
    $conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
    if ($conn) {
        Add-Content $LOG "[$ts] App UP (PID $($conn.OwningProcess))."
    } else {
        Add-Content $LOG "[$ts] WARN: FerreteriRun lanzada, port 3000 aun no responde."
    }
}

function Stop-App {
    schtasks /End /TN "FerreteriRun" 2>&1 | Out-Null
    Start-Sleep -Seconds 2
    $conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Stop-Process -Force -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 800
    }
}

# Watchdog: si la app no esta corriendo, levantarla
$escuchando = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $escuchando) {
    $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
    Add-Content $LOG "[$ts] App caida - reiniciando..."
    Start-App
}

# Deploy: revisar si hay cambios en GitHub
if (Test-Path $LOCK) { exit 0 }
"building" | Out-File $LOCK

try {
    git fetch origin main 2>&1 | Out-Null
    $local  = git rev-parse HEAD
    $remote = git rev-parse origin/main

    if ($local -eq $remote) { exit 0 }

    $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
    Add-Content $LOG "[$ts] Cambios detectados ($($remote.Substring(0,7))) - desplegando..."

    git pull origin main 2>&1 | Out-Null

    $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
    Add-Content $LOG "[$ts] Build iniciado..."
    pnpm build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
        Add-Content $LOG "[$ts] ERROR: build fallo (exit $LASTEXITCODE) - deploy cancelado."
        exit 1
    }

    Stop-App
    Start-App

    $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
    Add-Content $LOG "[$ts] Deploy completado OK."

} finally {
    Remove-Item $LOCK -ErrorAction SilentlyContinue
}
