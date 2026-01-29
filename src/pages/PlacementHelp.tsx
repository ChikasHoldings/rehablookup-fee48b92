import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { PlacementIntakeForm } from "@/components/placement/PlacementIntakeForm";
import { PlacementSuccessScreen } from "@/components/placement/PlacementSuccessScreen";
import { Heart, Shield, Users, Clock, CheckCircle2 } from "lucide-react";
import { fadeInUp, staggerContainer, heroStaggerContainer, viewportOnce } from "@/lib/animations";

const TRUST_POINTS = [
  {
    icon: Heart,
    title: "Free Service",
    description: "No cost to you or your family",
  },
  {
    icon: Shield,
    title: "Verified Facilities",
    description: "All centers are licensed and vetted",
  },
  {
    icon: Users,
    title: "Personal Support",
    description: "A real specialist works your case",
  },
  {
    icon: Clock,
    title: "Fast Response",
    description: "Contact within 24 hours",
  },
];

export default function PlacementHelp() {
  const navigate = useNavigate();
  const [submittedCaseId, setSubmittedCaseId] = useState<string | null>(null);

  const handleSubmitSuccess = (caseId: string) => {
    setSubmittedCaseId(caseId);
    window.scrollTo(0, 0);
  };

  if (submittedCaseId) {
    return (
      <Layout>
        <SEO
          title="Case Submitted | RehabLookup Placement Help"
          description="Your placement case has been submitted. Our specialist will contact you within 24 hours."
        />
        <PlacementSuccessScreen caseId={submittedCaseId} />
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="Free Placement Help | RehabLookup"
        description="Get personalized help finding the right treatment center. Our specialists work with you to find the best match for your needs, insurance, and budget."
        canonical="/placement-help"
      />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-transparent">
          <motion.div 
            className="max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center"
            variants={heroStaggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
            >
              <Heart className="h-4 w-4" />
              Free Placement Service
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4"
            >
              Let Us Help You Find the Right Treatment Center
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8"
            >
              Our placement specialists work directly with you to understand your unique situation 
              and connect you with treatment centers that match your needs, insurance, and preferences.
            </motion.p>

            {/* Trust Points */}
            <motion.div 
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
              variants={staggerContainer}
            >
              {TRUST_POINTS.map((point) => (
                <motion.div 
                  key={point.title} 
                  variants={fadeInUp}
                  className="flex flex-col items-center p-3 rounded-xl bg-background/50"
                >
                  <point.icon className="h-5 w-5 text-primary mb-2" />
                  <span className="font-medium text-sm text-foreground">{point.title}</span>
                  <span className="text-xs text-muted-foreground">{point.description}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Form Section */}
        <motion.div 
          className="max-w-3xl mx-auto px-4 py-8 sm:py-12"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <div className="bg-card rounded-2xl border shadow-sm p-6 sm:p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Tell Us About Your Situation
              </h2>
              <p className="text-muted-foreground">
                This information helps our specialists find the best options for you.
              </p>
            </div>

            <PlacementIntakeForm onSuccess={handleSubmitSuccess} />
          </div>

          {/* Bottom Trust Section */}
          <div className="mt-12 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                100% Confidential
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                No Obligation
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                HIPAA Compliant
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
