// commands/database.rs — Connect to external MySQL / MongoDB and run queries.
//
// MySQL  : uses the blocking `mysql` crate, wrapped in spawn_blocking so it
//          does not stall the async executor.
// MongoDB: uses the async `mongodb` crate directly.

use crate::{MongoState, MySqlState};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use tauri::State;

// ---------------------------------------------------------------------------
// Shared DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Map<String, Value>>,
    pub affected_rows: Option<u64>,
    pub error: Option<String>,
}

// ---------------------------------------------------------------------------
// MySQL commands
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct MySqlConnectParams {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
}

/// Establish (or replace) the current MySQL connection pool.
#[tauri::command]
pub async fn connect_mysql(
    params: MySqlConnectParams,
    state: State<'_, MySqlState>,
) -> Result<String, String> {
    let url = format!(
        "mysql://{}:{}@{}:{}/{}",
        urlencoding::encode(&params.username),
        urlencoding::encode(&params.password),
        params.host,
        params.port,
        params.database,
    );

    // Build the pool on a blocking thread so we don't block the executor
    let url_clone = url.clone();
    let pool = tokio::task::spawn_blocking(move || mysql::Pool::new(url_clone.as_str()))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?;

    // Verify connectivity by pinging the server
    let pool_clone = pool.clone();
    tokio::task::spawn_blocking(move || {
        let mut conn = pool_clone.get_conn().map_err(|e| e.to_string())?;
        mysql::prelude::Queryable::query_drop(&mut conn, "SELECT 1")
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())??;

    // Store in shared state
    let mut guard = state.0.lock().map_err(|_| "Lock poisoned")?;
    *guard = Some(pool);

    Ok(format!(
        "Connected to MySQL at {}:{}/{}",
        params.host, params.port, params.database
    ))
}

/// Execute a SQL query against the active MySQL connection.
#[tauri::command]
pub async fn run_mysql_query(
    query: String,
    state: State<'_, MySqlState>,
) -> Result<QueryResult, String> {
    let pool = {
        let guard = state.0.lock().map_err(|_| "Lock poisoned")?;
        guard
            .clone()
            .ok_or("Not connected to MySQL. Please connect first.")?
    };

    let query_clone = query.clone();
    let result = tokio::task::spawn_blocking(move || {
        use mysql::prelude::Queryable;

        let mut conn = pool.get_conn().map_err(|e| e.to_string())?;
        let result: Vec<mysql::Row> = conn.query(query_clone).map_err(|e| e.to_string())?;

        let mut columns: Vec<String> = Vec::new();
        let mut rows: Vec<Map<String, Value>> = Vec::new();

        for (i, row) in result.iter().enumerate() {
            // Extract column names once from the first row
            if i == 0 {
                columns = row
                    .columns_ref()
                    .iter()
                    .map(|c| c.name_str().to_string())
                    .collect();
            }
            let mut map = Map::new();
            for (j, col) in columns.iter().enumerate() {
                let val: mysql::Value = row.get(j).unwrap_or(mysql::Value::NULL);
                let json_val = mysql_value_to_json(val);
                map.insert(col.clone(), json_val);
            }
            rows.push(map);
        }

        Ok::<QueryResult, String>(QueryResult {
            columns,
            rows,
            affected_rows: None,
            error: None,
        })
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(result)
}

/// Convert a MySQL value to a serde_json Value.
fn mysql_value_to_json(val: mysql::Value) -> Value {
    match val {
        mysql::Value::NULL => Value::Null,
        mysql::Value::Bytes(b) => {
            Value::String(String::from_utf8_lossy(&b).to_string())
        }
        mysql::Value::Int(i) => Value::Number(i.into()),
        mysql::Value::UInt(u) => Value::Number(u.into()),
        mysql::Value::Float(f) => serde_json::Number::from_f64(f as f64)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        mysql::Value::Double(d) => serde_json::Number::from_f64(d)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        mysql::Value::Date(y, m, d, h, min, s, _) => {
            Value::String(format!("{:04}-{:02}-{:02} {:02}:{:02}:{:02}", y, m, d, h, min, s))
        }
        mysql::Value::Time(neg, d, h, m, s, _) => {
            let sign = if neg { "-" } else { "" };
            Value::String(format!("{}{}:{:02}:{:02}:{:02}", sign, d, h, m, s))
        }
    }
}

// ---------------------------------------------------------------------------
// MongoDB commands
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct MongoConnectParams {
    pub uri: String,
    pub database: String,
}

/// Connect to a MongoDB instance using a URI.
#[tauri::command]
pub async fn connect_mongodb(
    params: MongoConnectParams,
    state: State<'_, MongoState>,
) -> Result<String, String> {
    use mongodb::{options::ClientOptions, Client};

    let mut client_options = ClientOptions::parse(&params.uri)
        .await
        .map_err(|e| e.to_string())?;

    client_options.app_name = Some("DevHub".to_string());

    let client = Client::with_options(client_options).map_err(|e| e.to_string())?;

    // Ping the database to verify connection
    client
        .database(&params.database)
        .run_command(bson::doc! { "ping": 1 }, None)
        .await
        .map_err(|e| format!("Connection test failed: {e}"))?;

    let mut guard = state.0.lock().await;
    *guard = Some(client);

    Ok(format!("Connected to MongoDB database '{}'", params.database))
}

/// Run a find query against a MongoDB collection.
/// `filter_json` is an optional JSON object used as the query filter.
#[tauri::command]
pub async fn run_mongodb_query(
    database: String,
    collection_name: String,
    filter_json: Option<String>,
    state: State<'_, MongoState>,
) -> Result<QueryResult, String> {
    use futures::stream::TryStreamExt;
    use mongodb::bson::Document;

    let client = {
        let guard = state.0.lock().await;
        guard
            .clone()
            .ok_or("Not connected to MongoDB. Please connect first.")?
    };

    // Parse the filter, defaulting to an empty document (returns all)
    let filter: Option<Document> = if let Some(json) = filter_json {
        if json.trim().is_empty() {
            None
        } else {
            let bson_val: bson::Bson = serde_json::from_str::<Value>(&json)
                .map_err(|e| format!("Invalid filter JSON: {e}"))?
                .try_into()
                .map_err(|e: bson::extjson::de::Error| e.to_string())?;
            Some(bson_val.as_document().cloned().unwrap_or_default())
        }
    } else {
        None
    };

    let collection: mongodb::Collection<Document> =
        client.database(&database).collection(&collection_name);

    let cursor = collection
        .find(filter, None)
        .await
        .map_err(|e| e.to_string())?;

    let docs: Vec<Document> = cursor.try_collect().await.map_err(|e| e.to_string())?;

    // Derive column names from all unique keys across the first 50 docs
    let mut col_set: indexmap::IndexSet<String> = indexmap::IndexSet::new();
    for doc in docs.iter().take(50) {
        for key in doc.keys() {
            col_set.insert(key.clone());
        }
    }
    let columns: Vec<String> = col_set.into_iter().collect();

    // Convert documents to JSON rows
    let rows: Vec<Map<String, Value>> = docs
        .iter()
        .map(|doc| {
            let json: Value = bson::to_bson(doc)
                .ok()
                .and_then(|b| serde_json::to_value(b).ok())
                .unwrap_or(Value::Object(Map::new()));
            json.as_object().cloned().unwrap_or_default()
        })
        .collect();

    Ok(QueryResult {
        columns,
        rows,
        affected_rows: None,
        error: None,
    })
}
