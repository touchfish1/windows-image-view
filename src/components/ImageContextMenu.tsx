import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Copy, Save, FolderOpen, Info } from "lucide-react";

interface ImageContextMenuProps {
  children: React.ReactNode;
  hasImage: boolean;
  hasSelection: boolean;
  onCopyImage: () => void;
  onSaveAs: () => void;
  onShowInFolder: () => void;
  onImageInfo: () => void;
  onCopyText: () => void;
}

export function ImageContextMenu({
  children, hasImage, hasSelection,
  onCopyImage, onSaveAs, onShowInFolder, onImageInfo, onCopyText,
}: ImageContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem disabled={!hasImage} onClick={onCopyImage}>
          <Copy className="h-4 w-4 mr-2" /> 复制图片
        </ContextMenuItem>
        <ContextMenuItem disabled={!hasImage} onClick={onSaveAs}>
          <Save className="h-4 w-4 mr-2" /> 另存为...
        </ContextMenuItem>
        <ContextMenuItem disabled={!hasImage} onClick={onShowInFolder}>
          <FolderOpen className="h-4 w-4 mr-2" /> 在文件管理器中显示
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={!hasSelection} onClick={onCopyText}>
          复制 OCR 文本
        </ContextMenuItem>
        <ContextMenuItem disabled={!hasImage} onClick={onImageInfo}>
          <Info className="h-4 w-4 mr-2" /> 图片信息
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
