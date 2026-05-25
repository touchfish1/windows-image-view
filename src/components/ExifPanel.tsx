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
        setError(
          typeof e === "string" ? e : "Failed to load EXIF"
        );
        setLoading(false);
        setExifData(null);
      });
  }, [imagePath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (!exifData || exifData.fields.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        打开图片以查看信息
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1.5 text-sm">
      {exifData.fields.map((field, i) => (
        <div key={i} className="flex justify-between gap-2">
          <span className="text-muted-foreground shrink-0">
            {field.label}
          </span>
          <span className="text-foreground text-right font-mono text-xs truncate max-w-[180px]">
            {field.value}
          </span>
        </div>
      ))}
    </div>
  );
}
