// DevHub — Tauri main entry point
// Registers all IPC command handlers and initialises the SQLite database.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod models;

use commands::{collections::*, database::*, http::*, snippets::*, storage::*};

// ---------------------------------------------------------------------------
// Tauri application state
// ---------------------------------------------------------------------------

/// Holds an optional MySQL connection pool, shared across command invocations.
pub struct MySqlState(pub std::sync::Mutex<Option<mysql::Pool>>);

/// Holds an optional MongoDB client, shared across async command invocations.
pub struct MongoState(pub tokio::sync::Mutex<Option<mongodb::Client>>);

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

fn main() {
    // Initialise the SQLite database (creates file + tables if required)
    if let Err(e) = db::init_database() {
        eprintln!("[DevHub] Failed to initialise database: {e}");
        std::process::exit(1);
    }

    tauri::Builder::default()
        // Register shared state accessible via `State<T>` in commands
        .manage(MySqlState(std::sync::Mutex::new(None)))
        .manage(MongoState(tokio::sync::Mutex::new(None)))
        // Register every IPC command the frontend can call
        .invoke_handler(tauri::generate_handler![
            // HTTP requests
            make_http_request,
            // API collections
            get_collections,
            save_collection,
            delete_collection,
            // API requests within collections
            get_requests,
            save_request,
            update_request,
            delete_request,
            // Request history
            get_request_history,
            save_history_entry,
            clear_history,
            // Snippets
            get_snippets,
            save_snippet,
            update_snippet,
            delete_snippet,
            // External databases
            connect_mysql,
            run_mysql_query,
            connect_mongodb,
            run_mongodb_query,
            // Import / export
            export_data,
            import_data,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running DevHub");
}
