import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  MessageSquare,
  Shield,
  ArrowRight,
  Users,
  Heart,
  Globe,
  Headphones,
  Building2,
} from "lucide-react";

const contactMethods = [
  {
    icon: Mail,
    title: "Email Support",
    value: "help@rehablookup.com",
    description: "Response within 1-2 business days",
    href: "mailto:help@rehablookup.com",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Clock,
    title: "Business Hours",
    value: "Mon-Fri 9am-5pm EST",
    description: "Email support during business hours",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: Globe,
    title: "Service Coverage",
    value: "All 50 States",
    description: "Nationwide treatment directory",
    gradient: "from-emerald-500 to-teal-500",
  },
];

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-contact-form", {
        body: formData,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "Message Sent",
        description: "We'll get back to you within 1-2 business days.",
      });
    } catch (error) {
      console.error("Contact form error:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Contact Us - Get Help Finding Treatment"
        description="Contact RehabLookup for assistance finding addiction treatment. Our specialists are available 24/7 to help you or your loved one find the right rehab center."
        canonical="/contact"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Contact", url: "/contact" },
        ]}
      />
      
      {/* Hero - Navy background with decorative elements */}
      <section className="bg-primary py-16 px-4 md:py-20 md:px-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>
        
        <div className="container text-center relative">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 backdrop-blur-sm border border-white/10">
            <MessageSquare className="h-5 w-5 text-accent" />
            <span className="text-base font-medium text-primary-foreground">Get In Touch</span>
          </div>
          <h1 className="mb-5 font-display text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
            Contact Us
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto leading-relaxed md:text-xl">
            Have questions about finding treatment? We're here to help.
          </p>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-5 px-4 md:py-4 md:px-6">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-base md:gap-12 md:text-sm">
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Shield className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>Confidential</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Headphones className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>24/7 Available</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Users className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>Expert Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Methods Cards */}
      <section className="py-12 px-4 md:py-16 md:px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="container">
          <div className="grid gap-5 md:grid-cols-3 max-w-4xl mx-auto">
            {contactMethods.map((method, index) => (
              <div
                key={method.title}
                className="group relative animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {method.href ? (
                  <a 
                    href={method.href}
                    className="block h-full rounded-2xl bg-gradient-to-br from-accent/5 to-accent/10 p-1 hover:scale-[1.02] transition-transform duration-300"
                  >
                    <div className="h-full rounded-[14px] bg-card p-6 border border-border/50 text-center">
                      <div className={`mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${method.gradient} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                        <method.icon className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">{method.title}</h3>
                      <p className="font-display text-lg font-bold text-foreground mb-1">{method.value}</p>
                      <p className="text-xs text-muted-foreground">{method.description}</p>
                    </div>
                  </a>
                ) : (
                  <div className="h-full rounded-2xl bg-gradient-to-br from-accent/5 to-accent/10 p-1">
                    <div className="h-full rounded-[14px] bg-card p-6 border border-border/50 text-center">
                      <div className={`mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${method.gradient} shadow-lg`}>
                        <method.icon className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">{method.title}</h3>
                      <p className="font-display text-lg font-bold text-foreground mb-1">{method.value}</p>
                      <p className="text-xs text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="py-12 px-4 md:py-20 md:px-6">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 max-w-6xl mx-auto">
            {/* Contact Form */}
            <div className="order-2 lg:order-1 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="rounded-3xl border border-border bg-card p-8 md:p-10 shadow-elevated relative overflow-hidden">
                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/10 to-transparent rounded-bl-full" />
                
                <div className="relative">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/80 shadow-lg">
                      <Send className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold text-foreground">
                        Send Us a Message
                      </h3>
                      <p className="text-sm text-muted-foreground">We'll respond within 1-2 business days</p>
                    </div>
                  </div>

                  {isSubmitted ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                        <CheckCircle className="h-10 w-10 text-emerald-500" />
                      </div>
                      <h4 className="mb-3 font-display text-2xl font-bold text-foreground">
                        Message Received!
                      </h4>
                      <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                        Thank you for contacting us. We'll respond within 1-2 business days.
                      </p>
                      <Link to="/rehab-centers">
                        <Button variant="outline" className="gap-2 h-12 px-6">
                          Find Treatment Centers
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-foreground">
                            Full Name <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            placeholder="Your name"
                            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-foreground">
                            Email Address <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({ ...formData, email: e.target.value })
                            }
                            placeholder="you@example.com"
                            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Subject <span className="text-destructive">*</span>
                        </label>
                        <select
                          required
                          value={formData.subject}
                          onChange={(e) =>
                            setFormData({ ...formData, subject: e.target.value })
                          }
                          className="h-12 w-full appearance-none rounded-xl border border-input bg-background px-4 text-base text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                        >
                          <option value="">Select a subject</option>
                          <option value="general">General Inquiry</option>
                          <option value="listing">Facility Listing</option>
                          <option value="feedback">Feedback</option>
                          <option value="technical">Technical Issue</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Message <span className="text-destructive">*</span>
                        </label>
                        <textarea
                          required
                          value={formData.message}
                          onChange={(e) =>
                            setFormData({ ...formData, message: e.target.value })
                          }
                          placeholder="How can we help you?"
                          rows={5}
                          className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                        />
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full gap-2 h-14 text-base font-semibold bg-gradient-to-r from-accent to-accent/90 hover:from-accent/95 hover:to-accent/85 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Map and Info */}
            <div className="order-1 lg:order-2 space-y-6 animate-fade-in">
              {/* US Map Section */}
              <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-elevated">
                <div className="relative h-72 md:h-80 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 flex items-center justify-center p-8">
                  {/* US Map SVG */}
                  <div className="relative w-full max-w-md">
                    <svg
                      viewBox="0 0 959 593"
                      className="w-full h-auto opacity-90"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Simplified US Map outline */}
                      <path
                        d="M158 494l2-10 6-2 4 1 3 4 8 2 6-2 6 1 3 3 3-1 4-5 5-2 10 2 6-1 3-4 6-2 9 1 4 4 5-1 3-5 6-2 10 3 4-2 4-8 7-4 8 1 5 5 3-1 4-7 8-3 10 2 3 4 5-2 5-7 6-2 7 3 4 5 2-2 6-9 5-3 11 1 5 4 2 7-1 5-6 5-3 8v6l-2 9 3 7 5-1 7-8 3 1 1 7-3 8-1 10 3 5 6-2 3-6 5-3 8 2 4 6 3 9-1 6-4 5-9 3-4 4-1 8 3 6 7 2 4 5v8l-4 7-8 6-3 8 2 9 5 4 4-1 6-6 4 1v6l-5 8-1 6 3 4 10 2 5 5 1 8-3 8-7 5-4 7 1 7 5 4 8-2 5-6 5-1 3 4-2 9-6 8-2 8 2 6 7 3 6-1 4-5 5-1 4 3 2 7-3 7-7 5-4 8v8l4 6 8 2 5 5 1 9-4 8-9 6-4 8v9l4 7 9 3 5 5 1 10-5 8-9 5-5 9v10l4 8 10 4 6 6 2 10-4 9-10 6-6 9-1 11 4 9 11 5 7 8-158 1v-60l-5-6-3-8 2-6 5-3 1-4-3-5-1-7 4-5 1-5-4-4v-6l5-5 3-7-1-5-4-3-1-8 2-5 6-4 2-7-2-6-5-3-2-6 1-7 5-5 3-8-1-7-5-4-3-7 1-6 5-4 2-7-1-6-5-4-2-7 1-7 6-5 3-8-1-7-6-5-3-7 1-7 5-5 3-8v-7l-5-6-4-8 1-7 5-5 2-7-1-7-6-5-3-8z"
                        className="fill-primary/20 stroke-primary/40"
                        strokeWidth="2"
                      />
                      {/* Location dots representing coverage */}
                      <circle cx="180" cy="450" r="6" className="fill-accent animate-pulse" />
                      <circle cx="280" cy="380" r="6" className="fill-accent animate-pulse" style={{ animationDelay: "0.2s" }} />
                      <circle cx="420" cy="320" r="6" className="fill-accent animate-pulse" style={{ animationDelay: "0.4s" }} />
                      <circle cx="550" cy="280" r="6" className="fill-accent animate-pulse" style={{ animationDelay: "0.6s" }} />
                      <circle cx="680" cy="240" r="6" className="fill-accent animate-pulse" style={{ animationDelay: "0.8s" }} />
                      <circle cx="780" cy="200" r="6" className="fill-accent animate-pulse" style={{ animationDelay: "1s" }} />
                      <circle cx="850" cy="280" r="6" className="fill-accent animate-pulse" style={{ animationDelay: "1.2s" }} />
                      <circle cx="620" cy="420" r="6" className="fill-accent animate-pulse" style={{ animationDelay: "1.4s" }} />
                      <circle cx="480" cy="480" r="6" className="fill-accent animate-pulse" style={{ animationDelay: "1.6s" }} />
                      <circle cx="350" cy="520" r="6" className="fill-accent animate-pulse" style={{ animationDelay: "1.8s" }} />
                    </svg>
                    
                    {/* Overlay badge */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="bg-card/95 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-xl border border-accent/20 text-center">
                        <div className="text-3xl font-display font-bold text-accent">50</div>
                        <div className="text-sm font-medium text-muted-foreground">States Covered</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-card/50 via-transparent to-transparent pointer-events-none" />
                </div>
                
                <div className="p-6 bg-gradient-to-r from-primary/5 to-accent/5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                      <Globe className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-xl font-bold text-foreground mb-1">
                        Nationwide Coverage
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Our comprehensive directory connects families with treatment centers across all 50 states, ensuring help is always within reach.
                      </p>
                    </div>
                  </div>
                  
                  {/* Stats row */}
                  <div className="mt-5 pt-5 border-t border-border/50 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-display font-bold text-foreground">500+</div>
                      <div className="text-xs text-muted-foreground">Treatment Centers</div>
                    </div>
                    <div>
                      <div className="text-2xl font-display font-bold text-foreground">24/7</div>
                      <div className="text-xs text-muted-foreground">Directory Access</div>
                    </div>
                    <div>
                      <div className="text-2xl font-display font-bold text-accent">Free</div>
                      <div className="text-xs text-muted-foreground">To Search</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Help Card */}
              <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 to-accent/10 p-6 relative overflow-hidden">
                {/* Decorative element */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
                
                <div className="relative flex flex-col gap-4 md:flex-row md:items-start">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent/80 shadow-lg">
                    <Heart className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h4 className="mb-2 font-display text-lg font-bold text-foreground">
                      Looking for Treatment Help?
                    </h4>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      For immediate treatment assistance, our specialists are ready to help you find the right care.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link to="/request-help?source=contact_sidebar">
                        <Button size="sm" className="gap-2 h-10">
                          <Heart className="h-4 w-4" />
                          Request Help
                        </Button>
                      </Link>
                      <Link to="/rehab-centers">
                        <Button variant="outline" size="sm" className="gap-2 h-10">
                          Search Centers
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Teaser */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <MessageSquare className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-display text-base font-semibold text-foreground mb-1">
                      Have Common Questions?
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Check our FAQ page for quick answers to frequently asked questions.
                    </p>
                    <Link to="/faq" className="text-sm font-medium text-accent hover:underline inline-flex items-center gap-1">
                      Visit FAQ Page
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary py-16 px-4 md:py-20 md:px-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        </div>
        
        <div className="container text-center relative">
          <div className="mb-6 inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-accent/80 shadow-xl mx-auto">
            <Headphones className="h-8 w-8 text-white" />
          </div>
          <h2 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
            Need Immediate Assistance?
          </h2>
          <p className="mb-8 text-lg text-primary-foreground/80 max-w-xl mx-auto leading-relaxed">
            Our specialists are available 24/7 to help you find the right treatment center.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-4">
            <Link to="/request-help?source=contact_cta" className="w-full sm:w-auto">
              <Button variant="hero-light" size="lg" className="w-full h-14 gap-2 text-base font-semibold sm:w-auto sm:px-8 hover:scale-105 hover:shadow-xl transition-all duration-200">
                <Heart className="h-5 w-5" />
                Request Help
              </Button>
            </Link>
            <Link to="/rehab-centers" className="w-full sm:w-auto">
              <Button variant="hero-light" size="lg" className="w-full h-14 gap-2 text-base font-semibold sm:w-auto sm:px-8 hover:scale-105 transition-all duration-200">
                Find Treatment Centers
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
