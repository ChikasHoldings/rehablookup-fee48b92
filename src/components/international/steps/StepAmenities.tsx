import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const AMENITY_OPTIONS = [
  { value: "private-room", label: "Private Room" },
  { value: "gym-fitness", label: "Gym / Fitness" },
  { value: "spa-wellness", label: "Spa & Wellness" },
  { value: "holistic", label: "Holistic Therapies" },
  { value: "equine", label: "Equine Therapy" },
  { value: "ocean-view", label: "Ocean / Mountain Views" },
  { value: "gourmet", label: "Gourmet Dining" },
  { value: "pool", label: "Pool / Beach Access" },
];

const PROGRAM_PREFERENCES = [
  { value: "women-only", label: "Women Only" },
  { value: "men-only", label: "Men Only" },
  { value: "lgbtq", label: "LGBTQ+ Friendly" },
  { value: "faith-based", label: "Faith-Based" },
  { value: "secular", label: "Secular / Non-Religious" },
  { value: "trauma-focused", label: "Trauma-Focused" },
];

interface StepAmenitiesProps {
  data: { 
    amenities: string[]; 
    special_requirements: string;
    notes: string;
  };
  onChange: (data: { 
    amenities: string[]; 
    special_requirements: string;
    notes: string;
  }) => void;
}

export function StepAmenities({ data, onChange }: StepAmenitiesProps) {
  const toggleAmenity = (value: string) => {
    if (data.amenities.includes(value)) {
      onChange({ ...data, amenities: data.amenities.filter(a => a !== value) });
    } else {
      onChange({ ...data, amenities: [...data.amenities, value] });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Special Requirements
        </h2>
        <p className="text-muted-foreground">
          Select any amenities or program types that are important
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        {/* Amenities */}
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Desired Amenities <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleAmenity(opt.value)}
                className={cn(
                  "px-3 py-2 rounded-full border text-sm font-medium transition-all inline-flex items-center gap-1.5",
                  data.amenities.includes(opt.value)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50 text-foreground"
                )}
              >
                {data.amenities.includes(opt.value) && (
                  <Check className="h-3.5 w-3.5" />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Program Preferences */}
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Program Preferences <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {PROGRAM_PREFERENCES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ 
                  ...data, 
                  special_requirements: data.special_requirements === opt.value ? "" : opt.value 
                })}
                className={cn(
                  "px-3 py-2 rounded-full border text-sm font-medium transition-all",
                  data.special_requirements === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50 text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Additional Notes */}
        <div>
          <Label htmlFor="notes" className="text-sm font-medium">
            Additional Notes <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="notes"
            value={data.notes}
            onChange={(e) => onChange({ ...data, notes: e.target.value })}
            placeholder="Any specific needs, medical conditions, dietary requirements, or other important information..."
            className="mt-1.5 min-h-[100px]"
          />
        </div>
      </div>
    </motion.div>
  );
}
