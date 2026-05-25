import { useState, useEffect } from "react";
import { checkFileAssoc, registerFileAssoc, unregisterFileAssoc, openDefaultApps } from "@/lib/api";
import type { AssocStatus } from "@/types";
import { Loader2, Check, Settings, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const ALL_EXTENSIONS = [
  { ext: "png", label: "PNG" },
  { ext: "jpg", label: "JPEG" },
  { ext: "jpeg", label: "JPEG" },
  { ext: "bmp", label: "BMP" },
  { ext: "gif", label: "GIF" },
  { ext: "webp", label: "WebP" },
  { ext: "tiff", label: "TIFF" },
  { ext: "ico", label: "ICO" },
  { ext: "svg", label: "SVG" },
];

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [assocStatus, setAssocStatus] = useState<AssocStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    checkFileAssoc()
      .then((status) => {
        setAssocStatus(status);
        setSelected(new Set(status.filter((s) => !s.is_registered).map((s) => s.extension)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen]);

  const toggleExt = (ext: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ext)) next.delete(ext);
      else next.add(ext);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const toRegister = Array.from(selected);
    const toUnregister = assocStatus
      .filter((s) => s.is_registered && !selected.has(s.extension))
      .map((s) => s.extension);

    try {
      if (toRegister.length > 0) await registerFileAssoc(toRegister);
      if (toUnregister.length > 0) await unregisterFileAssoc(toUnregister);
      const updated = await checkFileAssoc();
      setAssocStatus(updated);
    } catch (e) {
      console.error("Failed to save associations:", e);
    }
    setSaving(false);
  };

  const handleSelectAll = () => {
    setSelected(new Set(ALL_EXTENSIONS.map((e) => e.ext)));
  };

  const handleDeselectAll = () => {
    setSelected(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay flex items-center justify-center" onClick={onClose}>
      <div
        className="dialog-content bg-card/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border w-[480px] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Settings className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-semibold tracking-tight">设置</h2>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">文件关联</h3>
            <p className="text-xs text-muted-foreground mb-3">
              选择要将 Image Viewer 关联的文件类型，关联后可在文件右键菜单的"打开方式"中选择本应用打开。
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    全选
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    取消全选
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {assocStatus.map((s) => {
                    const label = ALL_EXTENSIONS.find((e) => e.ext === s.extension)?.label ?? s.extension.toUpperCase();
                    const isSelected = selected.has(s.extension);
                    return (
                      <button
                        key={s.extension}
                        onClick={() => toggleExt(s.extension)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded border transition-colors ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground"
                            : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <span className="flex-1 text-left font-mono">{label}</span>
                        {s.is_registered && (
                          <span className="text-xs text-green-500" title="已关联">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">设为默认图片查看器</p>
                <p className="text-xs text-muted-foreground mt-1">
                  关联文件类型后，可前往 Windows 设置中将 Image Viewer 设为默认应用。
                </p>
                <Button variant="outline" size="sm" className="mt-2" onClick={openDefaultApps}>
                  打开 Windows 默认应用设置
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} size="sm">
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving || loading} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
