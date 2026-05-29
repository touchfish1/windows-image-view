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
