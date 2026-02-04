import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Mail, Info } from "lucide-react";

interface StepEmailProps {
  data: { email: string };
  onChange: (data: { email: string }) => void;
}

export function StepEmail({ data, onChange }: StepEmailProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5 md:space-y-6"
    >
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1.5 md:mb-2">
          What's your email address?
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          We'll send placement updates and facility matches here
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-4 px-1">
        <div>
          <Label htmlFor="email" className="text-sm font-medium">
            Email Address
          </Label>
          <div className="relative mt-2">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="you@example.com"
              className="h-12 text-base pl-10"
              autoFocus
            />
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            You'll need to verify your email after completing the application to activate your case.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
