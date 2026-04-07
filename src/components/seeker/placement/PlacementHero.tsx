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
  { icon: Users, text: "1,000+ Facilities" },
];

const FEATURES = [
  "Personalized facility recommendations",
  "Direct introductions to admissions",
  "Tour coordination & scheduling",
  "Support through admission",
];

export function PlacementHero({ onGetStarted }: PlacementHeroProps) {
  return (
    <div className="py-6 sm:py-8 lg:py-12">
      {/* Hero Content */}
      <div className="text-center space-y-4 sm:space-y-6 max-w-2xl mx-auto px-3 sm:px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            <HeartHandshake className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Personalized Placement</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            Find Your Perfect
            <span className="block text-primary mt-0.5 sm:mt-1">Treatment Center</span>
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg mt-3 sm:mt-4 max-w-xl mx-auto">
            Let our specialists connect you with treatment centers that fit your unique needs.
          </p>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap"
        >
          {TRUST_INDICATORS.map((item) => (
            <div key={item.text} className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
              <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span>{item.text}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="pt-2 sm:pt-4"
        >
          <div className="inline-flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-card border-2 border-border/50 shadow-sm">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-bold text-foreground">$29</span>
              <span className="text-sm text-muted-foreground">one-time</span>
            </div>

            <div className="space-y-1.5 sm:space-y-2 text-left">
              {FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              size="default"
              onClick={onGetStarted}
              className="w-full mt-1.5 sm:mt-2 gap-1.5 sm:gap-2 h-10 sm:h-11"
            >
              Start Your Request
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-xs sm:text-xs text-muted-foreground flex items-center gap-1">
              <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-yellow-500 fill-yellow-500" />
              Trusted by hundreds of families
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
