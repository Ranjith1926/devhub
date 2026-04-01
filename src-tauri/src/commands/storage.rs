// commands/storage.rs — Export all app data to JSON and import it back.

use crate::db::get_conn;
use crate::models::{Collection, ExportData, SavedRequest, Snippet};
use chrono::Utc;

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/// Gather all collections, requests, and snippets into a single JSON envelope.
#[tauri::command]
pub fn export_data() -> Result<String, String> {
    let conn = get_conn()?;

    // --- Collections ---
    let mut stmt = conn
        .prepare("SELECT id, name, description, created_at, updated_at FROM collections")
        .map_err(|e| e.to_string())?;
    let collections: Vec<Collection> = stmt
        .query_map([], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // --- Requests ---
    let mut stmt = conn
        .prepare(
            "SELECT id, collection_id, name, method, url, headers, params, body, body_type,
                    created_at, updated_at FROM requests",
        )
        .map_err(|e| e.to_string())?;
    let requests: Vec<SavedRequest> = stmt
        .query_map([], |row| {
            Ok(SavedRequest {
                id: row.get(0)?,
                collection_id: row.get(1)?,
                name: row.get(2)?,
                method: row.get(3)?,
                url: row.get(4)?,
                headers: row.get(5)?,
                params: row.get(6)?,
                body: row.get(7)?,
                body_type: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // --- Snippets ---
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, code, language, tags, created_at, updated_at
             FROM snippets",
        )
        .map_err(|e| e.to_string())?;
    let snippets: Vec<Snippet> = stmt
        .query_map([], |row| {
            Ok(Snippet {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                code: row.get(3)?,
                language: row.get(4)?,
                tags: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let envelope = ExportData {
        version: "1.0".to_string(),
        exported_at: Utc::now().to_rfc3339(),
        collections,
        requests,
        snippets,
    };

    serde_json::to_string_pretty(&envelope).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/// Merge an exported JSON envelope into the database.
/// Conflicts (same id) are ignored (INSERT OR IGNORE).
#[tauri::command]
pub fn import_data(json: String) -> Result<String, String> {
    let envelope: ExportData =
        serde_json::from_str(&json).map_err(|e| format!("Invalid import JSON: {e}"))?;

    let conn = get_conn()?;

    let mut imported_collections = 0usize;
    let mut imported_requests = 0usize;
    let mut imported_snippets = 0usize;

    for col in &envelope.collections {
        let n = conn.execute(
            "INSERT OR IGNORE INTO collections (id, name, description, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5)",
            rusqlite::params![col.id, col.name, col.description, col.created_at, col.updated_at],
        )
        .map_err(|e| e.to_string())?;
        imported_collections += n;
    }

    for req in &envelope.requests {
        let n = conn.execute(
            "INSERT OR IGNORE INTO requests
                (id, collection_id, name, method, url, headers, params, body, body_type, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
            rusqlite::params![
                req.id, req.collection_id, req.name, req.method, req.url,
                req.headers, req.params, req.body, req.body_type,
                req.created_at, req.updated_at,
            ],
        )
        .map_err(|e| e.to_string())?;
        imported_requests += n;
    }

    for snip in &envelope.snippets {
        let n = conn.execute(
            "INSERT OR IGNORE INTO snippets
                (id, name, description, code, language, tags, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
            rusqlite::params![
                snip.id, snip.name, snip.description, snip.code,
                snip.language, snip.tags, snip.created_at, snip.updated_at,
            ],
        )
        .map_err(|e| e.to_string())?;
        imported_snippets += n;
    }

    Ok(format!(
        "Imported {} collection(s), {} request(s), {} snippet(s).",
        imported_collections, imported_requests, imported_snippets
    ))
}
