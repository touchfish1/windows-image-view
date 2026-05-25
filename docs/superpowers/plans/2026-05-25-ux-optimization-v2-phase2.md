# UX 优化 V2 — Phase 2+3 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 Phase 2（6 个任务）+ Phase 3（1 个任务）

**Architecture:** 三轮并发执行。Round 1 四个独立任务（不同文件），Round 2 两个独立任务，Round 3 一个任务。

---
### Task 9: 图片切换过渡动画

**Files:**
- Modify: `src/components/ImageCanvas.tsx` — 添加 crossfade 逻辑

**依赖:** 无

- [ ] **实现 crossfade 过渡**

当 `imageInfo` 变化且旧图已加载时：
1. 保存当前 canvas 快照（`ctx.getImageData`）
2. 新图加载完成后，用 requestAnimationFrame 做 200ms 渐变
3. 每帧：旧图 globalAlpha 递减（1 → 0），新图 globalAlpha 递增（0 → 1）

关键实现：
```typescript
// 新增 ref
const transitionRef = useRef<{
  oldSnapshot: ImageData | null;
  startTime: number;
  duration: number;
  newImg: HTMLImageElement;
} | null>(null);

// 在 drawCanvas 中处理过渡
if (transitionRef.current) {
  const t = transitionRef.current;
  const elapsed = performance.now() - t.startTime;
  const progress = Math.min(elapsed / t.duration, 1);
  
  // Draw old snapshot
  if (t.oldSnapshot) {
    ctx.putImageData(t.oldSnapshot, 0, 0);
  }
  
  // Draw new image with alpha
  ctx.globalAlpha = progress;
  ctx.save();
  // ... same transform as normal image drawing ...
  ctx.drawImage(t.newImg, 0, 0);
  ctx.restore();
  ctx.globalAlpha = 1;
  
  if (progress >= 1) {
    transitionRef.current = null;
  }
}
```

- [ ] **验证:** `npx tsc --noEmit`
- [ ] **提交:** `git add src/components/ImageCanvas.tsx && git commit -m "feat: 图片切换 crossfade 过渡动画（200ms）"`

---
### Task 10: 深色/浅色主题切换

**Files:**
- Modify: `src/App.css` — 添加 light 色板 CSS 变量
- Modify: `src/App.tsx` — 主题切换逻辑 + store 持久化

**依赖:** 无

- [ ] **App.css 添加 light 主题色板**

在文件末尾添加：
```css
.light {
  --background: 0 0% 98%;
  --foreground: 225 6% 10%;
  --card: 0 0% 100%;
  --card-foreground: 225 6% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 225 6% 10%;
  --primary: 221 83% 53%;
  --primary-foreground: 0 0% 100%;
  --secondary: 225 6% 90%;
  --secondary-foreground: 225 6% 10%;
  --muted: 225 6% 92%;
  --muted-foreground: 225 6% 45%;
  --accent: 225 6% 90%;
  --accent-foreground: 225 6% 10%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 225 6% 85%;
  --input: 225 6% 85%;
  --ring: 221 83% 53%;
  --radius: 0.5rem;
}
```

- [ ] **App.tsx 添加主题切换**

导入：
```typescript
import { Sun, Moon } from "lucide-react";
```

添加 state：
```typescript
const [theme, setTheme] = useState<'dark' | 'light'>('dark');
```

加载时恢复：
```typescript
// 在 loadWindowState useEffect 中添加
const savedTheme = await store.get<'dark' | 'light'>('theme');
if (savedTheme) setTheme(savedTheme);
```

切换时持久化：
```typescript
useEffect(() => {
  document.documentElement.classList.toggle('light', theme === 'light');
  document.documentElement.classList.toggle('dark', theme === 'dark');
  saveWindowState({ theme } as any);
}, [theme]);
```

Toolbar 添加切换按钮（在 Settings 按钮左侧）：
```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
  title={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-150"
>
  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
</Button>
```

- [ ] **验证:** `npx tsc --noEmit`
- [ ] **提交:** `git add src/App.css src/App.tsx && git commit -m "feat: 深色/浅色主题切换"`

---
### Task 11: 缩略图懒加载优化

**Files:**
- Modify: `src/components/ThumbnailSidebar.tsx` — IntersectionObserver 延迟渲染缩略图

**依赖:** 无

- [ ] **实现 IntersectionObserver 懒加载**

用 `useInView` 模式：
```typescript
function ThumbnailItem({ path, index, isSelected, onSelect }: ThumbnailItemProps) {
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin: "100px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    // ... existing canvas drawing logic ...
  }, [path, inView]);

  return (
    <div ref={containerRef}>
      {/* ... button + canvas ... */}
    </div>
  );
}
```

- [ ] **验证:** `npx tsc --noEmit`
- [ ] **提交:** `git add src/components/ThumbnailSidebar.tsx && git commit -m "perf: 缩略图懒加载优化（IntersectionObserver 按需渲染）"`

---
### Task 12: OCR 文本导出

