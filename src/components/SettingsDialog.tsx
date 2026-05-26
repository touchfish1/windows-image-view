import { useState, useEffect } from "react";
import { checkFileAssoc, registerFileAssoc, unregisterFileAssoc, openDefaultApps, registerDefaultProgram } from "@/lib/api";
import type { AssocStatus } from "@/types";
import { Loader2, Check, Settings, ExternalLink, Star, ChevronRight } from "lucide-react";
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
  const [settingDefault, setSettingDefault] = useState(false);

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

  const handleSetAsDefault = async () => {
    setSettingDefault(true);
    try {
      // 1. Register all extensions
      const allExts = ALL_EXTENSIONS.map((e) => e.ext);
      await registerFileAssoc(allExts);

      // 2. Register as a Default Program candidate
      await registerDefaultProgram();

      // 3. Open Windows Settings deep-linked to our app
      await openDefaultApps();

      // 4. Refresh status
      const updated = await checkFileAssoc();
      setAssocStatus(updated);
      setSelected(new Set());
    } catch (e) {
      console.error("Failed to set as default:", e);
    }
    setSettingDefault(false);
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
        className="dialog-content bg-card/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border w-[500px] max-h-[80vh] overflow-y-auto scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Settings className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-semibold tracking-tight">设置</h2>
        </div>

        <div className="p-4 space-y-5">
          {/* Set as Default Hero */}
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/15 shrink-0">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">设为默认图片查看器</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  将 Image Viewer OCR 设置为 Windows 默认的图片打开方式，双击图片即可直接使用本应用打开。
                </p>
                <Button
                  className="mt-3"
                  size="sm"
                  onClick={handleSetAsDefault}
                  disabled={settingDefault}
                >
                  {settingDefault ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Star className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  设为默认
                </Button>
              </div>
            </div>
          </div>

          {/* Per-extension File Association */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">文件关联管理</h3>
              <span className="text-[11px] text-muted-foreground/60">
                {assocStatus.filter((s) => s.is_registered).length}/{assocStatus.length} 已关联
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              选择要关联的文件类型，关联后可在文件右键菜单的"打开方式"中选择本应用。
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
                  <div className="flex-1" />
                  <Button variant="default" size="sm" onClick={handleSave} disabled={saving || loading}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                    保存更改
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
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all duration-150 ${
                          isSelected
                            ? "bg-primary/10 border-primary/50 text-foreground shadow-sm"
                            : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/30"
                        }`}
                      >
                        <span className="flex-1 text-left font-mono text-xs">{label}</span>
                        {s.is_registered && (
                          <span className="text-green-500 shrink-0">
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

          {/* Windows Settings Link */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-start gap-2.5">
              <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Windows 默认应用设置</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  关联文件类型后，可前往 Windows 设置中为每种文件类型选择 Image Viewer OCR 作为默认应用。
                </p>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleSetAsDefault} disabled={settingDefault}>
                  <ChevronRight className="h-3 w-3 mr-1" />
                  打开 Windows 设置
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end">
          <Button variant="outline" onClick={onClose} size="sm">
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
