import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { debugStore, type LogLevel } from "@/lib/debug";
import { X, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const LEVEL_ORDER: LogLevel[] = ["error", "warn", "info", "debug"];
const LEVEL_COLORS: Record<LogLevel, string> = {
  error: "text-red-400 bg-red-400/10 border-l-red-500",
  warn: "text-amber-400 bg-amber-400/10 border-l-amber-500",
  info: "text-blue-300 bg-blue-400/5 border-l-blue-500",
  debug: "text-gray-400 bg-gray-400/5 border-l-gray-500",
};
const LEVEL_BADGE: Record<LogLevel, string> = {
  error: "ERROR",
  warn: "WARN",
  info: "INFO",
  debug: "DEBUG",
};

function formatMessage(msg: any): string {
  if (msg === null) return "null";
  if (msg === undefined) return "undefined";
  if (typeof msg === "string") return msg;
  if (typeof msg === "object") {
    try {
      return JSON.stringify(msg, null, 1);
    } catch {
      return String(msg);
    }
  }
  return String(msg);
}

export function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const entries = useSyncExternalStore(
    (cb) => debugStore.subscribe(cb),
    () => debugStore.getSnapshot(),
    () => [],
  );
  const [filterLevel, setFilterLevel] = useState<LogLevel | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isCapturing, setIsCapturing] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = filterLevel
    ? entries.filter((e) => e.level === filterLevel)
    : entries;

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered.length, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (!atBottom) setAutoScroll(false);
    else setAutoScroll(true);
  }, []);

  const toggleCapture = useCallback(() => {
    if (isCapturing) {
      debugStore.stopCapture();
    } else {
      debugStore.startCapture();
    }
    setIsCapturing(!isCapturing);
  }, [isCapturing]);

  useEffect(() => {
    debugStore.startCapture();
    debugStore.system("Debug panel initialized");
    return () => {
      // Don't stop capture on unmount — keep intercepting
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-border bg-background/95 backdrop-blur-xl shadow-2xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 select-none">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Debug</span>
          <span className="text-[10px] text-muted-foreground/50">{entries.length} logs</span>

          <div className="h-3 w-px bg-border mx-1" />

          <div className="flex items-center gap-0.5">
            {([null, ...LEVEL_ORDER] as (LogLevel | null)[]).map((lvl) => (
              <button
                key={lvl ?? "all"}
                onClick={() => setFilterLevel(lvl)}
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  filterLevel === lvl
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lvl ? LEVEL_BADGE[lvl] : "ALL"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleCapture}
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              isCapturing
                ? "text-green-500 hover:text-green-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={isCapturing ? "Stop capturing" : "Start capturing"}
          >
            {isCapturing ? "● Capturing" : "○ Paused"}
          </button>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              autoScroll ? "text-primary" : "text-muted-foreground"
            }`}
            title="Auto-scroll"
          >
            Auto
          </button>

          <button
            onClick={() => {
              debugStore.clear();
              debugStore.system("Logs cleared");
            }}
            className="p-0.5 text-muted-foreground hover:text-foreground"
            title="Clear"
          >
            <Trash2 className="h-3 w-3" />
          </button>

          <button
            onClick={() => setMinimized(!minimized)}
            className="p-0.5 text-muted-foreground hover:text-foreground"
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <button
            onClick={onClose}
            className="p-0.5 text-muted-foreground hover:text-foreground"
            title="Close"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Log list */}
      {!minimized && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed"
          style={{ maxHeight: "250px", minHeight: "80px" }}
        >
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground/50">
              No logs
            </div>
          ) : (
            filtered.map((entry) => (
              <div
                key={entry.id}
                className={`px-3 py-0.5 border-l-2 hover:bg-muted/20 ${LEVEL_COLORS[entry.level]} ${
                  entry.source === "invoke" ? "font-medium" : ""
                }`}
              >
                <span className="opacity-40 mr-1.5">{entry.timestamp}</span>
                <span className={`text-[9px] uppercase px-1 rounded mr-1.5 ${
                  entry.source === "invoke"
                    ? "bg-purple-500/20 text-purple-400"
                    : "bg-muted/30 text-muted-foreground"
                }`}>
                  {entry.source === "invoke" ? "IPC" : entry.source}
                </span>
                {entry.messages.map((msg, i) => (
                  <span key={i} className="mr-1">
                    {formatMessage(msg)}
                  </span>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
