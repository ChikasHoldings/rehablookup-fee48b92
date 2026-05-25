import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRY_DATA = [
  { code: "+1", country: "US", name: "United States", flag: "🇺🇸" },
  { code: "+1", country: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "+44", country: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+61", country: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "+49", country: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "FR", name: "France", flag: "🇫🇷" },
  { code: "+31", country: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "+353", country: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "+52", country: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "+55", country: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "+971", country: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "+966", country: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+91", country: "IN", name: "India", flag: "🇮🇳" },
  { code: "+81", country: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "+82", country: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "+65", country: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "+41", country: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "+46", country: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "+47", country: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "+34", country: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "+39", country: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "+86", country: "CN", name: "China", flag: "🇨🇳" },
  { code: "+7", country: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "+27", country: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "+64", country: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "+48", country: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "+43", country: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "+32", country: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "+45", country: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "+358", country: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "+351", country: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "+63", country: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "+60", country: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "+66", country: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "+84", country: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "+20", country: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "+234", country: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "+254", country: "KE", name: "Kenya", flag: "🇰🇪" },
];

export interface FlagPhoneInputProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (number: string) => void;
  className?: string;
  required?: boolean;
}

const FlagPhoneInput = React.forwardRef<HTMLInputElement, FlagPhoneInputProps>(
  ({ countryCode, phoneNumber, onCountryCodeChange, onPhoneNumberChange, className, required }, ref) => {
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/[^\d\s-]/g, "");
      onPhoneNumberChange(value);
    };

    const selectedCountry = COUNTRY_DATA.find(c => c.code === countryCode) || COUNTRY_DATA[0];

    return (
      <div className={cn("flex gap-2", className)}>
        <Select value={countryCode} onValueChange={onCountryCodeChange}>
          <SelectTrigger className="w-[100px] md:w-[120px] h-12 px-2 md:px-3 shrink-0">
            <SelectValue>
              <span className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                <span className="text-lg md:text-xl">{selectedCountry.flag}</span>
                <span className="text-xs md:text-sm text-muted-foreground">{selectedCountry.code}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px] bg-background z-50">
            {COUNTRY_DATA.map((c, idx) => (
              <SelectItem 
                key={`${c.country}-${idx}`} 
                value={c.code}
                className="cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">{c.flag}</span>
                  <span className="text-sm">{c.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{c.code}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          ref={ref}
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder="Phone number"
          className="flex-1 h-12 text-base"
          required={required}
        />
      </div>
    );
  }
);

FlagPhoneInput.displayName = "FlagPhoneInput";

export { FlagPhoneInput, COUNTRY_DATA };
