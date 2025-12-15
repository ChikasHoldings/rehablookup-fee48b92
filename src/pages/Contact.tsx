import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";

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

    // Simulate submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);

    toast({
      title: "Message Sent",
      description: "We'll get back to you within 1-2 business days.",
    });
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
      {/* Hero - Navy background */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
            <MessageSquare className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-primary-foreground">Get In Touch</span>
          </div>
          <h1 className="mb-3 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
            Contact Us
          </h1>
          <p className="text-base text-primary-foreground/80 max-w-xl mx-auto">
            Have questions about finding treatment? We're here to help 24/7.
          </p>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:gap-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 text-accent" />
              <span>Confidential</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>24/7 Available</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-accent" />
              <span>Expert Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-2">
            {/* Contact Info */}
            <div className="animate-fade-in">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <Mail className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Contact Information</span>
              </div>
              <h2 className="mb-5 font-display text-xl font-bold text-foreground md:text-2xl">
                Get in Touch
              </h2>
              <p className="mb-6 text-muted-foreground">
                Whether you have questions about our directory, need assistance finding 
                treatment, or want to list a facility, we're here to help.
              </p>

              <div className="space-y-5">
                <div className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-accent/30 hover:shadow-card">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20">
                    <Mail className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">Email</h3>
                    <a
                      href="mailto:help@rehablookup.com"
                      className="text-primary hover:text-primary/80 font-medium"
                    >
                      help@rehablookup.com
                    </a>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Response within 1-2 business days
                    </p>
                  </div>
                </div>

                <div className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-accent/30 hover:shadow-card">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20">
                    <Clock className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">Hours</h3>
                    <p className="text-sm text-muted-foreground">
                      Email support: <span className="text-foreground font-medium">Mon-Fri 9am-5pm EST</span>
                    </p>
                  </div>
                </div>

                <div className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-accent/30 hover:shadow-card">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20">
                    <MapPin className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">Service Area</h3>
                    <p className="text-sm text-muted-foreground">
                      Nationwide coverage across all <span className="text-foreground font-medium">50 states</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-5 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15">
                    <MessageSquare className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground">
                      Looking for Treatment Help?
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      For immediate treatment assistance,{" "}
                      <Link to="/request-help?source=contact_sidebar" className="text-primary font-medium hover:underline">
                        request help
                      </Link>
                      {" "}or visit our{" "}
                      <Link to="/rehab-centers" className="text-primary font-medium hover:underline">
                        treatment center search
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <h3 className="mb-6 font-display text-xl font-semibold text-foreground">
                Send Us a Message
              </h3>

              {isSubmitted ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                    <CheckCircle className="h-8 w-8 text-accent" />
                  </div>
                  <h4 className="mb-2 font-display text-xl font-semibold text-foreground">
                    Message Received
                  </h4>
                  <p className="text-muted-foreground mb-6">
                    Thank you for contacting us. We'll respond within 1-2 business days.
                  </p>
                  <Link to="/rehab-centers">
                    <Button variant="outline" className="gap-2">
                      Find Treatment Centers
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Your name"
                      className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="you@example.com"
                      className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Subject *
                    </label>
                    <select
                      required
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      className="h-11 w-full appearance-none rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
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
                      Message *
                    </label>
                    <textarea
                      required
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      placeholder="How can we help you?"
                      rows={4}
                      className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full gap-2 h-12"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container text-center">
          <h2 className="mb-3 font-display text-xl font-bold text-primary-foreground md:text-2xl">
            Need Immediate Assistance?
          </h2>
          <p className="mb-6 text-primary-foreground/80 max-w-xl mx-auto">
            Our specialists are available 24/7 to help you find the right treatment center.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/request-help?source=contact_cta">
              <Button variant="hero-light" size="lg" className="gap-2">
                <Heart className="h-4 w-4" />
                Request Help
              </Button>
            </Link>
            <Link to="/rehab-centers">
              <Button variant="hero-light" size="lg" className="gap-2">
                Find Treatment Centers
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
