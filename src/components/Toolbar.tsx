import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  ChevronLeft,
  ChevronRight,
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
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 select-none">
      {/* Open */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpen}
        title="打开图片 (Ctrl+O)"
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent transition-all duration-150"
      >
        <FolderOpen className="h-4 w-4" />
      </Button>

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
