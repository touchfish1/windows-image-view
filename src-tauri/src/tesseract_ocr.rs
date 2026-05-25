use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::OnceLock;
use tauri::Manager;

static TESSERACT_PATH: OnceLock<Option<PathBuf>> = OnceLock::new();

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
    pub engine: String,
}

/// Initialize tesseract path from Tauri app resources.
pub fn init(app: &tauri::App) {
    let bundled = find_bundled_tesseract(app);
    let path = if bundled.is_some() {
        bundled
    } else {
        find_system_tesseract()
    };
    TESSERACT_PATH.set(path).ok();
}

/// Check if Tesseract is available (bundled or on system).
pub fn is_available() -> bool {
    TESSERACT_PATH
        .get()
        .and_then(|p| p.as_ref())
        .map(|p| p.exists())
        .unwrap_or(false)
}

/// Run Tesseract OCR on an image.
pub fn run_ocr(path: &str, lang: &str) -> Result<OcrResult, String> {
    let tess_path = TESSERACT_PATH
        .get()
        .and_then(|p| p.as_ref())
        .ok_or_else(|| "Tesseract not available".to_string())?;

    let tess_dir = tess_path.parent().ok_or_else(|| "Invalid tesseract path".to_string())?;
    let tessdata_dir = tess_dir.join("tessdata");
    let tessdata_str = tessdata_dir.to_str().ok_or_else(|| "Non-UTF8 tessdata path".to_string())?;

    // Map language codes
    let tesseract_lang = match lang {
        "zh-Hans" | "zh-CN" | "zh" => "chi_sim",
        "zh-Hant" | "zh-TW" => "chi_tra",
        "ja" => "jpn",
        "ko" => "kor",
        "en" => "eng",
        other => other,
    };

    eprintln!("Tesseract run: {} --tessdata-dir {} -l {} path={}", tess_path.display(), tessdata_str, tesseract_lang, path);

    // Run tesseract with TSV output for bounding box data
    let tsv_output = std::process::Command::new(tess_path)
        .arg(path)
        .arg("stdout")
        .arg("-l")
        .arg(tesseract_lang)
        .arg("--psm")
        .arg("3")
        .arg("--oem")
        .arg("1")
        .arg("--tessdata-dir")
        .arg(tessdata_str)
        .arg("tsv")
        .output()
        .map_err(|e| format!("Failed to run Tesseract: {}", e))?;

    if !tsv_output.status.success() {
        let stderr = String::from_utf8_lossy(&tsv_output.stderr);
        eprintln!("Tesseract stderr: {}", stderr);
        // Try with legacy engine if LSTM fails
        if stderr.contains("LSTM") || stderr.contains("engine") || stderr.contains("Failed loading") {
            let fallback = std::process::Command::new(tess_path)
                .arg(path)
                .arg("stdout")
                .arg("-l")
                .arg(tesseract_lang)
                .arg("--psm")
                .arg("3")
                .arg("--oem")
                .arg("0")
                .arg("--tessdata-dir")
                .arg(tessdata_str)
                .arg("tsv")
                .output()
                .map_err(|e| format!("Failed to run Tesseract (fallback): {}", e))?;

            if !fallback.status.success() {
                let err2 = String::from_utf8_lossy(&fallback.stderr);
                eprintln!("Tesseract fallback stderr: {}", err2);
                return Err(format!("Tesseract error (LSTM+legacy): {stderr} / {err2}"));
            }
            return parse_tsv(&fallback.stdout);
        }
        return Err(format!("Tesseract error: {stderr}"));
    }

    parse_tsv(&tsv_output.stdout)
}

/// Find tesseract.exe bundled with the app.
fn find_bundled_tesseract(app: &tauri::App) -> Option<PathBuf> {
    // In development: check project root's tesseract directory
    let dev_path = {
        let mut p = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        p.push("tesseract");
        p.push("tesseract.exe");
        p
    };
    if dev_path.exists() {
        return Some(dev_path);
    }

    // In production: check resource directory
    if let Ok(resource_dir) = app.handle().path().resource_dir() {
        let prod_path = resource_dir.join("tesseract").join("tesseract.exe");
        if prod_path.exists() {
            return Some(prod_path);
        }
    }

    None
}

