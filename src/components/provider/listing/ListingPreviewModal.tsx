import { useState, useEffect } from "react";
import { X, ExternalLink, Monitor, Smartphone, Tablet, Loader2, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ListingPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityName: string;
  facilitySlug: string;
}

type DeviceType = "desktop" | "tablet" | "mobile";

const deviceConfig: Record<DeviceType, { width: number; icon: React.ElementType; label: string }> = {
  desktop: { width: 1200, icon: Monitor, label: "Desktop" },
  tablet: { width: 768, icon: Tablet, label: "Tablet" },
  mobile: { width: 375, icon: Smartphone, label: "Mobile" },
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
  const displayUrl = `rehablookup.com/center/${facilitySlug}`;

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
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[90vh] p-0 gap-0 overflow-hidden flex flex-col [&>button]:hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">{facilityName}</h2>
              <p className="text-xs text-muted-foreground">Preview Mode</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Device Toggle */}
            <div className="hidden sm:flex items-center p-1 rounded-lg bg-background border shadow-sm">
              {(Object.keys(deviceConfig) as DeviceType[]).map((deviceType) => {
                const config = deviceConfig[deviceType];
                const Icon = config.icon;
                const isActive = device === deviceType;
                return (
                  <button
                    key={deviceType}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    onClick={() => setDevice(deviceType)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">{config.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Open External */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleOpenExternal}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open Live</span>
            </Button>

            {/* Close Button */}
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

        {/* URL Bar */}
        <div className="px-4 py-2 border-b bg-muted/20 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border max-w-lg mx-auto">
            <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
            <span className="text-xs text-muted-foreground truncate font-mono">
              {displayUrl}
            </span>
          </div>
        </div>

        {/* Preview Container */}
        <div className="flex-1 bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,hsl(var(--muted-foreground)/0.03)_0%_50%)] bg-[length:20px_20px] overflow-auto flex items-start justify-center p-4 sm:p-6 min-h-0">
          <div 
            className={cn(
              "bg-background rounded-xl shadow-2xl border overflow-hidden transition-all duration-300 ease-out h-full relative",
              "ring-1 ring-black/5"
            )}
            style={{
              width: device === "desktop" ? "100%" : `${deviceConfig[device].width}px`,
              maxWidth: "100%",
            }}
          >
            {/* Device Frame Header (for mobile/tablet) */}
            {device !== "desktop" && (
              <div className="h-6 bg-muted/60 border-b flex items-center justify-center gap-1">
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/20" />
              </div>
            )}
            
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full border-2 border-muted" />
                    <Loader2 className="h-12 w-12 animate-spin text-primary absolute inset-0" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Loading preview...</p>
                    <p className="text-xs text-muted-foreground">This is how families will see your listing</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Iframe */}
            <iframe
              src={publicUrl}
              className={cn(
                "w-full border-0 transition-opacity duration-300",
                device !== "desktop" ? "h-[calc(100%-24px)]" : "h-full",
                isLoading ? "opacity-0" : "opacity-100"
              )}
              title={`Preview: ${facilityName}`}
              onLoad={handleIframeLoad}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t bg-muted/20 text-center shrink-0">
          <p className="text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Preview only — Changes are saved automatically
            </span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
