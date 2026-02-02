import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const COUNTRY_CODES = [
  { code: "+1", country: "US/CA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+31", country: "NL", flag: "🇳🇱" },
  { code: "+353", country: "IE", flag: "🇮🇪" },
  { code: "+52", country: "MX", flag: "🇲🇽" },
  { code: "+55", country: "BR", flag: "🇧🇷" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+966", country: "SA", flag: "🇸🇦" },
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
  { code: "+82", country: "KR", flag: "🇰🇷" },
  { code: "+65", country: "SG", flag: "🇸🇬" },
  { code: "+41", country: "CH", flag: "🇨🇭" },
  { code: "+46", country: "SE", flag: "🇸🇪" },
  { code: "+47", country: "NO", flag: "🇳🇴" },
  { code: "+34", country: "ES", flag: "🇪🇸" },
  { code: "+39", country: "IT", flag: "🇮🇹" },
  { code: "+86", country: "CN", flag: "🇨🇳" },
  { code: "+7", country: "RU", flag: "🇷🇺" },
  { code: "+27", country: "ZA", flag: "🇿🇦" },
  { code: "+64", country: "NZ", flag: "🇳🇿" },
  { code: "+48", country: "PL", flag: "🇵🇱" },
  { code: "+43", country: "AT", flag: "🇦🇹" },
  { code: "+32", country: "BE", flag: "🇧🇪" },
  { code: "+45", country: "DK", flag: "🇩🇰" },
  { code: "+358", country: "FI", flag: "🇫🇮" },
  { code: "+351", country: "PT", flag: "🇵🇹" },
];

export interface InternationalPhoneInputProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (number: string) => void;
  className?: string;
  required?: boolean;
}

const InternationalPhoneInput = React.forwardRef<HTMLInputElement, InternationalPhoneInputProps>(
  ({ countryCode, phoneNumber, onCountryCodeChange, onPhoneNumberChange, className, required }, ref) => {
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow digits, spaces, and dashes
      const value = e.target.value.replace(/[^\d\s-]/g, "");
      onPhoneNumberChange(value);
    };

    return (
      <div className={cn("flex gap-2", className)}>
        <select
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          className="w-28 h-10 px-2 rounded-md border border-input bg-background text-sm shrink-0"
          required={required}
        >
          <option value="">Code</option>
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code}
            </option>
          ))}
        </select>
        <Input
          ref={ref}
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder="Phone number"
          className="flex-1"
          required={required}
        />
      </div>
    );
  }
);

InternationalPhoneInput.displayName = "InternationalPhoneInput";

export { InternationalPhoneInput, COUNTRY_CODES };
