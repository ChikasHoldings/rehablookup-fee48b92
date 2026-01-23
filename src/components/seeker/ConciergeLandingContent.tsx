import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  HeartHandshake, 
  Search, 
  Users, 
  Clock, 
  Shield, 
  CheckCircle,
  ArrowRight,
  Star
} from "lucide-react";

const BENEFITS = [
  {
    icon: Search,
    title: "Personalized Matching",
    description: "We analyze your unique needs to find treatment centers that specialize in your situation.",
  },
  {
    icon: Users,
    title: "Direct Introductions",
    description: "We introduce you to admissions teams so you skip the cold calls and automated forms.",
  },
  {
    icon: Clock,
    title: "Fast Response",
    description: "Our team reviews your case within 24 hours and starts matching immediately.",
  },
  {
    icon: Shield,
    title: "Confidential & Private",
    description: "Your information is protected with HIPAA-compliant practices throughout.",
  },
];

const WHATS_INCLUDED = [
  "Dedicated placement specialist assigned to your case",
  "Personalized facility recommendations based on your needs",
  "Direct introductions to treatment center admissions teams",
  "Coordination of tours and initial conversations",
  "Support throughout your decision-making process",
  "Follow-up after placement to ensure a smooth transition",
];

interface ConciergeLandingContentProps {
  onStartFlow: () => void;
}

export const ConciergeLandingContent = forwardRef<HTMLDivElement, ConciergeLandingContentProps>(
  function ConciergeLandingContent({ onStartFlow }, ref) {
    return (
      <div ref={ref} className="space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <HeartHandshake className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Concierge Placement Service</h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-base sm:text-lg px-4">
            Let our specialists guide you to the right treatment center. We handle the research, 
            introductions, and coordination—so you can focus on recovery.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span>Trusted by hundreds of families</span>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title} className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex gap-3 sm:gap-4">
                  <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <benefit.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-sm sm:text-base">{benefit.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* What's Included */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base sm:text-lg font-semibold mb-4">What's Included</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {WHATS_INCLUDED.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pricing & CTA */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-6 sm:py-8 text-center space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">One-time fee</p>
              <div className="text-3xl sm:text-4xl font-bold">$29</div>
              <p className="text-sm text-muted-foreground">
                No hidden fees. Full service included.
              </p>
            </div>
            <Button size="lg" onClick={onStartFlow} className="gap-2 w-full sm:w-auto">
              Start Your Placement Request
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto px-4">
              You'll complete a brief intake form and then proceed to secure payment.
              Our team will begin working on your case immediately.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
);
