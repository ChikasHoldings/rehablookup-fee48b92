import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ListingFormFieldProps {
  label: string;
  required?: boolean;
  error?: string | null;
  touched?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function ListingFormField({
  label,
  required,
  error,
  touched,
  hint,
  children,
  className
}: ListingFormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium flex items-center gap-1.5">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && touched && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
