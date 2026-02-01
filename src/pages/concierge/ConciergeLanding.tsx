import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import conciergeHeroImage from "@/assets/concierge-hero.jpg";
import { 
  CheckCircle,
  Shield,
  Clock,
  HeartHandshake,
  ArrowRight,
  Star,
  Users,
  Phone,
  MessageCircle,
  Sparkles,
  BadgeCheck,
  Building2,
  Heart,
  Zap,
  Lock,
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
          {/* Hero Section - Split Layout with Image */}
          <section className="relative overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
              <img 
                src={conciergeHeroImage} 
                alt="Path to recovery" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/70 lg:to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50 lg:hidden" />
            </div>
            
            <div className="container relative mx-auto px-4 py-12 md:py-20 lg:py-28">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Content */}
                <div className="max-w-xl">
                  {/* Trust badge */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-6"
                  >
                    <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20 backdrop-blur-sm">
                      <HeartHandshake className="h-4 w-4 mr-2" />
                      Trusted by 500+ Families
                    </Badge>
                  </motion.div>
                  
                  {/* Main headline */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight leading-[1.1]">
                      Your Path to
                      <span className="block text-primary">Recovery Starts Here</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                      Stop searching alone. Our specialists personally match you with treatment programs 
                      that fit your needs, insurance, and location.
                    </p>
                  </motion.div>
                  
                  {/* Key benefits */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="grid grid-cols-2 gap-4 mb-8"
                  >
                    {[
                      { icon: Clock, text: "24-48hr Match" },
                      { icon: Shield, text: "100% Confidential" },
                      { icon: Building2, text: "100+ Facilities" },
                      { icon: BadgeCheck, text: "Verified Programs" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{item.text}</span>
                      </div>
                    ))}
                  </motion.div>
                  
                  {/* CTA */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:flex-row gap-4"
                  >
                    <Button asChild size="lg" className="h-14 px-8 text-base font-semibold shadow-xl shadow-primary/25 group">
                      <Link to="/concierge/intake">
                        Get Matched for $29
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" />
                      <span>One-time fee • No hidden costs</span>
                    </div>
                  </motion.div>
                </div>
                
                {/* Right Content - Floating Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="hidden lg:block"
                >
                  <Card className="border-0 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/10 ml-auto max-w-md">
                    <CardContent className="p-8">
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">Rated 4.9/5 by families we've helped</p>
                      </div>
                      
                      <div className="space-y-4 mb-6">
                        <h3 className="font-semibold text-lg text-foreground text-center">
                          What's Included
                        </h3>
                        {[
                          "Personalized facility matching",
                          "Insurance verification assistance",
                          "Direct introductions to admissions",
                          "Ongoing support until placement"
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            </div>
                            <span className="text-foreground">{item}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-6 border-t">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-muted-foreground">One-time fee</span>
                          <span className="text-3xl font-bold text-foreground">$29</span>
                        </div>
                        <Button asChild size="lg" className="w-full h-12 text-base font-semibold group">
                          <Link to="/concierge/intake">
                            Start Your Intake
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
              
              {/* Mobile CTA Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="lg:hidden mt-10"
              >
                <Card className="border-2 border-primary/20 bg-card/95 backdrop-blur-sm shadow-xl">
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-4xl font-bold text-foreground">$29</span>
                      <div className="text-left">
                        <span className="text-sm text-muted-foreground block">one-time</span>
                        <span className="text-xs text-primary font-medium">No hidden fees</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-6 text-left">
                      {[
                        "Personalized facility matching",
                        "Insurance verification help", 
                        "Direct introductions to programs",
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="text-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button asChild size="lg" className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 group">
                      <Link to="/concierge/intake">
                        Get Matched Now
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>
          
          {/* Social Proof Stats Bar */}
          <section className="py-8 bg-muted/50 border-y">
            <div className="container mx-auto px-4">
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
          
          {/* How It Works - Simplified */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <Badge variant="outline" className="mb-4">
                  <Zap className="h-3 w-3 mr-1" />
                  Simple Process
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  How It Works
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Three simple steps to find treatment that fits your needs
                </p>
              </div>
              
              <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                  {steps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <Card className="relative h-full bg-card border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
                        {/* Step number */}
                        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{index + 1}</span>
                        </div>
                        
                        <CardContent className="pt-8 pb-6 px-6">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                            <step.icon className="h-7 w-7 text-primary" />
                          </div>
                          
                          <h3 className="font-semibold text-lg text-foreground mb-2">{step.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.description}</p>
                          
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
                <div className="text-center mt-10">
                  <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25">
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
          
          {/* Benefits Grid */}
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                  <Badge variant="outline" className="mb-4">
                    <Heart className="h-3 w-3 mr-1" />
                    Why Choose Us
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    More Than Just Matching
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                    We're committed to helping you find the right path to recovery
                  </p>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-5">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <Card className="h-full border bg-card hover:border-primary/30 transition-colors">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                              <benefit.icon className="h-6 w-6 text-primary" />
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
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          
          {/* Testimonials */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <Badge variant="outline" className="mb-4">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Real Stories
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Families We've Helped
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Join hundreds of families who found the right treatment with our help
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {TESTIMONIALS.map((testimonial, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="h-full bg-card border shadow-sm">
                      <CardContent className="p-6">
                        {/* Stars */}
                        <div className="flex gap-1 mb-4">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          ))}
                        </div>
                        
                        <blockquote className="text-foreground mb-4 leading-relaxed">
                          "{testimonial.quote}"
                        </blockquote>
                        
                        <div className="flex items-center gap-3 pt-4 border-t">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {testimonial.author.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm text-foreground">{testimonial.author}</p>
                            <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
          
          {/* FAQ Section */}
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                  <Badge variant="outline" className="mb-4">
                    <MessageCircle className="h-3 w-3 mr-1" />
                    FAQ
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Common Questions
                  </h2>
                </div>
                
                <div className="space-y-4">
                  {FAQ_ITEMS.map((item, index) => (
                    <Card key={index} className="border bg-card">
                      <CardContent className="p-6">
                        <h3 className="font-semibold text-foreground mb-2">{item.question}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">{item.answer}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>
          
          {/* Final CTA Section */}
          <section className="py-20 md:py-28 relative overflow-hidden">
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
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                    Ready to Find Help?
                  </h2>
                  <p className="text-lg md:text-xl opacity-90 mb-8 leading-relaxed">
                    You don't have to navigate this alone. Take the first step today and 
                    let us help you find treatment that works.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" variant="secondary" className="h-14 px-10 text-lg font-semibold shadow-xl group">
                      <Link to="/concierge/intake">
                        Get Started for $29
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm opacity-80">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>No hidden fees</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>24-48hr response</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>100% confidential</span>
                    </div>
                  </div>
                </motion.div>
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
