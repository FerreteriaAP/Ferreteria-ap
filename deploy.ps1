$ROOT = "C:\Users\Administrator\ferreteria-ap"
$LOCK = "C:\deploy.lock"
$LOG  = "C:\deploy.log"
$PID_FILE = "C:\ferreteria-ap.pid"

# Task Scheduler corre con PATH minimo — inyectar rutas de git y pnpm
$env:PATH = "C:\Program Files\Git\cmd;" +
            "C:\Program Files\nodejs;" +
            "$env:APPDATA\npm;" +
            "$env:APPDATA\pnpm;" +
            "C:\Users\Administrator\AppData\Roaming\npm;" +
            "C:\Users\Administrator\AppData\Local\pnpm;" +
            $env:PATH

Set-Location $ROOT

# KILLSWITCH: si existe este archivo, todo queda bloqueado
if (Test-Path "C:\KILLSWITCH_ACTIVE") {
    Add-Content $LOG "[ $(Get-Date -f 'yyyy-MM-dd HH:mm:ss') ] KILLSWITCH activo — bloqueado."
    exit 0
}

# ── Función: arrancar la app como proceso independiente ──────────────────────
function Start-App {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName  = "node.exe"
    $psi.Arguments = "`"$ROOT\node_modules\next\dist\bin\next`" start"
    $psi.WorkingDirectory  = $ROOT
    $psi.UseShellExecute   = $false
    $psi.CreateNoWindow    = $true
    $psi.RedirectStandardOutput = $false
    $psi.RedirectStandardError  = $false
    $proc = [System.Diagnostics.Process]::Start($psi)
    if ($proc) {
        $proc.Id | Out-File $PID_FILE -Encoding ascii
        $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
        Add-Content $LOG "[$ts] App arrancada (PID $($proc.Id))."
    }
}

# ── Función: matar el proceso en puerto 3000 ─────────────────────────────────
function Stop-App {
    $conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Stop-Process -Force -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
    # También matar por PID guardado
    if (Test-Path $PID_FILE) {
        $savedPid = [int](Get-Content $PID_FILE -ErrorAction SilentlyContinue)
        if ($savedPid) { Stop-Process -Force -Id $savedPid -ErrorAction SilentlyContinue }
        Remove-Item $PID_FILE -ErrorAction SilentlyContinue
    }
}

# ── WATCHDOG: si la app no está corriendo, levantarla ───────────────────────
$escuchando = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $escuchando) {
    $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
    Add-Content $LOG "[$ts] App caida — reiniciando..."
    Stop-App
    Start-App
}

# ── DEPLOY: revisar si hay cambios en GitHub ─────────────────────────────────
# Lock: evita builds concurrentes
if (Test-Path $LOCK) { exit 0 }
"building" | Out-File $LOCK

try {
    git fetch origin main 2>&1 | Out-Null
    $local  = git rev-parse HEAD
    $remote = git rev-parse origin/main

    if ($local -eq $remote) { exit 0 }

    $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
    Add-Content $LOG "[$ts] Cambios detectados ($($remote.Substring(0,7))) — desplegando..."

    git pull origin main 2>&1 | Out-Null

    $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
    Add-Content $LOG "[$ts] Build iniciado..."
    pnpm build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
        Add-Content $LOG "[$ts] ERROR: build falló (exit $LASTEXITCODE) — deploy cancelado."
        exit 1
    }

    # Recargar: matar proceso viejo y arrancar con el build nuevo
    Stop-App
    Start-App

    $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
    Add-Content $LOG "[$ts] Deploy completado OK."

} finally {
    Remove-Item $LOCK -ErrorAction SilentlyContinue
}
