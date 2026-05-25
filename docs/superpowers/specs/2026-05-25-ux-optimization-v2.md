# UX 优化计划 V2

## 概述

涵盖原有 8 个方向 + 新增 7 个方向，共 15 个优化项。按 **P0（已完成）**、**P1（核心体验）**、**P2（重要改进）**、**P3（锦上添花）** 四级排序。

---

## P0 — 已完成

### 1. 双击全屏 ✅

| 项目 | 内容 |
|---|---|
| **状态** | 已实现，`1fab966` |
| **实现** | `ImageCanvas.handleMouseDown` 检测 `e.detail === 2`，调用 `onToggleFullscreen` |

### 2. 加载状态 ✅

| 项目 | 内容 |
|---|---|
| **状态** | 已实现，`54d4d4a` + `a6443e8` |
| **实现** | `drawCanvas` 中 `imageInfo` 存在但 `imageRef` 为空时绘制旋转 spinner + "加载中..." |

---

## P1 — 核心体验

### 3. 记住窗口状态

| 项目 | 内容 |
|---|---|
| **工作量** | ~1h |
| **方式** | `tauri-plugin-store` 持久化侧边栏开关、窗口位置/大小、上次目录 |
| **改动** | `App.tsx`、新增 `useWindowState.ts` hook、`Cargo.toml` |

### 4. 缩放至鼠标位置

| 项目 | 内容 |
|---|---|
| **工作量** | ~30min |
| **方式** | 滚轮缩放时以鼠标指针为锚点调整 `offset`，而非固定居中缩放 |
| **改动** | `ImageCanvas.tsx` — `handleWheelRef` |
| **公式** | 新 offset = 鼠标在图片上坐标 × (新缩放比 - 旧缩放比) + 旧 offset |

### 5. 图片信息 HUD

| 项目 | 内容 |
|---|---|
| **工作量** | ~30min |
| **方式** | 画布角落（左下或右下）叠加半透明浮层，显示文件名、尺寸、缩放比 |
| **改动** | `ImageCanvas.tsx` — 在 canvas 上 overlay 一个 `pointer-events-none` 的 div |

### 6. 预加载相邻图片

| 项目 | 内容 |
|---|---|
| **工作量** | ~1h |
| **方式** | 当前图片稳定后，后台 `new Image()` 加载前一张和后一张 |
| **改动** | `useImageViewer.ts` 或 `App.tsx` — 当前图片变化时触发预加载 |

### 7. 缩略图右键菜单

| 项目 | 内容 |
|---|---|
| **工作量** | ~1.5h |
| **方式** | `ContextMenu` 包裹缩略图：在文件管理器中显示、复制路径、删除（回收站） |
| **改动** | `ThumbnailSidebar.tsx`、`commands.rs`（trash）、`api.ts`、`Cargo.toml`（trash crate）|

### 8. 最近打开

| 项目 | 内容 |
|---|---|
| **工作量** | ~1h |
| **方式** | 共用 store 保存最近 10 条路径，工具栏添加展开下拉列表 |
| **改动** | `Toolbar.tsx`、`App.tsx`、`useWindowState.ts` |

---

## P2 — 重要改进

### 9. 图片切换过渡动画

| 项目 | 内容 |
|---|---|
| **工作量** | ~1h |
| **方式** | 切换图片时两层 canvas 做 crossfade（`globalAlpha` 从 0 → 1），~200ms |
| **改动** | `ImageCanvas.tsx` — 加载新图时绘制旧图快照，渐变过渡到新图 |

### 10. 深色/浅色主题切换

| 项目 | 内容 |
|---|---|
| **工作量** | ~1h |
| **方式** | CSS 变量定义两套色板，`<html>` 切换 `class="dark/light"`，store 持久化偏好 |
| **改动** | `App.css`（新增 light 色板）、`App.tsx`（切换逻辑 + store 持久化）、各组件适配 |

### 11. 缩略图懒加载优化

| 项目 | 内容 |
|---|---|
| **工作量** | ~30min |
| **方式** | `IntersectionObserver` 只生成视口内缩略图的 canvas，降低初次渲染成本 |
| **改动** | `ThumbnailSidebar.tsx` |

### 12. OCR 文本导出

| 项目 | 内容 |
|---|---|
| **工作量** | ~30min |
| **方式** | 工具栏按钮/右键菜单"导出为 .txt"，调用 Tauri dialog 选保存路径 + fs 写文件 |
| **改动** | `Toolbar.tsx`、`ImageContextMenu.tsx`、`api.ts`（save dialog + write file）|

### 13. 自定义安装包

| 项目 | 内容 |
|---|---|
| **工作量** | ~2h |
| **方式** | `installer.nsh` NSIS 脚本 + `tauri.conf.json` NSIS 配置，安装时注册文件关联 |
| **改动** | 创建 `installer.nsh`、修改 `tauri.conf.json` |

### 14. 应用图标

| 项目 | 内容 |
|---|---|
| **工作量** | ~15min + 设计 |
| **方式** | 替换 `icons/` 下所有图标文件，所有规格（32/128/256/ICO/ICNS） |

---

## P3 — 锦上添花

### 15. 自动更新

| 项目 | 内容 |
|---|---|
| **工作量** | ~3h |
| **方式** | `tauri-plugin-updater` + GitHub Releases，启动后延迟检查 |
| **改动** | `Cargo.toml`、`package.json`、`lib.rs`、`tauri.conf.json`、新增 `useAppUpdater.ts` |
| **依赖** | 需 GitHub Release 流程稳定 + 签名密钥管理 |

---

## 优先级与执行顺序

```
Phase 1（P1 · 本次实现 · ~5.5h）
  ├── 记住窗口状态（~1h）
  ├── 缩放至鼠标位置（~30min）
  ├── 图片信息 HUD（~30min）
  ├── 预加载相邻图片（~1h）
  ├── 缩略图右键菜单（~1.5h）
  └── 最近打开（~1h）

Phase 2（P2 · 后续迭代 · ~5h）
  ├── 图片切换过渡动画（~1h）
  ├── 深色/浅色主题切换（~1h）
  ├── 缩略图懒加载优化（~30min）
  ├── OCR 文本导出（~30min）
  ├── 自定义安装包（~2h）
  └── 应用图标（~15min + 设计）

Phase 3（P3 · 长期规划 · ~3h）
  └── 自动更新（~3h）
```
