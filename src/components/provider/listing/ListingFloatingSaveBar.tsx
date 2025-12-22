import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ListingFloatingSaveBarProps {
  hasChanges: boolean;
  isSaving: boolean;
  isAutoSaving: boolean;
  onSave: () => void;
}

export function ListingFloatingSaveBar({
  hasChanges,
  isSaving,
  isAutoSaving,
  onSave
}: ListingFloatingSaveBarProps) {
  return (
    <div className="sticky bottom-4 flex justify-center pt-4 z-10 pointer-events-none">
      <div className={cn(
        "flex items-center gap-4 px-5 py-3 rounded-2xl bg-card/95 backdrop-blur-md border shadow-xl transition-all duration-300 pointer-events-auto",
        hasChanges ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
      )}>
        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-sm font-medium text-foreground">
          You have unsaved changes
        </span>
        <Button
          onClick={onSave}
          disabled={isSaving || isAutoSaving}
          size="sm"
          className="gap-2 rounded-xl shadow-md"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
