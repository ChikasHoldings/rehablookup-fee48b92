import { useRef } from "react";
import { Paperclip, X, FileText, ImageIcon, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useSignedAttachmentUrl,
  validateAttachments,
  MAX_FILES_PER_MESSAGE,
  type SupportAttachment,
} from "@/lib/support/useSupportTickets";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isImage = (type: string) => type.startsWith("image/");

/**
 * Picker for staging local File[] before send. Enforces the per-message
 * count/size limits via `onError`, shows chips with a remove control.
 */
export function SupportAttachmentPicker({
  files,
  onChange,
  onError,
  disabled,
  idPrefix = "support-attach",
}: {
  files: File[];
  onChange: (files: File[]) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    // Reset the input so re-picking the same file re-fires onChange.
    if (inputRef.current) inputRef.current.value = "";
    if (picked.length === 0) return;
    const next = [...files, ...picked];
    const validationError = validateAttachments(next);
    if (validationError) {
      onError?.(validationError);
      return;
    }
    onChange(next);
  };

  const removeAt = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={`${idPrefix}-input`}
        type="file"
        multiple
        className="sr-only"
        onChange={handleSelect}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={disabled || files.length >= MAX_FILES_PER_MESSAGE}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="h-3.5 w-3.5" />
        Attach files
      </Button>
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs max-w-full"
            >
              {isImage(file.type) ? (
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
              ) : (
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
              )}
              <span className="truncate max-w-[140px]">{file.name}</span>
              <span className="text-muted-foreground shrink-0">{formatSize(file.size)}</span>
              <button
                type="button"
                onClick={() => removeAt(index)}
                disabled={disabled}
                className="text-muted-foreground hover:text-destructive shrink-0"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Renders a single saved attachment. Images render inline (lazily signed);
 * everything else renders as a downloadable chip with a signed URL.
 */
export function AttachmentChip({ attachment, className }: { attachment: SupportAttachment; className?: string }) {
  const { url, loading } = useSignedAttachmentUrl(attachment.path);

  if (isImage(attachment.type)) {
    return (
      <a
        href={url || undefined}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("block rounded-md overflow-hidden border border-border bg-muted/30 max-w-[200px]", className)}
        aria-label={`Open ${attachment.name}`}
      >
        {loading || !url ? (
          <div className="flex items-center justify-center h-24 w-32">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <img src={url} alt={attachment.name} className="max-h-40 w-auto object-cover" loading="lazy" />
        )}
      </a>
    );
  }

  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs hover:bg-muted transition-colors max-w-full",
        !url && "pointer-events-none opacity-70",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
      ) : (
        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
      )}
      <span className="truncate max-w-[160px]">{attachment.name}</span>
      <span className="text-muted-foreground shrink-0">{formatSize(attachment.size)}</span>
      {url && <Download className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden />}
    </a>
  );
}

export function AttachmentList({ attachments }: { attachments: SupportAttachment[] | null | undefined }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((att, i) => (
        <AttachmentChip key={`${att.path}-${i}`} attachment={att} />
      ))}
    </div>
  );
}
