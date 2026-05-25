import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

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
    <div className="fixed inset-0 z-50 bg-black">
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 transition-opacity duration-300 ${
        showControls ? "opacity-100" : "opacity-0"
      }`}>
        <div className="flex items-center justify-center gap-4">
          <button onClick={onPrev} className="text-white/80 hover:text-white p-2">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button onClick={onToggle} className="text-white/80 hover:text-white p-2 bg-white/10 rounded-full">
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>
          <button onClick={onNext} className="text-white/80 hover:text-white p-2">
            <ChevronRight className="h-6 w-6" />
          </button>
          <span className="text-white/60 text-sm ml-4">{currentIndex + 1} / {imageCount}</span>
          <div className="flex items-center gap-1 ml-4">
            {SPEEDS.map((s) => (
              <button key={s.value}
                onClick={() => onSetInterval(s.value)}
                className={`px-2 py-1 text-xs rounded ${interval === s.value ? "bg-white/20 text-white" : "text-white/60 hover:text-white/80"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button onClick={onStop} className="text-white/60 hover:text-white text-sm ml-4">退出 (Esc)</button>
        </div>
      </div>
    </div>
  );
}
