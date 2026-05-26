# Image Viewer OCR

一款基于 **Tauri 2** 构建的现代化桌面图片查看器，集成 **OCR 文字识别**功能。支持多种图片格式、批量操作、幻灯片播放、EXIF 元数据查看，以及 Windows 原生 OCR 与 PaddleOCR 双引擎识别。

## 功能特性

| 类别 | 说明 |
|------|------|
| **图片查看** | 支持 PNG、JPG、BMP、GIF、WebP、TIFF、ICO、SVG 等格式 |
| **导航操作** | 自动扫描文件夹、上一张/下一张、缩略图侧边栏 |
| **缩放与拖拽** | 滚轮缩放、拖拽平移、适应窗口/原始大小切换 |
| **OCR 识别** | 支持 Windows.Media.Ocr（WinRT）与 PaddleOCR 双引擎，框选文字区域，一键复制 |
| **EXIF 信息** | 查看相机参数、拍摄设置、时间戳等元数据 |
| **全屏模式** | F11 切换，沉浸式浏览 |
| **幻灯片** | 自动播放，支持 2s/3s/5s/10s 间隔设置 |
| **批量转换** | 多张图片批量转换为 PNG/JPEG/WebP/BMP |
| **批量重命名** | 按自定义模板批量重命名文件，支持实时预览 |
| **文件关联** | 按扩展名注册为默认图片查看器 |
| **拖拽打开** | 直接拖拽图片到窗口打开 |
| **键盘快捷键** | 完整键盘导航支持 |
| **自动更新** | 内置更新检测，支持一键下载安装与自动重启 |
| **调试面板** | F12 打开，实时查看日志与前后端 IPC 调用记录 |

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `←` / `→` | 上一张 / 下一张图片 |
| `Ctrl+O` | 打开图片 |
| `Ctrl+W` | 切换适应窗口模式 |
| `Ctrl+0` | 原始大小 (100%) |
| `F11` | 切换全屏 |
| `F5` | 开始幻灯片 |
| `F12` | 切换调试面板 |
| `Esc` | 退出全屏 / 幻灯片 |
| `Ctrl+C` | 复制选中的 OCR 文字 |
| `滚轮` | 放大 / 缩小 |
| `拖拽` | 平移图片（自由缩放模式下） |

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | [Tauri 2](https://v2.tauri.app) |
| 前端 | React 19 + TypeScript + Vite |
| 样式 | Tailwind CSS + shadcn/ui |
| 图标 | Lucide React |
| 后端 | Rust |
| OCR 引擎 | Windows.Media.Ocr (WinRT) / PaddleOCR |
| 更新机制 | tauri-plugin-updater |
| 字体 | Inter |

## 快速开始

### 环境要求

- Rust（最新稳定版）— [rustup.rs](https://rustup.rs)
- Node.js 18+
- Windows 10+（OCR 需要 Windows）

### 开发

```bash
# 安装前端依赖
npm install

# 启动开发服务器（需要 Rust + Tauri CLI）
npm run tauri dev

# 或仅运行前端进行 UI 开发
npm run dev
# 浏览器打开 http://localhost:1420
```

### 构建

```bash
npm run tauri build
# 产物在 src-tauri/target/release/bundle/
```

## 项目结构

```
image-viewer-ocr/
├── src/                          # 前端 (React)
│   ├── components/               # UI 组件
│   │   ├── ui/                   # 基础 UI 组件 (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   └── context-menu.tsx
│   │   ├── Toolbar.tsx           # 主工具栏
│   │   ├── ImageCanvas.tsx       # 画布渲染 + 缩放/拖拽/OCR 框选
│   │   ├── ThumbnailSidebar.tsx  # 缩略图面板
│   │   ├── RightSidebar.tsx      # 右侧面板 (OCR + EXIF 标签页)
│   │   ├── OcrSidebar.tsx        # OCR 结果文字视图
│   │   ├── ExifPanel.tsx         # EXIF 元数据查看
│   │   ├── StatusBar.tsx         # 状态栏
│   │   ├── SlideshowOverlay.tsx  # 幻灯片控制覆盖层
│   │   ├── DropOverlay.tsx       # 拖拽打开覆盖层
│   │   ├── AboutDialog.tsx       # 关于对话框 + 自动更新
│   │   ├── SettingsDialog.tsx    # 设置（文件关联管理）
│   │   ├── DebugPanel.tsx        # 调试面板 (F12)
│   │   ├── BatchConvertDialog.tsx # 批量格式转换
│   │   ├── BatchRenameDialog.tsx  # 批量重命名
│   │   └── ImageContextMenu.tsx   # 右键菜单
│   ├── hooks/
│   │   ├── useImageViewer.ts     # 图片状态与操作
│   │   ├── useKeyboardShortcuts.ts # 键盘快捷键
│   │   ├── useSlideshow.ts       # 幻灯片逻辑
│   │   ├── useAppUpdater.ts      # 自动更新检测
│   │   └── useWindowState.ts     # 窗口状态管理
│   ├── lib/
│   │   ├── api.ts                # Tauri IPC 桥接
│   │   ├── debug.ts              # 调试日志存储
│   │   └── utils.ts              # 工具函数
│   ├── types/
│   │   └── index.ts              # TypeScript 类型定义
│   ├── App.tsx                   # 根布局
│   ├── App.css                   # 全局样式 & 主题变量
│   └── main.tsx                  # 入口
├── src-tauri/                    # 后端 (Rust)
│   ├── src/
│   │   ├── main.rs               # Tauri 应用入口
│   │   ├── lib.rs                # 模块声明与插件注册
│   │   ├── commands.rs           # Tauri IPC 命令
│   │   ├── image_loader.rs       # 图片解码 + base64
│   │   ├── ocr_engine.rs         # OCR 引擎抽象（多引擎调度）
│   │   ├── paddle_ocr.rs         # PaddleOCR 调用 (Windows)
│   │   ├── batch.rs              # 批量转换与重命名
│   │   ├── exif.rs               # EXIF 读取
│   │   ├── file_assoc.rs         # 文件关联 (Windows)
│   │   └── file_ops.rs           # 文件操作（另存为、移到回收站等）
│   └── Cargo.toml
├── package.json
└── tailwind.config.ts
```

## 许可证

MIT

---

基于 [Tauri](https://tauri.app) · [React](https://react.dev) · [Rust](https://www.rust-lang.org/) 构建
