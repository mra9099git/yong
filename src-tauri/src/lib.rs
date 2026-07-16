use std::path::PathBuf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![get_data_root, get_app_root])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// OneDrive\0VibeCoding\일용할양식 — 묵상 기록·성경 DB
#[tauri::command]
fn get_data_root() -> Result<String, String> {
    let root = resolve_onedrive()?.join("0VibeCoding").join("일용할양식");
    Ok(root.to_string_lossy().into_owned())
}

/// OneDrive\0VibeCoding\daily-bread — 앱(소스) 권장 위치
#[tauri::command]
fn get_app_root() -> Result<String, String> {
    let root = resolve_onedrive()?.join("0VibeCoding").join("daily-bread");
    Ok(root.to_string_lossy().into_owned())
}

fn resolve_onedrive() -> Result<PathBuf, String> {
    for key in ["OneDrive", "OneDriveConsumer", "OneDriveCommercial"] {
        if let Ok(val) = std::env::var(key) {
            let trimmed = val.trim();
            if !trimmed.is_empty() {
                return Ok(PathBuf::from(trimmed));
            }
        }
    }

    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| {
            "OneDrive 폴더를 찾을 수 없습니다. OneDrive가 설치·로그인되어 있는지 확인해 주세요."
                .to_string()
        })?;

    Ok(PathBuf::from(home).join("OneDrive"))
}
