import { useImageViewer } from "@/hooks/useImageViewer";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Toolbar } from "@/components/Toolbar";
import { ImageCanvas } from "@/components/ImageCanvas";
import { RightSidebar } from "@/components/RightSidebar";
import { StatusBar } from "@/components/StatusBar";
import { getFileSize } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

function App() {
  const {
    state,
    openImage,
    handleZoom,
    handlePan,
    resetView,
    setSelection,
    setZoomMode,
    setZoomAbsolute,
    navigateNext,
    navigatePrev,
    setFullscreen,
  } = useImageViewer();

  const [fileSize, setFileSize] = useState<string | null>(null);

  useEffect(() => {
    if (!state.currentPath) {
      setFileSize(null);
      return;
    }
    getFileSize(state.currentPath)
      .then((bytes) => setFileSize(formatFileSize(bytes)))
      .catch(() => setFileSize(null));
  }, [state.currentPath]);

  const getFileName = useCallback(() => {
    if (!state.currentPath) return null;
    return state.currentPath.split(/[\\/]/).pop() ?? null;
  }, [state.currentPath]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }, [setFullscreen]);

  useEffect(() => {
    const onFsChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [setFullscreen]);

  const handleZoomActual = useCallback(() => {
    setZoomMode("free");
    resetView();
  }, [setZoomMode, resetView]);

  const handleZoomFit = useCallback(() => {
    setZoomMode("fit");
  }, [setZoomMode]);

  const handleEscape = useCallback(() => {
    setFullscreen(false);
  }, [setFullscreen]);

  useKeyboardShortcuts({
    onNavigateNext: navigateNext,
    onNavigatePrev: navigatePrev,
    onZoomActual: handleZoomActual,
    onZoomFit: handleZoomFit,
    onToggleFullscreen: toggleFullscreen,
    onOpen: openImage,
    onEscape: handleEscape,
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => /\.(png|jpg|jpeg|bmp|gif|webp)$/i.test(f.name));
    if (!imageFile) return;
    const path = (imageFile as any).path;
    if (path) openImage(path);
  }, [openImage]);

  return (
    <div
      className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Toolbar
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
      />

      <div className="flex-1 flex overflow-hidden">
        <ImageCanvas
          imageInfo={state.imageInfo}
          ocrBlocks={state.ocrResult?.blocks ?? []}
          zoom={state.zoom}
          offset={state.offset}
          selectionRange={state.selectionRange}
          onZoom={handleZoom}
          onPan={handlePan}
          onSelectionChange={setSelection}
          zoomMode={state.zoomMode}
          onSetZoomMode={setZoomMode}
          onSetZoomAbsolute={setZoomAbsolute}
        />
        <RightSidebar
          ocrResult={state.ocrResult}
          ocrStatus={state.ocrStatus}
          selectionRange={state.selectionRange}
          onSelectionChange={setSelection}
          imagePath={state.currentPath}
        />
      </div>

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
      />
    </div>
  );
}

export default App;
