import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { 
  CreditCard, 
  ClipboardList, 
  Users, 
  CheckCircle,
  Shield,
  Clock,
  HeartHandshake,
  Mail,
  ArrowRight
} from "lucide-react";

export default function ConciergeLanding() {
  const steps = [
    {
      icon: CreditCard,
      title: "Pay $29 Fee",
      description: "One-time fee covers personalized matching and provider introductions",
    },
    {
      icon: ClipboardList,
      title: "Complete Intake",
      description: "Share your needs, preferences, and timeline so we can find the best fit",
    },
    {
      icon: Users,
      title: "We Match You",
      description: "Our specialists review your intake and identify best-fit treatment programs",
    },
    {
      icon: Mail,
      title: "Get Connected",
      description: "Matched programs reach out via email to discuss next steps",
    },
    {
      icon: CheckCircle,
      title: "Choose Your Path",
      description: "Select the program that feels right for your recovery journey",
    },
  ];

  const benefits = [
    {
      title: "Personalized Matching",
      description: "We consider your insurance, location preferences, treatment needs, and timeline to find programs that truly fit your situation.",
    },
    {
      title: "Save Time and Stress",
      description: "Skip the endless research. Our specialists do the legwork so you can focus on what matters most: getting help.",
    },
    {
      title: "Direct Provider Contact",
      description: "Matched programs contact you directly. No middleman, no delays, just real conversations with admissions teams.",
    },
    {
      title: "Confidential and Secure",
      description: "Your information is handled with care. We follow HIPAA-aware practices to protect your privacy throughout the process.",
    },
  ];

  return (
    <>
      <SEO
        title="Concierge Placement Service"
        description="Get personalized help finding the right treatment program. Our concierge service matches you with best-fit rehab centers for just $29."
        canonical="/concierge"
        keywords={["treatment placement", "rehab concierge", "addiction treatment matching", "personalized rehab help"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Concierge", url: "/concierge" },
        ]}
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        
        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-20 md:py-28">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_50%)]" />
            <div className="container relative mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
                  <HeartHandshake className="h-4 w-4" />
                  Personalized Placement Assistance
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
                  Find the Right Treatment
                  <span className="block text-primary">With Expert Help</span>
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
                  Our concierge team personally matches you with treatment centers that fit your 
                  specific needs, insurance, and preferences. No endless searching required.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                  <Button asChild size="lg" className="text-base h-12 px-8 shadow-lg shadow-primary/25">
                    <Link to="/concierge/intake">
                      Get Started for $29
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-base h-12 px-8">
                    <a href="mailto:placement@rehablookup.com">
                      <Mail className="mr-2 h-4 w-4" />
                      Contact Support
                    </a>
                  </Button>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>100% Confidential</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Response within 24-48 hours</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* How It Works */}
          <section className="py-20 md:py-28 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  How It Works
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Our simple 5-step process connects you with treatment programs that match your needs
                </p>
              </div>
              
              <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-3">
                  {steps.map((step, index) => (
                    <Card key={index} className="relative bg-card border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="pt-10 pb-6 px-4 text-center">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-md">
                          {index + 1}
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <step.icon className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-2 text-sm">{step.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>
          
          {/* Why Choose Concierge */}
          <section className="py-20 md:py-28">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Why Choose Our Concierge Service?
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                    We take the stress out of finding the right treatment program
                  </p>
                </div>
                
                <div className="grid gap-5 sm:grid-cols-2">
                  {benefits.map((benefit, index) => (
                    <Card key={index} className="border bg-card shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-foreground mb-2">{benefit.title}</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              {benefit.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>
          
          {/* CTA Section */}
          <section className="py-20 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to Find the Right Program?
                </h2>
                <p className="text-lg opacity-90 mb-8">
                  Take the first step toward recovery. Our team is ready to help you find 
                  treatment that works for your unique situation.
                </p>
                <Button asChild size="lg" variant="secondary" className="text-base h-12 px-8 shadow-lg">
                  <Link to="/concierge/intake">
                    Start Your Intake
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
          
          {/* Disclaimers */}
          <section className="py-10 bg-muted/40 border-t">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center text-sm text-muted-foreground space-y-3">
                <p>
                  <strong className="text-foreground/80">Important:</strong> This service provides placement assistance, not medical advice. 
                  Treatment decisions should be made with qualified healthcare professionals.
                </p>
                <p>
                  If you or someone you know is in immediate danger, please call 911 or your local 
                  emergency number. For crisis support, visit the{" "}
                  <a 
                    href="https://988lifeline.org" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    988 Suicide and Crisis Lifeline
                  </a>.
                </p>
              </div>
            </div>
          </section>
        </main>
        
        <PublicFooter />
      </div>
    </>
  );
}