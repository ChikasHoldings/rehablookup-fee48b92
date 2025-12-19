import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { LeadIntakeForm } from "@/components/lead-intake";

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
      <div className="min-h-[calc(100vh-200px)] bg-background py-6 md:py-12">
        <div className="container max-w-2xl mx-auto px-4 md:px-4">
          <LeadIntakeForm />
        </div>
      </div>
    </Layout>
  );
}
