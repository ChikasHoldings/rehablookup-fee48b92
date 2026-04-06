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
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-6">
      <div
        className={cn(
          "pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-4 rounded-2xl border bg-card/95 px-5 py-3 shadow-xl backdrop-blur-md transition-all duration-300",
          hasChanges ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"
        )}
      >
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
