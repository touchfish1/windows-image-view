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

pub fn run_ocr(image_path: &str, lang: &str) -> Result<OcrResult, String> {
    let mut tesseract = tesseract::Tesseract::new(None, Some(lang))
        .map_err(|e| format!("Tesseract init failed: {}", e))?;

    tesseract
        .set_image(image_path)
        .map_err(|e| format!("Tesseract set_image failed: {}", e))?;

    let full_text = tesseract
        .get_text()
        .map_err(|e| format!("Tesseract get_text failed: {}", e))?;

    // Get bounding boxes for each text component
    let boxes = tesseract
        .get_words_boxes()
        .map_err(|e| format!("Tesseract get_boxes failed: {}", e))?;

    let blocks: Vec<OcrBlock> = boxes
        .into_iter()
        .map(|b| OcrBlock {
            text: b.text,
            bbox_x: b.x as f64,
            bbox_y: b.y as f64,
            width: b.w as f64,
            height: b.h as f64,
        })
        .collect();

    Ok(OcrResult { blocks, full_text })
}
