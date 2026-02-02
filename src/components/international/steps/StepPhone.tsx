import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { InternationalPhoneInput, COUNTRY_CODES } from "@/components/ui/international-phone-input";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { motion } from "framer-motion";
import { Globe, Loader2 } from "lucide-react";

// Map ISO country codes to dial codes
const COUNTRY_TO_DIAL_CODE: Record<string, string> = {
  US: "+1", CA: "+1", GB: "+44", AU: "+61", DE: "+49", FR: "+33",
  NL: "+31", IE: "+353", MX: "+52", BR: "+55", AE: "+971", SA: "+966",
  IN: "+91", JP: "+81", KR: "+82", SG: "+65", CH: "+41", SE: "+46",
  NO: "+47", ES: "+34", IT: "+39", CN: "+86", RU: "+7", ZA: "+27",
  NZ: "+64", PL: "+48", AT: "+43", BE: "+32", DK: "+45", FI: "+358", PT: "+351",
};

interface StepPhoneProps {
  data: { phone: string; countryCode?: string };
  onChange: (data: { phone: string; countryCode?: string }) => void;
}

export function StepPhone({ data, onChange }: StepPhoneProps) {
  const { countryCode: detectedCountry, isLoading: geoLoading } = useGeoLocation();
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  // Auto-fill country code from geo-detection (only once)
  useEffect(() => {
    if (!hasAutoFilled && !geoLoading && detectedCountry && !data.countryCode) {
      const dialCode = COUNTRY_TO_DIAL_CODE[detectedCountry] || "+1";
      onChange({ ...data, countryCode: dialCode });
      setHasAutoFilled(true);
    }
  }, [detectedCountry, geoLoading, hasAutoFilled, data, onChange]);

  const handleCountryCodeChange = (code: string) => {
    onChange({ ...data, countryCode: code });
  };

  const handlePhoneNumberChange = (number: string) => {
    onChange({ ...data, phone: number });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5 md:space-y-6"
    >
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1.5 md:mb-2">
          How can we reach you?
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Your placement advisor may call to discuss options
        </p>
      </div>

      <div className="max-w-sm mx-auto">
        <Label htmlFor="phone" className="text-sm font-medium">
          Phone Number
        </Label>
        <div className="mt-1.5">
          {geoLoading ? (
            <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Detecting location...</span>
            </div>
          ) : (
            <InternationalPhoneInput
              countryCode={data.countryCode || "+1"}
              phoneNumber={data.phone}
              onCountryCodeChange={handleCountryCodeChange}
              onPhoneNumberChange={handlePhoneNumberChange}
              required
            />
          )}
        </div>
        {!geoLoading && detectedCountry && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Globe className="h-3 w-3" />
            Country detected automatically—change if needed
          </p>
        )}
      </div>
    </motion.div>
  );
}
