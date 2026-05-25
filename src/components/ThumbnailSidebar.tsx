import { useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

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
    <div className="w-44 border-r border-border bg-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">
          缩略图
        </span>
        <button
          onClick={onToggle}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
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
    img.src = convertFileSrc(path);
  }, [path]);

  return (
    <button
      onClick={() => onSelect(index)}
      className={`w-full p-1 rounded flex items-center justify-center transition-colors ${
        isSelected
          ? "bg-accent ring-1 ring-primary"
          : "hover:bg-accent/50"
      }`}
    >
      <canvas ref={canvasRef} className="max-w-full max-h-[90px]" />
    </button>
  );
}
