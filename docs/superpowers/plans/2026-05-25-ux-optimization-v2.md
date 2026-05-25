# UX 优化 V2 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 Phase 1 的 6 个用户体验优化：记住窗口状态、缩放至鼠标位置、图片信息 HUD、预加载相邻图片、缩略图右键菜单、最近打开

**Architecture:** 6 个独立任务，按依赖关系排序。任务 3（记住窗口状态）提供 store 基础设施，任务 8（最近打开）依赖该 store。其余任务相互独立，可任意顺序执行。

**Tech Stack:** Tauri 2 + React 19 + Rust + `tauri-plugin-store` + `trash` crate + Canvas 2D

---

### Task 3: 记住窗口状态

**Files:**
- Modify: `src-tauri/Cargo.toml` — 添加 `tauri-plugin-store`
- Modify: `package.json` — 添加 `@tauri-apps/plugin-store`
- Create: `src/hooks/useWindowState.ts` — store 读写封装
- Modify: `src-tauri/src/lib.rs` — 注册 store 插件
- Modify: `src/App.tsx` — 加载/保存侧边栏状态、窗口位置

**依赖:** 无

- [ ] **Step 1: 安装 store 插件依赖**

```bash
cd d:/opensource/rust/windows-image-view && npm install @tauri-apps/plugin-store@^2
```

在 `src-tauri/Cargo.toml` 的 `[dependencies]` 中添加：

```toml
tauri-plugin-store = "2"
```

- [ ] **Step 2: 在 lib.rs 注册 store 插件**

`src-tauri/src/lib.rs` — 在 `.plugin(tauri_plugin_dialog::init())` 之后添加：

```rust
.plugin(tauri_plugin_store::Builder::default().build())
```

- [ ] **Step 3: 创建 useWindowState hook**

`src/hooks/useWindowState.ts`：

```typescript
import { Store } from '@tauri-apps/plugin-store';

interface WindowState {
  showThumbnails: boolean;
  showRightSidebar: boolean;
  lastDirectory: string | null;
  recentFiles: string[];
}

const DEFAULT_STATE: WindowState = {
  showThumbnails: true,
  showRightSidebar: true,
  lastDirectory: null,
  recentFiles: [],
};

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load('settings.json');
  }
  return storeInstance;
}

export async function loadWindowState(): Promise<WindowState> {
  try {
    const store = await getStore();
    const showThumbnails = await store.get<boolean>('showThumbnails');
    const showRightSidebar = await store.get<boolean>('showRightSidebar');
    const lastDirectory = await store.get<string | null>('lastDirectory');
    const recentFiles = await store.get<string[]>('recentFiles');
    return {
      showThumbnails: showThumbnails ?? DEFAULT_STATE.showThumbnails,
      showRightSidebar: showRightSidebar ?? DEFAULT_STATE.showRightSidebar,
      lastDirectory: lastDirectory ?? DEFAULT_STATE.lastDirectory,
      recentFiles: recentFiles ?? DEFAULT_STATE.recentFiles,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export async function saveWindowState(state: Partial<WindowState>): Promise<void> {
  try {
    const store = await getStore();
    for (const [key, value] of Object.entries(state)) {
      await store.set(key, value);
    }
    await store.save();
  } catch (e) {
    console.error('Failed to save window state:', e);
  }
}

export async function addRecentFile(path: string): Promise<void> {
  try {
    const store = await getStore();
    const recent = await store.get<string[]>('recentFiles') ?? [];
    const filtered = recent.filter(f => f !== path);
    filtered.unshift(path);
    const trimmed = filtered.slice(0, 10);
    await store.set('recentFiles', trimmed);
    await store.save();
  } catch (e) {
    console.error('Failed to save recent file:', e);
  }
}
```

- [ ] **Step 4: 在 App.tsx 集成 store**

`src/App.tsx` — 顶部添加导入：

```typescript
import { loadWindowState, saveWindowState, addRecentFile } from "@/hooks/useWindowState";
```

在 `useState` 初始化后添加加载逻辑：

```typescript
// 在 useState 声明之后
const [recentFiles, setRecentFiles] = useState<string[]>([]);

useEffect(() => {
  loadWindowState().then((s) => {
    setShowThumbnails(s.showThumbnails);
    setShowRightSidebar(s.showRightSidebar);
    setRecentFiles(s.recentFiles);
  });
}, []);
```

