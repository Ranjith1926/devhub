// commands/collections.rs — CRUD for API collections and the requests inside them.

use crate::db::get_conn;
use crate::models::{Collection, HistoryEntry, SavedRequest};
use chrono::Utc;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_collections() -> Result<Vec<Collection>, String> {
    let conn = get_conn()?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM collections
             ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut collections = Vec::new();
    for r in rows {
        collections.push(r.map_err(|e| e.to_string())?);
    }
    Ok(collections)
}

#[tauri::command]
pub fn save_collection(name: String, description: String) -> Result<Collection, String> {
    let conn = get_conn()?;
    let now = Utc::now().to_rfc3339();
    let collection = Collection {
        id: Uuid::new_v4().to_string(),
        name,
        description,
        created_at: now.clone(),
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO collections (id, name, description, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![
            collection.id,
            collection.name,
            collection.description,
            collection.created_at,
            collection.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(collection)
}

#[tauri::command]
pub fn delete_collection(id: String) -> Result<(), String> {
    let conn = get_conn()?;
    // Requests are deleted automatically via ON DELETE CASCADE
    conn.execute("DELETE FROM collections WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Requests within a collection
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_requests(collection_id: String) -> Result<Vec<SavedRequest>, String> {
    let conn = get_conn()?;
    let mut stmt = conn
        .prepare(
            "SELECT id, collection_id, name, method, url, headers, params, body, body_type,
                    created_at, updated_at
             FROM requests
             WHERE collection_id = ?1
             ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params![collection_id], |row| {
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
        .map_err(|e| e.to_string())?;

    let mut requests = Vec::new();
    for r in rows {
        requests.push(r.map_err(|e| e.to_string())?);
    }
    Ok(requests)
}

#[tauri::command]
pub fn save_request(
    collection_id: String,
    name: String,
    method: String,
    url: String,
    headers: String,
    params: String,
    body: String,
    body_type: String,
) -> Result<SavedRequest, String> {
    let conn = get_conn()?;
    let now = Utc::now().to_rfc3339();
    let req = SavedRequest {
        id: Uuid::new_v4().to_string(),
        collection_id,
        name,
        method,
        url,
        headers,
        params,
        body,
        body_type,
        created_at: now.clone(),
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO requests
            (id, collection_id, name, method, url, headers, params, body, body_type, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
        rusqlite::params![
            req.id, req.collection_id, req.name, req.method, req.url,
            req.headers, req.params, req.body, req.body_type,
            req.created_at, req.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(req)
}

#[tauri::command]
pub fn update_request(
    id: String,
    name: String,
    method: String,
    url: String,
    headers: String,
    params: String,
    body: String,
    body_type: String,
) -> Result<(), String> {
    let conn = get_conn()?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE requests
         SET name=?1, method=?2, url=?3, headers=?4, params=?5, body=?6, body_type=?7, updated_at=?8
         WHERE id=?9",
        rusqlite::params![name, method, url, headers, params, body, body_type, now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_request(id: String) -> Result<(), String> {
    let conn = get_conn()?;
    conn.execute("DELETE FROM requests WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Request history
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_request_history() -> Result<Vec<HistoryEntry>, String> {
    let conn = get_conn()?;
    let mut stmt = conn
        .prepare(
            "SELECT id, method, url, status, response_time, created_at
             FROM request_history
             ORDER BY created_at DESC
             LIMIT 200",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(HistoryEntry {
                id: row.get(0)?,
                method: row.get(1)?,
                url: row.get(2)?,
                status: row.get(3)?,
                response_time: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for r in rows {
        entries.push(r.map_err(|e| e.to_string())?);
    }
    Ok(entries)
}

#[tauri::command]
pub fn save_history_entry(
    method: String,
    url: String,
    status: i64,
    response_time: i64,
) -> Result<(), String> {
    let conn = get_conn()?;
    let entry = HistoryEntry {
        id: Uuid::new_v4().to_string(),
        method,
        url,
        status,
        response_time,
        created_at: Utc::now().to_rfc3339(),
    };
    conn.execute(
        "INSERT INTO request_history (id, method, url, status, response_time, created_at)
         VALUES (?1,?2,?3,?4,?5,?6)",
        rusqlite::params![
            entry.id, entry.method, entry.url,
            entry.status, entry.response_time, entry.created_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn clear_history() -> Result<(), String> {
    let conn = get_conn()?;
    conn.execute("DELETE FROM request_history", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}
