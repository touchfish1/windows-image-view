# AGENTS.md — Image Viewer OCR

Tauri 2 桌面应用（React 19 + TypeScript + Vite + Rust）。支持双 OCR 引擎（Windows.Media.Ocr / PaddleOCR / Apple Vision）。

## STRUCTURE

```
.
├── src/              # 前端 (React 19 + TS + Tailwind)
│   ├── components/   # UI 组件（含 shadcn/ui）
│   ├── hooks/        # React 自定义 Hooks（状态 + 副作用）
│   ├── lib/          # IPC 桥接 + 调试 + 工具函数
│   └── types/        # TypeScript 类型定义
├── src-tauri/        # 后端 (Rust)
│   └── src/          # Rust 源文件
├── .github/          # CI/CD workflows
└── docs/             # 规划文档
```

## WHERE TO LOOK

| 任务 | 路径 | Notes |
|------|------|-------|
| Commands / IPC | [`src/lib/api.ts`](file:///D:/opensource/windows-image-view/src/lib/api.ts) | 所有 `invoke()` 调用封装，带调试日志 |
| 图片画布渲染 | [`src/components/ImageCanvas.tsx`](file:///D:/opensource/windows-image-view/src/components/ImageCanvas.tsx) | HTML Canvas + 缩放/拖拽/OCR 框选 |
| 状态管理 | [`src/hooks/useImageViewer.ts`](file:///D:/opensource/windows-image-view/src/hooks/useImageViewer.ts) | 核心全局状态 |
| Rust 入口 | [`src-tauri/src/lib.rs`](file:///D:/opensource/windows-image-view/src-tauri/src/lib.rs) | 插件注册 + 命令注册 |
| Rust 命令 | [`src-tauri/src/commands.rs`](file:///D:/opensource/windows-image-view/src-tauri/src/commands.rs) | IPC 命令处理器（无业务逻辑） |
| OCR 引擎 | [`src-tauri/src/ocr_engine.rs`](file:///D:/opensource/windows-image-view/src-tauri/src/ocr_engine.rs) | WinRT / Apple Vision |
| PaddleOCR | [`src-tauri/src/paddle_ocr.rs`](file:///D:/opensource/windows-image-view/src-tauri/src/paddle_ocr.rs) | 外部进程调用（兜底 OCR） |
| 批量操作 | [`src-tauri/src/batch.rs`](file:///D:/opensource/windows-image-view/src-tauri/src/batch.rs) | 批量转换 + 重命名 |
| EXIF | [`src-tauri/src/exif.rs`](file:///D:/opensource/windows-image-view/src-tauri/src/exif.rs) | kamadak-exif |
| 文件关联 | [`src-tauri/src/file_assoc.rs`](file:///D:/opensource/windows-image-view/src-tauri/src/file_assoc.rs) | Windows 注册表 |
| CI/CD | [`.github/workflows/release.yml`](file:///D:/opensource/windows-image-view/.github/workflows/release.yml) | v* 标签触发构建 |

## COMMANDS

| 命令 | 作用 |
|---------|-------------|
| `npm run dev` | 仅 Vite 前端（端口 1420，无 Rust） |
| `npm run tauri dev` | 完整 Tauri 开发（Rust 热重载） |
| `npm run build` | `tsc && vite build`（仅前端） |
| `npm run tauri build` | 生产构建 → `src-tauri/target/release/bundle/` |

项目无测试、lint、格式化脚本，未配置 ESLint、Prettier 或测试框架。

## CONVENTIONS

- **无测试/无 lint/无 prettier** — 纯手动 QA
- **CSS 变量主题** — `App.css` 通过 `<html>` 的 `dark`/`light` class 驱动
- **`@/*` 别名** → `./src/*`
- **`withGlobalTauri: true`** — 前端通过 `window.__TAURI__` 访问 Tauri API
- **Canvas 数据流** — base64 data URL（Rust → JS），非文件路径
- **IPC 调试日志** — 所有 `invoke()` 调用自动记录（F12 面板）
- **`live*Ref` 模式** — 缩放/偏移用 ref 绕过 React 异步状态（ImageCanvas）

## PREREQUISITES (Windows)

- **PaddleOCR-json** 需预下载：
  ```powershell
  .\src-tauri\download-paddleocr.ps1
  ```
  下载约 88MB 到 `src-tauri/paddleocr/`。CI 自动执行。

## TAURI 2 NOTES

- `custom-protocol` 是**默认** feature
- Vite 固定端口 1420；HMR 使用 1421（当 `TAURI_DEV_HOST` 设置时）
- CSP：`img-src 'self' data: https: asset: http://asset.localhost`，`script-src 'unsafe-inline'`
- 单实例插件发出 `"file-open"` 事件（从"打开方式"打开时）

## RELEASE

- 推送 `v*` 标签触发 CI 构建（`windows-latest` + `macos-latest`）
- 自动更新通过 `tauri.conf.json` → `plugins.updater`
- 安装包：NSIS（Windows）、DMG（macOS）
- 版本号同步：`Cargo.toml` ↔ `tauri.conf.json`
