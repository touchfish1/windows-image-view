import { useState } from "react";

interface DropOverlayProps {
  onDrop: (e: React.DragEvent) => void;
}

export function DropOverlay({ onDrop }: DropOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onDrop(e);
  };

  return (
    <div
      className="absolute inset-0 z-40"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center">
          <div className="bg-background/90 rounded-lg px-6 py-4 shadow-lg">
            <p className="text-lg font-medium text-foreground">拖放图片到此处</p>
            <p className="text-sm text-muted-foreground mt-1">支持 PNG、JPG、WebP 等格式</p>
          </div>
        </div>
      )}
    </div>
  );
}
