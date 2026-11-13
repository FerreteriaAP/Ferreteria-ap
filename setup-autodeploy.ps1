# Ejecutar UNA VEZ en el servidor para activar el auto-deploy.
# Despues de esto, cada push a GitHub se despliega solo en ~1 minuto.

$TASK  = "FerreteriaDeploy"
$SCRIPT = "C:\Users\Administrator\ferreteria-ap\deploy.ps1"

# Eliminar tarea anterior si existe
Unregister-ScheduledTask -TaskName $TASK -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction `
    -Execute "PowerShell.exe" `
    -Argument "-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$SCRIPT`""

# Trigger: repetir cada 1 minuto, comenzando ahora, indefinidamente
$trigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 1)

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
    -MultipleInstances IgnoreNew `
    -RestartCount 0 `
    -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal `
    -UserId "Administrator" `
    -LogonType S4U `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName $TASK `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Force | Out-Null

Write-Host ""
Write-Host "Auto-deploy activado." -ForegroundColor Green
Write-Host "Cada push a GitHub main se despliega en ~1 minuto."
Write-Host ""
Write-Host "Comandos utiles:"
Write-Host "  Ver log:          Get-Content C:\deploy.log -Tail 20"
Write-Host "  Pausar deploy:    New-Item C:\KILLSWITCH_ACTIVE"
Write-Host "  Reanudar deploy:  Remove-Item C:\KILLSWITCH_ACTIVE"
Write-Host "  Eliminar tarea:   Unregister-ScheduledTask -TaskName FerreteriaDeploy -Confirm:`$false"
Write-Host ""
