// commands/snippets.rs — CRUD for code snippets stored in SQLite.

use crate::db::get_conn;
use crate::models::Snippet;
use chrono::Utc;
use uuid::Uuid;

#[tauri::command]
pub fn get_snippets() -> Result<Vec<Snippet>, String> {
    let conn = get_conn()?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, code, language, tags, created_at, updated_at
             FROM snippets
             ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
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
        .map_err(|e| e.to_string())?;

    let mut snippets = Vec::new();
    for r in rows {
        snippets.push(r.map_err(|e| e.to_string())?);
    }
    Ok(snippets)
}

#[tauri::command]
pub fn save_snippet(
    name: String,
    description: String,
    code: String,
    language: String,
    tags: String,
) -> Result<Snippet, String> {
    let conn = get_conn()?;
    let now = Utc::now().to_rfc3339();
    let snippet = Snippet {
        id: Uuid::new_v4().to_string(),
        name,
        description,
        code,
        language,
        tags,
        created_at: now.clone(),
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO snippets (id, name, description, code, language, tags, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        rusqlite::params![
            snippet.id, snippet.name, snippet.description,
            snippet.code, snippet.language, snippet.tags,
            snippet.created_at, snippet.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(snippet)
}

#[tauri::command]
pub fn update_snippet(
    id: String,
    name: String,
    description: String,
    code: String,
    language: String,
    tags: String,
) -> Result<(), String> {
    let conn = get_conn()?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE snippets
         SET name=?1, description=?2, code=?3, language=?4, tags=?5, updated_at=?6
         WHERE id=?7",
        rusqlite::params![name, description, code, language, tags, now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_snippet(id: String) -> Result<(), String> {
    let conn = get_conn()?;
    conn.execute("DELETE FROM snippets WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