修改侧边栏 toggle 回调（约第 202-205 行）：

```typescript
onToggleThumbnails={() => {
  const next = !showThumbnails;
  setShowThumbnails(next);
  saveWindowState({ showThumbnails: next });
}}
// ...
onToggleRightSidebar={() => {
  const next = !showRightSidebar;
  setShowRightSidebar(next);
  saveWindowState({ showRightSidebar: next });
}}
```

在 `navigateTo`/`openImage` 调用处记录最近文件（约第 183 行 `handleDrop` 之前的 `openImage` 触发路径）：

在 `App.tsx` 添加包装函数处理打开 + 记录最近文件：

```typescript
const handleOpen = useCallback((path?: string) => {
  openImage(path);
  // 注意：实际 path 只有传入时才可知，dialog 打开的由 openImage 内部处理
}, [openImage]);
```

由于 `Toolbar` 的 `onOpen`(openImage) 可能通过 dialog 打开（路径在 openImage 内部获取），一种更简单的方式：在 `openImage` 内部记录。但这需要修改 hook。更实际的方案：先保持 toolbar 的 `onOpen` 不变，后续 Task 8 再细化记录逻辑。

- [ ] **Step 5: 更新 Toolbar 透传 recentFiles**

`src/components/Toolbar.tsx` — 在 `ToolbarProps` 中添加：

```typescript
recentFiles?: string[];
onOpenFile?: (path: string) => void;
```

在 `onOpen` 按钮旁添加"最近打开"下拉按钮（位于打开按钮右侧）：

```tsx
{/* Open 按钮组 */}
<div className="flex items-center">
  <Button
    variant="ghost"
    size="icon"
    onClick={onOpen}
    title="打开图片 (Ctrl+O)"
    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent transition-all duration-150"
  >
    <FolderOpen className="h-4 w-4" />
  </Button>
  {recentFiles && recentFiles.length > 0 && (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          // toggle dropdown — handled by a useState in Toolbar
        }}
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-150"
        title="最近打开"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  )}
</div>
```

注意：此步骤实际在 Task 8 中完整实现，Step 4 只保证 store 基础能力可用。

- [ ] **Step 6: 验证编译**

