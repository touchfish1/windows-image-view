use std::path::Path;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConvertOptions {
    pub files: Vec<String>,
    pub target_format: String,
    pub output_dir: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConvertResult {
    pub success: Vec<String>,
    pub failed: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RenameItem {
    pub old_path: String,
    pub new_name: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RenameResult {
    pub success: Vec<(String, String)>,
    pub failed: Vec<(String, String)>,
}

pub fn convert_images(options: ConvertOptions) -> ConvertResult {
    let mut success = Vec::new();
    let mut failed = Vec::new();

    if let Err(e) = std::fs::create_dir_all(&options.output_dir) {
        failed.push(format!("Failed to create output directory: {}", e));
        return ConvertResult { success, failed };
    }

    for file in &options.files {
        let input = Path::new(file);
        let stem = input.file_stem().and_then(|s| s.to_str()).unwrap_or("image");
        let output_name = format!("{}.{}", stem, options.target_format);
        let output_path = Path::new(&options.output_dir).join(&output_name);

        match image::open(file) {
            Ok(img) => {
                let save_result = match options.target_format.as_str() {
                    "png" => img.save_with_format(&output_path, image::ImageFormat::Png),
                    "jpeg" => img.save_with_format(&output_path, image::ImageFormat::Jpeg),
                    "webp" => img.save_with_format(&output_path, image::ImageFormat::WebP),
                    "bmp" => img.save_with_format(&output_path, image::ImageFormat::Bmp),
                    _ => img.save_with_format(&output_path, image::ImageFormat::Png),
                };
                match save_result {
                    Ok(_) => success.push(output_path.to_string_lossy().to_string()),
                    Err(e) => failed.push(format!("{}: {}", file, e)),
                }
            }
            Err(e) => failed.push(format!("{}: {}", file, e)),
        }
    }

    ConvertResult { success, failed }
}

pub fn rename_files(items: Vec<RenameItem>) -> RenameResult {
    let mut success = Vec::new();
    let mut failed = Vec::new();

    for item in &items {
        let old = Path::new(&item.old_path);
        let parent = old.parent().unwrap_or(Path::new("."));
        let new_path = parent.join(&item.new_name);

        match std::fs::rename(&item.old_path, &new_path) {
            Ok(_) => success.push((item.old_path.clone(), new_path.to_string_lossy().to_string())),
            Err(e) => failed.push((item.old_path.clone(), format!("{}: {}", item.new_name, e))),
        }
    }

    RenameResult { success, failed }
}

pub fn preview_rename(files: Vec<String>, pattern: &str, start_num: usize) -> Vec<RenameItem> {
    files.iter().enumerate().map(|(i, path)| {
        let input = Path::new(path);
        let ext = input.extension().and_then(|e| e.to_str()).unwrap_or("");
        let new_name = pattern
            .replace("{n}", &(start_num + i).to_string())
            .replace("{ext}", ext)
            .replace("{original}", input.file_stem().and_then(|s| s.to_str()).unwrap_or("image"));
        RenameItem {
            old_path: path.clone(),
            new_name,
        }
    }).collect()
}
