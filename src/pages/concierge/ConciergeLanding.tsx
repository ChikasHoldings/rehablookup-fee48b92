import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { 
  CreditCard, 
  ClipboardList, 
  Users, 
  Phone, 
  CheckCircle,
  Shield,
  Clock,
  HeartHandshake,
  Mail
} from "lucide-react";

export default function ConciergeLanding() {
  const steps = [
    {
      icon: CreditCard,
      title: "Pay $29 Concierge Fee",
      description: "One-time fee covers personalized matching and provider introductions",
    },
    {
      icon: ClipboardList,
      title: "Complete Your Intake",
      description: "Share your needs, preferences, and timeline so we can find the best fit",
    },
    {
      icon: Users,
      title: "We Match You",
      description: "Our specialists review your intake and identify best-fit treatment programs",
    },
    {
      icon: Phone,
      title: "Providers Contact You",
      description: "Matched programs reach out directly to discuss next steps",
    },
    {
      icon: CheckCircle,
      title: "Choose Your Path",
      description: "Select the program that feels right for your recovery journey",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Concierge Placement Service | RehabLookup</title>
        <meta 
          name="description" 
          content="Get personalized help finding the right treatment program. Our concierge service matches you with best-fit rehab centers for just $29." 
        />
      </Helmet>
      
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        
        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <HeartHandshake className="h-4 w-4" />
                  Personalized Placement Assistance
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                  Find the Right Treatment Program with Expert Help
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                  Our concierge team personally matches you with treatment centers that fit your 
                  specific needs, insurance, and preferences. No endless searching required.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="text-lg px-8">
                    <Link to="/concierge/intake">
                      Get Started for $29
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-lg px-8">
                    <a href="mailto:placement@rehablookup.com">
                      <Mail className="mr-2 h-5 w-5" />
                      Contact Support
                    </a>
                  </Button>
                </div>
                
                <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
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
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  How It Works
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Our simple 5-step process connects you with treatment programs that match your needs
                </p>
              </div>
              
              <div className="grid gap-6 md:grid-cols-5 max-w-6xl mx-auto">
                {steps.map((step, index) => (
                  <Card key={index} className="relative border-0 shadow-sm">
                    <CardContent className="pt-8 pb-6 px-6 text-center">
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <step.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                      <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
          
          {/* Why Choose Concierge */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Why Choose Our Concierge Service?
                  </h2>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border shadow-sm">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">Personalized Matching</h3>
                      <p className="text-muted-foreground">
                        We consider your insurance, location preferences, treatment needs, and 
                        timeline to find programs that truly fit your situation.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border shadow-sm">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">Save Time and Stress</h3>
                      <p className="text-muted-foreground">
                        Skip the endless research. Our specialists do the legwork so you can 
                        focus on what matters most: getting help.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border shadow-sm">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">Direct Provider Contact</h3>
                      <p className="text-muted-foreground">
                        Matched programs contact you directly. No middleman, no delays, just 
                        real conversations with admissions teams.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border shadow-sm">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">Confidential and Secure</h3>
                      <p className="text-muted-foreground">
                        Your information is handled with care. We follow HIPAA-aware practices 
                        to protect your privacy throughout the process.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>
          
          {/* CTA Section */}
          <section className="py-16 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Find the Right Program?
              </h2>
              <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                Take the first step toward recovery. Our team is ready to help you find 
                treatment that works for your unique situation.
              </p>
              <Button asChild size="lg" variant="secondary" className="text-lg px-8">
                <Link to="/concierge/intake">
                  Start Your Intake
                </Link>
              </Button>
            </div>
          </section>
          
          {/* Disclaimers */}
          <section className="py-8 bg-muted/50 border-t">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Important:</strong> This service provides placement assistance, not medical advice. 
                  Treatment decisions should be made with qualified healthcare professionals.
                </p>
                <p>
                  If you or someone you know is in immediate danger, please call 911 or your local 
                  emergency number. For crisis support, visit the{" "}
                  <a 
                    href="https://988lifeline.org" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
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