**Files:**
- Modify: `src/lib/api.ts` — 添加 `writeTextFile` 桥接
- Modify: `src-tauri/src/commands.rs` — 添加 `write_text_file` 命令
- Modify: `src-tauri/src/lib.rs` — 注册命令
- Modify: `src/components/Toolbar.tsx` — 添加导出按钮
- Modify: `src/components/ImageContextMenu.tsx` — 添加导出菜单项

- [ ] **Rust 端: write_text_file 命令**

`commands.rs`:
```rust
#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))
}
```

`lib.rs` — 注册 `commands::write_text_file`

- [ ] **JS 端: api.ts**

```typescript
export async function saveTextFile(path: string, content: string): Promise<void> {
  return invoke<void>("write_text_file", { path, content });
}
```

- [ ] **Toolbar: 添加导出 OCR 按钮**

在 OCR 状态为 done 时显示导出按钮：
```tsx
<Button
  variant="ghost"
  size="icon"
  disabled={!hasImage}
  onClick={onExportOcr}
  title="导出 OCR 文本"
  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-150 disabled:opacity-30"
>
  <FileText className="h-4 w-4" />
</Button>
```

- [ ] **ImageContextMenu: 添加导出菜单项**

添加 `onExportOcr` prop 和菜单项：
```tsx
<ContextMenuItem disabled={!hasImage || !hasOcr} onClick={onExportOcr}>
  <FileText className="h-4 w-4 mr-2" /> 导出 OCR 文本
</ContextMenuItem>
```

- [ ] **验证:** `npx tsc --noEmit && cargo check`
- [ ] **提交:** `git add ... && git commit -m "feat: OCR 文本导出（.txt）"`

---
### Task 13: 自定义安装包

**Files:**
- Modify: `src-tauri/tauri.conf.json` — NSIS 配置
- Create: `src-tauri/installer.nsh` — NSIS 安装/卸载脚本

- [ ] **创建 NSIS 脚本**

`src-tauri/installer.nsh`:
```nsis
!macro customInstall
  WriteRegStr HKCU "Software\RegisteredApplications" "ImageViewerOCR" "Software\ImageViewerOCR\Capabilities"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities" "ApplicationName" "Image Viewer OCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities" "ApplicationDescription" "Image viewer with OCR text recognition"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".png" "ImageViewerOCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".jpg" "ImageViewerOCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".jpeg" "ImageViewerOCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".bmp" "ImageViewerOCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".gif" "ImageViewerOCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".webp" "ImageViewerOCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".tiff" "ImageViewerOCR"
  WriteRegStr HKCU "Software\ImageViewerOCR\Capabilities\FileAssociations" ".ico" "ImageViewerOCR"
!macroend

!macro customUninstall
  DeleteRegValue HKCU "Software\RegisteredApplications" "ImageViewerOCR"
  DeleteRegKey HKCU "Software\ImageViewerOCR"
!macroend
```

- [ ] **更新 tauri.conf.json**

在 `bundle` 中添加：
```json
"windows": {
  "nsis": {
    "installMode": "currentUser",
    "installerHooks": "installer.nsh"
  }
}
```

- [ ] **验证:** `cargo check`
- [ ] **提交:** `git add src-tauri/tauri.conf.json src-tauri/installer.nsh && git commit -m "feat: 自定义 NSIS 安装包（安装时注册文件关联）"`

---
### Task 14: 应用图标

**Files:**
- Replace: `icons/` 目录下的所有图标文件

- [ ] **替换图标**

使用 Tauri CLI 生成：
```bash
cd d:/opensource/rust/windows-image-view && npx tauri icon source-icon.png
```
若无源图标文件，可使用现有图标占位（保持现有文件结构）。

- [ ] **验证:** `cargo check`
- [ ] **提交:** `git add icons/ && git commit -m "feat: 替换应用图标"`

---
### Task 15: 自动更新

**Files:**
- Modify: `src-tauri/Cargo.toml` — 添加 updater 插件
- Modify: `package.json` — 添加 `@tauri-apps/plugin-updater`
- Modify: `src-tauri/src/lib.rs` — 注册 updater 插件
- Modify: `src-tauri/tauri.conf.json` — updater 配置
- Create: `src/hooks/useAppUpdater.ts` — 更新检测 hook
- Modify: `src/App.tsx` — 集成更新提示

- [ ] **安装依赖**

```bash
npm install @tauri-apps/plugin-updater@^2
```

`Cargo.toml`:
```toml
tauri-plugin-updater = "2"
```

- [ ] **tauri.conf.json 配置**

```json
"plugins": {
  "updater": {
    "pubkey": "",
    "endpoints": [
      "https://github.com/touchfish1/windows-image-view/releases/latest/download/latest.json"
    ],
    "windows": {
      "installMode": "passive"
    }
  }
}
```

- [ ] **注册插件 + 创建 hook + 集成**

标准流程参考 updater 文档。

- [ ] **验证:** `npx tsc --noEmit && cargo check`
- [ ] **提交:** 相关文件全部提交
