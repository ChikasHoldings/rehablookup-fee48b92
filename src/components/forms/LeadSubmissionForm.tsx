import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Send, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

interface LeadSubmissionFormProps {
  facilityId: string;
  facilityName: string;
  facilityEmail?: string | null;
}

// Phone validation: must have 10-15 digits after removing formatting
const phoneRegex = /^[\d\s\-\(\)\+\.]{10,20}$/;
const phoneDigitsRegex = /^\d{10,15}$/;

const leadSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  phone: z.string().trim()
    .min(10, "Phone number is too short")
    .max(20, "Phone number is too long")
    .refine((val) => {
      const digits = val.replace(/[\s\-\(\)\+\.]/g, "");
      return phoneDigitsRegex.test(digits);
    }, "Please enter a valid phone number"),
  email: z.string().trim().email("Please enter a valid email address").max(255, "Email must be less than 255 characters"),
  message: z.string().trim().max(1000, "Message must be less than 1000 characters").optional(),
  preferredContact: z.enum(["call", "email"]),
  consent: z.literal(true, { errorMap: () => ({ message: "You must agree to the terms" }) }),
});

export function LeadSubmissionForm({ facilityId, facilityName, facilityEmail }: LeadSubmissionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
    preferredContact: "call" as "call" | "email",
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Rate limiting - 30 second cooldown
    const now = Date.now();
    if (now - lastSubmitTime < 30000) {
      toast({
        variant: "destructive",
        title: "Please wait",
        description: "You can submit another request in a few seconds.",
      });
      return;
    }

    // Validate form data
    const result = leadSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      
      const firstError = result.error.errors[0];
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: firstError.message,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Call edge function to create lead and send email
      const { error } = await supabase.functions.invoke("submit-lead", {
        body: {
          facilityId,
          facilityName,
          facilityEmail,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          message: formData.message.trim() || null,
          preferredContact: formData.preferredContact,
        },
      });

      if (error) {
        // Handle specific error codes from the edge function
        const errorData = error as { message?: string };
        const errorMessage = errorData.message || "";
        
        if (errorMessage.includes("DUPLICATE") || errorMessage.includes("already submitted")) {
          toast({
            title: "Already Submitted",
            description: "You've already sent a request to this facility. They will contact you soon.",
          });
          setIsSubmitted(true);
          return;
        }
        
        if (errorMessage.includes("RATE_LIMITED")) {
          toast({
            variant: "destructive",
            title: "Too Many Requests",
            description: "Please wait a while before submitting another request.",
          });
          return;
        }
        
        if (errorMessage.includes("INVALID_EMAIL")) {
          setErrors({ email: "Please enter a valid email address" });
          return;
        }
        
        if (errorMessage.includes("INVALID_PHONE")) {
          setErrors({ phone: "Please enter a valid phone number" });
          return;
        }
        
        throw error;
      }

      setLastSubmitTime(now);
      setIsSubmitted(true);
      toast({
        title: "Request Submitted",
        description: "A representative will contact you shortly.",
      });
    } catch (err) {
      console.error("Lead submission error:", err);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "There was an error submitting your request. Please try again or call directly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="rounded-xl bg-success/10 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h3 className="mb-2 font-display text-xl font-semibold text-foreground">
          Thank You!
        </h3>
        <p className="text-muted-foreground">
          Your information has been received. A treatment specialist from {facilityName} will contact you within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Full Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Your full name"
          className={`h-11 w-full rounded-lg border ${errors.name ? 'border-destructive' : 'border-input'} bg-card px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20`}
        />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Phone Number *
        </label>
        <input
          type="tel"
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="(555) 123-4567"
          className={`h-11 w-full rounded-lg border ${errors.phone ? 'border-destructive' : 'border-input'} bg-card px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20`}
        />
        {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Email Address *
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="you@example.com"
          className={`h-11 w-full rounded-lg border ${errors.email ? 'border-destructive' : 'border-input'} bg-card px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20`}
        />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Preferred Contact Method *
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="preferredContact"
              value="call"
              checked={formData.preferredContact === "call"}
              onChange={() => setFormData({ ...formData, preferredContact: "call" })}
              className="h-4 w-4 text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">Phone Call</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="preferredContact"
              value="email"
              checked={formData.preferredContact === "email"}
              onChange={() => setFormData({ ...formData, preferredContact: "email" })}
              className="h-4 w-4 text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">Email</span>
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Message (Optional)
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Tell us about your situation or any questions you have..."
          rows={3}
          className={`w-full resize-none rounded-lg border ${errors.message ? 'border-destructive' : 'border-input'} bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20`}
        />
        {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message}</p>}
      </div>

      <div className="rounded-lg bg-secondary/50 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.consent}
            onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            I consent to being contacted by phone, email, or text regarding treatment options. 
            I understand that my information will be shared with {facilityName} for follow-up purposes. 
            Standard messaging rates may apply.
          </span>
        </label>
        {errors.consent && <p className="mt-2 text-xs text-destructive">{errors.consent}</p>}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Confidential:</strong> Your information is protected and will only be used to connect you with treatment resources.
        </p>
      </div>

      <Button
        type="submit"
        variant="success"
        size="lg"
        className="w-full gap-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Request Information
          </>
        )}
      </Button>
    </form>
  );
}
