import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Phone, ArrowRight, Heart, Shield, Clock, HeartHandshake, Mail, MessageSquare, User } from "lucide-react";
import { ResendConfirmationButton } from "./ResendConfirmationButton";
import { useEffect, useState } from "react";

interface LeadIntakeSuccessContact {
  email?: string;
  phone?: string;
  preferredContact?: string;
  bestTimeToCall?: string;
}

interface LeadIntakeSuccessProps {
  facilityName?: string | null;
  firstName?: string;
  contact?: LeadIntakeSuccessContact;
}

const PREFERRED_CONTACT_LABEL: Record<string, string> = {
  call: "Phone call",
  phone: "Phone call",
  text: "Text message (SMS)",
  sms: "Text message (SMS)",
  email: "Email",
};

const BEST_TIME_LABEL: Record<string, string> = {
  morning: "Morning (8am–12pm)",
  afternoon: "Afternoon (12pm–5pm)",
  evening: "Evening (5pm–8pm)",
  anytime: "Anytime",
};

function maskPhone(phone?: string) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `••• ••• ${digits.slice(-4)}`;
}

export function LeadIntakeSuccess({ facilityName, firstName, contact }: LeadIntakeSuccessProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const preferredLabel = contact?.preferredContact
    ? PREFERRED_CONTACT_LABEL[contact.preferredContact] ?? contact.preferredContact
    : null;
  const bestTimeLabel = contact?.bestTimeToCall
    ? BEST_TIME_LABEL[contact.bestTimeToCall] ?? contact.bestTimeToCall
    : null;

  const hasContactRecap = !!(contact && (contact.email || contact.phone || preferredLabel));

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16 px-4">
      <div 
        className={`max-w-lg w-full text-center transition-all duration-700 ease-out ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Success Icon with Pulse Animation */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-green-400/20 animate-ping" />
          <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-green-500/25">
            <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-4">
          Thank You{firstName ? `, ${firstName}` : ""}!
        </h1>
        
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          {facilityName ? (
            <>
              Your request has been sent to{" "}
              <span className="font-semibold text-primary">{facilityName}</span>. 
              A representative will reach out to you shortly.
            </>
          ) : (
            <>
              Your request has been received. A treatment specialist will contact you 
              using your preferred method within 24 hours.
            </>
          )}
        </p>

        {/* Contact Details Recap */}
        {hasContactRecap && (
          <div className="bg-card border border-border/60 rounded-2xl p-5 mb-6 text-left shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground text-sm">
                Contact details we received
              </h3>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Confirmed
              </span>
            </div>
            <ul className="space-y-2.5 text-sm">
              {firstName && (
                <li className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground font-medium">{firstName}</span>
                </li>
              )}
              {contact?.email && (
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground break-all">{contact.email}</span>
                </li>
              )}
              {contact?.phone && (
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{maskPhone(contact.phone)}</span>
                </li>
              )}
              {preferredLabel && (
                <li className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground">
                    Preferred: <span className="font-medium">{preferredLabel}</span>
                    {bestTimeLabel ? (
                      <span className="text-muted-foreground"> · {bestTimeLabel}</span>
                    ) : null}
                  </span>
                </li>
              )}
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              Something not right? Reply to the confirmation email we just sent and we'll update it.
            </p>
          </div>
        )}

        {/* Feature Cards */}

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-colors">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs font-medium text-foreground">100% Confidential</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-colors">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs font-medium text-foreground">Response within 24hrs</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-colors">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs font-medium text-foreground">Caring Support</p>
          </div>
        </div>

        {/* What to Expect - Enhanced */}
        <div className="relative bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 rounded-2xl p-6 mb-8 text-left overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <h3 className="font-semibold text-foreground mb-4 text-lg">What happens next?</h3>
          <ul className="space-y-4 relative">
            <li className="flex items-start gap-4 group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                <span className="text-xs font-bold text-primary-foreground">1</span>
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Review Your Information</p>
                <p className="text-xs text-muted-foreground mt-0.5">A verified treatment specialist will carefully review your request</p>
              </div>
            </li>
            <li className="flex items-start gap-4 group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                <span className="text-xs font-bold text-primary-foreground">2</span>
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Personal Outreach</p>
                <p className="text-xs text-muted-foreground mt-0.5">They'll reach out using your preferred contact method</p>
              </div>
            </li>
            <li className="flex items-start gap-4 group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                <span className="text-xs font-bold text-primary-foreground">3</span>
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Discuss Your Path Forward</p>
                <p className="text-xs text-muted-foreground mt-0.5">You'll explore treatment options and plan next steps together</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Emergency Note - Enhanced */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl p-4 mb-8 shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Phone className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Need immediate help?
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Call 911 or SAMHSA: <span className="font-mono font-bold">1-800-662-4357</span>
              </p>
            </div>
          </div>
        </div>

        {/* Concierge CTA - Professional Design */}
        <div className="bg-card border border-border rounded-2xl p-6 text-left">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-base mb-1">
                Want help finding the best fit?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our Placement Service connects you with verified treatment centers based on your unique needs.
              </p>
            </div>
          </div>
          
          <Link to="/concierge">
            <Button className="w-full h-11 gap-2 group">
              Find Treatment
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Secondary Action */}
        <Link to="/rehab-centers">
          <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
            Browse Treatment Centers
          </Button>
        </Link>
      </div>
    </div>
  );
}
