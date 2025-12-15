import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  MessageSquare,
  Clock,
  HelpCircle,
  Send,
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
        {/* Hero */}
        <section className="bg-primary py-12 md:py-16">
          <div className="container text-center">
            <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">
              Provider Support
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
              We're here to help you succeed on RehabLookup.
            </p>
          </div>
        </section>

        {/* Contact Options */}
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="grid gap-6 md:grid-cols-3 mb-12">
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">Email Support</h3>
                <p className="mt-1 text-sm text-muted-foreground">Mon-Fri, 9am-6pm EST</p>
                <a href="mailto:providers@rehablookup.com" className="mt-3 inline-block text-primary font-medium hover:underline">
                  providers@rehablookup.com
                </a>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">Live Chat</h3>
                <p className="mt-1 text-sm text-muted-foreground">Quick questions answered</p>
                <p className="mt-3 text-foreground font-medium">Available in dashboard</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">Hours</h3>
                <p className="mt-1 text-sm text-muted-foreground">Monday - Friday</p>
                <p className="mt-3 text-foreground font-medium">9:00 AM - 6:00 PM EST</p>
              </div>
            </div>

            {/* Contact Form & FAQ */}
            <div className="grid gap-12 lg:grid-cols-2">
              {/* Contact Form */}
              <div>
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-3">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Send a Message</span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    How can we help?
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@facility.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your issue or question..."
                      rows={5}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="gap-2">
                    {isSubmitting ? "Sending..." : "Send Message"}
                    {!isSubmitting && <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>

              {/* FAQ */}
              <div>
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 mb-3">
                    <HelpCircle className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium text-accent">Quick Answers</span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    Common Questions
                  </h2>
                </div>

                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div key={index} className="rounded-lg border border-border bg-card p-5">
                      <h3 className="font-semibold text-foreground">{faq.question}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <Link to="/provider-resources" className="text-sm text-primary hover:underline">
                    View all resources →
                  </Link>
                </div>
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
