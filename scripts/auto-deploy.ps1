# =============================================================
# auto-deploy.ps1  —  Ferretería AP
# Detecta commits nuevos en GitHub y hace deploy automático.
# Configurar en Task Scheduler para correr cada 5 minutos.
# =============================================================

$projectDir = "C:\Users\Administrator\ferreteria-ap"
$logFile    = "$projectDir\scripts\deploy.log"
$maxLogKB   = 512   # rota el log si supera 512 KB

# ── Rota el log si está muy grande ─────────────────────────
if (Test-Path $logFile) {
    $kb = (Get-Item $logFile).Length / 1KB
    if ($kb -gt $maxLogKB) {
        Move-Item $logFile "$logFile.old" -Force
    }
}

function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    Add-Content -Path $logFile -Value $line -Encoding UTF8
    Write-Host $line
}

# ── Busca pnpm y node (rutas posibles en Windows) ──────────
$pnpmPath = $null
foreach ($p in @(
    "C:\Users\Administrator\AppData\Roaming\npm\pnpm.cmd",
    "C:\Program Files\nodejs\pnpm.cmd",
    "$env:APPDATA\npm\pnpm.cmd"
)) {
    if (Test-Path $p) { $pnpmPath = $p; break }
}
if (-not $pnpmPath) {
    # fallback: buscar en PATH
    $pnpmPath = (Get-Command pnpm -ErrorAction SilentlyContinue)?.Source
}
if (-not $pnpmPath) {
    Log "ERROR: no se encontró pnpm. Abortando."
    exit 1
}

# ── Cambia al directorio del proyecto ──────────────────────
Set-Location $projectDir

# ── Verifica si hay commits nuevos en origin/main ──────────
try {
    git fetch origin main --quiet 2>&1 | Out-Null
} catch {
    Log "ERROR en git fetch: $_"
    exit 1
}

$localHash  = git rev-parse HEAD 2>&1
$remoteHash = git rev-parse origin/main 2>&1

if ($localHash -eq $remoteHash) {
    # Sin cambios — salida silenciosa (no llena el log)
    exit 0
}

Log "============================================"
Log "Nuevos commits detectados — iniciando deploy"
Log "  local : $localHash"
Log "  remote: $remoteHash"
Log "============================================"

# ── git pull ───────────────────────────────────────────────
Log "Paso 1/4: git pull..."
$out = git pull origin main 2>&1
Log $out

# ── prisma migrate deploy ──────────────────────────────────
Log "Paso 2/4: prisma migrate deploy..."
$out = & $pnpmPath prisma migrate deploy 2>&1
Log ($out -join "`n")

# ── pnpm build (incluye prisma generate) ──────────────────
Log "Paso 3/4: pnpm build..."
$out = & $pnpmPath build 2>&1
Log ($out -join "`n")

if ($LASTEXITCODE -ne 0) {
    Log "ERROR: pnpm build falló (exit $LASTEXITCODE). No se reiniciará el servidor."
    exit 1
}

# ── Reinicio del servidor ──────────────────────────────────
Log "Paso 4/4: reiniciando servidor..."
taskkill /F /IM node.exe 2>&1 | Out-Null
Start-Sleep -Seconds 3
schtasks /run /tn "FerreteriaStartup" 2>&1 | Out-Null
Start-Sleep -Seconds 5

# Verifica que node arrancó
$nodeProc = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProc) {
    Log "Servidor reiniciado correctamente (PID $($nodeProc.Id))."
} else {
    Log "ADVERTENCIA: node no está corriendo después del reinicio. Revisar FerreteriaStartup."
}

Log "Deploy completado."
Log ""
