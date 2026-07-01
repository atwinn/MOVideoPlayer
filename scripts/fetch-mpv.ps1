# Downloads a pinned mpv Windows build and stages mpv.exe + its DLLs into
# src-tauri/resources/mpv/, where tauri.conf.json's bundle.resources picks
# them up and ships them inside the installer.
#
# Pinned to a specific dated release (not "latest") so CI builds are
# reproducible. Bump MPV_RELEASE_TAG/MPV_ASSET_NAME deliberately, on
# purpose, when you want a newer mpv — never point this at a moving target.
#
# Source: https://github.com/zhongfly/mpv-winbuild (mirrors shinchiro's
# mpv-winbuild-cmake nightly builds as proper GitHub Releases, which is
# far easier to pin and script against than the sourceforge distribution
# shinchiro publishes to directly).

$ErrorActionPreference = "Stop"

$MpvReleaseTag = "2026-07-01-99b4c12ccc"
$MpvAssetName = "mpv-x86_64-20260701-git-99b4c12ccc.7z"
$MpvDownloadUrl = "https://github.com/zhongfly/mpv-winbuild/releases/download/$MpvReleaseTag/$MpvAssetName"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ResourcesDir = Join-Path $RepoRoot "src-tauri/resources/mpv"
$DownloadPath = Join-Path $env:TEMP $MpvAssetName
$ExtractDir = Join-Path $env:TEMP "mpv-extract"

Write-Host "Downloading $MpvDownloadUrl"
Invoke-WebRequest -Uri $MpvDownloadUrl -OutFile $DownloadPath

if (Test-Path $ExtractDir) { Remove-Item -Recurse -Force $ExtractDir }
New-Item -ItemType Directory -Path $ExtractDir | Out-Null

$SevenZip = Get-Command "7z" -ErrorAction SilentlyContinue
if (-not $SevenZip) {
    $SevenZip = Join-Path ${env:ProgramFiles} "7-Zip\7z.exe"
}
& $SevenZip x $DownloadPath -o"$ExtractDir" -y | Out-Null

# Clear out any stale placeholder/previous run before staging fresh files.
Get-ChildItem $ResourcesDir -Exclude ".gitkeep" | Remove-Item -Recurse -Force

$MpvExe = Get-ChildItem -Path $ExtractDir -Filter "mpv.exe" -Recurse | Select-Object -First 1
if (-not $MpvExe) {
    throw "mpv.exe not found in extracted archive — check MPV_ASSET_NAME / archive layout."
}
Copy-Item $MpvExe.FullName -Destination $ResourcesDir

Get-ChildItem -Path $MpvExe.DirectoryName -Filter "*.dll" | ForEach-Object {
    Copy-Item $_.FullName -Destination $ResourcesDir
}

Write-Host "Staged mpv build in $ResourcesDir"
Get-ChildItem $ResourcesDir | Select-Object Name, Length
