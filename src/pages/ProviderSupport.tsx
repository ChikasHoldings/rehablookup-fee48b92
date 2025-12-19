import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { AnimatedCard } from "@/components/ui/animated-card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  MessageSquare,
  Clock,
  HelpCircle,
  Send,
  ArrowRight,
  Headphones,
  ChevronRight,
  FileText,
  Sparkles,
  Phone,
} from "lucide-react";

const providerNavLinks = [
  { href: "/for-providers", label: "Why List With Us" },
  { href: "/provider-resources", label: "Resources" },
  { href: "/provider-support", label: "Support" },
];

const faqs = [
  {
    question: "How do I update my facility listing?",
    answer: "Log into your provider dashboard and click 'Edit Listing' to update your facility information, photos, and programs.",
  },
  {
    question: "How long does verification take?",
    answer: "Verification typically takes 2-3 business days. You'll receive an email notification once complete.",
  },
  {
    question: "How do I respond to inquiries?",
    answer: "Inquiries are sent to your registered email. You can also view and manage them in your dashboard.",
  },
  {
    question: "Can I upgrade my listing?",
    answer: "Yes, contact our team to learn about featured placement and premium listing options.",
  },
];

export default function ProviderSupport() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      toast({
        title: "Message Sent",
        description: "Our team will respond within 24 hours.",
      });
      setName("");
      setEmail("");
      setMessage("");
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        navLinks={providerNavLinks}
        ctaLink="/provider-login"
        ctaLabel="Provider Login"
        variant="provider"
      />

      <main className="flex-1">
        {/* Hero Section - Centered, streamlined */}
        <section className="relative overflow-hidden bg-gradient-to-b from-muted/40 to-background py-12 md:py-16">
          {/* Subtle decorative elements */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

          <div className="container relative z-10 px-5 md:px-6">
            <div className="text-center max-w-3xl mx-auto">
              <div className="mb-4 md:mb-4 inline-flex items-center gap-2.5 md:gap-2 rounded-full bg-accent/10 px-5 md:px-4 py-2.5 md:py-1.5">
                <Headphones className="h-5 w-5 md:h-4 md:w-4 text-accent" />
                <span className="text-base md:text-sm font-medium text-accent">Provider Support</span>
              </div>
              <h1 className="mb-4 md:mb-3 font-display text-3xl md:text-3xl lg:text-4xl font-bold text-foreground">
                We're Here to Help
              </h1>
              <p className="text-lg md:text-base text-muted-foreground max-w-2xl mx-auto mb-8">
                Get dedicated support from our team of experts. Whether you need help with your listing or have questions about our platform, we're just a message away.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 md:gap-3 sm:flex-row">
                <a href="#contact-form" className="w-full sm:w-auto">
                  <Button size="lg" className="gap-2 w-full sm:w-auto h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                    Contact Support
                    <ArrowRight className="h-5 w-5 md:h-4 md:w-4" />
                  </Button>
                </a>
                <Link to="/provider-resources" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                    View Resources
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Options */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 mb-4">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Get in Touch</span>
              </div>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Multiple Ways to Reach Us
              </h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                Choose the contact method that works best for you
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-16">
              <AnimatedCard delay={0}>
                <div className="group relative h-full rounded-2xl border border-border bg-gradient-to-br from-blue-50/50 to-card p-8 text-center transition-all hover:border-primary/30 hover:shadow-lg dark:from-blue-950/20">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 transition-transform group-hover:scale-110">
                    <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground">Email Support</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Mon-Fri, 9am-6pm EST</p>
                  <a 
                    href="mailto:providers@rehablookup.com" 
                    className="mt-4 inline-flex items-center gap-1 text-primary font-medium hover:underline"
                  >
                    providers@rehablookup.com
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </AnimatedCard>

              <AnimatedCard delay={100}>
                <div className="group relative h-full rounded-2xl border border-border bg-gradient-to-br from-green-50/50 to-card p-8 text-center transition-all hover:border-primary/30 hover:shadow-lg dark:from-green-950/20">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 transition-transform group-hover:scale-110">
                    <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground">Live Chat</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Quick questions answered</p>
                  <p className="mt-4 inline-flex items-center gap-1 text-foreground font-medium">
                    Available in dashboard
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </p>
                </div>
              </AnimatedCard>

              <AnimatedCard delay={200}>
                <div className="group relative h-full rounded-2xl border border-border bg-gradient-to-br from-purple-50/50 to-card p-8 text-center transition-all hover:border-primary/30 hover:shadow-lg dark:from-purple-950/20">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 transition-transform group-hover:scale-110">
                    <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground">Business Hours</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Monday - Friday</p>
                  <p className="mt-4 inline-flex items-center gap-1 text-foreground font-medium">
                    9:00 AM - 6:00 PM EST
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </p>
                </div>
              </AnimatedCard>
            </div>

            {/* Contact Form & FAQ */}
            <div id="contact-form" className="grid gap-12 lg:grid-cols-2">
              {/* Contact Form */}
              <AnimatedCard delay={0}>
                <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                  <div className="mb-8">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-4">
                      <Send className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Send a Message</span>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-foreground">
                      How Can We Help?
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                      Fill out the form below and we'll get back to you within 24 hours.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-foreground">Name</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-foreground">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@facility.com"
                          required
                          className="h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-foreground">Message</Label>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe your issue or question..."
                        rows={5}
                        required
                        className="resize-none"
                      />
                    </div>
                    <Button type="submit" size="lg" disabled={isSubmitting} className="w-full gap-2">
                      {isSubmitting ? "Sending..." : "Send Message"}
                      {!isSubmitting && <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </AnimatedCard>

              {/* FAQ */}
              <AnimatedCard delay={100}>
                <div>
                  <div className="mb-8">
                    <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 mb-4">
                      <HelpCircle className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium text-accent">Quick Answers</span>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-foreground">
                      Common Questions
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                      Find quick answers to frequently asked questions.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {faqs.map((faq, index) => (
                      <div 
                        key={index} 
                        className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/20 hover:shadow-sm"
                      >
                        <h3 className="font-semibold text-foreground flex items-start gap-3">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {index + 1}
                          </span>
                          {faq.question}
                        </h3>
                        <p className="mt-3 pl-9 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <Button variant="outline" asChild className="gap-2">
                      <Link to="/provider-resources">
                        <FileText className="h-4 w-4" />
                        View All Resources
                      </Link>
                    </Button>
                    <Button variant="ghost" asChild className="gap-2">
                      <Link to="/faq">
                        <HelpCircle className="h-4 w-4" />
                        Full FAQ
                      </Link>
                    </Button>
                  </div>
                </div>
              </AnimatedCard>
            </div>
          </div>
        </section>

        {/* CTA Section - Light styling to match resources page */}
        <section className="relative overflow-hidden bg-gradient-to-br from-accent/5 via-accent/10 to-muted/50 py-16 md:py-20">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-40 top-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
          </div>

          <div className="container relative">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Need Immediate Help?</span>
              </div>
              
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Ready to Get Started?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Our team is standing by to help you make the most of your RehabLookup listing. Reach out today and let's grow together.
              </p>
              
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Button size="lg" className="gap-2" asChild>
                  <a href="#contact-form">
                    Send a Message
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/provider-login">
                    Access Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
      <BackToTop />
    </div>
  );
}
