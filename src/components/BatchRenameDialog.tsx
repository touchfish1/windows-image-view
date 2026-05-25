import { useState } from "react";
import { previewRename, renameFiles } from "@/lib/api";
import type { RenameItem, RenameResult } from "@/types";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PATTERNS = [
  { label: "序号", value: "image_{n}.{ext}" },
  { label: "原名+序号", value: "{original}_{n}.{ext}" },
  { label: "前缀+序号", value: "img_{n}.{ext}" },
];

interface BatchRenameDialogProps {
  imageList: string[];
  isOpen: boolean;
  onClose: () => void;
}

export function BatchRenameDialog({ imageList, isOpen, onClose }: BatchRenameDialogProps) {
  const [pattern, setPattern] = useState(PATTERNS[0].value);
  const [customPattern, setCustomPattern] = useState("");
  const [startNum, setStartNum] = useState(1);
  const [preview, setPreview] = useState<RenameItem[] | null>(null);
  const [result, setResult] = useState<RenameResult | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handlePatternSelect = (p: string) => {
    setPattern(p);
    setCustomPattern(p);
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const items = await previewRename(imageList, customPattern || pattern, startNum);
      setPreview(items);
    } catch (e) {
      console.error("Preview failed:", e);
    }
    setLoading(false);
  };

  const handleRename = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const res = await renameFiles(preview);
      setResult(res);
    } catch (e) {
      console.error("Rename failed:", e);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card rounded-lg shadow-xl w-[560px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">批量重命名</h2>
          <p className="text-sm text-muted-foreground mt-1">{imageList.length} 个文件</p>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">命名模板</label>
            <div className="flex gap-2 mt-1">
              {PATTERNS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handlePatternSelect(p.value)}
                  className={`px-3 py-1.5 text-sm rounded ${
                    pattern === p.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customPattern || pattern}
              onChange={(e) => { setCustomPattern(e.target.value); setPattern(e.target.value); }}
              className="w-full mt-2 px-3 py-1.5 text-sm bg-muted rounded border border-border font-mono"
              placeholder="{original}_{n}.{ext}"
            />
            <p className="text-xs text-muted-foreground mt-1">{'{n}'} = 序号，{'{original}'} = 原文件名，{'{ext}'} = 扩展名</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">起始序号:</label>
            <input
              type="number"
              value={startNum}
              onChange={(e) => setStartNum(parseInt(e.target.value) || 1)}
              className="w-20 px-2 py-1 text-sm bg-muted rounded border border-border"
              min={1}
            />
            <Button variant="outline" size="sm" onClick={handlePreview} disabled={loading}>
              预览
            </Button>
          </div>
          {preview && !result && (
            <div>
              <div className="max-h-[200px] overflow-y-auto space-y-1 border border-border rounded p-2">
                {preview.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground truncate max-w-[200px]">
                      {item.old_path.split(/[\\/]/).pop()}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-foreground font-mono">{item.new_name}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-2" onClick={handleRename} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                确认重命名
              </Button>
            </div>
          )}
          {result && (
            <div className="space-y-1">
              {result.success.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item[1].split(/[\\/]/).pop()}</span>
                </div>
              ))}
              {result.failed.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>{item[0].split(/[\\/]/).pop()}: {item[1]}</span>
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
