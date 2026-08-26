# Configura Chrome en la maquina de caja para imprimir sin dialogo
# Ejecutar como Administrador una sola vez

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    $chromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
}

# Crear acceso directo en el escritorio con --kiosk-printing
$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut("C:\Users\Public\Desktop\Ferreteria AP - Caja.lnk")
$shortcut.TargetPath   = $chromePath
$shortcut.Arguments    = "--kiosk-printing --start-maximized https://ferreteriaap.com/caja"
$shortcut.Description  = "Ferreteria AP - Caja (impresion automatica)"
$shortcut.Save()

Write-Host "✅ Acceso directo creado en el escritorio: 'Ferreteria AP - Caja'"
Write-Host "   Usa ese icono para abrir Chrome en la caja."
Write-Host "   Con --kiosk-printing, los recibos se imprimen sin dialogo."
