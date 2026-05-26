import { useState, useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask } from "@tauri-apps/plugin-dialog";
import { getVersion, getName, getTauriVersion } from "@tauri-apps/api/app";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ExternalLink, CheckCircle, AlertTriangle, Info } from "lucide-react";

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UpdateState {
  status: "idle" | "checking" | "available" | "uptodate" | "error";
  version?: string;
  error?: string;
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const [appVersion, setAppVersion] = useState("");
  const [appName, setAppName] = useState("");
  const [tauriVersion, setTauriVersion] = useState("");
  const [updateState, setUpdateState] = useState<UpdateState>({ status: "idle" });

  useEffect(() => {
    if (!isOpen) return;
    getVersion().then(setAppVersion).catch(() => setAppVersion("?"));
    getName().then(setAppName).catch(() => setAppName("Image Viewer"));
    getTauriVersion().then(setTauriVersion).catch(() => setTauriVersion("?"));
    setUpdateState({ status: "idle" });
  }, [isOpen]);

  const handleCheckUpdate = async () => {
    setUpdateState({ status: "checking" });
    try {
      const update = await check();
      if (update) {
        setUpdateState({ status: "available", version: update.version });
        const shouldUpdate = await ask(
          `新版本 ${update.version} 可用，是否现在更新？`,
          { title: "发现更新", kind: "info" }
        );
        if (shouldUpdate) {
          await update.downloadAndInstall();
          await relaunch();
        }
      } else {
        setUpdateState({ status: "uptodate" });
      }
    } catch (e) {
      setUpdateState({ status: "error", error: String(e) });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay flex items-center justify-center" onClick={onClose}>
      <div
        className="dialog-content bg-card/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Info className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">{appName || "Image Viewer OCR"}</h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">v{appVersion}</p>
        </div>

        {/* Info */}
        <div className="px-6 pb-4 space-y-2">
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">应用版本</span>
              <span className="font-mono text-foreground/80">{appVersion || "..."}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tauri 版本</span>
              <span className="font-mono text-foreground/80">{tauriVersion || "..."}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">系统平台</span>
              <span className="font-mono text-foreground/80">
                {navigator.platform || "Unknown"}
              </span>
            </div>
          </div>
        </div>

        {/* Update Section */}
        <div className="px-6 pb-4">
          <Button
            className="w-full"
            variant={updateState.status === "available" ? "default" : "outline"}
            size="sm"
            onClick={handleCheckUpdate}
            disabled={updateState.status === "checking"}
          >
            {updateState.status === "checking" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                正在检查更新...
              </>
            ) : updateState.status === "available" ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                更新到 v{updateState.version}
              </>
            ) : updateState.status === "uptodate" ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                已是最新版本
              </>
            ) : updateState.status === "error" ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                检查失败，点击重试
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                检查更新
              </>
            )}
          </Button>

          {updateState.status === "uptodate" && (
            <p className="text-[11px] text-green-600/70 text-center mt-1.5">
              当前已是最新版本
            </p>
          )}
          {updateState.status === "error" && (
            <p className="text-[11px] text-amber-600/70 text-center mt-1.5">
              无法连接到更新服务器
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <a
            href="https://github.com/touchfish1/windows-image-view"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            GitHub
          </a>
          <Button variant="outline" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
