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
  { href: "/provider-faq", label: "FAQ" },
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
        {/* Hero Section */}
        <section className="bg-muted/30 py-12 md:py-16">
          <div className="container px-5 md:px-6">
            <div className="text-center max-w-2xl mx-auto">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
                Provider Support
              </h1>
              <p className="text-muted-foreground">
                Get help with your listing, account, or platform questions.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-5">
              {/* Contact Form - Takes more space */}
              <div className="lg:col-span-3">
                <div className="rounded-xl border border-border bg-card p-6 md:p-8">
                  <h2 className="font-display text-xl font-semibold text-foreground mb-1">
                    Send us a message
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    We typically respond within 24 hours.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
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
                        className="resize-none"
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="gap-2">
                      {isSubmitting ? "Sending..." : "Send Message"}
                      {!isSubmitting && <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-2 space-y-6">
                {/* Contact Info */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold text-foreground mb-4">Contact Info</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Email</p>
                        <a href="mailto:providers@rehablookup.com" className="text-sm text-primary hover:underline">
                          providers@rehablookup.com
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Live Chat</p>
                        <p className="text-sm text-muted-foreground">Available in dashboard</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Hours</p>
                        <p className="text-sm text-muted-foreground">Mon-Fri, 9am-6pm EST</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick FAQ */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Quick FAQ</h3>
                    <Link to="/provider-faq" className="text-sm text-primary hover:underline">
                      View all
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {faqs.map((faq, index) => (
                      <div key={index} className="border-b border-border last:border-0 pb-3 last:pb-0">
                        <p className="text-sm font-medium text-foreground mb-1">{faq.question}</p>
                        <p className="text-sm text-muted-foreground">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Help Link */}
                <Button variant="outline" asChild className="w-full gap-2">
                  <Link to="/provider-resources">
                    <HelpCircle className="h-4 w-4" />
                    Browse Resources
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
