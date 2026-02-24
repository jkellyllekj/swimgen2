param(
    [string]$Endpoint
)

$adbPath = "C:\Users\jesse\AppData\Local\Android\Sdk\platform-tools\adb.exe"

if (-not (Test-Path $adbPath)) {
    Write-Host "adb.exe not found at:" -ForegroundColor Red
    Write-Host "  $adbPath" -ForegroundColor Yellow
    Write-Host "Update the path in connect-phone.ps1 if your Android SDK is elsewhere." -ForegroundColor Yellow
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Endpoint)) {
    Write-Host ""
    Write-Host "Wireless debugging helper" -ForegroundColor Cyan
    Write-Host "On your phone: Settings → Developer options → Wireless debugging, then note the IP:port (e.g. 192.168.137.77:46241)." -ForegroundColor Gray
    Write-Host ""
    $Endpoint = Read-Host "Enter phone IP:port"
}

if ([string]::IsNullOrWhiteSpace($Endpoint)) {
    Write-Host "No IP:port entered. Exiting." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Connecting to $Endpoint ..." -ForegroundColor Cyan
& $adbPath connect $Endpoint

Write-Host ""
Write-Host "Done. Check Android Studio's device list for your phone." -ForegroundColor Green

