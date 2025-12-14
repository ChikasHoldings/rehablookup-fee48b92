import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function Footer() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call - replace with actual backend integration
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Subscribed!",
      description: "Thank you for subscribing to our newsletter.",
    });
    
    setEmail("");
    setIsSubmitting(false);
  };

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      {/* Newsletter Section */}
      <div className="border-b border-primary-foreground/10">
        <div className="container py-10">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="mb-2 font-display text-xl font-semibold text-primary-foreground">
              Stay Informed
            </h3>
            <p className="mb-6 text-sm text-primary-foreground/70">
              Get the latest resources, guides, and updates on addiction recovery delivered to your inbox.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-3 sm:flex-row sm:gap-2">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 flex-1 border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-accent"
                required
              />
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="h-11 gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isSubmitting ? "Subscribing..." : "Subscribe"}
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="mt-3 text-xs text-primary-foreground/50">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </div>

      <div className="container py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Social */}
          <div className="space-y-5 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/15">
                <Heart className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold text-primary-foreground">
                RehabLookup
              </span>
            </Link>
            
            {/* Social Media Links */}
            <div className="flex items-center gap-3">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
                aria-label="Follow us on Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
                aria-label="Follow us on LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Treatment */}
          <div>
            <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-primary-foreground">
              Treatment
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/rehab-centers" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Find Treatment Centers
                </Link>
              </li>
              <li>
                <Link to="/treatment-types" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Treatment Types
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/for-providers" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  For Providers
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-primary-foreground">
              Resources
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/resources" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Resources & Guides
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-primary-foreground">
              Legal
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/privacy-policy" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Bar */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 rounded-xl bg-primary-foreground/5 p-4 md:justify-between">
          <div className="flex items-center gap-2.5 text-sm text-primary-foreground/80">
            <Phone className="h-4 w-4 text-accent" />
            <a href="tel:1-800-555-0199" className="transition-colors hover:text-primary-foreground font-medium">
              1-800-555-0199
            </a>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-primary-foreground/80">
            <Mail className="h-4 w-4 text-accent" />
            <a href="mailto:help@rehablookup.com" className="transition-colors hover:text-primary-foreground">
              help@rehablookup.com
            </a>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-primary-foreground/80">
            <MapPin className="h-4 w-4 text-accent" />
            <span>Available 24/7 Nationwide</span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-primary-foreground/15 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
            <p className="text-sm text-primary-foreground/70">
              © {new Date().getFullYear()} RehabLookup.com. All rights reserved.
            </p>
            <p className="text-xs text-primary-foreground/50">
              RehabLookup is a directory service. We are not a treatment provider.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
