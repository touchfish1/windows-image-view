import { useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { X, Image as ImageIcon } from "lucide-react";

interface ThumbnailSidebarProps {
  currentPath: string | null;
  currentIndex: number;
  imageList: string[];
  onNavigate: (index: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ThumbnailSidebar({
  currentPath,
  currentIndex,
  imageList,
  onNavigate,
  isOpen,
  onToggle,
}: ThumbnailSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="w-44 border-r border-border bg-background/60 backdrop-blur-lg flex flex-col overflow-hidden animate-slideInLeft">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            缩略图
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Thumbnails */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
        {imageList.map((path, idx) => (
          <ThumbnailItem
            key={path}
            path={path}
            index={idx}
            isSelected={idx === currentIndex && currentPath !== null}
            onSelect={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

interface ThumbnailItemProps {
  path: string;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
}

function ThumbnailItem({ path, index, isSelected, onSelect }: ThumbnailItemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const maxW = 160;
      const maxH = 90;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
    };
    img.onerror = () => {
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = 160;
      canvas.height = 90;
      ctx.fillStyle = "hsl(225, 5%, 16%)";
      ctx.fillRect(0, 0, 160, 90);
      ctx.fillStyle = "hsl(215, 10%, 56%)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("加载失败", 80, 50);
    };
    img.src = convertFileSrc(path);
    return () => { cancelled = true; };
  }, [path]);

  return (
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
  );
}
