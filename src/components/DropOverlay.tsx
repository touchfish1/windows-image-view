interface DropOverlayProps {
  visible: boolean;
}

/** Pure visual overlay shown during drag. Does NOT handle events. */
export function DropOverlay({ visible }: DropOverlayProps) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center pointer-events-none">
      <div className="bg-background/90 rounded-lg px-6 py-4 shadow-lg">
        <p className="text-lg font-medium text-foreground">拖放图片到此处</p>
        <p className="text-sm text-muted-foreground mt-1">支持 PNG、JPG、WebP 等格式</p>
      </div>
    </div>
  );
}
