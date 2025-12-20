import { Loader2 } from "lucide-react";

export function AdminPageLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}
