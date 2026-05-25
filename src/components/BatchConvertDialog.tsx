import { useState } from "react";
import { convertImages } from "@/lib/api";
import type { ConvertResult } from "@/types";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";

const FORMATS = ["png", "jpeg", "webp", "bmp"];

interface BatchConvertDialogProps {
  imageList: string[];
  isOpen: boolean;
  onClose: () => void;
}

export function BatchConvertDialog({ imageList, isOpen, onClose }: BatchConvertDialogProps) {
  const [targetFormat, setTargetFormat] = useState("png");
  const [outputDir, setOutputDir] = useState("");
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSelectDir = async () => {
    const dir = await open({ directory: true, multiple: false });
    if (dir) setOutputDir(dir);
  };

  const handleConvert = async () => {
    if (!outputDir) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await convertImages({
        files: imageList,
        target_format: targetFormat,
        output_dir: outputDir,
      });
      setResult(res);
    } catch (e) {
      console.error("Convert failed:", e);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card rounded-lg shadow-xl w-[480px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">批量格式转换</h2>
          <p className="text-sm text-muted-foreground mt-1">{imageList.length} 个文件</p>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">目标格式</label>
            <div className="flex gap-2 mt-1">
              {FORMATS.map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setTargetFormat(fmt)}
                  className={`px-3 py-1.5 text-sm rounded ${
                    targetFormat === fmt
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">输出目录</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={outputDir}
                readOnly
                placeholder="选择输出目录..."
                className="flex-1 px-3 py-1.5 text-sm bg-muted rounded border border-border"
              />
              <Button variant="outline" size="sm" onClick={handleSelectDir}>浏览</Button>
            </div>
          </div>
          <Button className="w-full" onClick={handleConvert} disabled={loading || !outputDir}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            开始转换
          </Button>
          {result && (
            <div className="space-y-1">
              {result.success.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{f}</span>
                </div>
              ))}
              {result.failed.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border flex justify-end">
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </div>
      </div>
    </div>
  );
}