```bash
cd d:/opensource/rust/windows-image-view && npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: 无错误

- [ ] **Step 7: 提交**

```bash
git add src-tauri/Cargo.toml src-tauri/src/lib.rs package.json src/hooks/useWindowState.ts src/App.tsx
git commit -m "feat: 记住窗口状态（store 插件 + 侧边栏/最近文件持久化）"
```

---

### Task 4: 缩放至鼠标位置

**Files:**
- Modify: `src/components/ImageCanvas.tsx` — `handleWheelRef` 重写

**依赖:** 无

- [ ] **Step 1: 修改 handleWheelRef**

当前 wheel handler 调用 `onZoom(delta)` 和 `onSetZoomAbsolute`，缩放以图片中心为锚点。改为以鼠标位置为锚点。

替换 `handleWheelRef` 的实现（约 175-186 行）：

```typescript
const handleWheelRef = useRef((_e: WheelEvent) => {});
handleWheelRef.current = (e: WheelEvent) => {
  e.preventDefault();

  const canvas = canvasRef.current;
  const img = imageRef.current;
  if (!canvas || !img) return;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // 当前缩放下鼠标在图片上的坐标
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const imgX = (mx - cx - offset.x) / zoom + img.width / 2;
  const imgY = (my - cy - offset.y) / zoom + img.height / 2;

  // 计算新缩放
  if (zoomMode === "fit") {
    const fitZoom = calculateFitZoom();
    onSetZoomMode("free");
    onSetZoomAbsolute(fitZoom);
  }

  const delta = e.deltaY > 0 ? -1 : 1;
  const newZoom = Math.min(10, Math.max(0.1, zoom + delta * 0.1));

  // 调整 offset 使鼠标指向的图片位置不变
  const newOffsetX = mx - cx - (imgX - img.width / 2) * newZoom;
  const newOffsetY = my - cy - (imgY - img.height / 2) * newZoom;

  onSetZoomAbsolute(newZoom);
  onPan(newOffsetX - offset.x, newOffsetY - offset.y);
};
```

注意：由于 `useRef` 中直接引用了 `zoom`、`offset`、`zoomMode` 等变量（它们通过闭包或 ref 持有），需要确保这些值是最新的。

当前代码用 `handleWheelRef.current = (e) => { ... }` 直接赋值，这些变量是组件渲染时的最新值，因为每次渲染都会更新 `handleWheelRef.current`。

- [ ] **Step 2: 验证编译**

```bash
cd d:/opensource/rust/windows-image-view && npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/components/ImageCanvas.tsx
git commit -m "feat: 缩放至鼠标位置（滚轮以鼠标指针为锚点）"
```

---

### Task 5: 图片信息 HUD

**Files:**
- Modify: `src/components/ImageCanvas.tsx` — 添加 HUD overlay div
- Modify: `src/hooks/useImageViewer.ts` — 暴露文件名（可选，或从 props 传）

**依赖:** 无

- [ ] **Step 1: 在 ImageCanvas 接口添加 hud 信息 props**

在 `ImageCanvasProps` 末尾添加：

```typescript
imageFileName?: string | null;
imageDimensions?: { width: number; height: number } | null;
```

从 props 解构：

```typescript
imageFileName,
imageDimensions,
```

- [ ] **Step 2: 在 canvas 下方添加 HUD overlay**

在 canvas 元素之后（`</canvas>` 之后）添加：

```tsx
{/* HUD: 图片信息浮层 */}
{imageInfo && (
  <div className="absolute bottom-3 left-3 pointer-events-none select-none">
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-[11px] text-white/80 font-mono">
      {imageFileName && (
        <span className="max-w-[200px] truncate" title={imageFileName}>
          {imageFileName}
        </span>
      )}
      {imageFileName && imageDimensions && <span className="text-white/40">|</span>}
      {imageDimensions && (
        <span className="shrink-0">
          {imageDimensions.width} × {imageDimensions.height}
        </span>
      )}
      {imageDimensions && <span className="text-white/40">|</span>}
      <span className="shrink-0">
        {zoomMode === "fit" ? "适应窗口" : `${Math.round(zoom * 100)}%`}
      </span>
    </div>
  </div>
)}
```

注意：canvas 的容器需要 `relative` 定位。查看 `ImageCanvas.tsx` 的返回结构，canvas 被包裹在 `ImageContextMenu` 中，所以需要在 `ImageContextMenu` 内添加一个 `relative` 容器。

或者直接在 `ImageContextMenu` 外面再包一层 `div.relative`。

修改返回结构：

```tsx
return (
  <div className="relative flex-1 overflow-hidden">
    <ImageContextMenu ...>
      <canvas ... />
    </ImageContextMenu>
    {/* HUD */}
    {imageInfo && (
      <div className="absolute bottom-3 left-3 pointer-events-none select-none z-10">
        ...
      </div>
    )}
  </div>
);
```

- [ ] **Step 3: 在 App.tsx 传递 props**

`src/App.tsx` — 在 `ImageCanvas` 组件调用处添加：

```tsx
<ImageCanvas
  // ... existing props
  imageFileName={getFileName()}
  imageDimensions={state.imageInfo ? { width: state.imageInfo.width, height: state.imageInfo.height } : null}
