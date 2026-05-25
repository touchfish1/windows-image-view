# Image Viewer OCR

基于 Tauri 2 的跨平台桌面图片查看器，集成 Windows 原生 OCR 文字识别功能。

## 功能

- **图片浏览** — 打开常见格式图片（PNG、JPG、BMP、GIF、WebP）
- **文件夹导航** — 自动扫描同目录图片，支持上一张/下一张切换
- **缩放与平移** — 鼠标滚轮缩放、拖拽平移、适应窗口 / 实际大小切换
- **OCR 文字识别** — 基于 Windows 原生 WinRT OCR API，选中并复制图片中的文字
- **全屏模式** — F11 全屏，Esc 退出
- **快捷键支持** — 方向键导航、Ctrl+O 打开、Ctrl+0 实际大小、Ctrl+W 适应窗口
- **拖拽打开** — 直接将图片文件拖入窗口打开
- **状态栏信息** — 实时显示文件名、尺寸、文件大小、图片位置、缩放比例

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | [Tauri 2](https://v2.tauri.app) |
| 前端 | React 19 + TypeScript + Vite |
| UI 组件 | shadcn/ui + Tailwind CSS |
| 图标 | Lucide React |
| 后端 | Rust |
| OCR | Windows.WinRT Media.Ocr (Windows 原生) |

## 快速开始

```bash
# 安装前端依赖
npm install

# 开发模式启动（需安装 Rust 和 Tauri CLI）
npm run tauri dev

# 构建生产版本
npm run tauri build
```

### 系统要求

- Rust (latest stable)
- Node.js 18+
- Windows 10+（OCR 功能仅限 Windows）

## 项目结构

```
src/
├── components/        # UI 组件
│   ├── ImageCanvas    # 画布渲染、缩放、平移、OCR 高亮
│   ├── Toolbar        # 工具栏
│   ├── StatusBar      # 状态栏
│   └── OcrSidebar     # OCR 结果侧栏
├── hooks/             # React Hooks
│   ├── useImageViewer        # 图片状态与操作
│   └── useKeyboardShortcuts  # 键盘快捷键
├── lib/
│   ├── api.ts         # Tauri IPC 调用
│   └── utils.ts       # 工具函数
└── types/             # TypeScript 类型定义

src-tauri/
├── src/
│   ├── commands.rs    # Tauri 命令（打开图片、OCR、文件扫描）
│   ├── image_loader.rs # 图片加载（base64 编码）
│   └── ocr.rs         # WinRT OCR 实现
└── Cargo.toml
```

## 许可

MIT
