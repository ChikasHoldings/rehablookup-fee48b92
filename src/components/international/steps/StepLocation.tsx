import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Globe, Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

      <div className="max-w-sm mx-auto space-y-4 md:space-y-5 px-1">
        <div>
          <Label htmlFor="country" className="text-sm font-medium flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-primary" />
            Country
          </Label>
          <Select
            value={data.country}
            onValueChange={(value) => onChange({ ...data, country: value })}
          >
            <SelectTrigger className="w-full h-12 text-base">
              <SelectValue placeholder="Select your country..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] bg-background z-50">
              {COUNTRY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c} className="cursor-pointer">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="language" className="text-sm font-medium flex items-center gap-2 mb-2">
            <Languages className="h-4 w-4 text-primary" />
            Preferred Language
          </Label>
          <Select
            value={data.preferred_language}
            onValueChange={(value) => onChange({ ...data, preferred_language: value })}
          >
            <SelectTrigger className="w-full h-12 text-base">
              <SelectValue placeholder="Select language..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] bg-background z-50">
              {LANGUAGE_OPTIONS.map((l) => (
                <SelectItem key={l} value={l} className="cursor-pointer">
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  );
}
