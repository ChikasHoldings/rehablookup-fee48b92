import { X, ExternalLink, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
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
      <DialogContent className="max-w-2xl w-full max-h-[90vh] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">{facilityName}</h2>
              <p className="text-xs text-muted-foreground">Listing Preview</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleOpenExternal}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View Live</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden bg-muted/10">
          <ListingPreviewContent facilitySlug={facilitySlug} />
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t bg-muted/20 text-center shrink-0">
          <p className="text-xs text-muted-foreground">
            This preview shows how families will see your listing
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
