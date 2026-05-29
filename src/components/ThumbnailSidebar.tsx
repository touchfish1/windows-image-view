import { useEffect, useRef, useState, useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { X, Image as ImageIcon, Trash2, Copy, FolderOpen, Search } from "lucide-react";
import { moveToTrash, showInFolder } from "@/lib/api";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface ThumbnailSidebarProps {
  currentPath: string | null;
  currentIndex: number;
  imageList: string[];
  onNavigate: (index: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ThumbnailSidebar({
  currentPath,
  currentIndex,
  imageList,
  onNavigate,
  isOpen,
  onToggle,
}: ThumbnailSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Compute filtered list & index mapping whenever searchQuery or imageList changes
  const { filteredList, indexMap } = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return { filteredList: imageList, indexMap: null as number[] | null };

    const indices: number[] = [];
    const filtered: string[] = [];
    imageList.forEach((path, i) => {
      const name = path.split(/[\\/]/).pop() ?? "";
      if (name.toLowerCase().includes(q)) {
        filtered.push(path);
        indices.push(i);
      }
    });
    return { filteredList: filtered, indexMap: indices };
  }, [searchQuery, imageList]);

  const handleSelect = (filteredIdx: number) => {
    const realIdx = indexMap ? indexMap[filteredIdx] : filteredIdx;
    onNavigate(realIdx);
  };

  // Derive the currently selected index in filtered space
  const selectedFilteredIdx = indexMap
    ? indexMap.indexOf(currentIndex)
    : currentIndex;

  if (!isOpen) return null;

  return (
    <div className="w-44 border-r border-border bg-background/60 backdrop-blur-lg flex flex-col overflow-hidden animate-slideInLeft">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            缩略图
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search — only show when enough thumbnails */}
      {imageList.length > 15 && (
        <div className="px-2 pt-1.5 pb-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={indexMap ? `找到 ${filteredList.length} 张` : "搜索图片..."}
              className="w-full h-7 pl-6 pr-2 text-[11px] bg-muted/50 border border-border/60 rounded-md
                         text-foreground/80 placeholder:text-muted-foreground/40
                         focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30
                         transition-all duration-150"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground/60 transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Thumbnails */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-muted-foreground/40 text-[11px]">
            无匹配图片
          </div>
        ) : (
          filteredList.map((path, filteredIdx) => (
            <ThumbnailItem
              key={path}
              path={path}
              index={filteredIdx}
              isSelected={filteredIdx === selectedFilteredIdx && currentPath !== null && selectedFilteredIdx >= 0}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ThumbnailItemProps {
  path: string;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
}

function ThumbnailItem({ path, index, isSelected, onSelect }: ThumbnailItemProps) {
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: "100px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const maxW = 160;
      const maxH = 90;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
    };
    img.onerror = () => {
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = 160;
      canvas.height = 90;
      ctx.fillStyle = "hsl(225, 5%, 16%)";
      ctx.fillRect(0, 0, 160, 90);
      ctx.fillStyle = "hsl(215, 10%, 56%)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("加载失败", 80, 50);
    };
    img.src = convertFileSrc(path);
    return () => { cancelled = true; };
  }, [path, inView]);

  const handleDelete = async () => {
    const name = path.split(/[\\/]/).pop() ?? '';
    if (!window.confirm(`确定将 ${name} 移到回收站？`)) return;
    try {
      await moveToTrash(path);
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(path);
  };

  const handleShowInFolder = () => {
    showInFolder(path);
  };

  return (
    <div ref={containerRef}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={() => onSelect(index)}
            className={`w-full rounded-lg overflow-hidden transition-all duration-150 ${
              isSelected
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/20"
                : "opacity-70 hover:opacity-100 hover:ring-1 hover:ring-border"
            }`}
          >
            <div className="bg-muted/50 flex items-center justify-center">
              <canvas ref={canvasRef} className="max-w-full max-h-[90px]" />
            </div>
          </button>
        </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <ContextMenuItem onClick={handleShowInFolder}>
          <FolderOpen className="h-3.5 w-3.5 mr-2" />
          在文件管理器中显示
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyPath}>
          <Copy className="h-3.5 w-3.5 mr-2" />
          复制文件路径
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          移到回收站
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
    </div>
  );
}
