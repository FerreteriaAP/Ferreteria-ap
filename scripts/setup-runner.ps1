# Ejecutar UNA vez en el servidor para registrar la tarea FerreteriRun.
# FerreteriRun corre Next.js en un Job Object independiente de FerreteriaDeploy,
# por lo que el proceso sobrevive cuando FerreteriaDeploy termina.

$dollar = [char]36
$line1 = "${dollar}env:PATH = `"C:\Program Files\nodejs;C:\Users\Administrator\AppData\Local\pnpm;C:\Program Files\Git\cmd;`" + ${dollar}env:PATH"
$line2 = "Set-Location C:\Users\Administrator\ferreteria-ap"
$line3 = "node.exe node_modules\next\dist\bin\next start"

Set-Content  -Path "C:\ferreteria-runner.ps1" -Value $line1 -Encoding UTF8
Add-Content  -Path "C:\ferreteria-runner.ps1" -Value $line2 -Encoding UTF8
Add-Content  -Path "C:\ferreteria-runner.ps1" -Value $line3 -Encoding UTF8
Write-Host "ferreteria-runner.ps1 creado."

schtasks /Delete /TN "FerreteriRun" /F 2>&1 | Out-Null

$tr = "powershell.exe -NonInteractive -ExecutionPolicy Bypass -File C:\ferreteria-runner.ps1"
schtasks /Create /TN "FerreteriRun" /TR $tr /SC ONCE /SD "01/01/2099" /ST "00:00" /RU SYSTEM /RL HIGHEST /F 2>&1
Write-Host "Tarea FerreteriRun creada."

schtasks /Run /TN "FerreteriRun" 2>&1
Write-Host "FerreteriRun iniciada."

Start-Sleep -Seconds 10
$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
Write-Host "Port 3000 escuchando: $($null -ne $conn)"
