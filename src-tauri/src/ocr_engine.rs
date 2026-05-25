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
    use image::GenericImageView;
    use std::path::PathBuf;
    use windows::Graphics::Imaging::{BitmapDecoder, BitmapPixelFormat, SoftwareBitmap};
    use windows::Media::Ocr::OcrEngine;
    use windows::Storage::FileAccessMode;
    use windows::Storage::Streams::FileRandomAccessStream;

    // ------------------------------------------------------------------
    // Image preprocessing helpers
    // ------------------------------------------------------------------

    /// Stretch histogram to cover full 0-255 range for better contrast.
    fn stretch_contrast(gray: &image::GrayImage) -> image::GrayImage {
        let (w, h) = gray.dimensions();
        let (mut lo, mut hi) = (255u8, 0u8);
        for p in gray.pixels() {
            let v = p.0[0];
            lo = lo.min(v);
            hi = hi.max(v);
        }
        if hi <= lo || (hi as u16 - lo as u16) >= 200 {
            return gray.clone();
        }
        let range = (hi - lo) as f64;
        let mut out = image::GrayImage::new(w, h);
        for (x, y, p) in gray.enumerate_pixels() {
            let v = ((p.0[0] - lo) as f64 / range * 255.0).round() as u8;
            out.put_pixel(x, y, image::Luma([v]));
        }
        out
    }

    /// Otsu's method — find optimal global threshold for binarization.
    fn otsu_threshold(gray: &image::GrayImage) -> u8 {
        let total = (gray.width() * gray.height()) as u64;
        let mut hist = [0u64; 256];
        for p in gray.pixels() {
            hist[p.0[0] as usize] += 1;
        }

        let total_sum: u64 = hist.iter().enumerate().map(|(i, &c)| i as u64 * c).sum();
        let mut best_t = 0u8;
        let mut best_var = 0f64;
        let mut pw = 0u64;
        let mut ps = 0u64;

        for t in 1..255 {
            pw += hist[t - 1];
            ps += (t - 1) as u64 * hist[t - 1];
            let w2 = total - pw;
            if pw == 0 || w2 == 0 {
                continue;
            }
            let m1 = ps as f64 / pw as f64;
            let m2 = (total_sum - ps) as f64 / w2 as f64;
            let var = (pw as f64) * (w2 as f64) * (m1 - m2).powi(2);
            if var > best_var {
                best_var = var;
                best_t = t as u8;
            }
        }
        best_t
    }

    /// Binarize (black/white) using a given threshold.
    fn binarize(gray: &image::GrayImage, threshold: u8) -> image::GrayImage {
        let (w, h) = gray.dimensions();
        let mut out = image::GrayImage::new(w, h);
        for (x, y, p) in gray.enumerate_pixels() {
            out.put_pixel(x, y, image::Luma([if p.0[0] >= threshold { 255 } else { 0 }]));
        }
        out
    }

    /// Full preprocessing: grayscale → upscale → contrast stretch → Otsu binarization.
    fn preprocess_image(img: &image::DynamicImage) -> image::GrayImage {
        let (w, h) = img.dimensions();
        let gray = img.to_luma8();

        // Scale up if the shortest side is < 300 px
        let shortest = w.min(h);
        let (new_w, new_h) = if shortest < 300 {
            let scale = (300.0 / shortest as f64).min(4.0);
            ((w as f64 * scale) as u32, (h as f64 * scale) as u32)
        } else {
            (w, h)
        };

        let scaled = if new_w != w || new_h != h {
            image::imageops::resize(&gray, new_w, new_h, image::imageops::FilterType::Lanczos3)
        } else {
            gray
        };

        binarize(&stretch_contrast(&scaled), otsu_threshold(&scaled))
    }

    fn temp_png_path() -> PathBuf {
        let dir = std::env::temp_dir().join("imgview_ocr");
        let _ = std::fs::create_dir_all(&dir);
        dir.join(format!("{}.png", std::process::id()))
    }

    // ------------------------------------------------------------------
    // OCR engine creation — respect requested language
    // ------------------------------------------------------------------

    fn create_engine(lang: &str) -> Result<OcrEngine, String> {
        if !lang.is_empty() {
            let lang_h: windows::core::HSTRING = lang.into();
            if let Ok(language) = windows::Globalization::Language::CreateLanguage(&lang_h) {
                if let Ok(engine) = OcrEngine::TryCreateFromLanguage(&language) {
                    return Ok(engine);
                }
            }
        }
        OcrEngine::TryCreateFromUserProfileLanguages()
            .map_err(|e| format!("Failed to create OCR engine: {}", e))
    }

    // ------------------------------------------------------------------
    // Core OCR — decode bitmap from file path and recognise
    // ------------------------------------------------------------------

    fn ocr_from_file(path: &str, lang: &str) -> Result<OcrResult, String> {
        let path_h: windows::core::HSTRING = path.into();

        let stream = FileRandomAccessStream::OpenAsync(&path_h, FileAccessMode::Read)
            .map_err(|e| format!("Failed to create open operation: {}", e))?
            .get()
            .map_err(|e| format!("Failed to open file: {}", e))?;

        let decoder = BitmapDecoder::CreateAsync(&stream)
            .map_err(|e| format!("Failed to create decoder: {}", e))?
            .get()
            .map_err(|e| format!("Failed to await decoder: {}", e))?;

        let bitmap = decoder
            .GetSoftwareBitmapAsync()
            .map_err(|e| format!("Failed to get bitmap: {}", e))?
            .get()
            .map_err(|e| format!("Failed to await bitmap: {}", e))?;

        let pf = bitmap
            .BitmapPixelFormat()
            .map_err(|e| format!("Failed to get pixel format: {}", e))?;
        let ocr_bitmap = if pf != BitmapPixelFormat::Bgra8 {
            SoftwareBitmap::Convert(&bitmap, BitmapPixelFormat::Bgra8)
                .map_err(|e| format!("Failed to convert bitmap: {}", e))?
        } else {
            bitmap
        };

        let engine = create_engine(lang)?;
        let result = engine
            .RecognizeAsync(&ocr_bitmap)
            .map_err(|e| format!("OCR recognition failed: {}", e))?
            .get()
            .map_err(|e| format!("Failed to await OCR: {}", e))?;

        let mut blocks: Vec<OcrBlock> = Vec::new();
        let mut full_text = String::new();

        let lines = result
            .Lines()
            .map_err(|e| format!("Failed to get lines: {}", e))?;
        let n = lines.Size().map_err(|_| "Failed to get line count".to_string())?;

        for i in 0..n {
            let line = lines
                .GetAt(i)
                .map_err(|e| format!("Failed to get line at {i}: {e}"))?;
            let line_text = line
                .Text()
                .map_err(|e| format!("Failed to get line text: {}", e))?
                .to_string();

            if !full_text.is_empty() {
                full_text.push('\n');
            }
            full_text.push_str(&line_text);

            let words = line
                .Words()
                .map_err(|e| format!("Failed to get words: {}", e))?;
            let wn = words.Size().map_err(|_| "Failed to get word count".to_string())?;

            let mut min_x = f64::MAX;
            let mut min_y = f64::MAX;
            let mut max_x = f64::MIN;
            let mut max_y = f64::MIN;

            for j in 0..wn {
                let word = words
                    .GetAt(j)
                    .map_err(|e| format!("Failed to get word at {j}: {e}"))?;
                let rect = word
                    .BoundingRect()
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

    // -------------------------------------------------------------------
    // Public entry point — tries 3 strategies, picks best
    // -------------------------------------------------------------------

    pub(super) fn run_ocr(path: &str, lang: &str) -> Result<OcrResult, String> {
        // Strategy 1: full preprocessing (binarized — best for clean text)
        if let Ok(img) = image::open(path) {
            let processed = preprocess_image(&img);
            let tmp = temp_png_path();
            if processed.save(&tmp).is_ok() {
                let result = ocr_from_file(tmp.to_str().unwrap_or(""), lang);
                let _ = std::fs::remove_file(&tmp);
                if let Ok(r) = &result {
                    if !r.blocks.is_empty() {
                        return result;
                    }
                }
            }

            // Strategy 2: grayscale + upscaled (better for natural scenes / photos)
            let gray = img.to_luma8();
            let (w, h) = gray.dimensions();
            let scaled = if w.min(h) < 300 {
                let s = (300.0 / w.min(h) as f64).min(4.0);
                image::imageops::resize(
                    &gray,
                    (w as f64 * s) as u32,
                    (h as f64 * s) as u32,
                    image::imageops::FilterType::Lanczos3,
                )
            } else {
                gray
            };
            let tmp2 = temp_png_path();
            if scaled.save(&tmp2).is_ok() {
                let result = ocr_from_file(tmp2.to_str().unwrap_or(""), lang);
                let _ = std::fs::remove_file(&tmp2);
                if let Ok(r) = &result {
                    if !r.blocks.is_empty() {
                        return result;
                    }
                }
            }
        }

        // Strategy 3: original file as-is
        ocr_from_file(path, lang)
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
