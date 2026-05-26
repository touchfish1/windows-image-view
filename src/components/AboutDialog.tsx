import { useState, useEffect, useRef } from "react";
import { check } from "@tauri-apps/plugin-updater";
import type { Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion, getName, getTauriVersion } from "@tauri-apps/api/app";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ExternalLink, CheckCircle, Download, RotateCcw } from "lucide-react";

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type UpdateStatus =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; version: string }
  | { status: "uptodate" }
  | { status: "error"; error: string }
  | { status: "downloading"; progress: number }   // 0–100
  | { status: "installing" };

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const [appVersion, setAppVersion] = useState("");
  const [appName, setAppName] = useState("");
  const [tauriVersion, setTauriVersion] = useState("");
  const [updateState, setUpdateState] = useState<UpdateStatus>({ status: "idle" });
  const updateRef = useRef<Update | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    getVersion().then(setAppVersion).catch(() => setAppVersion("?"));
    getName().then(setAppName).catch(() => setAppName("Image Viewer"));
    getTauriVersion().then(setTauriVersion).catch(() => setTauriVersion("?"));
    setUpdateState({ status: "idle" });
    updateRef.current = null;
  }, [isOpen]);

  /** Step 1: check for updates */
  const handleCheck = async () => {
    setUpdateState({ status: "checking" });
    try {
      const update = await check();
      if (update) {
        updateRef.current = update;
        setUpdateState({ status: "available", version: update.version });
      } else {
        setUpdateState({ status: "uptodate" });
      }
    } catch (e) {
      setUpdateState({ status: "error", error: String(e) });
    }
  };

  /** Step 2: download & install */
  const handleUpdate = async () => {
    const update = updateRef.current;
    if (!update) return;

    setUpdateState({ status: "downloading", progress: 0 });
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started" && event.data.contentLength) {
          // contentLength known — will track via Progress events
        } else if (event.event === "Progress") {
          // Approximate progress; without total size we show indeterminate
          setUpdateState((prev) =>
            prev.status === "downloading"
              ? { ...prev, progress: Math.min(prev.progress + 5, 90) }
              : prev,
          );
        } else if (event.event === "Finished") {
          setUpdateState((prev) =>
            prev.status === "downloading" ? { ...prev, progress: 100 } : prev,
          );
        }
      });
      setUpdateState({ status: "installing" });
      await relaunch();
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
            {updateState.status === "downloading" || updateState.status === "installing" ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <RefreshCw className="h-8 w-8 text-primary" />
            )}
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
          {/* Progress bar when downloading */}
          {(updateState.status === "downloading" || updateState.status === "installing") && (
            <div className="mb-3">
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>{updateState.status === "installing" ? "正在安装..." : "正在下载更新..."}</span>
                <span>{updateState.status === "downloading" ? `${updateState.progress}%` : ""}</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{
                    width: updateState.status === "installing" ? "100%" : `${updateState.progress}%`,
                  }}
                />
              </div>
            </div>
          )}

          <Button
            className="w-full"
            variant={
              updateState.status === "available" ? "default" :
              updateState.status === "error" ? "outline" : "outline"
            }
            size="sm"
            onClick={
              updateState.status === "available" ? handleUpdate :
              updateState.status === "downloading" || updateState.status === "installing" ? undefined :
              handleCheck
            }
            disabled={
              updateState.status === "checking" ||
              updateState.status === "downloading" ||
              updateState.status === "installing"
            }
          >
            {updateState.status === "checking" ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />正在检查更新...</>
            ) : updateState.status === "available" ? (
              <><Download className="h-3.5 w-3.5 mr-1.5" />更新到 v{updateState.version}</>
            ) : updateState.status === "uptodate" ? (
              <><CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-500" />已是最新版本</>
            ) : updateState.status === "error" ? (
              <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />重试</>
            ) : updateState.status === "downloading" || updateState.status === "installing" ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />{
                updateState.status === "installing" ? "正在安装..." : "正在下载..."
              }</>
            ) : (
              <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />检查更新</>
            )}
          </Button>

          {updateState.status === "uptodate" && (
            <p className="text-[11px] text-green-600/70 text-center mt-1.5">当前已是最新版本</p>
          )}
          {updateState.status === "error" && (
            <div className="text-center mt-1.5">
              <p className="text-[11px] text-amber-600/70">{updateState.error}</p>
            </div>
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
          <Button variant="outline" size="sm" onClick={onClose}>关闭</Button>
        </div>
      </div>
    </div>
  );
}
