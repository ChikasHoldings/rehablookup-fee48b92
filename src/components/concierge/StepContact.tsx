import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";

const BEST_TIMES = [
  { value: "morning", label: "Morning (8am - 12pm)" },
  { value: "afternoon", label: "Afternoon (12pm - 5pm)" },
  { value: "evening", label: "Evening (5pm - 8pm)" },
  { value: "anytime", label: "Anytime" },
];

interface Props {
  data: ConciergeIntakeData;
  errors: Record<string, string>;
  onChange: (updates: Partial<ConciergeIntakeData>) => void;
}

export function StepContact({ data, errors, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="decisionMakerName">Full name of decision-maker *</Label>
        <Input
          id="decisionMakerName"
          value={data.decisionMakerName}
          onChange={(e) => onChange({ decisionMakerName: e.target.value })}
          placeholder="Enter full name"
          className={errors.decisionMakerName ? "border-destructive" : ""}
        />
        {errors.decisionMakerName && <p className="text-sm text-destructive">{errors.decisionMakerName}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone number *</Label>
        <Input
          id="phone"
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="(555) 123-4567"
          className={errors.phone ? "border-destructive" : ""}
        />
        {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email address *</Label>
        <Input
          id="email"
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="your@email.com"
          className={errors.email ? "border-destructive" : ""}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label>Best time to call *</Label>
        <Select value={data.bestTimeToCall} onValueChange={(v) => onChange({ bestTimeToCall: v })}>
          <SelectTrigger className={errors.bestTimeToCall ? "border-destructive" : ""}>
            <SelectValue placeholder="Select best time" />
          </SelectTrigger>
          <SelectContent>
            {BEST_TIMES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.bestTimeToCall && <p className="text-sm text-destructive">{errors.bestTimeToCall}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional notes or special considerations *</Label>
        <Textarea
          id="notes"
          value={data.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Any additional information that would help us find the right program (min 10 characters)"
          rows={4}
          className={errors.notes ? "border-destructive" : ""}
        />
        {errors.notes && <p className="text-sm text-destructive">{errors.notes}</p>}
        <p className="text-xs text-muted-foreground">{data.notes.length}/10 characters minimum</p>
      </div>
    </div>
  );
}
