import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import {
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Maximize,
  Minimize2,
  Fullscreen,
  RotateCcw,
  PanelLeft,
  PanelRight,
  Play,
  ImageDown,
  ScanText,
  Settings,
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
  showThumbnails?: boolean;
  onToggleThumbnails?: () => void;
  onSlideshow?: () => void;
  showRightSidebar?: boolean;
  onToggleRightSidebar?: () => void;
  onBatchConvert?: () => void;
  onBatchRename?: () => void;
  onSettings?: () => void;
  recentFiles?: string[];
  onOpenFile?: (path: string) => void;
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
  showThumbnails,
  onToggleThumbnails,
  onSlideshow,
  onBatchConvert,
  onBatchRename,
  showRightSidebar,
  onToggleRightSidebar,
  onSettings,
  recentFiles,
  onOpenFile,
}: ToolbarProps) {
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

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 select-none">
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

      <div className="w-px h-5 bg-border/60 mx-0.5" />

      {/* Navigation */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          disabled={!hasImage || !hasPrev}
          onClick={onNavigatePrev}
          title="上一张 (←)"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent transition-all duration-150 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={!hasImage || !hasNext}
          onClick={onNavigateNext}
          title="下一张 (→)"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent transition-all duration-150 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-5 bg-border/60 mx-0.5" />

      {/* Zoom */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          disabled={!hasImage}
          onClick={onToggleZoomMode}
          title={zoomMode === "fit" ? "实际大小 (Ctrl+0)" : "适应窗口 (Ctrl+W)"}
          className={`h-8 w-8 transition-all duration-150 disabled:opacity-30 ${
            zoomMode === "fit"
              ? "text-primary hover:text-primary/80 hover:bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
          }`}
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
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent transition-all duration-150 disabled:opacity-30"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-5 bg-border/60 mx-0.5" />

      {/* Fullscreen */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleFullscreen}
        title={isFullscreen ? "退出全屏 (F11)" : "全屏 (F11)"}
        className={`h-8 w-8 transition-all duration-150 ${
          isFullscreen
            ? "text-primary hover:text-primary/80 hover:bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
        }`}
      >
        <Fullscreen className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border/60 mx-0.5" />

      {/* Panels */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleThumbnails}
          title={showThumbnails ? "隐藏缩略图" : "显示缩略图"}
          className={`h-8 w-8 transition-all duration-150 ${
            showThumbnails
              ? "text-primary hover:text-primary/80 hover:bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
          }`}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={!hasImage}
          onClick={onSlideshow}
          title="幻灯片 (F5)"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent transition-all duration-150 disabled:opacity-30"
        >
          <Play className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleRightSidebar}
          title={showRightSidebar ? "隐藏侧边栏" : "显示侧边栏"}
          className={`h-8 w-8 transition-all duration-150 ${
            showRightSidebar
              ? "text-primary hover:text-primary/80 hover:bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
          }`}
        >
          <PanelRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-5 bg-border/60 mx-0.5" />

      {/* Batch Operations */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          disabled={!hasImage}
          onClick={onBatchConvert}
          title="批量格式转换"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent transition-all duration-150 disabled:opacity-30"
        >
          <ImageDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={!hasImage}
          onClick={onBatchRename}
          title="批量重命名"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent transition-all duration-150 disabled:opacity-30"
        >
          <ScanText className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1" />

      {/* Settings */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onSettings}
        title="设置"
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent transition-all duration-150"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
}
