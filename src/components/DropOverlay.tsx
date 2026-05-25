import { Upload } from "lucide-react";

interface DropOverlayProps {
  visible: boolean;
}

/** Pure visual overlay shown during drag. Does NOT handle events. */
export function DropOverlay({ visible }: DropOverlayProps) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none animate-fadeIn">
      <div className="absolute inset-0 bg-primary/5" />
      <div className="relative bg-background/80 backdrop-blur-xl rounded-2xl border-2 border-dashed border-primary/50 px-10 py-8 shadow-2xl shadow-primary/10">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-foreground">拖放图片到此处</p>
            <p className="text-sm text-muted-foreground mt-1">支持 PNG、JPG、WebP 等格式</p>
          </div>
        </div>
      </div>
    </div>
  );
}
