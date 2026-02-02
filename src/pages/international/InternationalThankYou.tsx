import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { CheckCircle, Clock, Phone, Mail, Globe } from "lucide-react";

export default function InternationalThankYou() {
  return (
    <>
      <SEO
        title="Application Received | International Placement"
        description="Your international placement application has been received."
        noindex
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <Card className="max-w-lg w-full">
            <CardContent className="pt-8 pb-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Application Received
              </h1>
              
              <p className="text-muted-foreground mb-6">
                Thank you for completing your intake. Your dedicated placement advisor will reach out within 24 hours.
              </p>

              <div className="bg-muted/30 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  What Happens Next
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Our team reviews your intake and identifies suitable US facilities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>An advisor will call or email you to discuss options</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>We facilitate introductions to matched facilities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <span>Ongoing support through admission and travel coordination</span>
                  </li>
                </ul>
              </div>

              <div className="border-t pt-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Questions? Contact our international team:
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
                  <a href="mailto:international@rehablookup.com" className="flex items-center gap-2 text-primary hover:underline">
                    <Mail className="h-4 w-4" />
                    international@rehablookup.com
                  </a>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button asChild>
                  <Link to="/account/international">Track Your Case</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/">Return to Homepage</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        
        <PublicFooter />
      </div>
    </>
  );
}
