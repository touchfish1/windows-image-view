# AGENTS.md — src-tauri/ (Backend)

Rust 后端。Tauri 2 应用入口 + IPC 命令处理器 + 各功能模块。

## STRUCTURE

```
src-tauri/
├── src/
│   ├── main.rs         # 应用入口
│   ├── lib.rs          # 模块声明 + 插件注册（5 个插件）
│   ├── commands.rs     # IPC 命令（无业务逻辑，仅委托）
│   ├── image_loader.rs # 图片解码 + base64 编码
│   ├── ocr_engine.rs   # WinRT / Apple Vision OCR
│   ├── paddle_ocr.rs   # PaddleOCR 子进程封装（Windows 兜底）
│   ├── batch.rs        # 批量格式转换 + 重命名
│   ├── exif.rs         # EXIF 元数据（kamadak-exif）
│   ├── file_assoc.rs   # Windows 注册表文件关联
│   └── file_ops.rs     # 文件操作（另存为、回收站）
├── icons/              # 应用图标（iOS + Android）
├── capabilities/       # Tauri 2 权限配置
├── paddleocr/          # PaddleOCR 运行时（gitignored，需下载）
└── Cargo.toml
```

## WHERE TO LOOK

| 模块 | 文件 |
|------|------|
| 插件注册 | `lib.rs` |
| 命令路由 | `commands.rs` |
| 图片加载 | `image_loader.rs` |
| OCR 引擎 | `ocr_engine.rs` |
| PaddleOCR | `paddle_ocr.rs` |
| 批量操作 | `batch.rs` |

## CONVENTIONS

- **`commands.rs`** 是纯委托层 — 不包含业务逻辑
- **OCR 回退链**: PaddleOCR（先）→ Windows.Media.Ocr 3 策略（后）
- **PaddleOCR** 位于 `paddleocr/PaddleOCR-json/PaddleOCR-json.exe`（dev）；构建时打包为资源
- **LaunchFile** state 持有 CLI 参数（用于"打开方式"双击启动）
- **5 个 Tauri 插件**: dialog, store, updater, process, single-instance
- 版本号必须与 `Cargo.toml`/`tauri.conf.json` 同步
