import { Navigate, useLocation, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema } from "@/utils/seoPageValidator";
import { statesData } from "@/data/locationSeoData";
import { Search, ArrowRight, Shield, MapPin, Phone } from "lucide-react";

interface HubConfig {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroSubtitle: string;
  overview: string;
  stateRoutePrefix: string;
  faqs: { question: string; answer: string }[];
}

const HUB_CONFIGS: Record<string, HubConfig> = {
  "sober-living": {
    slug: "sober-living",
    title: "Sober Living Homes",
    metaTitle: "Find Sober Living Homes by State — Transitional Recovery Housing | RehabLookup",
    metaDescription: "Browse sober living homes in all 50 states. Find structured, substance-free transitional housing near you. Compare verified programs.",
    heroSubtitle: "Find structured, substance-free transitional housing that supports your recovery journey.",
    overview: "Sober living homes provide safe, structured environments for individuals transitioning from treatment to independent living. Browse verified programs by state to find the right fit.",
    stateRoutePrefix: "/treatment-types/sober-living",
    faqs: [
      { question: "What is sober living?", answer: "Sober living homes are substance-free residences that provide structured environments with house rules, drug testing, and peer support. They bridge the gap between intensive treatment and independent living, helping residents develop real-world recovery skills." },
      { question: "How long do people stay in sober living?", answer: "Average stays range from 3 to 12 months, though there is typically no maximum. Longer stays are associated with better recovery outcomes. Residents can stay as long as they follow house rules and benefit from the structure." },
      { question: "How much does sober living cost?", answer: "Sober living typically costs $500-$2,500 per month depending on location, amenities, and services. Some programs accept insurance or offer sliding-scale fees. State-funded and scholarship programs exist in many areas." },
    ],
  },
  "free-rehab": {
    slug: "free-rehab",
    title: "Free Rehab Programs",
    metaTitle: "Free Rehab Centers by State — No-Cost Addiction Treatment | RehabLookup",
    metaDescription: "Find free and low-cost rehab programs in every state. Government-funded, nonprofit, and sliding-scale treatment options. Get help today.",
    heroSubtitle: "Access no-cost addiction treatment through government-funded and nonprofit programs nationwide.",
    overview: "Free and low-cost rehabilitation programs are available in every state through federal SAMHSA grants, Medicaid, state funding, and nonprofit organizations. These programs provide evidence-based treatment regardless of ability to pay.",
    stateRoutePrefix: "/treatment-types/free-rehab",
    faqs: [
      { question: "Are there really free rehab programs?", answer: "Yes. Free treatment is available through state-funded programs, SAMHSA grant recipients, nonprofit organizations, and Medicaid-covered facilities. The Affordable Care Act requires most insurance plans to cover substance abuse treatment, and Medicaid expansion has significantly increased access in participating states." },
      { question: "How do I qualify for free rehab?", answer: "Qualification typically depends on income level, insurance status, and state residency. Uninsured, underinsured, and Medicaid-eligible individuals generally qualify. Many programs use sliding-scale fees based on ability to pay." },
      { question: "Is free rehab as effective as paid treatment?", answer: "Research shows treatment effectiveness depends on clinical quality and length of stay rather than cost. State-funded and nonprofit programs provide the same evidence-based approaches as private facilities, including medical detox, counseling, MAT, and aftercare planning." },
    ],
  },
  "faith-based-rehab": {
    slug: "faith-based-rehab",
    title: "Faith-Based Rehab Programs",
    metaTitle: "Faith-Based Rehab by State — Spiritual Recovery Programs | RehabLookup",
    metaDescription: "Find faith-based rehab programs in every state. Treatment integrating spiritual principles with clinical care. Compare verified programs.",
    heroSubtitle: "Discover treatment programs combining spiritual growth with evidence-based addiction care.",
    overview: "Faith-based rehabilitation programs integrate spiritual counseling, prayer, and scriptural principles alongside evidence-based clinical treatment. These programs serve individuals who draw strength from their faith during recovery.",
    stateRoutePrefix: "/treatment-types/faith-based-rehab",
    faqs: [
      { question: "What is faith-based rehab?", answer: "Faith-based rehab combines clinical addiction treatment with spiritual counseling, worship services, and faith-centered curriculum. The best programs maintain proper licensing and accreditation while adding a spiritual dimension to evidence-based care." },
      { question: "Do I need to be religious for faith-based rehab?", answer: "Most programs welcome individuals of all backgrounds, though the curriculum is typically rooted in Christian principles. Some are more inclusive than others — ask about spiritual expectations before enrolling to ensure it aligns with your beliefs." },
      { question: "Are faith-based programs free?", answer: "Many faith-based programs offer reduced-cost or free treatment funded through church donations and nonprofit grants. Others accept insurance. Cost ranges from completely free mission-based programs to comprehensive clinical programs with standard fees." },
    ],
  },
  "fentanyl-rehab": {
    slug: "fentanyl-rehab",
    title: "Fentanyl Addiction Treatment",
    metaTitle: "Fentanyl Rehab by State — Specialized Opioid Treatment | RehabLookup",
    metaDescription: "Find specialized fentanyl addiction treatment in every state. Medically supervised detox, MAT programs, and evidence-based care.",
    heroSubtitle: "Get specialized treatment for fentanyl addiction with medically supervised detox and MAT protocols.",
    overview: "Fentanyl addiction requires specialized medical protocols due to its extreme potency. Treatment includes medically supervised detox, medication-assisted treatment with buprenorphine or methadone, and comprehensive rehabilitation programming.",
    stateRoutePrefix: "/treatment-types/fentanyl-rehab",
    faqs: [
      { question: "Why does fentanyl require specialized treatment?", answer: "Fentanyl is 50-100 times stronger than morphine. This extreme potency means withdrawal is more severe, higher medication doses may be needed, and overdose risk is elevated during early recovery. Programs experienced with fentanyl understand these unique challenges." },
      { question: "What is MAT for fentanyl addiction?", answer: "Medication-assisted treatment (MAT) uses FDA-approved medications like buprenorphine (Suboxone), methadone, or naltrexone alongside counseling and behavioral therapies. MAT is considered the gold standard for opioid addiction treatment." },
      { question: "How long is fentanyl detox?", answer: "Acute fentanyl withdrawal typically lasts 5-10 days, though post-acute symptoms can persist for weeks or months. Medical supervision is essential. Most programs use medication tapers to manage withdrawal safely." },
    ],
  },
  "veterans-rehab": {
    slug: "veterans-rehab",
    title: "Veterans Rehab Programs",
    metaTitle: "Veterans Rehab by State — Military-Focused Addiction Treatment | RehabLookup",
    metaDescription: "Find veteran-specific rehab programs in every state. VA-covered and private options addressing PTSD, combat trauma, and substance use.",
    heroSubtitle: "Treatment programs designed specifically for military veterans and service members.",
    overview: "Veteran-focused rehab programs address the unique challenges military personnel face — combat trauma, PTSD, TBI, and military sexual trauma — alongside substance use disorders. Both VA and private programs are available.",
    stateRoutePrefix: "/treatment-types/veterans-rehab",
    faqs: [
      { question: "Does the VA cover rehab?", answer: "Yes, the VA provides substance abuse treatment at no cost to eligible veterans including detox, residential treatment, outpatient programs, and MAT. VA Community Care may also authorize treatment at approved non-VA facilities." },
      { question: "Can I use TRICARE for rehab?", answer: "TRICARE covers substance abuse treatment for active duty members, retirees, and eligible family members. Coverage includes detox, inpatient rehabilitation, outpatient programs, and medication-assisted treatment." },
      { question: "What makes veteran rehab different?", answer: "Veteran-specific programs employ staff experienced with military culture and provide trauma-informed care addressing combat PTSD, moral injury, and the transition challenges that often co-occur with substance use disorders." },
    ],
  },
  "womens-rehab": {
    slug: "womens-rehab",
    title: "Women's Rehab Programs",
    metaTitle: "Women's Rehab by State — Gender-Responsive Treatment | RehabLookup",
    metaDescription: "Find women-only rehab programs in every state. Gender-responsive treatment addressing trauma, mental health, and family needs.",
    heroSubtitle: "Women-only treatment addressing gender-specific factors in addiction and recovery.",
    overview: "Women's rehab programs provide gender-responsive treatment in female-only environments, addressing trauma, co-occurring mental health conditions, childcare needs, and the unique social factors that influence addiction in women.",
    stateRoutePrefix: "/treatment-types/womens-rehab",
    faqs: [
      { question: "Why choose women-only rehab?", answer: "Women-only programs create safer environments for addressing trauma, abuse history, and gender-specific challenges. Research shows women in gender-responsive programs have better treatment retention and long-term outcomes." },
      { question: "Can I bring my children to rehab?", answer: "Some women's programs offer family-inclusive treatment where mothers can have their children with them. These programs provide childcare, parenting classes, and family therapy. Contact facilities directly about their family policies." },
      { question: "Do women's programs accept pregnant patients?", answer: "Many women's rehab programs specialize in treating pregnant women, providing prenatal care alongside addiction treatment. Medication-assisted treatment with buprenorphine is often recommended for pregnant women with opioid use disorders." },
    ],
  },
  "mens-rehab": {
    slug: "mens-rehab",
    title: "Men's Rehab Programs",
    metaTitle: "Men's Rehab by State — Male-Focused Addiction Treatment | RehabLookup",
    metaDescription: "Find men-only rehab programs in every state. Treatment focused on accountability, emotional growth, and evidence-based recovery.",
    heroSubtitle: "Men-only treatment environments focused on accountability and emotional growth.",
    overview: "Men's rehab programs create environments where men can address workplace stress, emotional suppression, relationship challenges, and anger management in a male-only setting that encourages vulnerability and honest growth.",
    stateRoutePrefix: "/treatment-types/mens-rehab",
    faqs: [
      { question: "Why choose men-only rehab?", answer: "Men-only programs provide focused environments where men can openly discuss challenges without the dynamics of co-ed settings. Gender-specific treatment can improve engagement and outcomes by addressing male-specific issues." },
      { question: "What does men's rehab include?", answer: "Programs typically include individual and group therapy, anger management, accountability partnerships, vocational training, fitness programming, and family therapy. Many incorporate outdoor activities and experiential therapy." },
      { question: "How long is men's rehab?", answer: "Treatment ranges from 30 to 90+ days. Longer stays (60-90 days) are associated with better outcomes. Many programs also offer extended care and sober living transitions after primary treatment." },
    ],
  },
  "luxury-rehab": {
    slug: "luxury-rehab",
    title: "Luxury Rehab Centers",
    metaTitle: "Luxury Rehab by State — Premium Addiction Treatment | RehabLookup",
    metaDescription: "Find luxury rehab centers in every state. Private accommodations, personalized care, and resort-style amenities. Compare premium programs.",
    heroSubtitle: "Premium addiction treatment with private accommodations and personalized clinical care.",
    overview: "Luxury rehabilitation centers combine evidence-based addiction treatment with premium amenities — private rooms, gourmet nutrition, spa services, and holistic therapies — in resort-like settings designed for comfort and privacy.",
    stateRoutePrefix: "/treatment-types/luxury-rehab",
    faqs: [
      { question: "How much does luxury rehab cost?", answer: "Luxury rehab typically ranges from $30,000-$100,000+ per month depending on the program, amenities, and length of stay. Many luxury facilities accept PPO insurance plans, which can significantly reduce out-of-pocket costs." },
      { question: "Is luxury rehab more effective?", answer: "Effectiveness depends primarily on clinical quality, treatment duration, and aftercare — not amenities. However, luxury settings may improve retention because clients are more comfortable completing the full program." },
      { question: "What amenities do luxury rehab centers offer?", answer: "Common amenities include private rooms, gourmet meals, fitness centers, swimming pools, equine therapy, art studios, spa services, and scenic outdoor settings. The focus is on creating a comfortable healing environment." },
    ],
  },
};

