Set-Location C:\Users\Administrator\ferreteria-ap

# KILLSWITCH: si existe este archivo, el auto-deploy queda bloqueado
if (Test-Path "C:\KILLSWITCH_ACTIVE") {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content C:\deploy.log "[$ts] KILLSWITCH activo — deploy bloqueado."
    exit 0
}

# Verificar si hay cambios nuevos en GitHub
git fetch origin main 2>&1 | Out-Null
$local  = git rev-parse HEAD
$remote = git rev-parse origin/main

if ($local -ne $remote) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content C:\deploy.log "[$timestamp] Cambios detectados - desplegando..."

    git pull origin main 2>&1 | Out-Null

    # Build
    Add-Content C:\deploy.log "[$timestamp] Iniciando build..."
    pnpm build 2>&1 | Out-Null

    # Liberar puerto 3000 si está ocupado por otro proceso
    $pid3000 = (netstat -ano | findstr ":3000 " | Where-Object { $_ -match "LISTENING" } |
                ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
    if ($pid3000 -and $pid3000 -ne "0") {
        taskkill /F /PID $pid3000 2>&1 | Out-Null
    }

    # Reiniciar PM2
    pm2 restart ferreteria 2>&1 | Out-Null

    Add-Content C:\deploy.log "[$timestamp] Deploy completado OK."
}
