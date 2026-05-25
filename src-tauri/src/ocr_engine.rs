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
    // Chain the builder methods since they take self by value
    let mut tesseract = tesseract::Tesseract::new(None, Some(lang))
        .map_err(|e| format!("Tesseract init failed: {}", e))?
        .set_image(image_path)
        .map_err(|e| format!("Tesseract set_image failed: {}", e))?
        .recognize()
        .map_err(|e| format!("Tesseract recognize failed: {}", e))?;

    let full_text = tesseract
        .get_text()
        .map_err(|e| format!("Tesseract get_text failed: {}", e))?;

    // Parse TSV output to get word-level bounding boxes
    // TSV columns: level, page_num, block_num, par_num, line_num, word_num,
    //              left, top, width, height, conf, text
    let tsv = tesseract
        .get_tsv_text(0)
        .map_err(|e| format!("Tesseract get_tsv_text failed: {}", e))?;

    let blocks = parse_tsv_blocks(&tsv);

    Ok(OcrResult { blocks, full_text })
}

fn parse_tsv_blocks(tsv: &str) -> Vec<OcrBlock> {
    let mut blocks = Vec::new();

    for line in tsv.lines().skip(1) {
        // Split on tabs — TSV uses tab separators
        let cols: Vec<&str> = line.split('\t').collect();
        if cols.len() < 12 {
            continue;
        }

        // Only process word-level entries (level == 5)
        let level: i32 = cols[0].parse().unwrap_or(0);
        if level != 5 {
            continue;
        }

        // Skip empty text entries
        let text = cols[11].trim().to_string();
        if text.is_empty() {
            continue;
        }

        let left: f64 = cols[6].parse().unwrap_or(0.0);
        let top: f64 = cols[7].parse().unwrap_or(0.0);
        let width: f64 = cols[8].parse().unwrap_or(0.0);
        let height: f64 = cols[9].parse().unwrap_or(0.0);

        blocks.push(OcrBlock {
            text,
            bbox_x: left,
            bbox_y: top,
            width,
            height,
        });
    }

    blocks
}
