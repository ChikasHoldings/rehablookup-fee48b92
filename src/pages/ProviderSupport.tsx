import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  MessageSquare,
  Clock,
  ArrowRight,
  ChevronRight,
  Loader2,
} from "lucide-react";


const supportTopics = [
  { value: "listing", label: "Listing & Profile" },
  { value: "leads", label: "Leads & Contacts" },
  { value: "billing", label: "Billing & Payments" },
  { value: "technical", label: "Technical Issue" },
  { value: "account", label: "Account Settings" },
  { value: "other", label: "Other" },
];

const faqs = [
  {
    question: "How do I update my facility listing?",
    answer: "Log into your dashboard and click 'Edit Listing'.",
  },
  {
    question: "How long does verification take?",
    answer: "Typically 2-3 business days.",
  },
  {
    question: "How do I respond to leads?",
    answer: "Via email or your dashboard.",
  },
];

export default function ProviderSupport() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topic) {
      toast({
        title: "Please select a topic",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-provider-support", {
        body: { name, email, topic, message },
      });

      if (error) throw error;

      toast({
        title: "Message Sent",
        description: "We'll get back to you within 24 hours.",
      });
      
      setName("");
      setEmail("");
      setTopic("");
      setMessage("");
    } catch (error) {
      console.error("Error sending support request:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Helmet><title>Provider Support | RehabLookup</title><meta name="robots" content="noindex, nofollow" /></Helmet>
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border/50 py-10 md:py-14">
          <div className="container">
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
              Support
            </h1>
            <p className="mt-2 text-muted-foreground max-w-lg">
              Questions about your listing or account? We're here to help.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-10 md:py-14">
          <div className="container">
            <div className="grid gap-10 lg:grid-cols-3">
              {/* Contact Form */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground">
                    Send a message
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 mb-6">
                    We'll get back to you within 24 hours.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-sm">Name</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm">Email</Label>
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
                    <div className="space-y-1.5">
                      <Label htmlFor="topic" className="text-sm">Topic</Label>
                      <Select value={topic} onValueChange={setTopic} required>
                        <SelectTrigger className="h-11 bg-background">
                          <SelectValue placeholder="What can we help with?" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border z-50">
                          {supportTopics.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="message" className="text-sm">Message</Label>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe your question or issue..."
                        rows={4}
                        required
                        className="resize-none"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="h-11 px-6 gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                {/* Contact Methods */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-sm font-medium text-foreground mb-4">Other ways to reach us</h3>
                  <div className="space-y-4">
                    <a 
                      href="mailto:providers@rehablookup.com" 
                      className="flex items-center gap-3 group"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          Email us
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          providers@rehablookup.com
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </a>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Live chat</p>
                        <p className="text-xs text-muted-foreground">In your dashboard</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Business hours</p>
                        <p className="text-xs text-muted-foreground">Mon-Fri, 9am-6pm EST</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick FAQ */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-foreground">Common questions</h3>
                    <Link 
                      to="/provider-faq" 
                      className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      See all
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {faqs.map((faq, index) => (
                      <div 
                        key={index} 
                        className="pb-3 border-b border-border/50 last:border-0 last:pb-0"
                      >
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {faq.question}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resources Link */}
                <Link 
                  to="/provider-resources"
                  className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-primary/30 hover:bg-muted/30 transition-colors group"
                >
                  <span className="text-sm font-medium text-foreground">
                    Browse help resources
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
    </>
  );
}
