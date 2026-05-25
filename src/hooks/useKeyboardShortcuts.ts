import { useEffect } from "react";

interface ShortcutHandlers {
  onNavigateNext: () => void;
  onNavigatePrev: () => void;
  onZoomActual: () => void;      // Ctrl+0 -> zoom 1, "free" mode
  onZoomFit: () => void;         // Ctrl+W -> "fit" mode
  onToggleFullscreen: () => void;
  onOpen: () => void;            // Ctrl+O
  onEscape: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlers.onNavigatePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handlers.onNavigateNext();
      } else if (e.key === "F11") {
        e.preventDefault();
        handlers.onToggleFullscreen();
      } else if (e.key === "Escape") {
        handlers.onEscape();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        handlers.onOpen();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        handlers.onZoomActual();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
        handlers.onZoomFit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handlers]);
}
