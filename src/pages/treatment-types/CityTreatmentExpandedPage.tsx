import { useParams, Navigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { statesData } from "@/data/locationSeoData";
import { RelatedLinksSection } from "@/components/seo/RelatedLinksSection";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { StateFacilitiesSection } from "@/components/seo/StateFacilitiesSection";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import { shouldEmitFAQSchema, getFacilityDensity, getUrbanClassification } from "@/utils/seoPageValidator";
import {
  Search, ArrowRight, Shield, Clock, CheckCircle, MapPin, Heart, Phone,
} from "lucide-react";

interface CityTreatmentConfig {
  slug: string;
  label: string;
  parentSlug: string; // treatment-types parent path segment
  filterKeys: string[];
  heroDescription: string;
  sections: { heading: string; content: string }[];
  faqs: (city: string, state: string) => { question: string; answer: string }[];
}

const CITY_TREATMENT_CONFIGS: CityTreatmentConfig[] = [
  {
    slug: "luxury-rehab",
    label: "Luxury Rehab",
    parentSlug: "luxury-rehab",
    filterKeys: ["luxury"],
    heroDescription: "Premium, resort-style addiction treatment with private accommodations and personalized clinical care.",
    sections: [
      { heading: "What Makes Luxury Rehab Different", content: "Luxury rehabilitation centers combine evidence-based addiction treatment with premium amenities including private rooms, gourmet nutrition, spa services, and holistic therapies. These programs typically offer lower staff-to-client ratios, allowing for more individualized treatment plans and greater privacy during recovery." },
      { heading: "Choosing a Luxury Program", content: "When evaluating luxury rehab options, look beyond amenities to clinical credentials. The best programs pair resort-like settings with board-certified addiction medicine physicians, licensed therapists, and comprehensive aftercare planning. Accreditation from JCAHO or CARF indicates adherence to national treatment standards." },
    ],
    faqs: (city, state) => [
      { question: `How much does luxury rehab cost in ${city}?`, answer: `Luxury rehab in ${city}, ${state} typically ranges from $30,000-$100,000+ per month depending on the program, amenities, and length of stay. Many luxury facilities accept PPO insurance plans, which can significantly reduce out-of-pocket costs. Some programs offer financing options.` },
      { question: `What amenities do luxury rehab centers in ${city} offer?`, answer: `Luxury programs in ${city} often include private or semi-private rooms, gourmet chef-prepared meals, fitness centers, swimming pools, equine therapy, art therapy, and spa services. The focus is on creating a comfortable, distraction-free environment conducive to healing.` },
      { question: `Is luxury rehab more effective than standard treatment?`, answer: `Research shows treatment effectiveness depends more on clinical quality, length of stay, and aftercare than amenities. However, luxury settings may improve retention rates because clients are more comfortable and willing to complete the full program. The key is finding a program with strong clinical foundations.` },
    ],
  },
  {
    slug: "sober-living",
    label: "Sober Living Homes",
    parentSlug: "sober-living",
    filterKeys: ["sober-living", "sober living", "halfway"],
    heroDescription: "Structured, substance-free transitional housing for individuals in early recovery.",
    sections: [
      { heading: "Sober Living in Your Community", content: "Sober living homes provide a crucial bridge between intensive treatment and independent living. Residents share a substance-free household with peers in recovery, following house rules that promote accountability, regular drug testing, and participation in recovery activities." },
      { heading: "Finding the Right Sober Living Home", content: "Quality sober living homes are licensed by the state, maintain clear house rules, conduct regular drug testing, and connect residents with outpatient services and employment resources. Look for NARR-certified homes that meet national standards for ethical operation and resident care." },
    ],
    faqs: (city, state) => [
      { question: `How much does sober living cost in ${city}?`, answer: `Sober living in ${city}, ${state} typically costs $500-$2,500 per month depending on location, amenities, and services included. Some programs accept insurance, Medicaid, or offer sliding-scale fees. State-funded options may be available for qualifying residents.` },
      { question: `How long can I stay in sober living in ${city}?`, answer: `Most sober living homes in ${city} have no maximum stay. Average stays range from 3-12 months, though many residents stay longer. Research consistently shows longer stays correlate with better long-term recovery outcomes.` },
      { question: `What are the rules in sober living homes?`, answer: `Typical rules include no substance use (with random testing), maintaining employment or attending school, participating in house meetings, following curfews, doing assigned chores, and attending recovery meetings. Violations may result in warnings or removal from the home.` },
    ],
  },
  {
    slug: "free-rehab",
    label: "Free Rehab Programs",
    parentSlug: "free-rehab",
    filterKeys: ["free", "sliding-scale", "state-funded"],
    heroDescription: "No-cost and low-cost addiction treatment through government-funded and nonprofit programs.",
    sections: [
      { heading: "Accessing Free Treatment", content: "Free and low-cost rehab programs are funded through federal SAMHSA block grants, state appropriations, Medicaid, and charitable organizations. These programs provide the same evidence-based treatments as private facilities, including medical detox, counseling, medication-assisted treatment, and aftercare support." },
      { heading: "Qualifying for Free Rehab", content: "Eligibility for free treatment depends on income level, insurance status, and state residency. Uninsured individuals, those on Medicaid, and low-income residents typically qualify. Many programs use sliding-scale fees based on ability to pay, ensuring treatment is accessible regardless of financial situation." },
    ],
    faqs: (city, state) => [
      { question: `Are there free rehab centers in ${city}?`, answer: `Yes, ${city}, ${state} has access to free and low-cost treatment options through state-funded programs, nonprofit organizations, and Medicaid-covered facilities. SAMHSA's treatment locator and your local health department can help identify available programs.` },
      { question: `What does free rehab include in ${city}?`, answer: `Free rehab programs in ${city} typically include medical detox, individual and group counseling, medication-assisted treatment when appropriate, and aftercare planning. While amenities may be more basic than private facilities, the clinical care is evidence-based and effective.` },
      { question: `How do I qualify for free rehab?`, answer: `Qualification is typically based on income, insurance status, and state residency. If you're uninsured, underinsured, or have Medicaid, you likely qualify. Contact the facilities listed below or call SAMHSA's helpline (1-800-662-4357) for immediate assistance.` },
    ],
  },
  {
    slug: "faith-based-rehab",
    label: "Faith-Based Rehab",
    parentSlug: "faith-based-rehab",
    filterKeys: ["faith-based", "christian", "faith"],
    heroDescription: "Treatment programs integrating spiritual principles with evidence-based clinical care.",
    sections: [
      { heading: "Faith-Based Treatment Approach", content: "Faith-based rehab programs combine clinical addiction treatment with spiritual counseling, prayer, worship services, and scripture-based curriculum. These programs recognize that many people find strength and purpose through their faith, making spiritual growth a cornerstone of their recovery journey." },
      { heading: "Clinical Quality in Faith-Based Programs", content: "The best faith-based programs maintain the same clinical standards as secular facilities — licensed therapists, medical staff, evidence-based protocols — while adding a spiritual dimension. Look for programs with proper state licensing and accreditation alongside their faith-based approach." },
    ],
    faqs: (city, state) => [
      { question: `Are faith-based rehab programs in ${city} effective?`, answer: `Studies show faith-based programs can be highly effective, particularly for individuals whose spirituality is an important part of their identity. The most effective programs combine clinical evidence-based treatment with spiritual support, rather than relying solely on faith-based methods.` },
      { question: `Do I need to be religious to attend faith-based rehab?`, answer: `Most faith-based programs in ${city} welcome individuals of all faith backgrounds, though the curriculum is typically rooted in Christian principles. Some programs are more inclusive than others — ask about the spiritual expectations before enrolling to ensure it's a good fit.` },
      { question: `How much does faith-based rehab cost in ${city}?`, answer: `Many faith-based programs in ${city}, ${state} offer reduced-cost or free treatment funded through church donations and nonprofit grants. Others accept insurance. Cost varies widely — from completely free mission-based programs to comprehensive clinical programs with standard fees.` },
    ],
  },
  {
    slug: "fentanyl-rehab",
    label: "Fentanyl Rehab",
    parentSlug: "fentanyl-rehab",
    filterKeys: ["opioid", "fentanyl", "medication-assisted"],
    heroDescription: "Specialized treatment for fentanyl addiction with medically supervised detox and MAT protocols.",
    sections: [
      { heading: "Fentanyl-Specific Treatment", content: "Fentanyl addiction requires specialized medical protocols due to its extreme potency — 50-100 times stronger than morphine. Treatment typically begins with medically supervised detox using tapering protocols, followed by medication-assisted treatment (MAT) with buprenorphine or methadone to manage withdrawal and prevent relapse." },
      { heading: "Why Specialized Care Matters", content: "Fentanyl withdrawal can be severe and potentially dangerous without medical supervision. Programs experienced with fentanyl understand the longer withdrawal timeline, higher medication doses needed, and increased overdose risk during early recovery. Naloxone access is critical throughout treatment." },
    ],
    faqs: (city, state) => [
      { question: `How long is fentanyl detox in ${city}?`, answer: `Fentanyl detox in ${city}, ${state} typically takes 5-10 days for acute withdrawal, though post-acute withdrawal symptoms can persist for weeks or months. Medical supervision is essential due to fentanyl's potency. Many programs use buprenorphine to manage symptoms safely.` },
      { question: `Is MAT available for fentanyl addiction in ${city}?`, answer: `Yes, medication-assisted treatment (MAT) using buprenorphine (Suboxone), methadone, or naltrexone is available in ${city}. MAT is considered the gold standard for opioid addiction treatment and significantly reduces overdose risk and relapse rates.` },
      { question: `Does insurance cover fentanyl rehab?`, answer: `Most insurance plans, including Medicaid and Medicare, cover fentanyl addiction treatment under mental health parity laws. Coverage typically includes detox, inpatient/outpatient treatment, MAT, and therapy. Verify your specific benefits with your insurer or the facility.` },
    ],
  },
  {
    slug: "veterans-rehab",
    label: "Veterans Rehab",
    parentSlug: "veterans-rehab",
    filterKeys: ["veterans", "military", "va"],
    heroDescription: "Treatment programs designed for military veterans addressing combat trauma, PTSD, and substance use.",
    sections: [
      { heading: "Veteran-Specific Treatment", content: "Veterans face unique challenges including combat trauma, PTSD, traumatic brain injury, and military sexual trauma that often co-occur with substance use disorders. Veteran-focused programs employ staff experienced with military culture and provide trauma-informed care addressing these interconnected issues." },
      { heading: "VA and Non-VA Options", content: "Veterans have access to VA healthcare system substance abuse programs at no cost, as well as private programs that specialize in veteran care. TRICARE and VA Community Care may cover treatment at approved non-VA facilities, expanding options significantly." },
    ],
    faqs: (city, state) => [
      { question: `Does the VA cover rehab in ${city}?`, answer: `Yes, the VA provides substance abuse treatment at no cost to eligible veterans in ${city}, ${state}. This includes detox, residential treatment, outpatient programs, and medication-assisted treatment. VA Community Care may also authorize treatment at approved non-VA facilities.` },
      { question: `Are there veteran-only rehab programs in ${city}?`, answer: `${city} has access to veteran-specific treatment options through the VA healthcare system and private programs that specialize in military veteran care. These programs understand military culture and address PTSD, combat trauma, and substance use simultaneously.` },
      { question: `Can I use TRICARE for rehab in ${city}?`, answer: `Yes, TRICARE covers substance abuse treatment including detox, inpatient rehabilitation, outpatient programs, and MAT. Active duty members, retirees, and eligible family members can access covered treatment at TRICARE-authorized facilities in ${city}.` },
    ],
  },
  {
    slug: "womens-rehab",
    label: "Women's Rehab",
    parentSlug: "womens-rehab",
    filterKeys: ["women", "womens", "female"],
    heroDescription: "Women-only treatment programs addressing gender-specific factors in addiction and recovery.",
    sections: [
      { heading: "Gender-Responsive Treatment", content: "Women's rehab programs address the unique biological, psychological, and social factors that influence addiction in women — including trauma from abuse, hormonal influences, childcare responsibilities, and co-occurring mental health conditions like depression and anxiety that affect women at higher rates." },
      { heading: "What Women's Programs Offer", content: "Gender-responsive programs provide trauma-informed care in women-only environments, childcare or family-inclusive treatment options, prenatal care for pregnant women, and programming around self-esteem, healthy relationships, and parenting skills. These elements create a safer space for healing." },
    ],
    faqs: (city, state) => [
      { question: `Are there women-only rehab programs in ${city}?`, answer: `Yes, ${city}, ${state} offers women-only treatment programs providing gender-responsive care in safe, single-gender environments. These programs address trauma, co-occurring disorders, and life circumstances unique to women in recovery.` },
      { question: `Can I bring my children to rehab in ${city}?`, answer: `Some women's programs in ${city} offer family-inclusive treatment where mothers can have their children with them during residential treatment. Programs may provide childcare, parenting classes, and family therapy. Contact facilities directly to ask about their family policies.` },
      { question: `Do women's programs accept pregnant patients?`, answer: `Many women's rehab programs in ${city}, ${state} specialize in treating pregnant women, providing prenatal care alongside addiction treatment. Medication-assisted treatment with buprenorphine is often recommended for pregnant women with opioid use disorders to protect both mother and baby.` },
    ],
  },
  {
    slug: "mens-rehab",
    label: "Men's Rehab",
    parentSlug: "mens-rehab",
    filterKeys: ["men", "mens", "male"],
    heroDescription: "Men-only treatment environments focused on accountability, emotional growth, and recovery.",
    sections: [
      { heading: "Men-Focused Treatment", content: "Men's rehab programs create environments where men can address the specific pressures and expectations that contribute to substance abuse — workplace stress, emotional suppression, relationship challenges, and anger management. Male-only settings often reduce inhibitions around vulnerability and emotional honesty." },
      { heading: "Building Brotherhood in Recovery", content: "Men's programs emphasize accountability, peer mentorship, and building healthy male relationships. Programming often includes outdoor experiential therapy, vocational training, fatherhood skills, and anger management alongside evidence-based clinical treatment." },
    ],
    faqs: (city, state) => [
      { question: `Why choose men-only rehab in ${city}?`, answer: `Men-only programs in ${city}, ${state} provide focused environments where men can openly discuss challenges like emotional suppression, relationship issues, and societal pressure without the dynamics that co-ed settings sometimes create. Research shows gender-specific treatment can improve engagement and outcomes.` },
      { question: `What does men's rehab include?`, answer: `Men's programs in ${city} typically include individual and group therapy, anger management, accountability partnerships, vocational training, fitness programming, and family therapy. Many incorporate outdoor activities and experiential therapy designed to build confidence and emotional resilience.` },
      { question: `How long is men's rehab?`, answer: `Treatment length varies from 30 to 90+ days depending on the program and individual needs. Longer stays (60-90 days) are associated with better outcomes. Many men's programs also offer extended care and sober living transitions after the primary treatment phase.` },
    ],
  },
];

interface CityTreatmentExpandedPageProps {
  treatmentKey: string;
}

const CityTreatmentExpandedPage = ({ treatmentKey }: CityTreatmentExpandedPageProps) => {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();
  const config = CITY_TREATMENT_CONFIGS.find((c) => c.slug === treatmentKey);
  const stateData = statesData.find((s) => s.slug === stateSlug);
  const cityData = stateData?.cities.find((c) => c.slug === citySlug);

  if (!config || !stateData || !cityData) {
    return <Navigate to="/treatment-types" replace />;
  }

  const { name: stateName, abbreviation } = stateData;
  const cityName = cityData.name;
  const pageTitle = `${config.label} in ${cityName}, ${abbreviation}`;
  const faqs = config.faqs(cityName, stateName);

  const density = getFacilityDensity(0); // Will be replaced by actual count from StateFacilitiesSection
  const urbanClass = getUrbanClassification(cityData.population);

  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: pageTitle,
      description: `Find ${config.label.toLowerCase()} in ${cityName}, ${abbreviation}.`,
      url: `https://rehablookup.com/treatment-types/${config.parentSlug}/${stateSlug}/${citySlug}`,
      specialty: "Addiction Medicine",
      lastReviewed: new Date().toISOString().split("T")[0],
    },
  ];

  if (shouldEmitFAQSchema(faqs)) {
    structuredData.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Treatment Types", url: "/treatment-types" },
    { name: config.label, url: `/treatment-types/${config.parentSlug}` },
    { name: `${stateName}`, url: `/treatment-types/${config.parentSlug}/${stateSlug}` },
    { name: cityName, url: `/treatment-types/${config.parentSlug}/${stateSlug}/${citySlug}` },
  ];

  const otherCities = stateData.cities
    .filter((c) => c.slug !== citySlug)
    .slice(0, 8)
    .map((c) => ({
      title: `${config.label} in ${c.name}`,
      href: `/treatment-types/${config.parentSlug}/${stateSlug}/${c.slug}`,
    }));

  const otherTreatments = CITY_TREATMENT_CONFIGS
    .filter((c) => c.slug !== treatmentKey)
    .slice(0, 6)
    .map((c) => ({
      title: `${c.label} in ${cityName}`,
      href: `/treatment-types/${c.parentSlug}/${stateSlug}/${citySlug}`,
    }));

  return (
    <Layout>
      <SEO
        title={`${pageTitle} — Find Treatment | RehabLookup`}
        description={`Find ${config.label.toLowerCase()} in ${cityName}, ${abbreviation}. Compare verified programs, check insurance, read reviews. Get help today.`}
        canonical={`https://rehablookup.com/treatment-types/${config.parentSlug}/${stateSlug}/${citySlug}`}
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
                Verified & Accredited
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                {pageTitle}
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                {config.heroDescription} Compare verified programs in {cityName} and find the right fit for your recovery.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/concierge">
                  <Button size="lg" className="gap-2">
                    <Phone className="h-4 w-4" />
                    Get Matched Free
                  </Button>
                </Link>
                <Link to={`/rehab-centers/${stateSlug}/${citySlug}`}>
                  <Button variant="outline" size="lg" className="gap-2">
                    <Search className="h-4 w-4" />
                    Browse All {cityName} Centers
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Content Sections */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="prose prose-lg max-w-none mb-8">
              <p className="text-muted-foreground leading-relaxed">
                Looking for {config.label.toLowerCase()} in {cityName}, {abbreviation}? RehabLookup connects you with verified, accredited treatment programs in the {cityName} area.
                {urbanClass === "major-metro" || urbanClass === "metro"
                  ? ` As a major metropolitan area, ${cityName} offers a wide range of ${config.label.toLowerCase()} options with varying approaches and amenities.`
                  : ` While ${cityName} may have fewer local options, quality ${config.label.toLowerCase()} programs are accessible in the surrounding ${stateName} area.`}
              </p>
            </div>

            {config.sections.map((section, idx) => (
              <div key={idx} className="mb-10">
                <h2 className="text-2xl font-bold text-foreground mb-4">{section.heading} in {cityName}</h2>
                <p className="text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Facilities */}
        <StateFacilitiesSection
          stateSlug={stateSlug!}
          stateName={stateName}
          filterTags={config.filterKeys}
          sectionTitle={`${config.label} Near ${cityName}, ${abbreviation}`}
          cityFilter={cityName}
        />

        {/* FAQs */}
        {faqs.length >= 3 && (
          <section className="py-12 bg-muted/30">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-foreground mb-8">
                Frequently Asked Questions About {config.label} in {cityName}
              </h2>
              <div className="space-y-6">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="bg-card rounded-lg p-6 shadow-sm border">
                    <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Related Links */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {otherCities.length > 0 && (
              <RelatedLinksSection
                title={`${config.label} in Other ${stateName} Cities`}
                links={otherCities}
              />
            )}
            {otherTreatments.length > 0 && (
              <RelatedLinksSection
                title={`Other Treatment Types in ${cityName}`}
                links={otherTreatments}
              />
            )}
          </div>
        </section>

        <SmartInternalLinks
          pageType="city-treatment"
          stateSlug={stateSlug!}
          stateName={stateName}
          citySlug={citySlug}
          treatmentSlug={config.slug}
        />

        {/* CTA */}
        <section className="py-16 bg-primary/5">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Start {config.label} in {cityName} Today
            </h2>
            <p className="text-muted-foreground mb-8">
              Our concierge team will match you with the best {config.label.toLowerCase()} programs in {cityName}. Confidential. No obligation.
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

export default CityTreatmentExpandedPage;
