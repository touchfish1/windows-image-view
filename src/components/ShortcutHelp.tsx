import { X, Keyboard } from "lucide-react";

interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: "← / →", desc: "上一张 / 下一张图片" },
  { keys: "Ctrl+O", desc: "打开图片" },
  { keys: "Ctrl+W", desc: "适应窗口" },
  { keys: "Ctrl+0", desc: "原始大小 (100%)" },
  { keys: "F11", desc: "切换全屏" },
  { keys: "F5", desc: "开始 / 停止幻灯片" },
  { keys: "F12", desc: "切换调试面板" },
  { keys: "Esc", desc: "退出全屏 / 幻灯片" },
  { keys: "Ctrl+C", desc: "复制选中的 OCR 文字" },
  { keys: "滚轮", desc: "放大 / 缩小" },
  { keys: "拖拽", desc: "平移图片（自由缩放模式）" },
  { keys: "双击", desc: "切换全屏" },
  { keys: "?", desc: "显示此帮助面板" },
];

export function ShortcutHelp({ isOpen, onClose }: ShortcutHelpProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-[420px] max-h-[80vh] bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Keyboard className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground/90">键盘快捷键</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent/60 transition-all duration-150"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcuts */}
        <div className="overflow-y-auto scrollbar-thin py-2">
          {SHORTCUTS.map(({ keys, desc }, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-5 py-2.5 hover:bg-accent/30 transition-colors"
            >
              <span className="text-xs text-muted-foreground/80">{desc}</span>
              <kbd className="px-2 py-0.5 text-[11px] font-mono font-medium bg-muted/70 border border-border/60 rounded-md text-foreground/70 ml-4 shrink-0">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
