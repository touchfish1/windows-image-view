use std::path::Path;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExifData {
    pub fields: Vec<ExifField>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExifField {
    pub label: String,
    pub value: String,
}

pub fn read_exif(path: &str) -> Result<ExifData, String> {
    let mut fields = Vec::new();

    // Always add basic image info
    if let Ok(meta) = std::fs::metadata(path) {
        fields.push(ExifField {
            label: "文件大小".to_string(),
            value: format_file_size(meta.len()),
        });
    }
    if let Ok(dims) = image::image_dimensions(Path::new(path)) {
        fields.push(ExifField {
            label: "图像尺寸".to_string(),
            value: format!("{} x {}", dims.0, dims.1),
        });
    }

    // Try to read EXIF metadata (may not exist for all images)
    if let Ok(file) = std::fs::File::open(path) {
        let mut reader = std::io::BufReader::new(file);
        let exif_reader = exif::Reader::new();
        if let Ok(exif) = exif_reader.read_from_container(&mut reader) {
            for f in exif.fields() {
                let label = match f.tag {
                    exif::Tag::Make => "相机厂商".to_string(),
                    exif::Tag::Model => "相机型号".to_string(),
                    exif::Tag::ExposureTime => "曝光时间".to_string(),
                    exif::Tag::FNumber => "光圈".to_string(),
                    exif::Tag::ISOSpeed => "ISO".to_string(),
                    exif::Tag::FocalLength => "焦距".to_string(),
                    exif::Tag::DateTimeOriginal => "拍摄日期".to_string(),
                    exif::Tag::Software => "软件".to_string(),
                    _ => continue,
                };
                let value = f.display_value().to_string();
                fields.push(ExifField { label, value });
            }
        }
    }

    if fields.is_empty() {
        return Err("No image info found".to_string());
    }

    Ok(ExifData { fields })
}

fn format_file_size(size: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB"];
    let mut size = size as f64;
    let mut unit_idx = 0;
    while size > 1024.0 && unit_idx < UNITS.len() - 1 {
        size /= 1024.0;
        unit_idx += 1;
    }
    format!("{:.1} {}", size, UNITS[unit_idx])
}
