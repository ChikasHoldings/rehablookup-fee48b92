import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { LeadIntakeForm } from "@/components/lead-intake";
import { Shield, Clock, Heart, CheckCircle } from "lucide-react";

export default function RequestHelp() {
  return (
    <Layout>
      <SEO
        title="Request Help - Get Connected to Addiction Treatment"
        description="Complete our confidential assessment form to get matched with verified addiction treatment centers. Free, 24/7 support to help you or your loved one find recovery."
        canonical="/request-help"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Request Help", url: "/request-help" },
        ]}
      />
      
      {/* Minimal Hero */}
      <section className="bg-primary py-8 md:py-10">
        <div className="container text-center">
          <h1 className="font-display text-2xl font-bold text-primary-foreground md:text-3xl">
            Get Help Now
          </h1>
        </div>
      </section>

      {/* Form Section */}
      <div className="bg-background py-8 md:py-12">
        <div className="container max-w-xl mx-auto px-4">
          <LeadIntakeForm />
        </div>
      </div>

      {/* Trust & Info Section - Below Form */}
      <section className="border-t bg-secondary/30 py-10 md:py-12">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Why Choose RehabLookup?
            </h2>
            <p className="text-muted-foreground">
              We're here to help you find the right treatment center for your recovery journey.
            </p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-card border">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">100% Confidential</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your information is private and only shared with matching treatment providers.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-xl bg-card border">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Quick Response</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Get connected with verified treatment centers within hours.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-xl bg-card border">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Free Service</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Our matching service is completely free with no obligation.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-xl bg-card border">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Verified Centers</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  All treatment facilities are credential-verified for quality care.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
