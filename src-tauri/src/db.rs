// db.rs — SQLite initialisation and shared connection helper.

use rusqlite::Connection;
use std::path::PathBuf;

/// Returns the path to the SQLite file, creating parent directories as needed.
pub fn db_path() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir().ok_or("Cannot locate user data directory")?;
    let app_dir = data_dir.join("devhub");
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    Ok(app_dir.join("devhub.db"))
}

/// Opens a new connection to the SQLite database.
/// Each command that needs DB calls this — rusqlite with the `bundled` feature
/// handles concurrent access safely through WAL mode.
pub fn get_conn() -> Result<Connection, String> {
    let path = db_path()?;
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;

    // Enable WAL for better concurrency and performance
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")
        .map_err(|e| e.to_string())?;

    // Enable cascading foreign-key deletes
    conn.execute_batch("PRAGMA foreign_keys=ON;")
        .map_err(|e| e.to_string())?;

    Ok(conn)
}

/// Creates all required tables if they do not already exist.
pub fn init_database() -> Result<(), String> {
    let conn = get_conn()?;

    conn.execute_batch(
        "
        -- API request collections
        CREATE TABLE IF NOT EXISTS collections (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );

        -- Saved API requests within a collection
        CREATE TABLE IF NOT EXISTS requests (
            id            TEXT PRIMARY KEY,
            collection_id TEXT NOT NULL,
            name          TEXT NOT NULL,
            method        TEXT NOT NULL DEFAULT 'GET',
            url           TEXT NOT NULL DEFAULT '',
            headers       TEXT NOT NULL DEFAULT '[]',
            params        TEXT NOT NULL DEFAULT '[]',
            body          TEXT NOT NULL DEFAULT '',
            body_type     TEXT NOT NULL DEFAULT 'none',
            created_at    TEXT NOT NULL,
            updated_at    TEXT NOT NULL,
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
        );

        -- Lightweight record kept after every request is sent
        CREATE TABLE IF NOT EXISTS request_history (
            id            TEXT PRIMARY KEY,
            method        TEXT NOT NULL,
            url           TEXT NOT NULL,
            status        INTEGER NOT NULL DEFAULT 0,
            response_time INTEGER NOT NULL DEFAULT 0,
            created_at    TEXT NOT NULL
        );

        -- Code snippets
        CREATE TABLE IF NOT EXISTS snippets (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            code        TEXT NOT NULL DEFAULT '',
            language    TEXT NOT NULL DEFAULT 'text',
            tags        TEXT NOT NULL DEFAULT '[]',
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );
        ",
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
