# Image Viewer OCR

A modern desktop image viewer with **OCR text recognition**, built with Tauri 2. Supports common image formats, batch operations, slideshow, EXIF metadata, and Windows native OCR.

## Features

| Category | Details |
|---|---|
| **Image Viewing** | PNG, JPG, BMP, GIF, WebP, TIFF, ICO, SVG |
| **Navigation** | Auto-scan folder, prev/next, thumbnail sidebar |
| **Zoom & Pan** | Scroll-wheel zoom, drag-to-pan, fit-window / actual-size toggle |
| **OCR** | Windows WinRT OCR — select text blocks in image, copy recognized text |
| **EXIF** | View image metadata (camera, settings, timestamps) |
| **Fullscreen** | F11 toggle, immersive viewing |
| **Slideshow** | Auto-play with configurable interval (2s/3s/5s/10s) |
| **Batch Convert** | Convert multiple images to PNG/JPEG/WebP/BMP |
| **Batch Rename** | Rename files by pattern with preview |
| **File Association** | Register as default image viewer per extension |
| **Drag & Drop** | Drop images directly into the window |
| **Keyboard Shortcuts** | Full keyboard navigation |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `←` / `→` | Previous / Next image |
| `Ctrl+O` | Open image |
| `Ctrl+W` | Toggle fit-window mode |
| `Ctrl+0` | Actual size (100%) |
| `F11` | Toggle fullscreen |
| `F5` | Start slideshow |
| `Esc` | Exit fullscreen / slideshow |
| `Ctrl+C` | Copy selected OCR text |
| `Mouse wheel` | Zoom in / out |
| `Drag` | Pan image (free zoom mode) |

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Framework | [Tauri 2](https://v2.tauri.app) |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Icons | Lucide React |
| Backend | Rust |
| OCR Engine | Windows WinRT Media.Ocr (native) |
| Font | Inter |

## Getting Started

### Prerequisites

- Rust (latest stable) — [rustup.rs](https://rustup.rs)
- Node.js 18+
- Windows 10+ (OCR requires Windows)

### Development

```bash
# Install frontend dependencies
npm install

# Start development server (requires Rust + Tauri CLI)
npm run tauri dev

# Or run frontend-only for UI work
npm run dev
# Open http://localhost:1420 in browser
```

### Build

```bash
npm run tauri build
# Output in src-tauri/target/release/bundle/
```

## Project Structure

```
image-viewer-ocr/
├── src/                          # Frontend (React)
│   ├── components/               # UI Components
│   │   ├── ui/                   # Base UI primitives (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   └── context-menu.tsx
│   │   ├── Toolbar.tsx           # Main toolbar
│   │   ├── ImageCanvas.tsx       # Canvas renderer + zoom/pan/OCR highlight
│   │   ├── ThumbnailSidebar.tsx  # Thumbnail panel
│   │   ├── RightSidebar.tsx      # Right panel (OCR + EXIF tabs)
│   │   ├── OcrSidebar.tsx        # OCR results text view
│   │   ├── ExifPanel.tsx         # EXIF metadata viewer
│   │   ├── StatusBar.tsx         # Status bar
│   │   ├── SlideshowOverlay.tsx  # Slideshow controls overlay
│   │   ├── DropOverlay.tsx       # Drag-and-drop overlay
│   │   ├── BatchConvertDialog.tsx
│   │   ├── BatchRenameDialog.tsx
│   │   ├── SettingsDialog.tsx    # Settings (file association)
│   │   └── ImageContextMenu.tsx  # Right-click context menu
│   ├── hooks/
│   │   ├── useImageViewer.ts     # Image state & operations
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useSlideshow.ts
│   ├── lib/
│   │   ├── api.ts                # Tauri IPC bridge
│   │   └── utils.ts              # Utilities (cn, formatFileSize, joinSelectedText)
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   ├── App.tsx                   # Root layout
│   ├── App.css                   # Global styles & theme
│   └── main.tsx                  # Entry point
├── src-tauri/                    # Backend (Rust)
│   ├── src/
│   │   ├── main.rs               # Tauri app setup
│   │   ├── lib.rs                # Module declarations
│   │   ├── commands.rs           # Tauri IPC commands
│   │   ├── image_loader.rs       # Image decoding + base64
│   │   ├── ocr.rs                # WinRT OCR engine
│   │   ├── file_ops.rs           # File operations (convert, rename, copy)
│   │   ├── exif.rs               # EXIF reader
│   │   └── assoc.rs              # File association (Windows)
│   └── Cargo.toml
├── package.json
└── tailwind.config.ts
```

## Screenshots

> *Screenshots coming soon.*

## License

MIT

---

Built with [Tauri](https://tauri.app) · [React](https://react.dev) · [Rust](https://www.rust-lang.org/)