/>
```

- [ ] **Step 4: 验证编译**

```bash
cd d:/opensource/rust/windows-image-view && npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add src/components/ImageCanvas.tsx src/App.tsx
git commit -m "feat: 图片信息 HUD（画布左下角显示文件名/尺寸/缩放比例）"
```

---

### Task 6: 预加载相邻图片

**Files:**
- Modify: `src/hooks/useImageViewer.ts` — 在 `navigateTo` 和 `openImage` 成功后预加载前后图片

**依赖:** 无

- [ ] **Step 1: 添加预加载函数和调用**

在 `src/hooks/useImageViewer.ts` 末尾添加预加载函数：

```typescript
function preloadAdjacent(images: string[], currentIdx: number): void {
  const preload = (path: string) => {
    // 通过 asset protocol 预加载 — 触发 Rust 端缓存
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = convertFileSrc(path);
    document.head.appendChild(link);
    setTimeout(() => document.head.removeChild(link), 5000);
  };
  if (currentIdx > 0) preload(images[currentIdx - 1]);
  if (currentIdx < images.length - 1) preload(images[currentIdx + 1]);
}
```

在顶部添加 `convertFileSrc` 导入：

```typescript
import { convertFileSrc } from "@tauri-apps/api/core";
```

在 `openImage` 函数的 `setState` 调用之后（图片加载完成时）添加：

```typescript
// 在 openImage 的 try 块末尾，setState 之后
preloadAdjacent(images, idx);
```

在 `navigateTo` 函数的 `setState` 之后添加：

```typescript
preloadAdjacent(paths, index);
```

- [ ] **Step 2: 验证编译**

```bash
cd d:/opensource/rust/windows-image-view && npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/hooks/useImageViewer.ts
git commit -m "feat: 预加载相邻图片（切换到下一张时提前缓存）"
```

---

### Task 7: 缩略图右键菜单

**Files:**
- Modify: `src-tauri/Cargo.toml` — 添加 `trash` crate
- Modify: `src-tauri/src/commands.rs` — 添加 `move_to_trash` 命令
- Modify: `src-tauri/src/lib.rs` — 注册新命令
- Modify: `src/lib/api.ts` — 添加 `moveToTrash` JS bridge
- Modify: `src/components/ThumbnailSidebar.tsx` — 添加 ContextMenu

**依赖:** 无

- [ ] **Step 1: 添加 trash crate**

`src-tauri/Cargo.toml` `[dependencies]` 中添加：

```toml
trash = "5"
```

- [ ] **Step 2: 添加 move_to_trash Rust 命令**

`src-tauri/src/commands.rs` 末尾添加：

```rust
#[tauri::command]
pub fn move_to_trash(path: String) -> Result<(), String> {
    trash::delete(&path).map_err(|e| format!("Failed to move to trash: {}", e))
}
```

- [ ] **Step 3: 注册命令**

`src-tauri/src/lib.rs` 的 `invoke_handler` 中添加：

```rust
commands::move_to_trash,
```

- [ ] **Step 4: 添加 JS bridge**

`src/lib/api.ts` 末尾添加：

```typescript
export async function moveToTrash(path: string): Promise<void> {
  return invoke<void>("move_to_trash", { path });
}
```

- [ ] **Step 5: 修改 ThumbnailSidebar 添加右键菜单**

`src/components/ThumbnailSidebar.tsx` — 顶部添加导入：

```typescript
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Trash2, Copy, FolderOpen } from "lucide-react";
import { moveToTrash, showInFolder } from "@/lib/api";
```

将 `ThumbnailItem` 的返回从 button 改为 ContextMenu 包裹：

```typescript
function ThumbnailItem({ path, index, isSelected, onSelect }: ThumbnailItemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // ... existing canvas logic unchanged ...
  }, [path]);

  const handleDelete = async () => {
    const name = path.split(/[\\/]/).pop() ?? '';
    if (!window.confirm(`确定将 ${name} 移到回收站？`)) return;
    try {
      await moveToTrash(path);
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(path);
  };

  const handleShowInFolder = () => {
    showInFolder(path);
  };

  const fileName = path.split(/[\\/]/).pop() ?? '';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={() => onSelect(index)}
          className={`w-full rounded-lg overflow-hidden transition-all duration-150 ${
            isSelected
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/20"
              : "opacity-70 hover:opacity-100 hover:ring-1 hover:ring-border"
          }`}
        >
          <div className="bg-muted/50 flex items-center justify-center">
            <canvas ref={canvasRef} className="max-w-full max-h-[90px]" />
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <ContextMenuItem onClick={handleShowInFolder}>
          <FolderOpen className="h-3.5 w-3.5 mr-2" />
          在文件管理器中显示
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyPath}>
          <Copy className="h-3.5 w-3.5 mr-2" />
          复制文件路径
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          移到回收站
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
```

- [ ] **Step 6: 验证编译**

```bash
cd d:/opensource/rust/windows-image-view && npx tsc --noEmit
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: 无错误

- [ ] **Step 7: 提交**

```bash
git add src-tauri/Cargo.toml src-tauri/src/commands.rs src-tauri/src/lib.rs src/lib/api.ts src/components/ThumbnailSidebar.tsx
git commit -m "feat: 缩略图右键菜单（删除/复制路径/打开位置）"
```

---

### Task 8: 最近打开

**Files:**
- Modify: `src/hooks/useWindowState.ts` — 已有 `addRecentFile` 和 `recentFiles`，不需要额外修改
- Modify: `src/components/Toolbar.tsx` — 添加最近打开下拉列表
- Modify: `src/App.tsx` — 记录最近文件、传递 props

**依赖:** Task 3（store 基础设施）

