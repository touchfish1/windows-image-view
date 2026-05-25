# UX 优化计划

## 概述

基于 Image Viewer OCR 现有功能，对 8 个用户体验方向进行评估和规划。按优先级分为 **P0（核心体验）**、**P1（重要改进）**、**P2（锦上添花）**。

---

## P0 — 核心体验

### 1. 双击全屏

| 项目 | 内容 |
|---|---|
| **当前状态** | 全屏只能通过工具栏按钮或 F11 快捷键触发，画布上双击无反应 |
| **用户价值** | 图片查看器的标准交互，降低学习成本，提升浏览沉浸感 |
| **实现方式** | 在 `ImageCanvas` 的 `handleMouseDown` 中检测双击（`e.detail === 2`），调用 `onToggleFullscreen`。已有 `toggleFullscreen` 回调通过 props 传入 |
| **改动范围** | 仅 `ImageCanvas.tsx`，新增 `onToggleFullscreen` prop |
| **风险** | 需确保不与拖拽平移/OCR 选择冲突（双击时 `detail === 2`，单次点击 `detail === 1`，区分清晰） |
| **工作量** | ~15 分钟 |

### 2. 加载状态（大图 loading）

| 项目 | 内容 |
|---|---|
| **当前状态** | ImageCanvas 的 canvas 在图片加载完成前显示纯黑背景 (`#1a1a1a`)，大图有明显闪烁 |
| **用户价值** | 给用户明确的反馈，避免"卡死"的错觉 |
| **实现方式** | 在 `imageInfo` 存在但图片尚未解码完成时，canvas 上绘制 loading 指示器（居中旋转圆环 + "加载中..."）。使用 `imageRef.current === null` 判断加载状态 |
| **改动范围** | 仅 `ImageCanvas.tsx`，在 drawCanvas 函数中新增 loading 状态分支 |
| **风险** | 极低，纯 UI 改动 |
| **工作量** | ~20 分钟 |

---

## P1 — 重要改进

### 3. 记住窗口状态

| 项目 | 内容 |
|---|---|
| **当前状态** | 窗口大小/位置、侧边栏开关、最近目录等状态每次启动都重置 |
| **用户价值** | 恢复上次使用习惯，每次打开体验一致 |
| **实现方式 (选项)** | **Option A: Tauri store plugin（推荐）**。使用 `@tauri-apps/plugin-store` 将状态持久化到本地 JSON 文件。保存内容：窗口位置/大小（`getCurrentWindow().outerPosition()` + `outerSize()`）、`showThumbnails`、`showRightSidebar`、上次浏览目录。**Option B: localStorage**，WebView 侧存储，但窗口位置等原生信息无法获取。**Option C: Rust 侧自建 JSON 文件**，更灵活但需额外 IPC 开销 |
| **推荐** | Option A，Tauri 官方 store 插件，前后端都可用，最小侵入性 |
| **保存字段** | `window_x`, `window_y`, `window_width`, `window_height`, `show_thumbnails`, `show_right_sidebar`, `last_directory` |
| **改动范围** | `App.tsx`（加载/保存状态）、`src-tauri/Cargo.toml`（加插件依赖）、`package.json`（加 `@tauri-apps/plugin-store`）、新增 `useWindowState` hook |
| **风险** | 低，但需注意窗口未就绪时获取位置可能不准，需在 `onMounted` 后延迟读取 |
| **工作量** | ~1 小时 |

### 4. 缩略图右键菜单

| 项目 | 内容 |
|---|---|
| **当前状态** | 缩略图点击可导航，但无右键菜单。需要删除/复制/打开位置等操作时，用户只能先导航到图片再用主菜单 |
| **用户价值** | 批量管理图片时减少操作步骤 |
| **实现方式** | 使用已有的 `@radix-ui/react-context-menu` 组件（已在项目中），在 `ThumbnailItem` 上包装 `ContextMenu`。菜单项：在文件管理器中显示、复制文件路径、删除图片（回收站）。删除需 Rust 端实现 `move_to_trash` 命令（使用 `recycle` 或 `trash` crate） |
| **改动范围** | `ThumbnailSidebar.tsx`（加 ContextMenu）、`commands.rs`（加 trash 命令）、`Cargo.toml`（加 trash crate）、`api.ts`（加 JS bridge） |
| **依赖** | 删除功能依赖 `trash` crate（跨平台回收站） |
| **风险** | 低，删除操作需确认对话框防止误操作 |
| **工作量** | ~1.5 小时 |

### 5. 自定义安装包（NSIS 定制）

