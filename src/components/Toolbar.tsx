import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize2,
  Fullscreen,
  RotateCcw,
} from "lucide-react";

interface ToolbarProps {
  onOpen: () => void;
  onResetView: () => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onToggleFullscreen: () => void;
  onToggleZoomMode: () => void;
  hasImage: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  zoomMode: "fit" | "free";
  isFullscreen: boolean;
}

export function Toolbar({
  onOpen,
  onResetView,
  onNavigatePrev,
  onNavigateNext,
  onToggleFullscreen,
  onToggleZoomMode,
  hasImage,
  hasPrev,
  hasNext,
  zoomMode,
  isFullscreen,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-card">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpen}
        title="打开图片 (Ctrl+O)"
        className="h-8 w-8"
      >
        <FolderOpen className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button
        variant="ghost"
        size="icon"
        disabled={!hasImage || !hasPrev}
        onClick={onNavigatePrev}
        title="上一张 (←)"
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        disabled={!hasImage || !hasNext}
        onClick={onNavigateNext}
        title="下一张 (→)"
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button
        variant="ghost"
        size="icon"
        disabled={!hasImage}
        onClick={onToggleZoomMode}
        title={zoomMode === "fit" ? "实际大小 (Ctrl+0)" : "适应窗口 (Ctrl+W)"}
        className="h-8 w-8"
      >
        {zoomMode === "fit" ? (
          <Maximize className="h-4 w-4" />
        ) : (
          <Minimize2 className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        disabled={!hasImage}
        onClick={onResetView}
        title="重置到 100%"
        className="h-8 w-8"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleFullscreen}
        title={isFullscreen ? "退出全屏 (F11)" : "全屏 (F11)"}
        className="h-8 w-8"
      >
        <Fullscreen className="h-4 w-4" />
      </Button>
    </div>
  );
}
