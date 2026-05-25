use std::path::Path;
use winreg::enums::*;
use winreg::RegKey;
use winreg::enums::RegType;

const APP_NAME: &str = "ImageViewerOCR";
const APP_DISPLAY_NAME: &str = "Image Viewer OCR";
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
    // Ensure we're registered as a default program candidate first
    let _ = register_as_default_program();

    // Deep-link to our app in Windows 10/11 Settings (requires Windows 11 2023+ or Win10)
    // If deep-link fails, fall back to generic default apps page
    let deep_link = format!("ms-settings:defaultapps?registeredAppUser={}", APP_NAME);
    let result = std::process::Command::new("cmd")
        .args(["/c", "start", "", &deep_link])
        .spawn();

    if result.is_err() {
        // Fallback: open generic Default Apps settings
        let fallback = std::process::Command::new("cmd")
            .args(["/c", "start", "ms-settings:defaultapps"])
            .spawn();
        if fallback.is_err() {
            // Final fallback: Control Panel
            std::process::Command::new("control")
                .arg("/name")
                .arg("Microsoft.DefaultPrograms")
                .spawn()
                .map_err(|e| format!("Failed to open settings: {}", e))?;
        }
    }
    Ok(())
}

/// Registers the app as a "Default Program" candidate in Windows.
/// This makes the app appear in Settings > Default Apps with its
/// associated file types, and enables deep-linking via
/// ms-settings:defaultapps?registeredAppUser=ImageViewerOCR
pub fn register_as_default_program() -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let exe = app_exe_path();

    // 1. Register in HKCU\Software\RegisteredApplications
    let caps_key_path = format!("Software\\{}", APP_NAME);
    let registered_key = hkcu
        .create_subkey("Software\\RegisteredApplications")
        .map_err(|e| format!("Failed to open RegisteredApplications: {}", e))?;
    registered_key
        .0
        .set_value(APP_NAME, &format!("{}\\Capabilities", caps_key_path))
        .map_err(|e| format!("Failed to set RegisteredApplications: {}", e))?;

    // 2. Create Capabilities key with app info
    let caps_key = hkcu
        .create_subkey(&format!("{}\\Capabilities", caps_key_path))
        .map_err(|e| format!("Failed to create Capabilities key: {}", e))?;
    caps_key
        .0
        .set_value("ApplicationName", &APP_DISPLAY_NAME)
        .map_err(|e| format!("Failed to set ApplicationName: {}", e))?;
    caps_key
        .0
        .set_value("ApplicationDescription", &"A modern desktop image viewer with OCR text recognition")
        .map_err(|e| format!("Failed to set ApplicationDescription: {}", e))?;
    caps_key
        .0
        .set_value("ApplicationIcon", &format!("\"{}\",0", exe))
        .map_err(|e| format!("Failed to set ApplicationIcon: {}", e))?;

    // 3. Register FileAssociations: map each extension to our ProgID
    let assoc_key = hkcu
        .create_subkey(&format!("{}\\Capabilities\\FileAssociations", caps_key_path))
        .map_err(|e| format!("Failed to create FileAssociations key: {}", e))?;
    for ext in EXTENSIONS {
        assoc_key
            .0
            .set_value(&format!(".{}", ext), &APP_NAME)
            .map_err(|e| format!("Failed to set FileAssociations for .{}: {}", ext, e))?;
    }

    // 4. Register SupportedFileTypes (shown in Settings)
    let types_key = hkcu
        .create_subkey(&format!("{}\\Capabilities\\SupportedFileTypes", caps_key_path))
        .map_err(|e| format!("Failed to create SupportedFileTypes key: {}", e))?;
    for ext in EXTENSIONS {
        types_key
            .0
            .set_value(&ext.to_uppercase(), &format!(".{}", ext))
            .map_err(|e| format!("Failed to set SupportedFileTypes for {}: {}", ext, e))?;
    }

    // 5. Register URL Protocol for any potential deep-linking
    let _url_key = hkcu
        .create_subkey(&format!("{}\\Capabilities\\URLProtocols", caps_key_path))
        .map_err(|e| format!("Failed to create URLProtocols key: {}", e))?;
    // No URL protocols for now, but the key exists for future use

    Ok(())
}
