$ROOT = "C:\Users\Administrator\ferreteria-ap"
$LOCK = "C:\deploy.lock"
$LOG  = "C:\deploy.log"

# Task Scheduler corre con PATH minimo — inyectar rutas de git y pnpm
$env:PATH = "C:\Program Files\Git\cmd;" +
            "C:\Program Files\nodejs;" +
            "$env:APPDATA\npm;" +
            "$env:APPDATA\pnpm;" +
            "C:\Users\Administrator\AppData\Roaming\npm;" +
            "C:\Users\Administrator\AppData\Local\pnpm;" +
            $env:PATH

Set-Location $ROOT

# KILLSWITCH: si existe este archivo, el auto-deploy queda bloqueado
if (Test-Path "C:\KILLSWITCH_ACTIVE") {
    Add-Content $LOG "[ $(Get-Date -f 'yyyy-MM-dd HH:mm:ss') ] KILLSWITCH activo — deploy bloqueado."
    exit 0
}

# Lock: evita builds concurrentes
if (Test-Path $LOCK) { exit 0 }
"building" | Out-File $LOCK

try {
    # Verificar si hay cambios nuevos en GitHub
    git fetch origin main 2>&1 | Out-Null
    $local  = git rev-parse HEAD
    $remote = git rev-parse origin/main

    if ($local -eq $remote) { exit 0 }

    $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
    Add-Content $LOG "[$ts] Cambios detectados — desplegando..."

    git pull origin main 2>&1 | Out-Null

    $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
    Add-Content $LOG "[$ts] Build iniciado..."
    pnpm build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Add-Content $LOG "[$ts] ERROR: build falló (exit $LASTEXITCODE) — deploy cancelado."
        exit 1
    }

    # Liberar puerto 3000 si está ocupado por otro proceso
    $pid3000 = (netstat -ano | findstr ":3000 " | Where-Object { $_ -match "LISTENING" } |
                ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
    if ($pid3000 -and $pid3000 -ne "0") {
        taskkill /F /PID $pid3000 2>&1 | Out-Null
    }

    # Reiniciar PM2 (nombre correcto: ferreteria-ap)
    pm2 restart ferreteria-ap 2>&1 | Out-Null

    $ts = Get-Date -f "yyyy-MM-dd HH:mm:ss"
    Add-Content $LOG "[$ts] Deploy completado OK."

} finally {
    Remove-Item $LOCK -ErrorAction SilentlyContinue
}
