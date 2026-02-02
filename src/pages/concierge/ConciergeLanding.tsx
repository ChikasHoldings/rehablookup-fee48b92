import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { 
  CheckCircle,
  Shield,
  Clock,
  HeartHandshake,
  ArrowRight,
  Star,
  Users,
  MessageCircle,
  Sparkles,
  BadgeCheck,
  Building2,
  Heart,
  Zap,
  Calendar
} from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "They found me a program that accepted my insurance and was close to family. I couldn't have done it alone.",
    author: "Sarah M.",
    location: "Texas",
    rating: 5,
  },
  {
    quote: "Within 48 hours I had 3 great options to choose from. The team was compassionate and really listened.",
    author: "Michael R.",
    location: "Florida", 
    rating: 5,
  },
  {
    quote: "I was overwhelmed trying to find help for my son. They made the process so much easier during a hard time.",
    author: "Jennifer L.",
    location: "California",
    rating: 5,
  },
];

const STATS = [
  { value: "500+", label: "Families Helped" },
  { value: "100+", label: "Partner Facilities" },
  { value: "24hr", label: "Avg Response Time" },
  { value: "4.9", label: "Client Rating", icon: Star },
];

const FAQ_ITEMS = [
  {
    question: "What does the $29 fee cover?",
    answer: "The one-time fee covers personalized matching by our specialists, insurance verification assistance, direct introductions to matched programs, and ongoing support throughout your search.",
  },
  {
    question: "How quickly will I hear back?",
    answer: "Most clients receive their first matched program recommendations within 24-48 hours of completing their intake form.",
  },
  {
    question: "Is my information kept confidential?",
    answer: "Absolutely. We follow HIPAA-aware practices and only share your information with programs you're matched with. Your privacy is our priority.",
  },
  {
    question: "What if I don't like the programs I'm matched with?",
    answer: "Our team will work with you to understand your concerns and find additional options. We're committed to helping you find the right fit.",
  },
];

