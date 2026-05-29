# AGENTS.md — src/ (Frontend)

React 19 + TypeScript + Vite 前端。Tailwind CSS + shadcn/ui 样式系统。

## STRUCTURE

```
src/
├── components/     # UI 组件（ImageCanvas, Toolbar, Sidebars, Dialogs 等）
│   └── ui/         # shadcn/ui 基础组件
├── hooks/          # 自定义 Hooks（状态管理 + 副作用）
├── lib/            # IPC 桥接 + 调试日志 + 工具函数
├── types/          # TypeScript 类型定义
├── App.tsx         # 根布局 + 状态编排
├── App.css         # 全局样式 + CSS 变量主题
└── main.tsx        # 入口
```

## WHERE TO LOOK

| 任务 | 文件 |
|------|------|
| 全局状态 | `hooks/useImageViewer.ts` |
| 图片渲染/交互 | `components/ImageCanvas.tsx` |
| 键盘快捷键 | `hooks/useKeyboardShortcuts.ts` |
| 幻灯片播放 | `hooks/useSlideshow.ts` |
| 设置持久化 | `hooks/useWindowState.ts` |
| IPC 调用 | `lib/api.ts` |
| 类型定义 | `types/index.ts` |

## CONVENTIONS

- **`@/` 别名** → `./src/*`（tsconfig + vite 配置）
- **`useImageViewer`** 是唯一全局状态源 — 所有组件通过它读取
- **`App.tsx`** 是状态编排中心，owns 所有 UI toggle state
- **Canvas 交互**使用 `live*Ref`（`liveZoomRef`、`liveOffsetRef`）绕过 React 异步延迟
- 相邻图片用 `<link rel="prefetch">` 预加载
- CSS 变量通过 `<html>` 的 `dark`/`light` class 切换主题
