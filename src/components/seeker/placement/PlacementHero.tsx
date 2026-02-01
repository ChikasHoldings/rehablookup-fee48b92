import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  HeartHandshake, 
  ArrowRight,
  Shield,
  Clock,
  Users,
  Star,
  CheckCircle
} from "lucide-react";

interface PlacementHeroProps {
  onGetStarted: () => void;
}

const TRUST_INDICATORS = [
  { icon: Shield, text: "HIPAA Compliant" },
  { icon: Clock, text: "24hr Response" },
  { icon: Users, text: "100+ Facilities" },
];

const FEATURES = [
  "Personalized facility recommendations",
  "Direct introductions to admissions",
  "Tour coordination & scheduling",
  "Support through admission",
];

export function PlacementHero({ onGetStarted }: PlacementHeroProps) {
  return (
    <div className="py-8 sm:py-12">
      {/* Hero Content */}
      <div className="text-center space-y-6 max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <HeartHandshake className="h-4 w-4" />
            <span>Personalized Placement Service</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl lg:text-4xl">
            Find Your Perfect
            <span className="block text-primary mt-1">Treatment Center</span>
          </h1>

          <p className="text-muted-foreground text-lg mt-4 max-w-xl mx-auto">
            Let our specialists match you with treatment centers that fit your unique needs.
            We handle the research and introductions.
          </p>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap"
        >
          {TRUST_INDICATORS.map((item) => (
            <div key={item.text} className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <item.icon className="h-4 w-4 text-primary" />
              <span>{item.text}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="pt-4"
        >
          <div className="inline-flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border-2 border-border/50 shadow-sm">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground">$29</span>
              <span className="text-muted-foreground">one-time</span>
            </div>

            <div className="space-y-2 text-left">
              {FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              onClick={onGetStarted}
              className="w-full mt-2 gap-2"
            >
              Start Your Request
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              Trusted by hundreds of families
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