export default function ConciergeLanding() {
  const steps = [
    {
      icon: Sparkles,
      title: "Tell Us Your Needs",
      description: "Complete a quick intake form about your situation, preferences, and insurance",
      time: "5 min",
    },
    {
      icon: Users,
      title: "We Find Your Matches",
      description: "Our specialists identify programs that fit your specific requirements",
      time: "24-48 hrs",
    },
    {
      icon: MessageCircle,
      title: "Get Connected",
      description: "Matched programs reach out directly to discuss next steps with you",
      time: "Same day",
    },
  ];

  const benefits = [
    {
      icon: HeartHandshake,
      title: "Personal Attention",
      description: "Real specialists who listen, not algorithms. We understand every situation is unique.",
    },
    {
      icon: BadgeCheck,
      title: "Verified Programs",
      description: "Every facility in our network is vetted for quality, licensing, and accreditation.",
    },
    {
      icon: Shield,
      title: "Insurance Help",
      description: "We help verify coverage and find programs that work with your insurance plan.",
    },
    {
      icon: Clock,
      title: "Fast Response",
      description: "Get matched within 24-48 hours. When you're ready for help, we move quickly.",
    },
  ];

  return (
    <>
      <SEO
        title="Find Treatment That Fits | Concierge Placement Service"
        description="Stop searching alone. Our specialists match you with treatment programs that fit your needs, insurance, and location. Just $29, one-time. Get matched in 24-48 hours."
        canonical="/concierge"
        keywords={["treatment placement", "rehab concierge", "addiction treatment matching", "personalized rehab help", "find rehab near me"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Concierge", url: "/concierge" },
        ]}
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        
        <main className="flex-1">
          {/* Hero Section - Mobile Optimized */}
          <section className="relative overflow-hidden">
            {/* Background with subtle pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-muted/30" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_50%)]" />
            <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTItNCAwLTQgMiAwIDIgMiA0IDIgNHMyLTIgNC0yIDQgMCA0LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')]" />
            
            <div className="container relative mx-auto px-4 py-10 sm:py-12 md:py-16 lg:py-20">
              <div className="max-w-3xl mx-auto text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Badge className="mb-4 sm:mb-5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-primary/10 text-primary border-primary/20">
                    <HeartHandshake className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Personalized Placement
                  </Badge>
                  
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4 tracking-tight leading-tight">
                    Find the Right Treatment
                  </h1>
                  
                  <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed max-w-2xl mx-auto px-2">
                    Our specialists match you with programs that fit your needs, insurance, and location. 
                    Get matched in 24-48 hours for just <span className="text-foreground font-semibold">$29</span>.
                  </p>
                  
                  {/* Mobile-First CTA */}
                  <div className="flex flex-col items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
                    <Button asChild size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 text-base font-semibold shadow-lg shadow-primary/25 rounded-xl group">
                      <Link to="/concierge/intake">
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground">One-time fee • No hidden costs</p>
                  </div>
                  
                  {/* Trust Badges - Mobile Optimized */}
                  <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full"
                    >
                      <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      <span>Confidential</span>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full"
                    >
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      <span>24-48hr Match</span>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full"
                    >
                      <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      <span>100+ Facilities</span>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
          
          {/* Social Proof Stats Bar */}
          <section className="py-8 relative overflow-hidden bg-primary/10 border-y border-primary/20">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_60%)]" />
            <div className="container relative mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {STATS.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</span>
                      {stat.icon && <stat.icon className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
                    </div>
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          
          {/* How It Works - Mobile Optimized */}
          <section className="py-10 sm:py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8 sm:mb-12">
                <Badge variant="outline" className="mb-3 sm:mb-4">
                  <Zap className="h-3 w-3 mr-1" />
                  Simple Process
                </Badge>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
                  How It Works
                </h2>
                <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto px-2">
                  Three simple steps to find treatment that fits
                </p>
              </div>
              
              <div className="max-w-4xl mx-auto">
                {/* Mobile: Vertical Stack with Connection Line */}
                <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 md:gap-8">
                  {steps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="relative"
                    >
                      {/* Mobile Connection Line */}
                      {index < steps.length - 1 && (
                        <div className="sm:hidden absolute left-7 top-20 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 to-transparent h-8" />
                      )}
                      
                      <Card className="relative h-full bg-card border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
                        {/* Step number */}
                        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs sm:text-sm font-bold text-primary">{index + 1}</span>
                        </div>
                        
                        <CardContent className="pt-6 pb-5 px-4 sm:pt-8 sm:pb-6 sm:px-6">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform">
                            <step.icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                          </div>
                          
                          <h3 className="font-semibold text-base sm:text-lg text-foreground mb-1.5 sm:mb-2">{step.title}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3 sm:mb-4">{step.description}</p>
                          
                          <div className="flex items-center gap-2 text-xs text-primary font-medium">
                            <Calendar className="h-3 w-3" />
                            {step.time}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
                
                {/* CTA after steps */}
                <div className="text-center mt-8 sm:mt-10">
                  <Button asChild size="lg" className="w-full sm:w-auto h-12 px-6 sm:px-8 text-base shadow-lg shadow-primary/25 rounded-xl">
                    <Link to="/concierge/intake">
                      Start Your Free Intake
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">Takes only 5 minutes</p>
                </div>
              </div>
            </div>
          </section>
          
          {/* Benefits Grid - Mobile Optimized */}
          <section className="py-10 sm:py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-8 sm:mb-12">
                  <Badge variant="outline" className="mb-3 sm:mb-4">
                    <Heart className="h-3 w-3 mr-1" />
                    Why Choose Us
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
                    More Than Just Matching
                  </h2>
                  <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto px-2">
                    We're committed to helping you find the right path
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <Card className="h-full border bg-card hover:border-primary/30 transition-colors">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                              <benefit.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base sm:text-lg text-foreground mb-1 sm:mb-2">{benefit.title}</h3>
                              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                                {benefit.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          
          {/* Testimonials - Mobile Optimized */}
          <section className="py-10 sm:py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8 sm:mb-12">
                <Badge variant="outline" className="mb-3 sm:mb-4">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Real Stories
                </Badge>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
                  Families We've Helped
                </h2>
                <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto px-2">
                  Join hundreds who found the right treatment
                </p>
              </div>
              
              {/* Mobile: Horizontal Scroll, Desktop: Grid */}
              <div className="relative">
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0 max-w-5xl mx-auto">
                  {TESTIMONIALS.map((testimonial, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="min-w-[280px] snap-center md:min-w-0"
                    >
                      <Card className="h-full bg-card border shadow-sm">
                        <CardContent className="p-4 sm:p-6">
                          {/* Stars */}
                          <div className="flex gap-0.5 mb-3 sm:mb-4">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Star key={i} className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500 fill-yellow-500" />
                            ))}
                          </div>
                          
                          <blockquote className="text-sm sm:text-base text-foreground mb-3 sm:mb-4 leading-relaxed line-clamp-4">
                            "{testimonial.quote}"
                          </blockquote>
                          
                          <div className="flex items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs sm:text-sm font-semibold text-primary">
                                {testimonial.author.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-xs sm:text-sm text-foreground">{testimonial.author}</p>
                              <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          
          {/* FAQ Section - Mobile Optimized */}
          <section className="py-10 sm:py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8 sm:mb-12">
                  <Badge variant="outline" className="mb-3 sm:mb-4">
                    <MessageCircle className="h-3 w-3 mr-1" />
                    FAQ
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
                    Common Questions
                  </h2>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  {FAQ_ITEMS.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card className="border bg-card">
                        <CardContent className="p-4 sm:p-6">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1.5 sm:mb-2">{item.question}</h3>
                          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{item.answer}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          
          {/* Final CTA Section - Mobile Optimized */}
          <section className="py-12 sm:py-20 md:py-28 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_70%)]" />
            
            <div className="container relative mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center text-primary-foreground">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
                    Ready to Find Help?
                  </h2>
                  <p className="text-sm sm:text-lg md:text-xl opacity-90 mb-6 sm:mb-8 leading-relaxed px-2">
                    You don't have to navigate this alone. Take the first step today.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                    <Button asChild size="lg" variant="secondary" className="h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-semibold shadow-xl rounded-xl group">
                      <Link to="/concierge/intake">
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 sm:mt-8 text-xs sm:text-sm opacity-80">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>No hidden fees</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>24-48hr response</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>100% confidential</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
          
          {/* Disclaimers */}
          <section className="py-6 sm:py-10 bg-muted/40 border-t">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center text-xs sm:text-sm text-muted-foreground space-y-2 sm:space-y-3">
                <p>
                  <strong className="text-foreground/80">Important:</strong> This service provides placement assistance, not medical advice. 
                  Treatment decisions should be made with qualified healthcare professionals.
                </p>
                <p className="hidden sm:block">
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
