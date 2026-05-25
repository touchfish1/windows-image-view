import { useImageViewer } from "@/hooks/useImageViewer";
import { Toolbar } from "@/components/Toolbar";
import { ImageCanvas } from "@/components/ImageCanvas";
import { OcrSidebar } from "@/components/OcrSidebar";
import { StatusBar } from "@/components/StatusBar";
import { useCallback } from "react";

function App() {
  const {
    state,
    openImage,
    handleZoom,
    handlePan,
    resetView,
    selectBlock,
  } = useImageViewer();

  const getFileName = useCallback(() => {
    if (!state.currentPath) return null;
    return state.currentPath.split(/[\\/]/).pop() ?? null;
  }, [state.currentPath]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Toolbar
        onOpen={openImage}
        onResetView={resetView}
        hasImage={state.imageInfo !== null}
      />

      <div className="flex-1 flex overflow-hidden">
        <ImageCanvas
          imageInfo={state.imageInfo}
          ocrBlocks={state.ocrResult?.blocks ?? []}
          zoom={state.zoom}
          offset={state.offset}
          selectedBlockIndex={state.selectedBlockIndex}
          onZoom={handleZoom}
          onPan={handlePan}
          onSelectBlock={selectBlock}
        />
        <OcrSidebar
          ocrResult={state.ocrResult}
          ocrStatus={state.ocrStatus}
          selectedBlockIndex={state.selectedBlockIndex}
          onSelectBlock={selectBlock}
        />
      </div>

      <StatusBar
        ocrStatus={state.ocrStatus}
        fileName={getFileName()}
        zoom={state.zoom}
      />
    </div>
  );
}

export default App;
