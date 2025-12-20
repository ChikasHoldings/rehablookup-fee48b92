import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatEmailInput, normalizeEmail } from "@/lib/emailUtils";
import { cn } from "@/lib/utils";

interface EmailInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
}

const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(
  ({ className, value, onChange, onBlur, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatEmailInput(e.target.value);
      onChange(formatted);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Normalize on blur (trim trailing spaces)
      onChange(normalizeEmail(value));
      onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(className)}
        {...props}
      />
    );
  }
);

EmailInput.displayName = "EmailInput";

export { EmailInput };
