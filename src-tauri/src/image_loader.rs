use std::path::Path;
use base64::Engine;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub data: String, // base64 data URL
    pub path: String,
}

pub fn load_image(path: &str) -> Result<ImageInfo, String> {
    let bytes = std::fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Fast dimension extraction (reads only header bytes)
    let (width, height) = image::image_dimensions(Path::new(path))
        .map_err(|e| format!("Failed to get image dimensions: {}", e))?;

    // Determine mime type from extension
    let mime = match Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .as_deref()
    {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("bmp") => "image/bmp",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        _ => "image/png",
    };

    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    let data = format!("data:{};base64,{}", mime, b64);

    Ok(ImageInfo {
        width,
        height,
        data,
        path: path.to_string(),
    })
}

pub fn get_image_info(path: &str) -> Result<ImageInfo, String> {
    load_image(path)
}
