use std::path::PathBuf;
use tauri_plugin_fs::FsExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let data_root = data_root_path()
                .map_err(|message| std::io::Error::new(std::io::ErrorKind::NotFound, message))?;

            std::fs::create_dir_all(&data_root)?;
            app.fs_scope().allow_directory(&data_root, true)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_data_root])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// OneDrive\0VibeCoding\DailyBread\데이터 — 여러 PC에서 공유하는 묵상 기록·성경 DB
#[tauri::command]
fn get_data_root() -> Result<String, String> {
    Ok(data_root_path()?.to_string_lossy().into_owned())
}

fn data_root_path() -> Result<PathBuf, String> {
    Ok(resolve_onedrive()?
        .join("0VibeCoding")
        .join("DailyBread")
        .join("데이터"))
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
