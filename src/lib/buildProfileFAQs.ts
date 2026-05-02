import type { FAQItem } from "@/components/seo/PageFAQ";

interface BuildProfileFAQsInput {
  name: string;
  city?: string | null;
  state?: string | null;
  services?: string[];
  insurance?: string[];
  ageGroups?: string[];
  genderServed?: string | null;
  facilityType?: string | null;
  yearEstablished?: number | null;
  verified?: boolean | null;
  accreditations?: { accreditation_type: string; verified?: boolean | null }[];
}

const formatList = (items: string[], max = 5): string => {
  const trimmed = items.filter(Boolean).slice(0, max);
  if (trimmed.length === 0) return "";
  if (trimmed.length === 1) return trimmed[0];
  if (trimmed.length === 2) return `${trimmed[0]} and ${trimmed[1]}`;
  return `${trimmed.slice(0, -1).join(", ")}, and ${trimmed[trimmed.length - 1]}`;
};

const genderLabel = (g?: string | null) => {
  if (!g) return null;
  if (g === "male") return "men";
  if (g === "female") return "women";
  if (g === "all") return "adults of all genders";
  return g;
};

/**
 * Builds a unique, data-driven FAQ list for a facility profile page.
 * Returns at least 3 FAQs when minimum data is available so the FAQPage
 * JSON-LD audit (`check:faq-jsonld`) emits valid structured data.
 */
export function buildProfileFAQs(input: BuildProfileFAQsInput): FAQItem[] {
  const {
    name,
    city,
    state,
    services = [],
    insurance = [],
    ageGroups = [],
    genderServed,
    facilityType,
    yearEstablished,
    verified,
    accreditations = [],
  } = input;

  const location =
    city && state ? `${city}, ${state}` : state || city || "this area";
  const faqs: FAQItem[] = [];

  // 1. Services / treatment offered
  if (services.length > 0) {
    faqs.push({
      question: `What treatment programs does ${name} offer?`,
      answer: `${name} in ${location} offers ${formatList(services, 6)}${
        services.length > 6 ? `, plus additional specialized programs` : ""
      }. Programs are tailored to each client based on a clinical assessment at intake. Contact admissions to confirm which level of care best fits your situation.`,
    });
  } else {
    faqs.push({
      question: `What kind of treatment does ${name} provide?`,
      answer: `${name} is a ${
        facilityType?.toLowerCase() || "treatment"
      } center based in ${location}. The admissions team can walk you through available levels of care, length of stay, and clinical approach during a confidential phone screening.`,
    });
  }

  // 2. Insurance / payment
  if (insurance.length > 0) {
    faqs.push({
      question: `Does ${name} accept insurance?`,
      answer: `${name} works with several major insurance providers, including ${formatList(
        insurance,
        6,
      )}${
        insurance.length > 6 ? ", among others" : ""
      }. Coverage and out-of-pocket costs vary by plan and level of care. We recommend verifying your specific benefits with the admissions team before admission.`,
    });
  } else {
    faqs.push({
      question: `How do I pay for treatment at ${name}?`,
      answer: `${name} can review your insurance benefits and discuss self-pay or financing options during a confidential admissions call. Cost depends on the level of care, length of stay, and your specific plan.`,
    });
  }

  // 3. Who it serves (age / gender)
  const genderL = genderLabel(genderServed);
  const ageList = ageGroups.length > 0 ? formatList(ageGroups, 4) : null;
  if (genderL || ageList) {
    const parts: string[] = [];
    if (genderL) parts.push(`treatment for ${genderL}`);
    if (ageList) parts.push(`programs for ${ageList}`);
    faqs.push({
      question: `Who is ${name} designed to treat?`,
      answer: `${name} provides ${parts.join(
        " and ",
      )}. The clinical team can confirm whether the program is the right fit during the admissions assessment.`,
    });
  } else {
    faqs.push({
      question: `Who can attend ${name}?`,
      answer: `${name} serves clients seeking addiction and behavioral health treatment in ${location}. The admissions team can confirm eligibility, age requirements, and any specialty tracks during a confidential phone call.`,
    });
  }

  // 4. Trust / accreditation
  const verifiedAccs = accreditations.filter((a) => a?.verified).map((a) => a.accreditation_type);
  if (verifiedAccs.length > 0 || verified || yearEstablished) {
    const trustParts: string[] = [];
    if (verifiedAccs.length > 0) {
      trustParts.push(`verified accreditations (${formatList(verifiedAccs, 4)})`);
    }
    if (verified) trustParts.push(`a verified provider profile on RehabLookup`);
    if (yearEstablished) trustParts.push(`operations dating back to ${yearEstablished}`);
    faqs.push({
      question: `Is ${name} a legitimate, accredited treatment center?`,
      answer: `${name} maintains ${formatList(
        trustParts,
        3,
      )}. Each accreditation is independently reviewed by our team before being displayed on the profile. You can also contact licensing boards in ${
        state || "your state"
      } to verify a center's good standing.`,
    });
  }

  // 5. Location-specific
  if (city && state) {
    faqs.push({
      question: `Where is ${name} located?`,
      answer: `${name} is located in ${city}, ${state}. The exact address and directions are available on the profile, and the admissions team can also help coordinate transportation for clients traveling from out of the area.`,
    });
  }

  return faqs.slice(0, 6);
}
