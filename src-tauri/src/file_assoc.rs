use std::path::Path;
use winreg::enums::*;
use winreg::RegKey;
use winreg::enums::RegType;

const APP_NAME: &str = "ImageViewerOCR";
const EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "bmp", "gif", "webp", "tiff", "tif", "ico", "svg"];

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AssocStatus {
    pub extension: String,
    pub is_registered: bool,
}

fn app_exe_path() -> String {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.to_str().map(|s| s.to_string()))
        .unwrap_or_else(|| "image-viewer-ocr.exe".to_string())
}

fn exe_name() -> String {
    Path::new(&app_exe_path())
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image-viewer-ocr.exe")
        .to_string()
}

pub fn register_extension(ext: &str) -> Result<(), String> {

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    // 1. Register app command (OpenWithList)
    let app_cmd_path = format!(
        "Software\\Classes\\Applications\\{}\\shell\\open\\command",
        exe_name()
    );
    let app_key = hkcu
        .create_subkey(&app_cmd_path)
        .map_err(|e| format!("Failed to create app key: {}", e))?;
    app_key
        .0
        .set_value("", &format!("\"{}\" \"%1\"", app_exe_path()))
        .map_err(|e| format!("Failed to set command: {}", e))?;

    // 2. Register progid
    let progid_cmd_path = format!("Software\\Classes\\{}\\shell\\open\\command", APP_NAME);
    let progid_key = hkcu
        .create_subkey(&progid_cmd_path)
        .map_err(|e| format!("Failed to create progid key: {}", e))?;
    progid_key
        .0
        .set_value("", &format!("\"{}\" \"%1\"", app_exe_path()))
        .map_err(|e| format!("Failed to set progid command: {}", e))?;

    // 3. Set progid friendly name
    let progid_name_key = hkcu
        .create_subkey(&format!("Software\\Classes\\{}", APP_NAME))
        .map_err(|e| format!("Failed to create progid name key: {}", e))?;
    progid_name_key
        .0
        .set_value("", &"Image Viewer")
        .map_err(|e| format!("Failed to set progid name: {}", e))?;

    // 4. Register extension with progid
    let ext_key = hkcu
        .create_subkey(&format!("Software\\Classes\\.{}", ext))
        .map_err(|e| format!("Failed to create ext key: {}", e))?;
    ext_key
        .0
        .set_value("", &APP_NAME)
        .map_err(|e| format!("Failed to set default extension handler: {}", e))?;

    // 5. Register OpenWithProgids (REG_NONE value)
    let openwith_key = hkcu
        .create_subkey(&format!("Software\\Classes\\.{}\\OpenWithProgids", ext))
        .map_err(|e| format!("Failed to create OpenWithProgids key: {}", e))?;
    openwith_key
        .0
        .set_raw_value(
            APP_NAME,
            &winreg::RegValue {
                bytes: Vec::new(),
                vtype: RegType::REG_NONE,
            },
        )
        .map_err(|e| format!("Failed to set OpenWithProgids: {}", e))?;

    Ok(())
}

pub fn unregister_extension(ext: &str) -> Result<(), String> {

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    // Remove extension default
    let ext_key_path = format!("Software\\Classes\\.{}", ext);
    if let Ok(ext_key) = hkcu.open_subkey_with_flags(&ext_key_path, KEY_READ | KEY_WRITE) {
        // Clear the default value if it points to our app
        let current: String = ext_key.get_value("").unwrap_or_default();
        if current == APP_NAME {
            let _ = ext_key.set_value("", &"");
        }
    }

    // Remove OpenWithProgids entry
    let openwith_path = format!("Software\\Classes\\.{}\\OpenWithProgids", ext);
    if let Ok(openwith_key) = hkcu.open_subkey_with_flags(&openwith_path, KEY_READ | KEY_WRITE) {
        let _ = openwith_key.delete_value(APP_NAME);
    }

    Ok(())
}

pub fn check_registration() -> Vec<AssocStatus> {

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    EXTENSIONS
        .iter()
        .map(|ext| {
            let ext_key_path = format!("Software\\Classes\\.{}", ext);
            let is_registered = hkcu
                .open_subkey(&ext_key_path)
                .and_then(|key| key.get_value::<String, _>(""))
                .map(|val| val == APP_NAME)
                .unwrap_or(false);
            AssocStatus {
                extension: ext.to_string(),
                is_registered,
            }
        })
        .collect()
}

pub fn open_default_apps_settings() -> Result<(), String> {
    // Open Windows "Default apps by file type" settings page
    let result = std::process::Command::new("cmd")
        .args(["/c", "start", "ms-settings:defaultapps"])
        .spawn();
    if result.is_err() {
        // Fallback: open Control Panel Default Programs
        std::process::Command::new("control")
            .arg("/name")
            .arg("Microsoft.DefaultPrograms")
            .arg("/page")
            .arg("pageFileAssoc")
            .spawn()
            .map_err(|e| format!("Failed to open settings: {}", e))?;
    }
    Ok(())
}
