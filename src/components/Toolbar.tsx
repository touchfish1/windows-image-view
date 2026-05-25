import { Button } from "@/components/ui/button";
import { FolderOpen, Maximize } from "lucide-react";

interface ToolbarProps {
  onOpen: () => void;
  onResetView: () => void;
  hasImage: boolean;
}

export function Toolbar({
  onOpen,
  onResetView,
  hasImage,
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
        disabled={!hasImage}
        title="适应窗口"
        className="h-8 w-8"
        onClick={onResetView}
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
}
