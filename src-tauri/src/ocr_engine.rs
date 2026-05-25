use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrBlock {
    pub text: String,
    pub bbox_x: f64,
    pub bbox_y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrResult {
    pub blocks: Vec<OcrBlock>,
    pub full_text: String,
}

// ---------------------------------------------------------------------------
// Windows — Windows.Media.Ocr
// ---------------------------------------------------------------------------
#[cfg(target_os = "windows")]
mod platform {
    use super::{OcrBlock, OcrResult};
    use windows::Graphics::Imaging::{BitmapDecoder, BitmapPixelFormat, SoftwareBitmap};
    use windows::Media::Ocr::OcrEngine;
    use windows::Storage::FileAccessMode;
    use windows::Storage::Streams::FileRandomAccessStream;

    pub(super) fn run_ocr(path: &str, _lang: &str) -> Result<OcrResult, String> {
        let path: windows::core::HSTRING = path.into();

        // Open file as random-access stream (blocking on WinRT async)
        let stream: windows::Storage::Streams::IRandomAccessStream =
            FileRandomAccessStream::OpenAsync(&path, FileAccessMode::Read)
                .map_err(|e| format!("Failed to create open operation: {}", e))?
                .get()
                .map_err(|e| format!("Failed to open file: {}", e))?;

        // Decode image → SoftwareBitmap
        let decoder: BitmapDecoder =
            BitmapDecoder::CreateAsync(&stream)
                .map_err(|e| format!("Failed to create decoder: {}", e))?
                .get()
                .map_err(|e| format!("Failed to await decoder: {}", e))?;

        let bitmap: SoftwareBitmap =
            decoder.GetSoftwareBitmapAsync()
                .map_err(|e| format!("Failed to get bitmap: {}", e))?
                .get()
                .map_err(|e| format!("Failed to await bitmap: {}", e))?;

        // Convert to Bgra8 if needed — OcrEngine prefers this format
        let pf = bitmap.BitmapPixelFormat()
            .map_err(|e| format!("Failed to get pixel format: {}", e))?;
        let ocr_bitmap = if pf != BitmapPixelFormat::Bgra8 {
            SoftwareBitmap::Convert(&bitmap, BitmapPixelFormat::Bgra8)
                .map_err(|e| format!("Failed to convert bitmap: {}", e))?
        } else {
            bitmap
        };

        // Create OCR engine (uses user-profile languages)
        let engine = OcrEngine::TryCreateFromUserProfileLanguages()
            .map_err(|e| format!("Failed to create OCR engine: {}", e))?;

        // Recognise (blocking)
        let result =
            engine.RecognizeAsync(&ocr_bitmap)
                .map_err(|e| format!("OCR recognition failed: {}", e))?
                .get()
                .map_err(|e| format!("Failed to await OCR: {}", e))?;

        // Parse result
        let mut blocks: Vec<OcrBlock> = Vec::new();
        let mut full_text = String::new();

        let lines = result.Lines()
            .map_err(|e| format!("Failed to get lines: {}", e))?;
        let n = lines.Size()
            .map_err(|_| "Failed to get line count".to_string())?;

        for i in 0..n {
            let line = lines.GetAt(i)
                .map_err(|e| format!("Failed to get line at {i}: {e}"))?;
            let line_text = line.Text()
                .map_err(|e| format!("Failed to get line text: {}", e))?
                .to_string();

            if !full_text.is_empty() {
                full_text.push('\n');
            }
            full_text.push_str(&line_text);

            // Compute line bounding box from its words
            let words = line.Words()
                .map_err(|e| format!("Failed to get words: {}", e))?;
            let wn = words.Size()
                .map_err(|_| "Failed to get word count".to_string())?;

            let mut min_x = f64::MAX;
            let mut min_y = f64::MAX;
            let mut max_x = f64::MIN;
            let mut max_y = f64::MIN;

            for j in 0..wn {
                let word = words.GetAt(j)
                    .map_err(|e| format!("Failed to get word at {j}: {e}"))?;
                let rect = word.BoundingRect()
                    .map_err(|e| format!("Failed to get rect: {}", e))?;

                min_x = min_x.min(rect.X as f64);
                min_y = min_y.min(rect.Y as f64);
                max_x = max_x.max((rect.X + rect.Width) as f64);
                max_y = max_y.max((rect.Y + rect.Height) as f64);
            }

            blocks.push(OcrBlock {
                text: line_text,
                bbox_x: if min_x == f64::MAX { 0.0 } else { min_x },
                bbox_y: if min_y == f64::MAX { 0.0 } else { min_y },
                width: if max_x == f64::MIN { 0.0 } else { max_x - min_x },
                height: if max_y == f64::MIN { 0.0 } else { max_y - min_y },
            });
        }

        Ok(OcrResult { blocks, full_text })
    }
}

// ---------------------------------------------------------------------------
// macOS — Vision framework (via sidecar binary)
// ---------------------------------------------------------------------------
#[cfg(target_os = "macos")]
mod platform {
    use super::OcrResult;
    use std::process::Command;

    pub(super) fn run_ocr(path: &str, lang: &str) -> Result<OcrResult, String> {
        let output = Command::new("macos-ocr-helper")
            .arg(path)
            .arg(lang)
            .output()
            .map_err(|e| format!("Failed to run OCR helper: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("OCR helper failed: {}", stderr));
        }

        serde_json::from_slice(&output.stdout)
            .map_err(|e| format!("Failed to parse OCR result: {}", e))
    }
}

// ---------------------------------------------------------------------------
// Linux / other — not supported yet
// ---------------------------------------------------------------------------
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
mod platform {
    pub(super) fn run_ocr(_path: &str, _lang: &str) -> Result<super::OcrResult, String> {
        Err("OCR is not supported on this platform".to_string())
    }
}

pub fn run_ocr(path: &str, lang: &str) -> Result<OcrResult, String> {
    platform::run_ocr(path, lang)
}
