import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

interface StepContactProps {
  data: { first_name: string; last_name: string };
  onChange: (data: { first_name: string; last_name: string }) => void;
}

export function StepContact({ data, onChange }: StepContactProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5 md:space-y-6"
    >
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1.5 md:mb-2">
          Let's start with your name
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          We'll use this to personalize your experience
        </p>
      </div>

      <div className="space-y-4 max-w-sm mx-auto px-1">
        <div>
          <Label htmlFor="first_name" className="text-sm font-medium">
            First Name
          </Label>
          <Input
            id="first_name"
            value={data.first_name}
            onChange={(e) => onChange({ ...data, first_name: e.target.value })}
            placeholder="Enter your first name"
            className="h-12 text-base mt-2"
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="last_name" className="text-sm font-medium">
            Last Name
          </Label>
          <Input
            id="last_name"
            value={data.last_name}
            onChange={(e) => onChange({ ...data, last_name: e.target.value })}
            placeholder="Enter your last name"
            className="h-12 text-base mt-2"
          />
        </div>
      </div>
    </motion.div>
  );
}
