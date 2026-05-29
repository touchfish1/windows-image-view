use std::io::Cursor;
use std::path::Path;

const THUMBNAIL_MAX_W: u32 = 1920;
const THUMBNAIL_MAX_H: u32 = 1080;

const BASE64_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub path: String,
    /// Base64 JPEG data URL of a downscaled version (None if image ≤ threshold).
    /// For large images (>1920×1080), provides a memory-efficient display version.
    pub thumbnail_url: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CropRect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

fn base64_encode(data: &[u8]) -> String {
    let mut result = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        match chunk.len() {
            1 => {
                result.push(BASE64_CHARS[(chunk[0] >> 2) as usize] as char);
                result.push(BASE64_CHARS[((chunk[0] & 0x03) << 4) as usize] as char);
                result.push_str("==");
            }
            2 => {
                result.push(BASE64_CHARS[(chunk[0] >> 2) as usize] as char);
                result.push(BASE64_CHARS[((chunk[0] & 0x03) << 4 | chunk[1] >> 4) as usize] as char);
                result.push(BASE64_CHARS[((chunk[1] & 0x0f) << 2) as usize] as char);
                result.push('=');
            }
            _ => {
                result.push(BASE64_CHARS[(chunk[0] >> 2) as usize] as char);
                result.push(BASE64_CHARS[((chunk[0] & 0x03) << 4 | chunk[1] >> 4) as usize] as char);
                result.push(BASE64_CHARS[((chunk[1] & 0x0f) << 2 | chunk[2] >> 6) as usize] as char);
                result.push(BASE64_CHARS[(chunk[2] & 0x3f) as usize] as char);
            }
        }
    }
    result
}

pub fn get_image_info(path: &str) -> Result<ImageInfo, String> {
    let p = Path::new(path);
    let (width, height) = image::image_dimensions(p)
        .map_err(|e| format!("Failed to get image dimensions: {}", e))?;

    let thumbnail_url = if width > THUMBNAIL_MAX_W || height > THUMBNAIL_MAX_H {
        generate_thumbnail(p, width, height)
    } else {
        None
    };

    Ok(ImageInfo {
        width,
        height,
        path: path.to_string(),
        thumbnail_url,
    })
}

/// Decode, downscale to fit within THUMBNAIL_MAX_W × THUMBNAIL_MAX_H (maintaining
/// aspect ratio), and return a base64 JPEG data URL. Returns None on any failure
/// (unsupported format, corrupt file, etc.) — the frontend falls back to full-res.
fn generate_thumbnail(p: &Path, width: u32, height: u32) -> Option<String> {
    let img = image::open(p).ok()?;

    let (new_w, new_h) = if width > height {
        (THUMBNAIL_MAX_W, (height * THUMBNAIL_MAX_W / width).max(1))
    } else {
        ((width * THUMBNAIL_MAX_H / height).max(1), THUMBNAIL_MAX_H)
    };

    // Fast path: skip resize if already small enough
    if new_w >= width && new_h >= height {
        return None;
    }

    let resized = img.resize_exact(new_w, new_h, image::imageops::FilterType::Lanczos3);

    let mut buf = Cursor::new(Vec::new());
    resized.write_to(&mut buf, image::ImageFormat::Jpeg).ok()?;

    let b64 = base64_encode(&buf.into_inner());
    Some(format!("data:image/jpeg;base64,{}", b64))
}

