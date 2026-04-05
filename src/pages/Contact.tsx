import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail,
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
  ChevronRight,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

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
        title="Contact RehabLookup - 24/7 Treatment Help"
        description="Contact our specialists for help finding addiction treatment. Get confidential assistance locating the right rehab center for you or a loved one."
        canonical="/contact"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "name": "Contact RehabLookup",
          "description": "Contact our specialists for help finding addiction treatment.",
          "url": "https://rehablookup.com/contact",
          "mainEntity": {
            "@type": "Organization",
            "name": "RehabLookup",
            "url": "https://rehablookup.com",
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer service",
              "availableLanguage": "English",
            },
          },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Contact", url: "/contact" },
        ]}
      />
      
      {/* Hero - Navy background with decorative elements */}
      <section className="bg-primary py-10 px-4 md:py-12 lg:py-14 md:px-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>
        
        <div className="container relative">
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Contact" },
            ]}
          /><div className="text-center">
            <div className="mb-4 md:mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 md:px-5 py-2 md:py-2.5 backdrop-blur-sm border border-white/10">
              <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-accent" />
              <span className="text-sm md:text-base font-medium text-primary-foreground">Get In Touch</span>
            </div>
            <h1 className="mb-3 md:mb-4 font-display text-2xl md:text-3xl lg:text-4xl font-bold text-primary-foreground">
              Contact Us for Addiction Treatment Help
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/80 max-w-xl md:max-w-2xl mx-auto leading-relaxed">
              Have questions about finding treatment? We're here to help.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-5 md:py-6 px-4 md:px-6">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-base md:gap-10 lg:gap-12 md:text-sm lg:text-base">
            <div className="flex items-center gap-2.5 md:gap-3 text-muted-foreground">
              <Shield className="h-5 w-5 md:h-6 md:w-6 text-accent" />
              <span>Confidential</span>
            </div>
            <div className="flex items-center gap-2.5 md:gap-3 text-muted-foreground">
              <Headphones className="h-5 w-5 md:h-6 md:w-6 text-accent" />
              <span>24/7 Available</span>
            </div>
            <div className="flex items-center gap-2.5 md:gap-3 text-muted-foreground">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-accent" />
              <span>Expert Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Methods Cards */}
      <section className="py-6 md:py-8 lg:py-10 bg-gradient-to-b from-background to-muted/30">
        <div className="container">
          <div className="grid gap-4 md:gap-5 md:grid-cols-3 max-w-4xl lg:max-w-5xl mx-auto">
            {contactMethods.map((method, index) => (
              <div
                key={method.title}
                className="group relative animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {method.href ? (
                  <a 
                    href={method.href}
                    className="block h-full rounded-xl md:rounded-2xl bg-card border border-border/50 p-4 md:p-5 hover:border-accent/30 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-3">
                      <div className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg md:rounded-xl bg-gradient-to-br ${method.gradient} shadow-sm`}>
                        <method.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                      </div>
                      <h3 className="text-sm md:text-base font-medium text-muted-foreground">{method.title}</h3>
                    </div>
                    <p className="font-display text-base md:text-lg font-bold text-foreground mb-0.5 md:mb-1">{method.value}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{method.description}</p>
                  </a>
                ) : (
                  <div className="h-full rounded-xl md:rounded-2xl bg-card border border-border/50 p-4 md:p-5">
                    <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-3">
                      <div className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg md:rounded-xl bg-gradient-to-br ${method.gradient} shadow-sm`}>
                        <method.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                      </div>
                      <h3 className="text-sm md:text-base font-medium text-muted-foreground">{method.title}</h3>
                    </div>
                    <p className="font-display text-base md:text-lg font-bold text-foreground mb-0.5 md:mb-1">{method.value}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{method.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="section-padding">
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
                          <option value="general">General Question</option>
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

            {/* Info Cards */}
            <div className="order-1 lg:order-2 space-y-6 animate-fade-in">
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
                      <Link to="/concierge">
                        <Button size="sm" className="gap-2 h-10">
                          <Heart className="h-4 w-4" />
                          Concierge Service
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

    </Layout>
  );
};

export default Contact;
