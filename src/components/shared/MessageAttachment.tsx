import { FileText, Image, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageAttachmentProps {
  url: string;
  name: string;
  isPreview?: boolean;
  onRemove?: () => void;
}

export function MessageAttachment({ url, name, isPreview, onRemove }: MessageAttachmentProps) {
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
  const isPdf = /\.pdf$/i.test(name);
  const fileExt = name.split(".").pop()?.toUpperCase() || "FILE";

  if (isPreview) {
    return (
      <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm border">
        {isImage ? (
          <Image className="h-4 w-4 text-muted-foreground" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="truncate max-w-[150px]">{name}</span>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  if (isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-2"
      >
        <img
          src={url}
          alt={name}
          className="max-w-[200px] max-h-[150px] rounded-lg object-cover border"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-2 bg-background/50 rounded-lg px-3 py-2 text-sm border hover:bg-background/80 transition-colors"
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[120px]">{name}</span>
      <span className="text-xs text-muted-foreground shrink-0">{fileExt}</span>
      <Download className="h-3 w-3 ml-auto shrink-0" />
    </a>
  );
}
