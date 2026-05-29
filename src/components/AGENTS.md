# AGENTS.md — src/components/ (UI Components)

15 个 React 组件。含 shadcn/ui 基础组件。Canvas 为核心渲染层。

## COMPONENTS

| 组件 | 作用 | 行数 |
|------|------|------|
| `ImageCanvas.tsx` | HTML Canvas 渲染 + 缩放/拖拽/OCR 框选 | 511 |
| `Toolbar.tsx` | 主工具栏 | 317 |
| `App.tsx` | 根布局编排 | 389 |
| `ThumbnailSidebar.tsx` | 缩略图面板 |
| `RightSidebar.tsx` | 右侧面板（OCR + EXIF tab） |
| `OcrSidebar.tsx` | OCR 文字视图 |
| `ExifPanel.tsx` | EXIF 元数据 |
| `StatusBar.tsx` | 状态栏 |
| `SlideshowOverlay.tsx` | 幻灯片控制覆盖层 |
| `DropOverlay.tsx` | 拖拽打开覆盖层 |
| `AboutDialog.tsx` | 关于 + 自动更新 | 201 |
| `SettingsDialog.tsx` | 设置（文件关联） | 210 |
| `DebugPanel.tsx` | 调试面板 (F12) | 187 |
| `BatchConvertDialog.tsx` | 批量格式转换 |
| `BatchRenameDialog.tsx` | 批量重命名 |
| `ImageContextMenu.tsx` | 右键菜单 |
| `ui/button.tsx` | shadcn Button |
| `ui/context-menu.tsx` | shadcn Context Menu |

## CONVENTIONS

- **ImageCanvas** 使用 `live*Ref` 模式处理实时缩放/偏移（非 React state）
- **Canvas 背景色** `#21211a` — 深棕色，全屏/幻灯片时保持一致
- **交叉淡入淡出动画** 在 ImageCanvas 中实现图片切换
- **OCR 命中检测** — 框选区域点击后高亮对应文本
- 所有 dialog/overlay 由 `App.tsx` 管理 open/close toggle
