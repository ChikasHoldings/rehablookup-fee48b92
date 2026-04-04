import { ProviderSEOPageLayout } from "@/components/provider-guides/ProviderSEOPageLayout";
import pgPatientAcquisition from "@/assets/provider-guides/pg-patient-acquisition.jpg";
import treatmentFacility from "@/assets/provider-guides/treatment-facility.jpg";

export default function TreatmentCenterPatientAcquisition() {
  return (
    <ProviderSEOPageLayout
      title="Patient Acquisition for Treatment Centers"
      metaTitle="Treatment Center Patient Acquisition: The Complete Guide | RehabLookup"
      metaDescription="Build a sustainable patient acquisition system for your treatment center. Move beyond lead buying and build channels that compound over time."
      canonical="/provider-guides/treatment-center-patient-acquisition"
      keywords={["treatment center patient acquisition", "get more patients treatment center", "rehab patient acquisition strategy", "behavioral health patient acquisition"]}
      heroHeadline="The Complete Guide to Treatment Center Patient Acquisition"
      heroSubheadline="Build acquisition channels that compound — not campaigns that drain your budget the moment you stop spending."
      sections={[
        {
          heading: "Patient Acquisition vs. Lead Buying: Understanding the Difference",
          content: "Too many treatment centers confuse buying leads with patient acquisition. Buying leads is a transaction — you pay money, receive contact information, and hope someone converts. Patient acquisition is a system — a collection of channels, processes, and relationships that consistently deliver qualified patients to your facility over time.",
          bullets: [
            "Lead buying is a cost center; patient acquisition is a growth engine",
            "Acquisition systems compound in value; purchased leads depreciate instantly",
            "The best facilities spend less on marketing per admission because their systems are more efficient",
            "Sustainable acquisition reduces dependence on any single channel or vendor",
          ],
        },
        {
          heading: "The Three Pillars of Sustainable Patient Acquisition",
          content: "Every successful treatment center's acquisition system rests on three pillars: organic discoverability, professional referrals, and operational excellence. Weakness in any pillar creates a vulnerability that no amount of spending on the others can compensate for.",
          bullets: [
            "Organic Discoverability: Being found where families search (directories, Google, content)",
            "Professional Referrals: Relationships with healthcare providers who trust your clinical quality",
            "Operational Excellence: An admissions process that converts inquiries into admissions efficiently",
          ],
        },
        {
          heading: "Building Your Organic Discoverability",
          content: "Organic discoverability means families can find your facility without you paying for each individual impression. This includes treatment directory listings, search engine optimization, Google Business Profile optimization, and content that ranks for treatment-related search terms.",
          bullets: [
            "Claim free listings on RehabLookup, SAMHSA, and Google Business Profile",
            "Create service pages on your website for each treatment program you offer",
            "Build location-specific content for each geographic area you serve",
            "Earn backlinks through partnerships, press coverage, and clinical publications",
            "Maintain consistent NAP (Name, Address, Phone) across all online listings",
          ],
        },
        {
          heading: "Developing a Professional Referral Network",
          content: "Professional referrals convert at the highest rate of any acquisition channel because they come with built-in trust. When a therapist or physician recommends your facility, the family starts the conversation already predisposed to choose you. But referral relationships require investment — they grow through consistent communication, shared values, and demonstrated outcomes.",
          bullets: [
            "Map your ideal referral partners: therapists, psychiatrists, hospitals, EAPs, courts",
            "Create a referral partner program with clear communication and outcome reporting",
            "Visit potential referral partners in person — relationships are built face-to-face",
            "Provide CEU opportunities and educational resources to referral partners",
            "Track referral source performance in your CRM",
          ],
        },
        {
          heading: "RehabLookup: Your Organic Discoverability Partner",
          content: "Building organic discoverability takes time and expertise. RehabLookup accelerates this process by providing your facility with a SEO-optimized profile on a platform that already ranks for thousands of treatment-related search terms. When families search for treatment in your area, your RehabLookup profile helps them find you — without you spending a dollar on advertising.",
        },
      ]}
      ctaHeadline="Build Your Acquisition System — Start Free"
      ctaSubheadline="Your RehabLookup listing is the fastest way to build organic discoverability."
    />
  );
}
