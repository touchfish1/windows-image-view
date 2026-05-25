# Download PaddleOCR-json and RapidOCR-json for bundling
# Run this script before building if the src-tauri/paddleocr/ directory is missing.

$PaddleDir = Join-Path $PSScriptRoot "paddleocr"
$PaddleSubDir = Join-Path $PaddleDir "PaddleOCR-json"
$RapidSubDir = Join-Path $PaddleDir "RapidOCR-json"
$ArchiveDir = Join-Path $PSScriptRoot ".downloads"

# URLs
$PaddleUrl = "https://github.com/hiroi-sora/PaddleOCR-json/releases/download/v1.4.1/PaddleOCR-json_v1.4.1_windows_x64.7z"
$RapidUrl = "https://github.com/hiroi-sora/RapidOCR-json/releases/download/v0.2.0/RapidOCR-json_v0.2.0.7z"
$SevenZipUrl = "https://www.7-zip.org/a/7zr.exe"

# Ensure directories exist
New-Item -ItemType Directory -Force -Path $PaddleDir | Out-Null
New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null

# Find or download 7zr
function Get-7zr {
    $7zrPaths = @(
        Join-Path $ArchiveDir "7zr.exe"
        "C:\Program Files\7-Zip\7z.exe"
        "C:\Program Files (x86)\7-Zip\7z.exe"
        "C:\ProgramData\chocolatey\lib\7zip\tools\7z.exe"
    )
    foreach ($p in $7zrPaths) {
        if (Test-Path $p) { return $p }
    }
    # Download 7zr standalone
    Write-Host "Downloading 7zr.exe (standalone 7-Zip)..."
    $7zrExe = Join-Path $ArchiveDir "7zr.exe"
    Invoke-WebRequest -Uri $SevenZipUrl -OutFile $7zrExe -UseBasicParsing
    if (-not (Test-Path $7zrExe)) {
        Write-Host "ERROR: Failed to download 7zr.exe" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Done."
    return $7zrExe
}

$7z = Get-7zr
Write-Host "Using 7-Zip: $7z"

function Extract-Archive {
    param($ArchivePath, $OutDir)
    $name = Split-Path $ArchivePath -Leaf
    Write-Host "Extracting $name..."
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = $7z
    $pinfo.Arguments = "x `"$ArchivePath`" -o`"$OutDir`" -y"
    $pinfo.RedirectStandardOutput = $true
    $pinfo.RedirectStandardError = $true
    $pinfo.UseShellExecute = $false
    $pinfo.CreateNoWindow = $true
    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $pinfo
    $p.Start() | Out-Null
    $p.WaitForExit()
    if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 1) {
        Write-Host "  Extract failed (exit code $($p.ExitCode))" -ForegroundColor Red
        return $false
    }
    Write-Host "  Done."
    return $true
}

# PaddleOCR-json
if (-not (Test-Path (Join-Path $PaddleSubDir "PaddleOCR-json.exe"))) {
    $paddleArchive = Join-Path $ArchiveDir "PaddleOCR-json_v1.4.1_windows_x64.7z"
    if (-not (Test-Path $paddleArchive)) {
        Write-Host "Downloading PaddleOCR-json v1.4.1 (88MB)..."
        Invoke-WebRequest -Uri $PaddleUrl -OutFile $paddleArchive -UseBasicParsing
        Write-Host "  Done."
    }
    New-Item -ItemType Directory -Force -Path $PaddleSubDir | Out-Null
    if (-not (Extract-Archive $paddleArchive $PaddleSubDir)) {
        Write-Host "Failed to extract PaddleOCR-json" -ForegroundColor Red
        exit 1
    }

    # Move contents up if extracted into a subdirectory
    $subItems = Get-ChildItem $PaddleSubDir
    if ($subItems.Count -eq 1 -and $subItems[0].PSIsContainer) {
        $subDir = $subItems[0].FullName
        Get-ChildItem $subDir | Move-Item -Destination $PaddleSubDir -Force
        Remove-Item $subDir -Force
    }

    Write-Host "PaddleOCR-json ready."
} else {
    Write-Host "PaddleOCR-json already exists, skipping."
}

# RapidOCR-json
if (-not (Test-Path (Join-Path $RapidSubDir "RapidOCR_json.exe"))) {
    $rapidArchive = Join-Path $ArchiveDir "RapidOCR-json_v0.2.0.7z"
    if (-not (Test-Path $rapidArchive)) {
        Write-Host "Downloading RapidOCR-json v0.2.0..."
        Invoke-WebRequest -Uri $RapidUrl -OutFile $rapidArchive -UseBasicParsing
        Write-Host "  Done."
    }
    New-Item -ItemType Directory -Force -Path $RapidSubDir | Out-Null
    if (-not (Extract-Archive $rapidArchive $RapidSubDir)) {
        Write-Host "Failed to extract RapidOCR-json" -ForegroundColor Red
        exit 1
    }

    # Move contents up if extracted into a subdirectory
    $subItems = Get-ChildItem $RapidSubDir
    if ($subItems.Count -eq 1 -and $subItems[0].PSIsContainer) {
        $subDir = $subItems[0].FullName
        Get-ChildItem $subDir | Move-Item -Destination $RapidSubDir -Force
        Remove-Item $subDir -Force
    }

    Write-Host "RapidOCR-json ready."
} else {
    Write-Host "RapidOCR-json already exists, skipping."
}

# Print sizes
Write-Host ""
Write-Host "Setup complete!"
if (Test-Path (Join-Path $PaddleSubDir "PaddleOCR-json.exe")) {
    $size = (Get-ChildItem $PaddleSubDir -Recurse | Measure-Object -Property Length -Sum).Sum
    Write-Host "  PaddleOCR-json: $([math]::Round($size / 1MB, 1)) MB"
}
if (Test-Path (Join-Path $RapidSubDir "RapidOCR_json.exe")) {
    $size = (Get-ChildItem $RapidSubDir -Recurse | Measure-Object -Property Length -Sum).Sum
    Write-Host "  RapidOCR-json: $([math]::Round($size / 1MB, 1)) MB"
}
