import { useState, useEffect } from "react";
import { readExif } from "@/lib/api";
import type { ExifData } from "@/types";
import { Loader2 } from "lucide-react";

interface ExifPanelProps {
  imagePath: string | null;
}

export function ExifPanel({ imagePath }: ExifPanelProps) {
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) {
      setExifData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    readExif(imagePath)
      .then((data) => {
        setExifData(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(typeof e === "string" ? e : "Failed to load EXIF");
        setLoading(false);
        setExifData(null);
      });
  }, [imagePath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-xs text-muted-foreground/70 italic">
        {error}
      </div>
    );
  }

  if (!exifData || exifData.fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground/50 italic px-4 text-center">
        打开图片以查看信息
      </div>
    );
  }

  return (
    <div className="overflow-y-auto scrollbar-thin h-full">
      <div className="divide-y divide-border/50">
        {exifData.fields.map((field, i) => (
          <div
            key={i}
            className="flex items-start gap-2 px-3 py-2 hover:bg-accent/20 transition-colors"
          >
            <span className="text-[11px] text-muted-foreground/70 shrink-0 min-w-[80px] pt-0.5">
              {field.label}
            </span>
            <span className="text-[11px] text-foreground/80 text-right font-mono break-all leading-relaxed">
              {field.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
