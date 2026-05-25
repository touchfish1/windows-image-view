pub mod commands;
pub mod image_loader;
pub mod ocr_engine;
pub mod exif;
pub mod batch;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::open_image,
            commands::run_ocr,
            commands::list_images,
            commands::get_file_size,
            commands::read_exif,
            commands::convert_images,
            commands::rename_files,
            commands::preview_rename,
            commands::save_image_as,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
