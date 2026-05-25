use image::DynamicImage;
use std::path::Path;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub data: String, // base64 encoded image data
}

pub fn load_image(path: &str) -> Result<DynamicImage, String> {
    let img = image::open(Path::new(path))
        .map_err(|e| format!("Failed to load image: {}", e))?;
    Ok(img)
}

pub fn get_image_info(path: &str) -> Result<ImageInfo, String> {
    let img = load_image(path)?;
    let width = img.width();
    let height = img.height();

    // Resize for display if too large (max 4096px on either dimension, preserves aspect ratio)
    let display_img = if width > 4096 || height > 4096 {
        img.thumbnail(4096, 4096)
    } else {
        img
    };

    // Return actual display dimensions (may differ from original after resize)
    let display_width = display_img.width();
    let display_height = display_img.height();

    // Encode to JPEG base64 for transport to frontend
    let mut buf = std::io::Cursor::new(Vec::new());
    display_img
        .write_to(&mut buf, image::ImageFormat::Jpeg)
        .map_err(|e| format!("Failed to encode image: {}", e))?;
    let b64 = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        buf.get_ref(),
    );

    Ok(ImageInfo {
        width: display_width,
        height: display_height,
        data: format!("data:image/jpeg;base64,{}", b64),
    })
}

