import { X, ExternalLink, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ListingPreviewContent } from "./ListingPreviewContent";

interface ListingPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityName: string;
  facilitySlug: string;
}

export function ListingPreviewModal({
  open,
  onOpenChange,
  facilityName,
  facilitySlug,
}: ListingPreviewModalProps) {
  const publicUrl = `/center/${facilitySlug}`;

  const handleOpenExternal = () => {
    window.open(publicUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogTitle className="sr-only">{facilityName} - Listing Preview</DialogTitle>
        <DialogDescription className="sr-only">Preview of how your listing appears to the public</DialogDescription>
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-semibold truncate">{facilityName}</h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Listing Preview</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 sm:h-8 gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-2 sm:px-3"
              onClick={handleOpenExternal}
            >
              <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden xs:inline sm:inline">View Live</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden bg-muted/10">
          <ListingPreviewContent facilitySlug={facilitySlug} />
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-4 py-1.5 sm:py-2 border-t bg-muted/20 text-center shrink-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            This preview shows how families will see your listing
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