interface ExpandedTreatmentNationalHubProps {
  treatmentKey: string;
}

const ExpandedTreatmentNationalHub = ({ treatmentKey }: ExpandedTreatmentNationalHubProps) => {
  const config = HUB_CONFIGS[treatmentKey];

  if (!config) {
    return <Navigate to="/treatment-types" replace />;
  }

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Treatment Types", url: "/treatment-types" },
    { name: config.title, url: `/treatment-types/${config.slug}` },
  ];

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: config.title,
      description: config.metaDescription,
      url: `https://rehablookup.com/treatment-types/${config.slug}`,
      specialty: "Addiction Medicine",
      lastReviewed: new Date().toISOString().split("T")[0],
    },
  ];

  if (shouldEmitFAQSchema(config.faqs)) {
    structuredData.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: config.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  // Group states by region for display
  const regions: Record<string, typeof statesData> = {};
  statesData.forEach((s) => {
    const region = getRegion(s.slug);
    if (!regions[region]) regions[region] = [];
    regions[region].push(s);
  });

  return (
    <Layout>
      <SEO
        title={config.metaTitle}
        description={config.metaDescription}
        canonical={`https://rehablookup.com/treatment-types/${config.slug}`}
        structuredData={structuredData}
        breadcrumbs={breadcrumbs}
      />

      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <BreadcrumbNav items={breadcrumbs} />
        </div>

        {/* Hero */}
        <section className="relative bg-gradient-to-br from-primary/10 via-background to-blue-50/30 py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                <Shield className="h-4 w-4" />
                All 50 States
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                {config.title} by State
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                {config.heroSubtitle}
              </p>
              <Link to="/concierge">
                <Button size="lg" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Get Matched Free
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Overview */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">{config.overview}</p>
          </div>
        </section>

        {/* State Directory */}
        <section className="py-12 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground mb-8">
              Browse {config.title} by State
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {statesData
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((state) => (
                  <Link
                    key={state.slug}
                    to={`${config.stateRoutePrefix}/${state.slug}`}
                    className="flex items-center gap-2 px-4 py-3 bg-card border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm font-medium text-foreground"
                  >
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    {state.abbreviation} — {state.name}
                  </Link>
                ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        {config.faqs.length >= 3 && (
          <section className="py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-foreground mb-8">
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                {config.faqs.map((faq, idx) => (
                  <div key={idx} className="bg-card rounded-lg p-6 shadow-sm border">
                    <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <SmartInternalLinks pageType="state" stateSlug="" stateName="" />

        {/* CTA */}
        <section className="py-16 bg-primary/5">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Find {config.title} Near You
            </h2>
            <p className="text-muted-foreground mb-8">
              Our concierge team matches you with the best {config.title.toLowerCase()} based on your needs, location, and insurance. Free and confidential.
            </p>
            <Link to="/concierge">
              <Button size="lg" className="gap-2">
                Get Matched Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
};

function getRegion(stateSlug: string): string {
  const northeast = ["maine", "new-hampshire", "vermont", "massachusetts", "rhode-island", "connecticut", "new-york", "new-jersey", "pennsylvania"];
  const southeast = ["virginia", "west-virginia", "north-carolina", "south-carolina", "georgia", "florida", "alabama", "mississippi", "tennessee", "kentucky", "arkansas", "louisiana"];
  const midwest = ["ohio", "michigan", "indiana", "illinois", "wisconsin", "minnesota", "iowa", "missouri", "north-dakota", "south-dakota", "nebraska", "kansas"];
  const west = ["montana", "wyoming", "colorado", "new-mexico", "idaho", "utah", "arizona", "nevada", "washington", "oregon", "california", "hawaii", "alaska"];
  const southwest = ["texas", "oklahoma"];

  if (northeast.includes(stateSlug)) return "Northeast";
  if (southeast.includes(stateSlug)) return "Southeast";
  if (midwest.includes(stateSlug)) return "Midwest";
  if (southwest.includes(stateSlug)) return "Southwest";
  if (west.includes(stateSlug)) return "West";
  return "Other";
}

export default ExpandedTreatmentNationalHub;