- [ ] **Step 1: 在 Toolbar 实现最近打开下拉**

`src/components/Toolbar.tsx` — 顶部添加导入：

```typescript
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
```

在 `ToolbarProps` 接口末尾添加：

```typescript
recentFiles?: string[];
onOpenFile?: (path: string) => void;
```

在函数组件内添加状态和点击外部关闭：

```typescript
const [showRecent, setShowRecent] = useState(false);
const recentRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handler = (e: MouseEvent) => {
    if (recentRef.current && !recentRef.current.contains(e.target as Node)) {
      setShowRecent(false);
    }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, []);
```

在 "Open" 按钮旁添加最近打开下拉按钮（约第 64 行，`{/* Open */}` 区域）：

```tsx
{/* Open */}
<div className="flex items-center">
  <Button
    variant="ghost"
    size="icon"
    onClick={onOpen}
    title="打开图片 (Ctrl+O)"
    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent transition-all duration-150"
  >
    <FolderOpen className="h-4 w-4" />
  </Button>
  {recentFiles && recentFiles.length > 0 && (
    <div className="relative" ref={recentRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowRecent(!showRecent)}
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-150"
        title="最近打开"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      {showRecent && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl py-1 z-50">
          <div className="px-3 py-1.5 text-[11px] text-muted-foreground/50 font-medium uppercase tracking-wider">
            最近打开
          </div>
          {recentFiles.map((file, i) => (
            <button
              key={i}
              className="w-full px-3 py-1.5 text-xs text-left text-foreground/70 hover:bg-accent/50 hover:text-foreground truncate transition-colors"
              onClick={() => {
                setShowRecent(false);
                onOpenFile?.(file);
              }}
              title={file}
            >
              {file.split(/[\\/]/).pop()}
            </button>
          ))}
        </div>
      )}
    </div>
  )}
</div>
```

- [ ] **Step 2: 在 App.tsx 集成最近文件记录**

`src/App.tsx` — 确认顶部已有：

```typescript
import { loadWindowState, saveWindowState, addRecentFile } from "@/hooks/useWindowState";
```

如果还没有，添加 `recentFiles` state（在 `const [showSettings, setShowSettings]` 附近）：

```typescript
const [recentFiles, setRecentFiles] = useState<string[]>([]);
```

添加加载逻辑的 useEffect（如果 Task 3 还未添加的话）：

```typescript
useEffect(() => {
  loadWindowState().then((s) => {
    setShowThumbnails(s.showThumbnails);
    setShowRightSidebar(s.showRightSidebar);
    setRecentFiles(s.recentFiles);
  });
}, []);
```

创建包装打开函数，记录最近文件：

```typescript
const handleOpenRecent = useCallback((path: string) => {
  openImage(path);
  addRecentFile(path).then(() => {
    // 更新本地 state 以刷新 Toolbar 下拉
    setRecentFiles(prev => {
      const filtered = prev.filter(f => f !== path);
      return [path, ...filtered].slice(0, 10);
    });
  });
}, [openImage]);
```

当一个图片通过 `handleDrop` 或 `openImage` 打开时也需要记录。但 `openImage` 内部分为 dialog 选择路径和直接传入路径两种情况。最简洁的方式：在 `handleDrop` 中也调用 `addRecentFile`。

修改 `handleDrop` 约 184 行：

```typescript
const handleDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  dragCounter.current = 0;
  setIsDragging(false);
  const files = Array.from(e.dataTransfer.files);
  const imageFile = files.find(f => /\.(png|jpg|jpeg|bmp|gif|webp)$/i.test(f.name));
  if (!imageFile) return;
  const path = (imageFile as any).path;
  if (path) {
    openImage(path);
    addRecentFile(path).then(() => {
      setRecentFiles(prev => {
        const filtered = prev.filter(f => f !== path);
        return [path, ...filtered].slice(0, 10);
      });
    });
  }
}, [openImage]);
```

更新 `Toolbar` props 传递（约 190 行）：

```tsx
<Toolbar
  // ... existing props ...
  recentFiles={recentFiles}
  onOpenFile={handleOpenRecent}
/>
```

- [ ] **Step 3: 验证编译**

```bash
cd d:/opensource/rust/windows-image-view && npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/components/Toolbar.tsx src/App.tsx src/hooks/useWindowState.ts
git commit -m "feat: 最近打开（工具栏下拉列表 + 自动记录）"
```