/// Crop a region from the image and save as `<stem>_cropped.<ext>` next to the original.
/// Returns the path of the new file.
pub fn crop_image(path: &str, rect: &CropRect) -> Result<String, String> {
    let p = Path::new(path);

    // Validate crop rect
    let (orig_w, orig_h) = image::image_dimensions(p)
        .map_err(|e| format!("Failed to get image dimensions: {}", e))?;
    if rect.width == 0 || rect.height == 0 {
        return Err("Crop region must have non-zero width and height".into());
    }
    if rect.x + rect.width > orig_w || rect.y + rect.height > orig_h {
        return Err(format!(
            "Crop region ({}+{} x {}+{}) exceeds image bounds ({}x{})",
            rect.x, rect.width, rect.y, rect.height, orig_w, orig_h
        ));
    }

    let img = image::open(p).map_err(|e| format!("Failed to open image: {}", e))?;
    let cropped = img.crop_imm(rect.x, rect.y, rect.width, rect.height);

    // Generate new filename: stem_cropped.ext
    let stem = p.file_stem().unwrap_or_default().to_string_lossy();
    let ext = p.extension().unwrap_or_default().to_string_lossy();
    let new_path = p.with_file_name(format!("{}_cropped.{}", stem, ext));

    cropped
        .save(&new_path)
        .map_err(|e| format!("Failed to save cropped image: {}", e))?;

    Ok(new_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    /// Create a solid-color PNG for testing. Returns (path, width, height).
    fn create_test_image(name: &str, w: u32, h: u32) -> PathBuf {
        let dir = std::env::temp_dir().join("image_viewer_ocr_test");
        let _ = fs::create_dir_all(&dir);
        let path = dir.join(format!("{}_{}x{}.png", name, w, h));
        let img = image::RgbaImage::from_fn(w, h, |_, _| {
            image::Rgba([128u8, 64, 192, 255])
        });
        img.save(&path).expect("failed to write test png");
        path
    }

    fn path_str(p: &PathBuf) -> String {
        p.to_string_lossy().to_string()
    }

    #[test]
    fn test_crop_valid_region() {
        let src = create_test_image("valid", 100, 100);
        let rect = CropRect { x: 10, y: 10, width: 30, height: 30 };
        let result = crop_image(&path_str(&src), &rect);
        assert!(result.is_ok(), "crop should succeed: {:?}", result.err());

        let cropped = result.unwrap();
        let cropped_path = Path::new(&cropped);
        assert!(cropped_path.exists(), "cropped file should exist");

        let (cw, ch) = image::image_dimensions(cropped_path).unwrap();
        assert_eq!(cw, 30, "cropped width");
        assert_eq!(ch, 30, "cropped height");

        // Cleanup
        let _ = fs::remove_file(&src);
        let _ = fs::remove_file(cropped_path);
    }

    #[test]
    fn test_crop_full_image() {
        let src = create_test_image("full", 64, 48);
        let rect = CropRect { x: 0, y: 0, width: 64, height: 48 };
        let result = crop_image(&path_str(&src), &rect);
        assert!(result.is_ok());

        let cropped = result.unwrap();
        let cropped_path = Path::new(&cropped);
        let (cw, ch) = image::image_dimensions(cropped_path).unwrap();
        assert_eq!(cw, 64);
        assert_eq!(ch, 48);

        let _ = fs::remove_file(&src);
        let _ = fs::remove_file(cropped_path);
    }

    #[test]
    fn test_crop_zero_width() {
        let src = create_test_image("zw", 50, 50);
        let rect = CropRect { x: 0, y: 0, width: 0, height: 10 };
        let result = crop_image(&path_str(&src), &rect);
        assert!(result.is_err(), "zero width should fail");
        let _ = fs::remove_file(&src);
    }

    #[test]
    fn test_crop_zero_height() {
        let src = create_test_image("zh", 50, 50);
        let rect = CropRect { x: 0, y: 0, width: 10, height: 0 };
        let result = crop_image(&path_str(&src), &rect);
        assert!(result.is_err(), "zero height should fail");
        let _ = fs::remove_file(&src);
    }

    #[test]
    fn test_crop_out_of_bounds_x() {
        let src = create_test_image("oobx", 50, 50);
        let rect = CropRect { x: 40, y: 0, width: 20, height: 10 };
        let result = crop_image(&path_str(&src), &rect);
        assert!(result.is_err(), "should error when x+width > orig_w");
        let _ = fs::remove_file(&src);
    }

    #[test]
    fn test_crop_out_of_bounds_y() {
        let src = create_test_image("ooby", 50, 50);
        let rect = CropRect { x: 0, y: 45, width: 10, height: 20 };
        let result = crop_image(&path_str(&src), &rect);
        assert!(result.is_err(), "should error when y+height > orig_h");
        let _ = fs::remove_file(&src);
    }

    #[test]
    fn test_crop_invalid_path() {
        let rect = CropRect { x: 0, y: 0, width: 10, height: 10 };
        let result = crop_image("/nonexistent/path.png", &rect);
        assert!(result.is_err(), "invalid path should fail");
    }
}
