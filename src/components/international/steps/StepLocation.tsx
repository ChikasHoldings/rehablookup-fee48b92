import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Globe, Languages } from "lucide-react";

const COUNTRY_OPTIONS = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria", "Bangladesh",
  "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia", "Czech Republic", "Denmark",
  "Egypt", "Finland", "France", "Germany", "Greece", "Hong Kong", "Hungary", "India",
  "Indonesia", "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kenya", "Kuwait",
  "Lebanon", "Malaysia", "Mexico", "Morocco", "Netherlands", "New Zealand", "Nigeria",
  "Norway", "Oman", "Pakistan", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Saudi Arabia", "Singapore", "South Africa", "South Korea", "Spain",
  "Sweden", "Switzerland", "Taiwan", "Thailand", "Turkey", "UAE", "Ukraine",
  "United Kingdom", "Venezuela", "Vietnam", "Other"
];

const LANGUAGE_OPTIONS = [
  "English", "Spanish", "French", "German", "Arabic", "Mandarin", "Portuguese",
  "Russian", "Japanese", "Korean", "Italian", "Dutch", "Hindi", "Other"
];

interface StepLocationProps {
  data: { country: string; preferred_language: string };
  onChange: (data: { country: string; preferred_language: string }) => void;
}

export function StepLocation({ data, onChange }: StepLocationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5 md:space-y-6"
    >
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1.5 md:mb-2">
          Where are you located?
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          This helps us coordinate across time zones
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-4 md:space-y-5">
        <div>
          <Label htmlFor="country" className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Country
          </Label>
          <select
            id="country"
            value={data.country}
            onChange={(e) => onChange({ ...data, country: e.target.value })}
            className="w-full h-12 px-3 rounded-md border bg-background text-base mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 border-input"
          >
            <option value="">Select your country...</option>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="language" className="text-sm font-medium flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" />
            Preferred Language
          </Label>
          <select
            id="language"
            value={data.preferred_language}
            onChange={(e) => onChange({ ...data, preferred_language: e.target.value })}
            className="w-full h-12 px-3 rounded-md border bg-background text-base mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 border-input"
          >
            <option value="">Select language...</option>
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>
    </motion.div>
  );
}
