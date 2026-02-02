import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { motion } from "framer-motion";

interface StepPhoneProps {
  data: { phone: string };
  onChange: (data: { phone: string }) => void;
}

export function StepPhone({ data, onChange }: StepPhoneProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          How can we reach you?
        </h2>
        <p className="text-muted-foreground">
          Your placement advisor may call to discuss options
        </p>
      </div>

      <div className="max-w-sm mx-auto">
        <Label htmlFor="phone" className="text-sm font-medium">
          Phone Number
        </Label>
        <div className="mt-1.5">
          <PhoneInput
            value={data.phone}
            onChange={(value) => onChange({ phone: value })}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Include your country code for international calls
        </p>
      </div>
    </motion.div>
  );
}
