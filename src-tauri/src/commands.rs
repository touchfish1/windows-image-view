use crate::{image_loader, ocr_engine};

#[tauri::command]
pub fn open_image(path: String) -> Result<image_loader::ImageInfo, String> {
    image_loader::get_image_info(&path)
}

#[tauri::command]
pub async fn run_ocr(path: String, _lang: Option<String>) -> Result<ocr_engine::OcrResult, String> {
    tokio::task::spawn_blocking(move || {
        #[cfg(windows)]
        {
            // Try PaddleOCR-json first (best accuracy, especially for Chinese)
            if crate::paddle_ocr::is_available() {
                match crate::paddle_ocr::run_ocr(&path) {
                    Ok(result) if !result.blocks.is_empty() => {
                        return Ok(ocr_engine::OcrResult {
                            engine: "PaddleOCR".to_string(),
                            blocks: result.blocks.into_iter().map(|b| ocr_engine::OcrBlock {
                                text: b.text,
                                bbox_x: b.bbox_x,
                                bbox_y: b.bbox_y,
                                width: b.width,
                                height: b.height,
                            }).collect(),
                            full_text: result.full_text,
                        });
                    }
                    Ok(_) => { /* empty — fall through */ }
                    Err(e) => eprintln!("PaddleOCR failed, falling back: {e}"),
                }
            }
        }

        let lang = _lang.unwrap_or_default();
        ocr_engine::run_ocr(&path, &lang)
    })
    .await
    .map_err(|e| format!("OCR task failed: {}", e))?
}

#[tauri::command]
pub fn list_images(path: String) -> Result<Vec<String>, String> {
    let parent = std::path::Path::new(&path).parent()
        .ok_or_else(|| "No parent directory".to_string())?;
    let extensions = ["png", "jpg", "jpeg", "bmp", "gif", "webp"];

    let mut entries: Vec<String> = std::fs::read_dir(parent)
        .map_err(|e| format!("Failed to read directory: {}", e))?
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.path().is_file())
        .filter(|entry| {
            entry.path().extension()
                .and_then(|e| e.to_str())
                .map(|e| extensions.contains(&e.to_lowercase().as_str()))
                .unwrap_or(false)
        })
        .map(|entry| entry.path().to_string_lossy().to_string())
        .collect::<Vec<_>>();

    entries.sort();
    Ok(entries)
}

#[tauri::command]
pub fn get_file_size(path: String) -> Result<u64, String> {
    std::fs::metadata(&path)
        .map(|m| m.len())
        .map_err(|e| format!("Failed to read file metadata: {}", e))
}

#[tauri::command]
pub fn read_exif(path: String) -> Result<crate::exif::ExifData, String> {
    crate::exif::read_exif(&path)
}

#[tauri::command]
pub fn convert_images(options: crate::batch::ConvertOptions) -> Result<crate::batch::ConvertResult, String> {
    Ok(crate::batch::convert_images(options))
}

#[tauri::command]
pub fn rename_files(items: Vec<crate::batch::RenameItem>) -> Result<crate::batch::RenameResult, String> {
    Ok(crate::batch::rename_files(items))
}

#[tauri::command]
pub fn preview_rename(files: Vec<String>, pattern: String, start_num: usize) -> Result<Vec<crate::batch::RenameItem>, String> {
    Ok(crate::batch::preview_rename(files, &pattern, start_num))
}

#[tauri::command]
pub fn save_image_as(source: String, dest: String) -> Result<(), String> {
    std::fs::copy(&source, &dest)
        .map_err(|e| format!("Failed to save image: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn show_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open explorer: {}", e))?;
    }
    Ok(())
}

#[cfg(windows)]
#[tauri::command]
pub fn register_file_assoc(extensions: Vec<String>) -> Result<(), String> {
    for ext in &extensions {
        crate::file_assoc::register_extension(ext)?;
    }
    Ok(())
}

#[cfg(windows)]
#[tauri::command]
pub fn unregister_file_assoc(extensions: Vec<String>) -> Result<(), String> {
    for ext in &extensions {
        crate::file_assoc::unregister_extension(ext)?;
    }
    Ok(())
}

#[cfg(windows)]
#[tauri::command]
pub fn check_file_assoc() -> Vec<crate::file_assoc::AssocStatus> {
    crate::file_assoc::check_registration()
}

#[cfg(windows)]
#[tauri::command]
pub fn open_default_apps() -> Result<(), String> {
    crate::file_assoc::open_default_apps_settings()
}

#[cfg(windows)]
#[tauri::command]
pub fn register_default_program() -> Result<(), String> {
    crate::file_assoc::register_as_default_program()
}

#[tauri::command]
pub fn move_to_trash(path: String) -> Result<(), String> {
    trash::delete(&path).map_err(|e| format!("Failed to move to trash: {}", e))
}

#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))
}
