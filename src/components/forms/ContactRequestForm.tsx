import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Send, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContactRequestFormProps {
  centerName?: string;
}

export function ContactRequestForm({ centerName }: ContactRequestFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
    consent: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.consent) {
      toast({
        variant: "destructive",
        title: "Consent Required",
        description: "Please agree to the terms before submitting.",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    
    toast({
      title: "Request Submitted",
      description: "A representative will contact you shortly.",
    });
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
          Your information has been received. A treatment specialist will contact you within 24 hours.
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
          className="h-11 w-full rounded-lg border border-input bg-card px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
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
          className="h-11 w-full rounded-lg border border-input bg-card px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
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
          className="h-11 w-full rounded-lg border border-input bg-card px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Message (Optional)
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Tell us about your situation or any questions you have..."
          rows={4}
          className="w-full resize-none rounded-lg border border-input bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="rounded-lg bg-secondary/50 p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.consent}
            onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            I consent to being contacted by phone, email, or text regarding treatment options. 
            I understand that my information will be shared with{centerName ? ` ${centerName}` : " the selected treatment center"} for follow-up purposes. 
            Standard messaging rates may apply.
          </span>
        </label>
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