/// Find tesseract installed on the system.
fn find_system_tesseract() -> Option<PathBuf> {
    // Check PATH
    if let Ok(path) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path) {
            let candidate = dir.join("tesseract.exe");
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }

    // Check common install locations
    let common_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\ProgramData\chocolatey\lib\tesseract\tools\tesseract.exe",
    ];

    for p in &common_paths {
        let path = PathBuf::from(p);
        if path.exists() {
            return Some(path);
        }
    }

    None
}

/// Parse tesseract TSV output into OcrBlocks.
fn parse_tsv(output: &[u8]) -> Result<OcrResult, String> {
    let text = String::from_utf8_lossy(output);
    let mut blocks: Vec<OcrBlock> = Vec::new();
    let mut full_text = String::new();

    let mut lines = text.lines();

    // First line is the header; find column indices
    let header = lines.next().ok_or("Empty TSV output")?;
    if !header.starts_with("level") {
        // TSV output not available (maybe older tesseract?), return plain text
        return parse_plain_text(output);
    }

    let cols: Vec<&str> = header.split('\t').collect();
    let idx_level = cols.iter().position(|&c| c == "level").unwrap_or(0);
    let idx_text = cols.iter().position(|&c| c == "text").unwrap_or(11);
    let idx_conf = cols.iter().position(|&c| c == "conf").unwrap_or(10);
    let idx_left = cols.iter().position(|&c| c == "left").unwrap_or(6);
    let idx_top = cols.iter().position(|&c| c == "top").unwrap_or(7);
    let idx_width = cols.iter().position(|&c| c == "width").unwrap_or(8);
    let idx_height = cols.iter().position(|&c| c == "height").unwrap_or(9);

    for line in lines {
        let fields: Vec<&str> = line.split('\t').collect();
        if fields.len() <= idx_text.max(idx_level) {
            continue;
        }

        // Only process word-level entries (level == 5)
        let level: i32 = fields.get(idx_level).and_then(|s| s.parse().ok()).unwrap_or(0);
        if level != 5 {
            continue;
        }

        let text = fields.get(idx_text).unwrap_or(&"");
        let text = text.trim().trim_matches('"').to_string();
        if text.is_empty() {
            continue;
        }

        let conf: f64 = fields.get(idx_conf).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        // Skip low-confidence results
        if conf < 10.0 {
            continue;
        }

        let left: f64 = fields.get(idx_left).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        let top: f64 = fields.get(idx_top).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        let w: f64 = fields.get(idx_width).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        let h: f64 = fields.get(idx_height).and_then(|s| s.parse().ok()).unwrap_or(0.0);

        blocks.push(OcrBlock {
            text: text.clone(),
            bbox_x: left,
            bbox_y: top,
            width: w,
            height: h,
        });

        if !full_text.is_empty() {
            full_text.push(' ');
        }
        full_text.push_str(&text);
    }

    Ok(OcrResult { blocks, full_text, engine: "Tesseract".into() })
}

/// Fallback: parse plain text output (no bounding boxes).
fn parse_plain_text(output: &[u8]) -> Result<OcrResult, String> {
    let text = String::from_utf8_lossy(output);
    let lines: Vec<&str> = text.lines().filter(|l| !l.is_empty()).collect();

    let full_text = lines.join("\n");
    let blocks: Vec<OcrBlock> = lines
        .into_iter()
        .map(|l| OcrBlock {
            text: l.to_string(),
            bbox_x: 0.0,
            bbox_y: 0.0,
            width: 0.0,
            height: 0.0,
        })
        .collect();

    Ok(OcrResult { blocks, full_text, engine: "Tesseract".into() })
}