| 项目 | 内容 |
|---|---|
| **当前状态** | 使用 Tauri 默认的 NSIS 安装包，无自定义安装程序图标、无安装时文件关联注册 |
| **用户价值** | 安装时自动注册文件关联，用户安装完即用；专业的安装体验 |
| **实现方式** | Tauri 2 支持通过 `tauri.conf.json` 的 `bundle > windows > nsis` 自定义 NSIS 安装程序：设置安装包图标、安装时运行自定义 NSIS 脚本注册文件关联。创建 `installer.nsh` 文件，在安装时写入 `HKCU\Software\Classes` 的扩展名关联 |
| **改动范围** | `tauri.conf.json`（加 nsis 配置）、`src-tauri/installer.nsh`（新增 NSIS 脚本）、图标文件 |
| **注意** | NSIS 自定义脚本中的文件关联注册应当与运行时注册保持一致的注册表路径 |
| **工作量** | ~2 小时 |

---

## P2 — 锦上添花

### 6. 自动更新

| 项目 | 内容 |
|---|---|
| **当前状态** | 用户需要手动下载新版本安装包重新安装 |
| **用户价值** | 新版本发布后用户自动收到更新通知，一键升级 |
| **实现方式** | 使用 `@tauri-apps/plugin-updater` 插件 + 配合 GitHub Releases。流程：插件从 GitHub Releases 检查更新 → 发现新版本 → 下载 → 安装。需要后端生成 `latest.json`（Tauri 已支持 `createUpdaterArtifacts`）|
| **改动范围** | `tauri.conf.json`（加 updater 配置）、`lib.rs`（注册 updater 插件）、`App.tsx`（检查更新 UI 提示）、`Cargo.toml`（加 updater 插件依赖）、`package.json`（加 `@tauri-apps/plugin-updater`）|
| **依赖** | GitHub Release 流程必须稳定产出安装包。CI 流水线需要启用 `createUpdaterArtifacts: true` 并上传 `.zip` + `.sig` 签名文件 |
| **风险** | 中等。签名密钥管理（`TAURI_SIGNING_PRIVATE_KEY`）需妥善保管。首次安装后的更新链路需要完整测试 |
| **工作量** | ~3 小时 |

### 7. 最近打开

| 项目 | 内容 |
|---|---|
| **当前状态** | 无最近打开记录，每次启动需重新浏览到目录 |
| **用户价值** | 快速回到上次浏览的图片或常用目录 |
| **实现方式** | 在 store（与"记住窗口状态"共用）中保存最近打开的 N 个文件/目录路径。在工具栏或文件菜单中添加"最近打开"下拉列表。使用 `@tauri-apps/plugin-store` 持久化 |
| **改动范围** | `Toolbar.tsx`（加最近打开按钮 + 下拉列表）、`useImageViewer.ts`（加记录逻辑）、复用 store 插件 |
| **依赖** | 依赖"记住窗口状态"的 store 实现 |
| **风险** | 低。注意路径隐私问题（用户可能不希望路径被持久化），可限制最多保留 10 条 |
| **工作量** | ~1 小时 |

### 8. 应用图标

| 项目 | 内容 |
|---|---|
| **当前状态** | 使用 Tauri 默认生成的图标，无专业应用图标 |
| **用户价值** | 任务栏、开始菜单、文件关联中显示高质量图标，提升应用的专业感 |
| **实现方式** | 设计/获取一套高品质图标（PNG 32/128/256/512、ICO、ICNS），覆盖 tauri.conf.json 中配置的所有图标路径。可使用 AI 生成或设计师提供 |
| **改动范围** | `icons/` 目录下的图标文件替换，`tauri.conf.json` 中 icon 配置不变 |
| **注意** | ICO 文件需包含 256x256 以支持 Windows 高 DPI。图标风格应与应用定位一致（简洁、现代、图片相关） |
| **工作量** | 设计时间不确定，替换操作 ~15 分钟 |

---

## 优先级与执行顺序

```
Phase 1（P0 · 本次实现）
  ├── 双击全屏（~15min）
  └── 加载状态（~20min）

Phase 2（P1 · 高价值）
  ├── 记住窗口状态（~1h）
  ├── 缩略图右键菜单（~1.5h）
  └── 自定义安装包（~2h）

Phase 3（P2 · 锦上添花）
  ├── 自动更新（~3h）
  ├── 最近打开（~1h）
  └── 应用图标（~15min + 设计）
```

## 技术要点

### Tauri Store 插件
- 添加 `tauri-plugin-store` 到 Cargo.toml 和 package.json
- 在 lib.rs 用 `.plugin(tauri_plugin_store::Builder::default().build())` 注册
- 前端使用 `new Store('settings.json')` 读写

### Updater 插件
- 需 GitHub Token 以访问 Releases API
- Tauri 2 使用 `tauri-plugin-updater`，配置 `pubkey` 和 `endpoints`
- CI 中需要 `TAURI_SIGNING_PRIVATE_KEY` 环境变量签名更新包

### NSIS 自定义
- `tauri.conf.json` 中 `bundle > windows > nsis > installerIcon` 和 `installerHeaderIcon`
- 通过 `installerHooks` 指向自定义 NSIS 脚本
- 脚本中使用 `WriteRegStr` 写入注册表关联

### 回收站删除
- 使用 `trash` crate (v5.x)，API 简单：`trash::delete(path)`
- 需要 `features = ["windows"]` 以支持 Windows 回收站
