$ErrorActionPreference = "Stop"

$env:JAVA_HOME = "$env:LOCALAPPDATA\jdk-21"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

Set-Location "C:\projects\active\LyricVault"

Write-Host "1/5 Building web assets (v1.6.0)..." -ForegroundColor Cyan
& npm.cmd run build

Write-Host "2/5 Syncing Capacitor Android project..." -ForegroundColor Cyan
& npx.cmd cap sync android

Write-Host "3/5 Building Android APK with Gradle..." -ForegroundColor Cyan
Set-Location "C:\projects\active\LyricVault\android"
& .\gradlew.bat assembleDebug
Set-Location "C:\projects\active\LyricVault"

Write-Host "4/5 Copying APK to LyricVault.apk..." -ForegroundColor Cyan
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" -Destination "LyricVault.apk" -Force

Write-Host "5/5 Committing and pushing v1.6.0 to GitHub..." -ForegroundColor Cyan
git add -A
git commit -m "feat: 50% larger song tabs, slower auto-scroll (.5x/.75x), and expanded LRCLIB artist search (v1.6.0)"
git push origin main

Write-Host "DONE! v1.6.0 is built and pushed to GitHub." -ForegroundColor Green
