# Download PaddleOCR-json for bundling.
# Run this script before building if the src-tauri/paddleocr/ directory is missing.

$PaddleDir = Join-Path $PSScriptRoot "paddleocr"
$ArchiveDir = Join-Path $PSScriptRoot ".downloads"

$PaddleUrl = "https://github.com/hiroi-sora/PaddleOCR-json/releases/download/v1.4.1/PaddleOCR-json_v1.4.1_windows_x64.7z"
$SevenZipUrl = "https://www.7-zip.org/a/7zr.exe"

New-Item -ItemType Directory -Force -Path $PaddleDir | Out-Null
New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null

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
    Write-Host "Downloading 7zr.exe (standalone 7-Zip)..."
    $7zrExe = Join-Path $ArchiveDir "7zr.exe"
    Invoke-WebRequest -Uri $SevenZipUrl -OutFile $7zrExe -UseBasicParsing
    if (-not (Test-Path $7zrExe)) { exit 1 }
    return $7zrExe
}

$7z = Get-7zr

$SubDir = Join-Path $PaddleDir "PaddleOCR-json"
if (-not (Test-Path (Join-Path $SubDir "PaddleOCR-json.exe"))) {
    $archive = Join-Path $ArchiveDir "PaddleOCR-json_v1.4.1_windows_x64.7z"
    if (-not (Test-Path $archive)) {
        Write-Host "Downloading PaddleOCR-json v1.4.1 (88MB)..."
        Invoke-WebRequest -Uri $PaddleUrl -OutFile $archive -UseBasicParsing
    }
    & $7z x "$archive" -o"$SubDir" -y > $null
    # Move contents up from any nested subdirectory
    $subItems = Get-ChildItem $SubDir
    if ($subItems.Count -eq 1 -and $subItems[0].PSIsContainer) {
        Get-ChildItem $subItems[0].FullName | Move-Item -Destination $SubDir -Force
        Remove-Item $subItems[0].FullName -Force
    }
    # Create default config.txt pointing to Chinese models
    @"
# 默认配置: 简体中文 + English
det_model_dir models/ch_PP-OCRv3_det_infer
cls_model_dir models/ch_ppocr_mobile_v2.0_cls_infer
rec_model_dir models/ch_PP-OCRv3_rec_infer
rec_char_dict_path models/dict_chinese.txt
"@ | Out-File -FilePath (Join-Path $SubDir "config.txt") -Encoding ascii
    Write-Host "PaddleOCR-json ready."
} else {
    Write-Host "PaddleOCR-json already exists, skipping."
}

$size = (Get-ChildItem $PaddleDir -Recurse | Measure-Object -Property Length -Sum).Sum
Write-Host "Total: $([math]::Round($size / 1MB, 1)) MB"
