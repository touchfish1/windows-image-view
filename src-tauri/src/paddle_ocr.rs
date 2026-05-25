use std::path::PathBuf;
use std::sync::OnceLock;
use tauri::Manager;

use crate::tesseract_ocr::{OcrBlock, OcrResult};

static PADDLE_PATH: OnceLock<Option<PathBuf>> = OnceLock::new();
static RAPID_PATH: OnceLock<Option<PathBuf>> = OnceLock::new();

/// Initialize PaddleOCR/RapidOCR paths from Tauri app resources.
pub fn init(app: &tauri::App) {
    PADDLE_PATH.set(find_paddle_ocr(app)).ok();
    RAPID_PATH.set(find_rapid_ocr(app)).ok();
}

/// Check if PaddleOCR-json is available.
pub fn is_paddle_available() -> bool {
    PADDLE_PATH
        .get()
        .and_then(|p| p.as_ref())
        .map(|p| p.exists())
        .unwrap_or(false)
}

/// Check if RapidOCR-json is available.
pub fn is_rapid_available() -> bool {
    RAPID_PATH
        .get()
        .and_then(|p| p.as_ref())
        .map(|p| p.exists())
        .unwrap_or(false)
}

/// Run PaddleOCR-json or RapidOCR-json on an image.
/// Returns Ok(result) if successful with non-empty text,
/// or an Err with description if unavailable or failed.
pub fn run_ocr(path: &str, _lang: &str) -> Result<OcrResult, String> {
    // Try PaddleOCR-json first (better accuracy, requires AVX)
    if let Some(p) = PADDLE_PATH.get().and_then(|p| p.as_ref()) {
        match run_engine(p, path, "PaddleOCR") {
            Ok(result) if !result.blocks.is_empty() => return Ok(result),
            Ok(_) => { /* empty result — fall through */ }
            Err(e) => {
                eprintln!("PaddleOCR-json failed: {e}");
            }
        }
    }

    // Fallback to RapidOCR-json (no AVX needed, ONNX-based)
    if let Some(p) = RAPID_PATH.get().and_then(|p| p.as_ref()) {
        match run_engine(p, path, "RapidOCR") {
            Ok(result) if !result.blocks.is_empty() => return Ok(result),
            Ok(_) => { /* empty result — fall through */ }
            Err(e) => {
                eprintln!("RapidOCR-json failed: {e}");
            }
        }
    }

    Err("No PaddleOCR engine available or all returned empty".into())
}

/// Run a single OCR engine process and parse its JSON output.
fn run_engine(engine_path: &PathBuf, image_path: &str, engine_name: &str) -> Result<OcrResult, String> {
    let engine_dir = engine_path.parent().ok_or("Invalid engine path")?;

    let mut cmd = std::process::Command::new(engine_path);

    // PaddleOCR-json needs an explicit config path; RapidOCR auto-detects models/
    if engine_name == "PaddleOCR" {
        cmd.arg("--config_path=config.txt");
    }

    let output = cmd
        .arg(format!("--image_path={}", image_path))
        .current_dir(engine_dir)
        .output()
        .map_err(|e| format!("Failed to run {}: {}", engine_name, e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!("{} stderr: {}", engine_name, stderr);
        return Err(format!("{} exited with error: {}", engine_name, stderr));
    }

    parse_json_output(&output.stdout, engine_name)
}

/// Parse JSON output from PaddleOCR-json / RapidOCR-json.
///
/// The engine outputs initialization info (plain text) followed by a single JSON line.
/// We find the JSON by locating the outermost `{...}`.
fn parse_json_output(output: &[u8], engine_name: &str) -> Result<OcrResult, String> {
    let raw = String::from_utf8_lossy(output);

    // Find the first '{' and last '}' to extract JSON
    let json_start = raw.find('{').ok_or_else(|| "No JSON found in output".to_string())?;
    let json_end = raw.rfind('}').ok_or_else(|| "No JSON end found in output".to_string())?;
    let json_str = &raw[json_start..=json_end];

    let value: serde_json::Value =
        serde_json::from_str(json_str).map_err(|e| format!("JSON parse error: {e}"))?;

    let code = value["code"].as_i64().unwrap_or(-1);

    match code {
        100 => {
            let data = value["data"]
                .as_array()
                .ok_or_else(|| "Invalid data format: expected array".to_string())?;

            let mut blocks: Vec<OcrBlock> = Vec::new();
            let mut full_text = String::new();

            for item in data {
                let text = item["text"].as_str().unwrap_or("").to_string();
                if text.is_empty() {
                    continue;
                }

                let score = item["score"].as_f64().unwrap_or(0.0);
                if score < 0.3 {
                    continue;
                }

                let box_arr = item["box"].as_array().and_then(|b| {
                    if b.len() >= 4 {
                        Some((
                            b[0][0].as_f64().unwrap_or(0.0), // left-top x
                            b[0][1].as_f64().unwrap_or(0.0), // left-top y
                            b[2][0].as_f64().unwrap_or(0.0), // right-bottom x
                            b[2][1].as_f64().unwrap_or(0.0), // right-bottom y
                        ))
                    } else {
                        None
                    }
                });

                if let Some((left, top, right, bottom)) = box_arr {
                    blocks.push(OcrBlock {
                        text: text.clone(),
                        bbox_x: left,
                        bbox_y: top,
                        width: right - left,
                        height: bottom - top,
                    });
                } else {
                    blocks.push(OcrBlock {
                        text: text.clone(),
                        bbox_x: 0.0,
                        bbox_y: 0.0,
                        width: 0.0,
                        height: 0.0,
                    });
                }

                if !full_text.is_empty() {
                    full_text.push(' ');
                }
                full_text.push_str(&text);
            }

            Ok(OcrResult {
                blocks,
                full_text,
                engine: engine_name.into(),
            })
        }
        101 => {
            // No text found in image
            Ok(OcrResult {
                blocks: vec![],
                full_text: String::new(),
                engine: engine_name.into(),
            })
        }
        code => {
            let msg = value["data"].as_str().unwrap_or("Unknown error");
            Err(format!("{} error ({}): {}", engine_name, code, msg))
        }
    }
}

/// Find PaddleOCR-json bundled with the app.
fn find_paddle_ocr(app: &tauri::App) -> Option<PathBuf> {
    // In development: check project root's paddleocr directory
    let dev_path = {
        let mut p = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        p.push("paddleocr");
        p.push("PaddleOCR-json");
        p.push("PaddleOCR-json.exe");
        p
    };
    if dev_path.exists() {
        return Some(dev_path);
    }

    // In production: check resource directory
    if let Ok(resource_dir) = app.handle().path().resource_dir() {
        let prod_path = resource_dir.join("paddleocr").join("PaddleOCR-json").join("PaddleOCR-json.exe");
        if prod_path.exists() {
            return Some(prod_path);
        }
    }

    None
}

/// Find RapidOCR-json bundled with the app.
fn find_rapid_ocr(app: &tauri::App) -> Option<PathBuf> {
    // In development: check project root's paddleocr directory
    let dev_path = {
        let mut p = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        p.push("paddleocr");
        p.push("RapidOCR-json");
        p.push("RapidOCR-json.exe");
        p
    };
    if dev_path.exists() {
        return Some(dev_path);
    }

    // In production: check resource directory
    if let Ok(resource_dir) = app.handle().path().resource_dir() {
        let prod_path = resource_dir.join("paddleocr").join("RapidOCR-json").join("RapidOCR_json.exe");
        if prod_path.exists() {
            return Some(prod_path);
        }
    }

    None
}
