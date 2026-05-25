use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::OnceLock;
use tauri::Manager;

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

static PADDLE_PATH: OnceLock<Option<PathBuf>> = OnceLock::new();

/// Initialize PaddleOCR-json path from Tauri app resources.
pub fn init(app: &tauri::App) {
    PADDLE_PATH.set(find_paddle_ocr(app)).ok();
}

/// Check if PaddleOCR-json is available.
pub fn is_available() -> bool {
    PADDLE_PATH
        .get()
        .and_then(|p| p.as_ref())
        .map(|p| p.exists())
        .unwrap_or(false)
}

/// Run PaddleOCR-json OCR on an image.
pub fn run_ocr(path: &str) -> Result<OcrResult, String> {
    let engine_path = PADDLE_PATH
        .get()
        .and_then(|p| p.as_ref())
        .ok_or_else(|| "PaddleOCR-json not available".to_string())?;

    let engine_dir = engine_path.parent().ok_or("Invalid engine path")?;

    let output = std::process::Command::new(engine_path)
        .arg("--config_path=config.txt")
        .arg(format!("--image_path={}", path))
        .current_dir(engine_dir)
        .output()
        .map_err(|e| format!("Failed to run PaddleOCR-json: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!("PaddleOCR-json stderr: {}", stderr);
        return Err(format!("PaddleOCR-json error: {}", stderr));
    }

    parse_json_output(&output.stdout)
}

/// Parse JSON output from PaddleOCR-json.
///
/// The engine outputs initialization info (plain text) followed by a single JSON line.
fn parse_json_output(output: &[u8]) -> Result<OcrResult, String> {
    let raw = String::from_utf8_lossy(output);

    // Find the first '{' and last '}' to extract JSON
    let json_start = raw.find('{').ok_or("No JSON found in output")?;
    let json_end = raw.rfind('}').ok_or("No JSON end found in output")?;
    let json_str = &raw[json_start..=json_end];

    let value: serde_json::Value =
        serde_json::from_str(json_str).map_err(|e| format!("JSON parse error: {e}"))?;

    let code = value["code"].as_i64().unwrap_or(-1);

    match code {
        100 => {
            let data = value["data"]
                .as_array()
                .ok_or_else(|| "Invalid data: expected array".to_string())?;

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
                            b[0][0].as_f64().unwrap_or(0.0),
                            b[0][1].as_f64().unwrap_or(0.0),
                            b[2][0].as_f64().unwrap_or(0.0),
                            b[2][1].as_f64().unwrap_or(0.0),
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
                engine: "PaddleOCR".into(),
            })
        }
        101 => Ok(OcrResult {
            blocks: vec![],
            full_text: String::new(),
            engine: "PaddleOCR".into(),
        }),
        code => {
            let msg = value["data"].as_str().unwrap_or("Unknown error");
            Err(format!("PaddleOCR error ({}): {}", code, msg))
        }
    }
}

/// Find PaddleOCR-json bundled with the app.
fn find_paddle_ocr(app: &tauri::App) -> Option<PathBuf> {
    // Dev: CARGO_MANIFEST_DIR/paddleocr/PaddleOCR-json/PaddleOCR-json.exe
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

    // Prod: resource_dir/paddleocr/PaddleOCR-json/PaddleOCR-json.exe
    if let Ok(resource_dir) = app.handle().path().resource_dir() {
        let prod_path = resource_dir
            .join("paddleocr")
            .join("PaddleOCR-json")
            .join("PaddleOCR-json.exe");
        if prod_path.exists() {
            return Some(prod_path);
        }
    }

    None
}
