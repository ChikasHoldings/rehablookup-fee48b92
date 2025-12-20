import * as React from "react";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidatedInputProps {
  type?: "text" | "email" | "phone" | "password" | "tel";
  value: string;
  onChange: (value: string) => void;
  isValid?: boolean;
  showValidation?: boolean;
  error?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
}

export function ValidatedInput({
  type = "text",
  value,
  onChange,
  isValid = false,
  showValidation = true,
  error,
  className,
  inputClassName,
  id,
  placeholder,
  disabled,
  required,
  autoComplete,
}: ValidatedInputProps) {
  const showCheck = showValidation && isValid && value.length > 0 && !error;

  const wrapperClasses = cn(
    "relative",
    className
  );

  const inputClasses = cn(
    inputClassName,
    showCheck && "pr-10",
    error && "border-destructive focus-visible:ring-destructive"
  );

  const checkmark = showCheck && (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    </div>
  );

  if (type === "phone") {
    return (
      <div className={wrapperClasses}>
        <PhoneInput
          id={id}
          value={value}
          onChange={onChange}
          className={inputClasses}
          disabled={disabled}
        />
        {checkmark}
      </div>
    );
  }

  if (type === "email") {
    return (
      <div className={wrapperClasses}>
        <EmailInput
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={inputClasses}
          disabled={disabled}
        />
        {checkmark}
      </div>
    );
  }

  return (
    <div className={wrapperClasses}>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClasses}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
      />
      {checkmark}
    </div>
  );
}
