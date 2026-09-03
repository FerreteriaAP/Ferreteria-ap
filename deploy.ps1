Set-Location C:\Users\Administrator\ferreteria-ap

# Verificar si hay cambios nuevos en GitHub
git fetch origin main 2>&1 | Out-Null
$local  = git rev-parse HEAD
$remote = git rev-parse origin/main

if ($local -ne $remote) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content C:\deploy.log "[$timestamp] Cambios detectados - desplegando..."

    git pull origin main | Out-File -Append C:\deploy.log
    pnpm build | Out-File -Append C:\deploy.log
    pm2 restart ferreteria | Out-File -Append C:\deploy.log

    Add-Content C:\deploy.log "[$timestamp] Deploy completado."
}
