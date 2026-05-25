use crate::{image_loader, ocr_engine};

#[tauri::command]
pub fn open_image(path: String) -> Result<image_loader::ImageInfo, String> {
    image_loader::get_image_info(&path)
}

#[tauri::command]
pub fn run_ocr(path: String, lang: Option<String>) -> Result<ocr_engine::OcrResult, String> {
    let lang = lang.unwrap_or_else(|| "zh-Hans".to_string());
    ocr_engine::run_ocr(&path, &lang)
}
