# AGENTS.md — src/hooks/ (React Hooks)

5 个自定义 Hook。`useImageViewer` 是全局状态中枢。

## HOOKS

| Hook | 作用 | 行数 |
|------|------|------|
| `useImageViewer.ts` | 核心全局状态（图片信息、OCR 结果、缩放、导航等） | 190 |
| `useKeyboardShortcuts.ts` | 键盘快捷键注册 |
| `useSlideshow.ts` | 幻灯片自动播放逻辑 |
| `useAppUpdater.ts` | 自动更新检测 |
| `useWindowState.ts` | 窗口状态持久化（sidebar、主题、最近文件） |

## CONVENTIONS

- **`useImageViewer`** 是所有组件的数据源 — `App.tsx` 调用一次，通过 props 传递
- 使用 `stateRef` + `imageListRef` 避免导航时的 stale closure
- **`useWindowState`** 通过 `tauri-plugin-store` 持久化到 `settings.json`
- 最近文件列表上限 10 条
- 主题切换通过 `<html>` 的 `dark`/`light` class 实现
