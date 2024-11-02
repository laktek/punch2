#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

if ($v) {
  $Version = "${v}"
}
if ($Args.Length -eq 1) {
  $Version = $Args.Get(0)
}

$PunchInstall = $env:PUNCH_INSTALL
$BinDir = if ($PunchInstall) {
  "${PunchInstall}\bin"
} else {
  "${Home}\.punch\bin"
}

$PunchExe = "$BinDir\punch.exe"
$Target = 'x86_64-pc-windows-msvc'

$DownloadUrl = if (!$Version) {
  "https://github.com/laktek/punch2/releases/latest/download/punch-${Target}.exe"
} else {
  "https://github.com/laktek/punch2/releases/download/$Version/punch-${Target}.exe"
}

if (!(Test-Path $BinDir)) {
  New-Item $BinDir -ItemType Directory | Out-Null
}

curl.exe -Lo $PunchExe $DownloadUrl

$User = [System.EnvironmentVariableTarget]::User
$Path = [System.Environment]::GetEnvironmentVariable('Path', $User)
if (!(";${Path};".ToLower() -like "*;${BinDir};*".ToLower())) {
  [System.Environment]::SetEnvironmentVariable('Path', "${Path};${BinDir}", $User)
  $Env:Path += ";${BinDir}"
}

Write-Output "Punch was installed successfully to ${PunchExe}"
Write-Output "Run 'punch --help' to get started"
Write-Output "Need help? visit https://punch.dev/docs"
