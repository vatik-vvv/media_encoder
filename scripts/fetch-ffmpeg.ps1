# Downloads FFmpeg full build for Windows into resources/ffmpeg/ (includes HAP encoder)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dest = Join-Path $root "resources\ffmpeg"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$version = "8.1"
$url = "https://github.com/GyanD/codexffmpeg/releases/download/$version/ffmpeg-$version-full_build.zip"
$zip = Join-Path $env:TEMP "ffmpeg-full.zip"
$extract = Join-Path $env:TEMP "ffmpeg-extract"

Write-Host "Downloading FFmpeg full build $version..."
Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing

if (Test-Path $extract) { Remove-Item -Recurse -Force $extract }
Expand-Archive -Path $zip -DestinationPath $extract -Force

$binDir = Get-ChildItem -Path $extract -Recurse -Directory -Filter "bin" | Select-Object -First 1
if (-not $binDir) { throw "Could not find bin folder in archive" }

Copy-Item (Join-Path $binDir.FullName "ffmpeg.exe") $dest -Force
Copy-Item (Join-Path $binDir.FullName "ffprobe.exe") $dest -Force

Write-Host "Installed to $dest"
Write-Host "ffmpeg.exe and ffprobe.exe ready (full build with HAP encoder)."
