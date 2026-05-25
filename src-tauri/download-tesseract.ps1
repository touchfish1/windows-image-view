# Download Tesseract OCR static binary and Chinese language data for bundling
# Run this script before building if the src-tauri/tesseract/ directory is missing.

$TesseractDir = Join-Path $PSScriptRoot "tesseract"
$TessdataDir = Join-Path $TesseractDir "tessdata"

# URLs
$TesseractUrl = "https://github.com/duzhor/tesseract-x64-windows-static/releases/download/5.5.2/tesseract-v5.5.2.exe"
$TessdataBase = "https://github.com/tesseract-ocr/tessdata/raw/main"
$Languages = @{
    "chi_sim.traineddata" = "Chinese (Simplified)"
    "eng.traineddata"     = "English"
}

# Ensure directories exist
New-Item -ItemType Directory -Force -Path $TesseractDir | Out-Null
New-Item -ItemType Directory -Force -Path $TessdataDir | Out-Null

# Download tesseract executable
$TesseractExe = Join-Path $TesseractDir "tesseract.exe"
if (-not (Test-Path $TesseractExe)) {
    Write-Host "Downloading tesseract.exe (static build, 10MB)..."
    Invoke-WebRequest -Uri $TesseractUrl -OutFile $TesseractExe -UseBasicParsing
    Write-Host "  Done."
} else {
    Write-Host "tesseract.exe already exists, skipping."
}

# Download language data
foreach ($File in $Languages.Keys) {
    $Path = Join-Path $TessdataDir $File
    if (-not (Test-Path $Path)) {
        $Url = "$TessdataBase/$File"
        Write-Host "Downloading $File ($($Languages[$File]))..."
        Invoke-WebRequest -Uri $Url -OutFile $Path -UseBasicParsing
        Write-Host "  Done."
    } else {
        Write-Host "$File already exists, skipping."
    }
}

Write-Host ""
Write-Host "Tesseract setup complete!"
Write-Host "  Tesseract: $( (Get-Item $TesseractExe).Length / 1MB ) MB"
foreach ($File in $Languages.Keys) {
    $Path = Join-Path $TessdataDir $File
    if (Test-Path $Path) {
        Write-Host "  $File: $( (Get-Item $Path).Length / 1MB ) MB"
    }
}
