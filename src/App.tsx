import { useAppUpdater } from "@/hooks/useAppUpdater";
import { useImageViewer } from "@/hooks/useImageViewer";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSlideshow } from "@/hooks/useSlideshow";
import { Toolbar } from "@/components/Toolbar";
import { ImageCanvas } from "@/components/ImageCanvas";
import { RightSidebar } from "@/components/RightSidebar";
import { StatusBar } from "@/components/StatusBar";
import { ThumbnailSidebar } from "@/components/ThumbnailSidebar";
import { SlideshowOverlay } from "@/components/SlideshowOverlay";
import { DropOverlay } from "@/components/DropOverlay";
import { BatchConvertDialog } from "@/components/BatchConvertDialog";
import { BatchRenameDialog } from "@/components/BatchRenameDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { AboutDialog } from "@/components/AboutDialog";
import { DebugPanel } from "@/components/DebugPanel";
import { getFileSize, saveImageAs, showInFolder, saveTextFile } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { save } from "@tauri-apps/plugin-dialog";
import { loadWindowState, saveWindowState, addRecentFile } from "@/hooks/useWindowState";
import { useCallback, useEffect, useRef, useState } from "react";

const EMPTY_BLOCKS: never[] = [];

function App() {
  const {
    state,
    openImage,
    navigateTo,
    handleZoom,
    handlePan,
    resetView,
    setSelection,
    setZoomMode,
    setZoomAbsolute,
    navigateNext,
    navigatePrev,
    setFullscreen,
    selectedText,
  } = useImageViewer();

  useAppUpdater();

  const [fileSize, setFileSize] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [fileType, setFileType] = useState<string | null>(null);
  const [fileModified, setFileModified] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const { slideshowState, start: startSlideshow, stop: stopSlideshow, toggle: toggleSlideshow, setInterval: setSlideshowInterval, setOnNext } = useSlideshow(state.imageList.length);

  useEffect(() => {
    if (!state.currentPath) {
      setFileSize(null);
      return;
    }
    getFileSize(state.currentPath)
      .then((bytes) => setFileSize(formatFileSize(bytes)))
      .catch(() => setFileSize(null));
  }, [state.currentPath]);

  useEffect(() => {
    if (!state.currentPath) {
      setFileType(null);
      setFileModified(null);
      return;
    }
    const ext = state.currentPath.split('.').pop()?.toLowerCase() ?? null;
    setFileType(ext);
  }, [state.currentPath]);

  useEffect(() => {
    setOnNext(navigateNext);
  }, [setOnNext, navigateNext]);

  useEffect(() => {
    loadWindowState().then((s) => {
      setShowThumbnails(s.showThumbnails);
      setShowRightSidebar(s.showRightSidebar);
      setRecentFiles(s.recentFiles);
      if ((s as any).theme) {
        setTheme((s as any).theme);
      }
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    saveWindowState({ theme } as any);
  }, [theme]);

  const getFileName = useCallback(() => {
    if (!state.currentPath) return null;
    return state.currentPath.split(/[\\/]/).pop() ?? null;
  }, [state.currentPath]);

  const toggleFullscreen = useCallback(async () => {
    const win = getCurrentWindow();
    const isFullscreen = await win.isFullscreen();
    await win.setFullscreen(!isFullscreen);
    setFullscreen(!isFullscreen);
  }, [setFullscreen]);

  const handleZoomActual = useCallback(() => {
    setZoomMode("free");
    resetView();
  }, [setZoomMode, resetView]);

  const handleZoomFit = useCallback(() => {
    setZoomMode("fit");
  }, [setZoomMode]);

  const handleEscape = useCallback(() => {
    if (slideshowState.isPlaying) {
      stopSlideshow();
    }
    getCurrentWindow().setFullscreen(false).catch(() => {});
    setFullscreen(false);
  }, [slideshowState.isPlaying, stopSlideshow, setFullscreen]);

  useKeyboardShortcuts({
    onNavigateNext: navigateNext,
    onNavigatePrev: navigatePrev,
    onZoomActual: handleZoomActual,
    onZoomFit: handleZoomFit,
    onToggleFullscreen: toggleFullscreen,
    onOpen: openImage,
    onEscape: handleEscape,
  });

  // F12 — toggle debug panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        setShowDebug((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleCopyImage = useCallback(async () => {
    if (!state.currentPath) return;
    try {
      const response = await fetch(convertFileSrc(state.currentPath));
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } catch (e) {
      console.error("Failed to copy image:", e);
    }
  }, [state.currentPath]);

  const handleSaveAs = useCallback(async () => {
    if (!state.currentPath) return;
    const dest = await save({
      filters: [{ name: "Image", extensions: ["png", "jpg", "webp", "bmp"] }],
    });
    if (dest) {
      try { await saveImageAs(state.currentPath, dest); }
      catch (e) { console.error("Save failed:", e); }
    }
  }, [state.currentPath]);

  const handleShowInFolder = useCallback(async () => {
    if (!state.currentPath) return;
    try { await showInFolder(state.currentPath); }
    catch (e) { console.error("Show in folder failed:", e); }
  }, [state.currentPath]);

  const handleImageInfo = useCallback(() => {
    // Right sidebar has an info tab - already accessible via tab click
  }, []);

  const handleCopyText = useCallback(async () => {
    const text = selectedText();
    if (text) {
      try { await navigator.clipboard.writeText(text); }
      catch (e) { console.error("Failed to copy text:", e); }
    }
  }, [selectedText]);

  const handleExportOcr = useCallback(async () => {
    if (!state.ocrResult?.full_text) return;
    try {
      const dest = await save({
        filters: [{ name: "Text", extensions: ["txt"] }],
        defaultPath: state.currentPath?.replace(/\.\w+$/, '.txt'),
      });
      if (dest) {
        await saveTextFile(dest, state.ocrResult.full_text);
      }
    } catch (e) {
      console.error("Export OCR failed:", e);
    }
  }, [state.ocrResult, state.currentPath]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => /\.(png|jpg|jpeg|bmp|gif|webp)$/i.test(f.name));
    if (!imageFile) return;
    const path = (imageFile as any).path;
    if (path) {
      openImage(path);
      addRecentFile(path).then(() => {
        setRecentFiles(prev => {
          const filtered = prev.filter(f => f !== path);
          return [path, ...filtered].slice(0, 10);
        });
      });
    }
  }, [openImage]);

  const handleOpenRecent = useCallback((path: string) => {
    openImage(path);
    addRecentFile(path).then(() => {
      setRecentFiles(prev => {
        const filtered = prev.filter(f => f !== path);
        return [path, ...filtered].slice(0, 10);
      });
    });
  }, [openImage]);

  const isSlideshowPlaying = slideshowState.isPlaying;

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${isSlideshowPlaying ? 'bg-black' : 'bg-background text-foreground'}`}>
      {!isSlideshowPlaying && <Toolbar
        onOpen={openImage}
        onResetView={resetView}
        onNavigatePrev={navigatePrev}
        onNavigateNext={navigateNext}
        onToggleFullscreen={toggleFullscreen}
        onToggleZoomMode={() => setZoomMode(state.zoomMode === "fit" ? "free" : "fit")}
        hasImage={state.imageInfo !== null}
        hasPrev={state.currentIndex > 0}
        hasNext={state.currentIndex < state.imageList.length - 1}
        zoomMode={state.zoomMode}
        isFullscreen={state.isFullscreen}
        showThumbnails={showThumbnails}
        onToggleThumbnails={() => {
          const next = !showThumbnails;
          setShowThumbnails(next);
          saveWindowState({ showThumbnails: next });
        }}
        onSlideshow={startSlideshow}
        showRightSidebar={showRightSidebar}
        onToggleRightSidebar={() => {
          const next = !showRightSidebar;
          setShowRightSidebar(next);
          saveWindowState({ showRightSidebar: next });
        }}
        onBatchConvert={() => setShowConvertDialog(true)}
        onBatchRename={() => setShowRenameDialog(true)}
        onSettings={() => setShowSettings(true)}
        onAbout={() => setShowAbout(true)}
        hasOcr={state.ocrResult !== null && state.ocrResult.full_text.length > 0}
        onExportOcr={handleExportOcr}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        recentFiles={recentFiles}
        onOpenFile={handleOpenRecent}
      />}

      <div
        className="flex-1 flex overflow-hidden relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!isSlideshowPlaying && (
          <ThumbnailSidebar
            currentPath={state.currentPath}
            currentIndex={state.currentIndex}
            imageList={state.imageList}
            onNavigate={navigateTo}
            isOpen={showThumbnails}
            onToggle={() => setShowThumbnails(!showThumbnails)}
          />
        )}
        <ImageCanvas
          imageInfo={state.imageInfo}
          ocrBlocks={state.ocrResult?.blocks ?? EMPTY_BLOCKS}
          zoom={state.zoom}
          offset={state.offset}
          selectionRange={state.selectionRange}
          onZoom={handleZoom}
          onPan={handlePan}
          onSelectionChange={setSelection}
          zoomMode={state.zoomMode}
          onSetZoomMode={setZoomMode}
          onSetZoomAbsolute={setZoomAbsolute}
          onCopyImage={handleCopyImage}
          onSaveAs={handleSaveAs}
          onShowInFolder={handleShowInFolder}
          onImageInfo={handleImageInfo}
          onCopyText={handleCopyText}
          onExportOcr={handleExportOcr}
          onToggleFullscreen={toggleFullscreen}
          imageFileName={getFileName()}
          imageDimensions={state.imageInfo ? { width: state.imageInfo.width, height: state.imageInfo.height } : null}
        />
        {!isSlideshowPlaying && showRightSidebar && (
          <RightSidebar
            ocrResult={state.ocrResult}
            ocrStatus={state.ocrStatus}
            selectionRange={state.selectionRange}
            onSelectionChange={setSelection}
            imagePath={state.currentPath}
            onClose={() => setShowRightSidebar(false)}
          />
        )}
        <DropOverlay visible={isDragging} />
      </div>

      {!isSlideshowPlaying && (
        <StatusBar
          ocrStatus={state.ocrStatus}
          fileName={getFileName()}
          zoom={state.zoom}
          zoomMode={state.zoomMode}
          imageDimensions={
            state.imageInfo
              ? {
                  width: state.imageInfo.width,
                  height: state.imageInfo.height,
                }
              : null
          }
          fileSize={fileSize}
          imageIndex={state.currentIndex}
          totalImages={state.imageList.length}
          fileType={fileType}
          fileModified={fileModified}
        />
      )}

      {slideshowState.isPlaying && (
        <SlideshowOverlay
          isPlaying={slideshowState.isPlaying}
          interval={slideshowState.interval}
          imageCount={state.imageList.length}
          currentIndex={state.currentIndex}
          onPrev={navigatePrev}
          onNext={navigateNext}
          onToggle={toggleSlideshow}
          onSetInterval={setSlideshowInterval}
          onStop={stopSlideshow}
        />
      )}

      <BatchConvertDialog
        imageList={state.imageList}
        isOpen={showConvertDialog}
        onClose={() => setShowConvertDialog(false)}
      />
      <BatchRenameDialog
        imageList={state.imageList}
        isOpen={showRenameDialog}
        onClose={() => setShowRenameDialog(false)}
      />

      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <AboutDialog
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />

      <DebugPanel
        isOpen={showDebug}
        onClose={() => setShowDebug(false)}
      />
    </div>
  );
}

export default App;
