# DevHub — Developer Productivity Hub

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Tauri](https://img.shields.io/badge/Tauri-v1-brightgreen)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

A modern Windows desktop application built with **Tauri + React (TypeScript)** — an all-in-one developer productivity tool.

## Features

| Feature | Description |
|---|---|
| **API Tester** | Postman-like HTTP client with collections, history, response viewer |
| **JSON Tools** | Format, validate, minify JSON + JSON → TypeScript interface generator |
| **Snippet Manager** | Save, tag, search and copy code snippets |
| **Database Tool** | Connect to MySQL & MongoDB, run queries, view results |

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **State**: Zustand
- **Editor**: CodeMirror 6 (syntax highlighting for JSON, SQL, JS, Python, HTML, CSS)
- **Backend**: Tauri v1 (Rust)
- **Storage**: SQLite (rusqlite bundled)

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| Rust | ≥ 1.70 (stable) |
| Tauri CLI | Installed via npm |
| WebView2 | Ships with Windows 11; install for Windows 10 |

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
npm install -g @tauri-apps/cli
```

---

## Getting Started

```bash
# Clone / enter project
cd devhub

# Install JS dependencies
npm install

# Run in development mode (opens Tauri window + HMR)
npm run tauri dev

# Build for production
npm run tauri build
```

---

## Project Structure

```
devhub/
├── src/                        # React frontend
│   ├── components/
│   │   ├── ui/                 # Reusable UI primitives
│   │   └── Layout/             # Sidebar, TabBar
│   ├── features/
│   │   ├── api/                # API Tester
│   │   ├── json/               # JSON Tools
│   │   ├── snippets/           # Snippet Manager
│   │   └── database/           # Database Tool
│   ├── store/                  # Zustand stores
│   ├── hooks/                  # Custom React hooks
│   └── types/                  # Shared TypeScript types
└── src-tauri/                  # Rust/Tauri backend
    └── src/
        ├── commands/           # Tauri IPC command handlers
        ├── db.rs               # SQLite initialization
        └── models.rs           # Shared data models
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Enter` | Send API request |
| `Ctrl+N` | New tab |
| `Ctrl+W` | Close current tab |
| `Ctrl+1..4` | Switch to feature tab |
| `Ctrl+Shift+E` | Export data |
| `Ctrl+Shift+I` | Import data |

---

## Icons

Generate Tauri app icons from your own 1024×1024 PNG:

```bash
npm run tauri icon path/to/your-icon.png
```

This auto-generates all required sizes in `src-tauri/icons/`.

---

## Adding External Database Drivers

- **MySQL**: Already included via `mysql` crate — just provide connection credentials in the UI.
- **MongoDB**: Included via `mongodb` crate — provide a MongoDB URI (Atlas or local).

For MongoDB Atlas, typical URI format:
```
mongodb+srv://user:pass@cluster.mongodb.net/database
```

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

MIT
