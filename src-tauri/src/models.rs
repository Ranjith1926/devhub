// models.rs — Shared data-transfer structs serialised/deserialised with serde.

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// API collections & requests
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
}

/// A saved HTTP request inside a collection.
/// `headers` and `params` are stored as JSON-serialised arrays of [key, value] objects.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedRequest {
    pub id: String,
    pub collection_id: String,
    pub name: String,
    pub method: String,
    pub url: String,
    /// JSON array of { key, value, enabled } objects
    pub headers: String,
    /// JSON array of { key, value, enabled } objects
    pub params: String,
    pub body: String,
    /// "none" | "json" | "text" | "form"
    pub body_type: String,
    pub created_at: String,
    pub updated_at: String,
}

// ---------------------------------------------------------------------------
// Request history
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub method: String,
    pub url: String,
    pub status: i64,
    pub response_time: i64,
    pub created_at: String,
}

// ---------------------------------------------------------------------------
// Snippets
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snippet {
    pub id: String,
    pub name: String,
    pub description: String,
    pub code: String,
    pub language: String,
    /// JSON array of tag strings
    pub tags: String,
    pub created_at: String,
    pub updated_at: String,
}

// ---------------------------------------------------------------------------
// Export / import envelope
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub version: String,
    pub exported_at: String,
    pub collections: Vec<Collection>,
    pub requests: Vec<SavedRequest>,
    pub snippets: Vec<Snippet>,
    /// Request history — optional so old export files remain compatible.
    #[serde(default)]
    pub history: Vec<HistoryEntry>,
}
