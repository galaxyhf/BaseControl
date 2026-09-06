mod commands;
mod models;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::list_databases,
            commands::drop_databases
        ])
        .run(tauri::generate_context!())
        .expect("não foi possível iniciar o BaseControl");
}
