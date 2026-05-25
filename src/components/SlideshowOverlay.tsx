import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  X,
} from "lucide-react";

interface SlideshowOverlayProps {
  isPlaying: boolean;
  interval: number;
  imageCount: number;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  onSetInterval: (ms: number) => void;
  onStop: () => void;
}

const SPEEDS = [
  { label: "2s", value: 2000 },
  { label: "3s", value: 3000 },
  { label: "5s", value: 5000 },
  { label: "10s", value: 10000 },
];

export function SlideshowOverlay({
  isPlaying, interval, imageCount, currentIndex,
  onPrev, onNext, onToggle, onSetInterval, onStop,
}: SlideshowOverlayProps) {
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onMouseMove = () => {
      setShowControls(true);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => setShowControls(false), 2000);
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 select-none">
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-10">
        <div
          className="h-full bg-primary/80 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / imageCount) * 100}%` }}
        />
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out ${
          showControls
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-16 pb-6 px-6">
          <div className="flex items-center justify-center gap-3 max-w-lg mx-auto">
            {/* Prev */}
            <button
              onClick={onPrev}
              className="text-white/70 hover:text-white p-2.5 rounded-full hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={onToggle}
              className="text-white p-3 rounded-full bg-white/15 hover:bg-white/25 transition-all hover:scale-105 active:scale-95"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={onNext}
              className="text-white/70 hover:text-white p-2.5 rounded-full hover:bg-white/10 transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Counter */}
            <span className="text-white/50 text-xs ml-2 min-w-[60px]">
              {currentIndex + 1} / {imageCount}
            </span>

            {/* Speed selector */}
            <div className="flex items-center gap-1 ml-2">
              {SPEEDS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => onSetInterval(s.value)}
                  className={`px-2 py-1 text-[11px] rounded-md transition-all ${
                    interval === s.value
                      ? "bg-white/20 text-white"
                      : "text-white/40 hover:text-white/70 hover:bg-white/10"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Stop */}
            <button
              onClick={onStop}
              className="text-white/40 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all ml-1"
              title="退出 (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
