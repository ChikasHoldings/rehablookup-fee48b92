import { useState, useEffect } from "react";
import { X, ExternalLink, Monitor, Smartphone, Tablet, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ListingPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityName: string;
  facilitySlug: string;
}

type DeviceType = "desktop" | "tablet" | "mobile";

const deviceConfig: Record<DeviceType, { width: string; icon: React.ElementType; label: string }> = {
  desktop: { width: "100%", icon: Monitor, label: "Desktop" },
  tablet: { width: "768px", icon: Tablet, label: "Tablet" },
  mobile: { width: "375px", icon: Smartphone, label: "Mobile" },
};

export function ListingPreviewModal({
  open,
  onOpenChange,
  facilityName,
  facilitySlug,
}: ListingPreviewModalProps) {
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [isLoading, setIsLoading] = useState(true);
  const publicUrl = `/center/${facilitySlug}`;

  // Reset loading state when modal opens
  useEffect(() => {
    if (open) {
      setIsLoading(true);
    }
  }, [open]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleOpenExternal = () => {
    window.open(publicUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <DialogTitle className="text-base font-semibold truncate">
                {facilityName}
              </DialogTitle>
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 shrink-0">
                Preview Mode
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {/* Device Toggle */}
              <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border/40">
                {(Object.keys(deviceConfig) as DeviceType[]).map((deviceType) => {
                  const config = deviceConfig[deviceType];
                  const Icon = config.icon;
                  return (
                    <Button
                      key={deviceType}
                      variant={device === deviceType ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-7 px-2 gap-1.5",
                        device === deviceType && "bg-background shadow-sm"
                      )}
                      onClick={() => setDevice(deviceType)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-xs hidden md:inline">{config.label}</span>
                    </Button>
                  );
                })}
              </div>

              {/* Open External */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleOpenExternal}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open Live</span>
              </Button>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Preview Container */}
        <div className="flex-1 bg-muted/20 overflow-auto flex items-start justify-center p-4 min-h-0">
          <div 
            className={cn(
              "bg-background rounded-lg shadow-xl border border-border/60 overflow-hidden transition-all duration-300 h-full",
              device === "desktop" && "w-full",
              device === "tablet" && "w-[768px] max-w-full",
              device === "mobile" && "w-[375px] max-w-full"
            )}
          >
            {/* Loading State */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Loading preview...</span>
                </div>
              </div>
            )}
            
            {/* Iframe */}
            <iframe
              src={publicUrl}
              className="w-full h-full border-0"
              title={`Preview: ${facilityName}`}
              onLoad={handleIframeLoad}
            />
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t bg-muted/20 text-center shrink-0">
          <span className="text-xs text-muted-foreground">
            This is how families will see your listing
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
