// commands/http.rs — Tauri IPC command that proxies HTTP requests from the UI.
// Running requests server-side (Rust) avoids CORS restrictions and allows the
// frontend to reach any URL the user specifies.

use reqwest::{Client, Method};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;
use std::time::Instant;

// ---------------------------------------------------------------------------
// Request / Response DTOs
// ---------------------------------------------------------------------------

/// Parameters sent by the frontend for an outgoing HTTP request.
#[derive(Debug, Deserialize)]
pub struct HttpRequestConfig {
    pub method: String,
    pub url: String,
    /// Flat list of [key, value] pairs (enabled pairs only).
    pub headers: Vec<[String; 2]>,
    /// Flat list of [key, value] pairs appended as query-string.
    pub params: Vec<[String; 2]>,
    pub body: Option<String>,
    /// "none" | "json" | "text"
    pub body_type: String,
}

/// Response data sent back to the frontend.
#[derive(Debug, Serialize)]
pub struct HttpResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    /// Round-trip time in milliseconds.
    pub time: u64,
    /// Response body size in bytes.
    pub size: usize,
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

/// Send an HTTP request and return the response.
/// This is an async Tauri command — Tauri's tokio runtime handles it.
#[tauri::command]
pub async fn make_http_request(config: HttpRequestConfig) -> Result<HttpResponse, String> {
    // Build a client that accepts self-signed TLS certs (handy for local dev APIs)
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| e.to_string())?;

    let method = Method::from_str(&config.method.to_uppercase()).map_err(|e| e.to_string())?;

    // Append query params to URL
    let mut url = config.url.clone();
    let active_params: Vec<_> = config
        .params
        .iter()
        .filter(|p| !p[0].is_empty())
        .collect();

    if !active_params.is_empty() {
        let already_has_query = url.contains('?');
        url.push(if already_has_query { '&' } else { '?' });
        let qs: Vec<String> = active_params
            .iter()
            .map(|p| {
                format!(
                    "{}={}",
                    urlencoding::encode(&p[0]),
                    urlencoding::encode(&p[1])
                )
            })
            .collect();
        url.push_str(&qs.join("&"));
    }

    let mut req_builder = client.request(method, &url);

    // Attach headers
    for h in &config.headers {
        if !h[0].is_empty() {
            req_builder = req_builder.header(h[0].as_str(), h[1].as_str());
        }
    }

    // Attach body and set Content-Type when applicable
    if let Some(body) = &config.body {
        match config.body_type.as_str() {
            "json" if !body.is_empty() => {
                req_builder = req_builder
                    .header("Content-Type", "application/json")
                    .body(body.clone());
            }
            "text" if !body.is_empty() => {
                req_builder = req_builder.body(body.clone());
            }
            _ => {}
        }
    }

    let start = Instant::now();
    let response = req_builder.send().await.map_err(|e| e.to_string())?;
    let elapsed_ms = start.elapsed().as_millis() as u64;

    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("Unknown")
        .to_string();

    // Collect response headers
    let mut resp_headers: HashMap<String, String> = HashMap::new();
    for (k, v) in response.headers() {
        resp_headers.insert(
            k.as_str().to_string(),
            v.to_str().unwrap_or("").to_string(),
        );
    }

    let body_bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let size = body_bytes.len();
    // Lossy-convert the body so we never panic on binary responses
    let body = String::from_utf8_lossy(&body_bytes).to_string();

    Ok(HttpResponse {
        status,
        status_text,
        headers: resp_headers,
        body,
        time: elapsed_ms,
        size,
    })
}
