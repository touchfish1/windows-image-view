pub mod commands;
pub mod image_loader;
pub mod ocr_engine;
pub mod paddle_ocr;
pub mod exif;
pub mod batch;
pub mod file_assoc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            paddle_ocr::init(app);
            Ok(())
        })
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
            commands::show_in_folder,
            commands::register_file_assoc,
            commands::unregister_file_assoc,
            commands::check_file_assoc,
            commands::open_default_apps,
            commands::register_default_program,
            commands::move_to_trash,
            commands::write_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
