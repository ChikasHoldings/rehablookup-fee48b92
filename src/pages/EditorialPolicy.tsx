import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { Shield, BookOpen, CheckCircle, Users, FileText, AlertTriangle, Eye, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const EditorialPolicy = () => {
  return (
    <Layout>
      <SEO
        title="Editorial Policy & Content Standards"
        description="Learn about RehabLookup's editorial standards, fact-checking process, and commitment to accurate, evidence-based addiction treatment information."
        canonical="/editorial-policy"
        keywords={["editorial policy", "content standards", "fact-checking", "medical review", "addiction treatment information"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Editorial Policy", url: "/editorial-policy" },
        ]}
      />

      <section className="border-b border-border bg-secondary/30 py-12">
        <div className="container">
          <BreadcrumbNav className="mb-4" variant="light" items={[{ label: "Editorial Policy" }]} />
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Editorial Policy
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

            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 mb-8">
              <div className="flex items-start gap-3">
                <Shield className="h-6 w-6 text-accent mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-lg font-bold text-foreground mt-0 mb-2">Our Commitment to Accuracy</h2>
                  <p className="text-muted-foreground text-sm mb-0">
                    RehabLookup is committed to providing accurate, unbiased, and evidence-based information about addiction treatment. 
                    Our editorial standards ensure every piece of content meets the highest quality benchmarks before publication.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              Content Creation Process
            </h2>
            <p className="text-muted-foreground">
              Every article, guide, and resource published on RehabLookup follows a rigorous multi-step editorial process:
            </p>
            <ol className="space-y-3 text-muted-foreground">
              <li><strong className="text-foreground">Research & Sourcing:</strong> Content is developed using peer-reviewed studies, government health databases (SAMHSA, NIDA, NIH), and recognized medical guidelines.</li>
              <li><strong className="text-foreground">Expert Writing:</strong> Articles are written by health content specialists with backgrounds in behavioral health, addiction medicine, or clinical psychology.</li>
              <li><strong className="text-foreground">Medical Review:</strong> All clinical content is reviewed by licensed healthcare professionals to ensure accuracy and adherence to current medical standards.</li>
              <li><strong className="text-foreground">Editorial Review:</strong> Our editorial team verifies facts, checks sources, and ensures content is clear, compassionate, and free from bias.</li>
              <li><strong className="text-foreground">Regular Updates:</strong> Published content is reviewed periodically and updated to reflect the latest research, guidelines, and treatment advances.</li>
            </ol>

            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <CheckCircle className="h-5 w-5 text-primary" />
              Facility Verification Standards
            </h2>
            <p className="text-muted-foreground">
              We verify every treatment center in our directory against these criteria:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>Valid state licensing and active operating status</li>
              <li>Accreditation from recognized bodies (JCAHO, CARF, NAATP, LegitScript)</li>
              <li>Accurate representation of services, staff qualifications, and treatment modalities</li>
              <li>No history of significant regulatory violations or fraud</li>
              <li>Verified contact information and physical address</li>
            </ul>

            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Eye className="h-5 w-5 text-primary" />
              Independence & Conflict of Interest
            </h2>
            <p className="text-muted-foreground">
              RehabLookup maintains strict editorial independence. Our content is never influenced by advertising relationships or facility partnerships. 
              Key principles include:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">No pay-for-placement:</strong> Facilities cannot pay for higher rankings in search results or more favorable editorial coverage.</li>
              <li><strong className="text-foreground">Advertising separation:</strong> Sponsored content is always clearly labeled and separated from editorial content.</li>
              <li><strong className="text-foreground">Staff disclosure:</strong> Team members disclose any potential conflicts of interest that could affect content objectivity.</li>
            </ul>

            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Users className="h-5 w-5 text-primary" />
              Our Editorial Team
            </h2>
            <p className="text-muted-foreground">
              Our editorial team includes professionals with expertise in:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>Clinical psychology and behavioral health</li>
              <li>Addiction medicine and substance abuse counseling</li>
              <li>Health journalism and medical writing</li>
              <li>Public health policy and healthcare administration</li>
            </ul>

            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Corrections & Feedback
            </h2>
            <p className="text-muted-foreground">
              We take accuracy seriously. If you identify an error or have concerns about any content on our platform:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>Email our editorial team at <a href="mailto:Support@rehablookup.com" className="text-primary hover:underline">Support@rehablookup.com</a></li>
              <li>We investigate all reports within 48 hours</li>
              <li>Corrections are made promptly and noted on the affected content</li>
              <li>Significant corrections include a public note explaining the change</li>
            </ul>

            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Heart className="h-5 w-5 text-primary" />
              Content Ethics
            </h2>
            <p className="text-muted-foreground">
              Given the sensitive nature of addiction and recovery, we adhere to strict ethical guidelines:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>We use person-first, non-stigmatizing language</li>
              <li>We never use sensationalized or fear-based messaging</li>
              <li>We respect the privacy and dignity of individuals in recovery</li>
              <li>We include crisis resources and helpline information where appropriate</li>
              <li>We acknowledge that addiction is a medical condition, not a moral failing</li>
            </ul>

            <div className="rounded-xl border border-border bg-muted/50 p-6 mt-8">
              <h3 className="font-bold text-foreground mb-2">Sources We Trust</h3>
              <p className="text-sm text-muted-foreground mb-3">Our content references authoritative sources including:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                <span>• SAMHSA</span>
                <span>• NIDA (NIH)</span>
                <span>• CDC</span>
                <span>• WHO</span>
                <span>• AMA Guidelines</span>
                <span>• Peer-Reviewed Journals</span>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Link to="/about" className="text-primary hover:underline text-sm font-medium">About Us →</Link>
              <Link to="/privacy-policy" className="text-primary hover:underline text-sm font-medium">Privacy Policy →</Link>
              <Link to="/medical-disclaimer" className="text-primary hover:underline text-sm font-medium">Medical Disclaimer →</Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default EditorialPolicy;
