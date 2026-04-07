import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { AlertTriangle, Phone, Shield, Heart, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const MedicalDisclaimer = () => {
  return (
    <Layout>
      <SEO
        title="Medical Disclaimer - Important Health Information Notice"
        description="RehabLookup medical disclaimer. Important information about the limitations of our directory service and the importance of professional medical advice."
        canonical="/medical-disclaimer"
        keywords={["medical disclaimer", "health information", "addiction treatment disclaimer", "not medical advice"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Medical Disclaimer", url: "/medical-disclaimer" },
        ]}
      />

      <section className="border-b border-border bg-secondary/30 py-12">
        <div className="container">
          <BreadcrumbNav className="mb-4" variant="light" items={[{ label: "Medical Disclaimer" }]} />
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Medical Disclaimer
              </h1>
              <p className="text-muted-foreground">
                Last updated: April 7, 2026
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container max-w-4xl">
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">

            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 mb-8">
              <div className="flex items-start gap-3">
                <Phone className="h-6 w-6 text-destructive mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-lg font-bold text-foreground mt-0 mb-2">Emergency Notice</h2>
                  <p className="text-muted-foreground text-sm mb-0">
                    If you or someone you know is experiencing a medical emergency, an overdose, or is in immediate danger, 
                    <strong className="text-foreground"> call 911 immediately</strong>. For the Suicide & Crisis Lifeline, 
                    call or text <strong className="text-foreground">988</strong>. For SAMHSA's National Helpline, 
                    call <strong className="text-foreground">1-800-662-4357</strong> (free, confidential, 24/7).
                  </p>
                </div>
              </div>
            </div>

            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              General Disclaimer
            </h2>
            <p className="text-muted-foreground">
              RehabLookup ("we," "us," or "our") operates as a directory and referral service. The information 
              provided on our website, including but not limited to facility listings, articles, guides, and educational 
              resources, is intended for <strong className="text-foreground">general informational purposes only</strong>.
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Nothing on this website constitutes medical advice, diagnosis, or treatment.</strong> The 
              content on RehabLookup should not be used as a substitute for professional medical advice, diagnosis, 
              or treatment from a qualified healthcare provider.
            </p>

            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Shield className="h-5 w-5 text-primary" />
              Not a Treatment Provider
            </h2>
            <p className="text-muted-foreground">
              RehabLookup is <strong className="text-foreground">not a treatment center, medical facility, or healthcare provider</strong>. We do not:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>Provide medical diagnoses or treatment recommendations</li>
              <li>Prescribe medications or create treatment plans</li>
              <li>Employ licensed physicians, therapists, or counselors for patient care</li>
              <li>Guarantee outcomes from any treatment center listed in our directory</li>
              <li>Make clinical decisions on behalf of individuals seeking treatment</li>
            </ul>

            <h2 className="text-xl font-bold text-foreground">Facility Listing Accuracy</h2>
            <p className="text-muted-foreground">
              While we make every reasonable effort to verify the accuracy of facility information in our directory, 
              we cannot guarantee that all details are complete, current, or error-free. Treatment centers independently 
              manage their own programs, staff, pricing, and availability. We strongly recommend:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>Contacting facilities directly to confirm current availability and services</li>
              <li>Verifying insurance coverage with both the facility and your insurance provider</li>
              <li>Reviewing licensing and accreditation status through official state and national databases</li>
              <li>Consulting with a qualified healthcare professional before making treatment decisions</li>
            </ul>

            <h2 className="text-xl font-bold text-foreground">Third-Party Content & Links</h2>
            <p className="text-muted-foreground">
              Our website may contain links to third-party websites, resources, or services. These links are provided 
              for convenience and informational purposes only. RehabLookup does not endorse, control, or assume 
              responsibility for the content, privacy policies, or practices of any third-party websites.
            </p>

            <h2 className="text-xl font-bold text-foreground">No Doctor-Patient Relationship</h2>
            <p className="text-muted-foreground">
              Using this website, submitting forms, or communicating with our team does not create a doctor-patient 
              relationship, therapist-client relationship, or any other professional healthcare relationship. 
              Our concierge service provides referral assistance only and is not a clinical service.
            </p>

            <h2 className="text-xl font-bold text-foreground">Insurance & Financial Information</h2>
            <p className="text-muted-foreground">
              Any information about insurance coverage, costs, or financial assistance is provided as general guidance 
              only. Coverage determinations are made by insurance companies, and costs vary by facility, program type, 
              and individual circumstances. Always verify financial details directly with the facility and your 
              insurance provider.
            </p>

            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Heart className="h-5 w-5 text-primary" />
              Seeking Help
            </h2>
            <p className="text-muted-foreground">
              If you or a loved one is struggling with substance use disorder or mental health challenges, 
              we encourage you to seek professional help. Key resources include:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">SAMHSA National Helpline:</strong> 1-800-662-4357 (free, confidential, 24/7)</li>
              <li><strong className="text-foreground">988 Suicide & Crisis Lifeline:</strong> Call or text 988</li>
              <li><strong className="text-foreground">Crisis Text Line:</strong> Text HOME to 741741</li>
              <li><strong className="text-foreground">Emergency Services:</strong> Call 911</li>
            </ul>

            <div className="rounded-xl border border-border bg-muted/50 p-6 mt-8">
              <h3 className="font-bold text-foreground mb-2">Questions About This Disclaimer?</h3>
              <p className="text-sm text-muted-foreground">
                If you have questions about this medical disclaimer or our services, please contact us at{" "}
                <a href="mailto:Support@rehablookup.com" className="text-primary hover:underline">Support@rehablookup.com</a>.
              </p>
            </div>

            <div className="flex gap-4 mt-8">
              <Link to="/about" className="text-primary hover:underline text-sm font-medium">About Us →</Link>
              <Link to="/editorial-policy" className="text-primary hover:underline text-sm font-medium">Editorial Policy →</Link>
              <Link to="/privacy-policy" className="text-primary hover:underline text-sm font-medium">Privacy Policy →</Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default MedicalDisclaimer;
