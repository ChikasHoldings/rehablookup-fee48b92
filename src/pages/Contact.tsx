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
      <section className="bg-primary py-12 px-4 md:py-16 md:px-6">
        <div className="container text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 md:px-4 md:py-1.5 md:mb-4">
            <MessageSquare className="h-5 w-5 text-accent md:h-4 md:w-4" />
            <span className="text-base font-medium text-primary-foreground md:text-sm">Get In Touch</span>
          </div>
          <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl md:mb-3">
            Contact Us
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto leading-relaxed md:text-base">
            Have questions about finding treatment? We're here to help 24/7.
          </p>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-5 px-4 md:py-4 md:px-6">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-5 text-base md:gap-10 md:text-sm">
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Shield className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>Confidential</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Clock className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>24/7 Available</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Users className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>Expert Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-10 px-4 md:py-16 md:px-6">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
            {/* Contact Info */}
            <div className="animate-fade-in">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent/10 px-5 py-2 md:px-4 md:py-1.5 md:mb-4">
                <Mail className="h-5 w-5 text-accent md:h-4 md:w-4" />
                <span className="text-base font-medium text-accent md:text-sm">Contact Information</span>
              </div>
              <h2 className="mb-5 font-display text-2xl font-bold text-foreground md:text-2xl">
                Get in Touch
              </h2>
              <p className="mb-6 text-base text-muted-foreground leading-relaxed md:text-base">
                Whether you have questions about our directory, need assistance finding 
                treatment, or want to list a facility, we're here to help.
              </p>

              <div className="space-y-4 md:space-y-5">
                <a 
                  href="mailto:help@rehablookup.com"
                  className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-accent/30 hover:shadow-card active:scale-[0.98] md:rounded-xl md:p-4"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 transition-colors group-hover:bg-accent/20 md:h-12 md:w-12 md:rounded-xl">
                    <Mail className="h-6 w-6 text-accent md:h-5 md:w-5" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-semibold text-foreground md:text-base">Email</h3>
                    <p className="text-base text-primary font-medium md:text-sm">
                      help@rehablookup.com
                    </p>
                    <p className="mt-1.5 text-sm text-muted-foreground md:mt-1 md:text-xs">
                      Response within 1-2 business days
                    </p>
                  </div>
                </a>

                <div className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-accent/30 hover:shadow-card md:rounded-xl md:p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 transition-colors group-hover:bg-accent/20 md:h-12 md:w-12 md:rounded-xl">
                    <Clock className="h-6 w-6 text-accent md:h-5 md:w-5" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-semibold text-foreground md:text-base">Hours</h3>
                    <p className="text-base text-muted-foreground md:text-sm">
                      Email support: <span className="text-foreground font-medium">Mon-Fri 9am-5pm EST</span>
                    </p>
                  </div>
                </div>

                <div className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-accent/30 hover:shadow-card md:rounded-xl md:p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 transition-colors group-hover:bg-accent/20 md:h-12 md:w-12 md:rounded-xl">
                    <MapPin className="h-6 w-6 text-accent md:h-5 md:w-5" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-semibold text-foreground md:text-base">Service Area</h3>
                    <p className="text-base text-muted-foreground md:text-sm">
                      Nationwide coverage across all <span className="text-foreground font-medium">50 states</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-5 animate-fade-in md:rounded-xl" style={{ animationDelay: "0.2s" }}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/15 md:h-10 md:w-10">
                    <MessageSquare className="h-6 w-6 text-accent md:h-5 md:w-5" />
                  </div>
                  <div>
                    <h4 className="mb-2 text-lg font-semibold text-foreground md:text-base md:mb-1">
                      Looking for Treatment Help?
                    </h4>
                    <p className="text-base text-muted-foreground leading-relaxed md:text-sm">
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
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 md:h-16 md:w-16 md:mb-4">
                    <CheckCircle className="h-10 w-10 text-accent md:h-8 md:w-8" />
                  </div>
                  <h4 className="mb-3 font-display text-2xl font-semibold text-foreground md:text-xl md:mb-2">
                    Message Received
                  </h4>
                  <p className="text-base text-muted-foreground mb-8 md:text-base md:mb-6">
                    Thank you for contacting us. We'll respond within 1-2 business days.
                  </p>
                  <Link to="/rehab-centers" className="block md:inline-block">
                    <Button variant="outline" className="w-full h-14 gap-2 text-base font-semibold md:w-auto md:h-auto">
                      Find Treatment Centers
                      <ArrowRight className="h-5 w-5 md:h-4 md:w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="mb-2.5 block text-base font-medium text-foreground md:text-sm md:mb-2">
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
                      className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors md:h-11 md:text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2.5 block text-base font-medium text-foreground md:text-sm md:mb-2">
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
                      className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors md:h-11 md:text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2.5 block text-base font-medium text-foreground md:text-sm md:mb-2">
                      Subject *
                    </label>
                    <select
                      required
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      className="h-14 w-full appearance-none rounded-xl border border-input bg-background px-4 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors md:h-11 md:text-sm"
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
                    <label className="mb-2.5 block text-base font-medium text-foreground md:text-sm md:mb-2">
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
                      className="w-full resize-none rounded-xl border border-input bg-background px-4 py-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors md:py-3 md:text-sm"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full gap-2 h-14 text-base font-semibold md:h-12"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent md:h-4 md:w-4" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 md:h-4 md:w-4" />
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
      <section className="bg-primary py-12 px-4 md:py-16 md:px-6">
        <div className="container text-center">
          <h2 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-2xl md:mb-3">
            Need Immediate Assistance?
          </h2>
          <p className="mb-8 text-lg text-primary-foreground/80 max-w-xl mx-auto leading-relaxed md:text-base md:mb-6">
            Our specialists are available 24/7 to help you find the right treatment center.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-3">
            <Link to="/request-help?source=contact_cta" className="w-full sm:w-auto">
              <Button variant="hero-light" size="lg" className="w-full h-14 gap-2 text-base font-semibold sm:w-auto sm:h-auto">
                <Heart className="h-5 w-5 md:h-4 md:w-4" />
                Request Help
              </Button>
            </Link>
            <Link to="/rehab-centers" className="w-full sm:w-auto">
              <Button variant="hero-light" size="lg" className="w-full h-14 gap-2 text-base font-semibold sm:w-auto sm:h-auto">
                Find Treatment Centers
                <ArrowRight className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;