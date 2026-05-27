use std::path::Path;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub path: String,
}

pub fn get_image_info(path: &str) -> Result<ImageInfo, String> {
    let (width, height) = image::image_dimensions(Path::new(path))
        .map_err(|e| format!("Failed to get image dimensions: {}", e))?;

    Ok(ImageInfo {
        width,
        height,
        path: path.to_string(),
    })
}
