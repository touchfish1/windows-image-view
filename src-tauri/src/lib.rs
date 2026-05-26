use std::sync::Mutex;
use tauri::Manager;

pub mod commands;
pub mod image_loader;
pub mod ocr_engine;
#[cfg(windows)]
pub mod paddle_ocr;
pub mod exif;
pub mod batch;
#[cfg(windows)]
pub mod file_assoc;

pub struct LaunchFile(pub Mutex<Option<String>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(windows)]
            paddle_ocr::init(app);
            let launch_file = std::env::args().skip(1).next();
            app.manage(LaunchFile(Mutex::new(launch_file)));
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
            #[cfg(windows)]
            commands::register_file_assoc,
            #[cfg(windows)]
            commands::unregister_file_assoc,
            #[cfg(windows)]
            commands::check_file_assoc,
            #[cfg(windows)]
            commands::open_default_apps,
            #[cfg(windows)]
            commands::register_default_program,
            commands::move_to_trash,
            commands::write_text_file,
            commands::get_launch_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
