import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Loader2, CreditCard, Shield, CheckCircle2 } from "lucide-react";

interface IntakeData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  preferred_language: string;
  seeking_for: string;
  age_range: string;
  gender: string;
  level_of_care: string;
  primary_concern: string;
  co_occurring_conditions: string[];
  previous_treatment: string;
  budget_range: string;
  rehab_style: string;
  treatment_duration: string;
  amenities: string[];
  special_requirements: string;
  notes: string;
}

interface StepReviewProps {
  data: IntakeData;
  isSubmitting: boolean;
  onSubmit: () => void;
}

const formatValue = (value: string | string[]) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(v => v.replace(/-/g, ' ')).join(', ') : 'None selected';
  }
  return value ? value.replace(/-/g, ' ') : 'Not specified';
};

export function StepReview({ data, isSubmitting, onSubmit }: StepReviewProps) {
  const sections = [
    {
      title: "Contact Information",
      items: [
        { label: "Name", value: `${data.first_name} ${data.last_name}` },
        { label: "Email", value: data.email },
        { label: "Phone", value: data.phone || 'Not provided' },
        { label: "Country", value: data.country },
        { label: "Language", value: data.preferred_language },
      ],
    },
    {
      title: "Patient Details",
      items: [
        { label: "Seeking treatment for", value: data.seeking_for === 'self' ? 'Myself' : 'Someone else' },
        { label: "Age range", value: formatValue(data.age_range) },
        { label: "Gender", value: formatValue(data.gender) },
      ],
    },
    {
      title: "Treatment Needs",
      items: [
        { label: "Level of care", value: formatValue(data.level_of_care) },
        { label: "Primary concern", value: formatValue(data.primary_concern) },
        { label: "Co-occurring conditions", value: formatValue(data.co_occurring_conditions) },
        { label: "Previous treatment", value: formatValue(data.previous_treatment) },
      ],
    },
    {
      title: "Preferences",
      items: [
        { label: "Budget range", value: formatValue(data.budget_range) },
        { label: "Program style", value: formatValue(data.rehab_style) },
        { label: "Duration", value: formatValue(data.treatment_duration) },
        { label: "Amenities", value: formatValue(data.amenities) },
        { label: "Program type", value: formatValue(data.special_requirements) },
      ],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Review Your Application
        </h2>
        <p className="text-muted-foreground">
          Please confirm your details before proceeding to payment
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        {/* Summary Cards */}
        {sections.map((section, idx) => (
          <div key={idx} className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <h3 className="font-medium text-sm text-foreground">{section.title}</h3>
            </div>
            <div className="p-4 space-y-2">
              {section.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground font-medium text-right max-w-[200px] capitalize">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {data.notes && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <h3 className="font-medium text-sm text-foreground">Additional Notes</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">{data.notes}</p>
            </div>
          </div>
        )}

        {/* Payment Section */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Placement Service Fee</p>
              <p className="text-3xl font-bold text-foreground">$299 <span className="text-base font-normal text-muted-foreground">USD</span></p>
            </div>
            <CreditCard className="h-8 w-8 text-primary" />
          </div>

          <ul className="space-y-2 mb-6">
            {[
              "Personalized facility matching",
              "Direct admissions coordination", 
              "24-hour advisor response",
              "Refunded upon confirmed admission"
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue to Payment — $299
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Secure payment via Stripe
          </div>
        </div>
      </div>
    </motion.div>
  );
}
