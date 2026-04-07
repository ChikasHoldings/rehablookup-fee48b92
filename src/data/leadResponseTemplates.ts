export interface ResponseTemplate {
  id: string;
  category: "initial" | "follow-up" | "insurance" | "scheduling" | "family";
  categoryLabel: string;
  title: string;
  channel: "sms" | "email" | "both";
  subject?: string;
  body: string;
}

export const leadResponseTemplates: ResponseTemplate[] = [
  {
    id: "initial-warm",
    category: "initial",
    categoryLabel: "Initial Outreach",
    title: "Warm First Contact",
    channel: "sms",
    body: `Hi {{name}}, this is {{your_name}} from {{facility_name}}. We received your inquiry and would love to help. Is now a good time for a brief, confidential call? We're here when you're ready.`,
  },
  {
    id: "initial-email",
    category: "initial",
    categoryLabel: "Initial Outreach",
    title: "Professional Email Introduction",
    channel: "email",
    subject: "Your Inquiry to {{facility_name}} — We're Here to Help",
    body: `Dear {{name}},

Thank you for reaching out to {{facility_name}}. We understand that taking this step takes courage, and we want you to know we're here to support you.

Our admissions team is available to answer any questions you may have about our programs, insurance coverage, and what to expect during treatment.

Would you be available for a confidential call today or tomorrow? You can reach us directly at {{phone}}.

With care,
{{your_name}}
{{facility_name}} Admissions Team`,
  },
  {
    id: "followup-24hr",
    category: "follow-up",
    categoryLabel: "Follow-Up",
    title: "24-Hour Follow-Up",
    channel: "sms",
    body: `Hi {{name}}, just checking in from {{facility_name}}. We know this is a big decision and there's no pressure. If you have any questions about our program or insurance, we're a quick call away at {{phone}}.`,
  },
  {
    id: "followup-48hr",
    category: "follow-up",
    categoryLabel: "Follow-Up",
    title: "48-Hour Gentle Follow-Up",
    channel: "email",
    subject: "Still Here for You — {{facility_name}}",
    body: `Hi {{name}},

I wanted to follow up on your recent inquiry. We understand the decision-making process can feel overwhelming, and we're here without any pressure.

A few things that might help:
• We accept most major insurance plans and can verify your benefits in minutes
• Our admissions process is confidential and compassionate
• We can answer any questions over the phone or via email

When you're ready, we're here. You can call us anytime at {{phone}}.

Warmly,
{{your_name}}
{{facility_name}}`,
  },
  {
    id: "insurance-vob",
    category: "insurance",
    categoryLabel: "Insurance Verification",
    title: "Insurance Verification Request",
    channel: "sms",
    body: `Hi {{name}}, this is {{your_name}} from {{facility_name}}. We'd love to check your insurance benefits — it only takes a few minutes and is completely confidential. Could you share your insurance provider and member ID? We'll handle the rest.`,
  },
  {
    id: "insurance-email",
    category: "insurance",
    categoryLabel: "Insurance Verification",
    title: "Detailed Insurance Email",
    channel: "email",
    subject: "Free Insurance Verification — {{facility_name}}",
    body: `Hi {{name}},

We offer a free, confidential insurance verification to help you understand your coverage for treatment. To get started, we just need:

1. Insurance provider name
2. Member ID number
3. Date of birth

Our team will verify your benefits and walk you through what's covered — typically within 1-2 hours.

Feel free to reply to this email or call us at {{phone}}.

Best,
{{your_name}}
{{facility_name}} Admissions`,
  },
  {
    id: "scheduling-tour",
    category: "scheduling",
    categoryLabel: "Tour & Assessment",
    title: "Tour/Assessment Invitation",
    channel: "both",
    body: `Hi {{name}}, we'd love to invite you for a tour of {{facility_name}} or a confidential phone assessment — whichever you're most comfortable with. We have availability this week. What day works best for you?`,
  },
  {
    id: "family-response",
    category: "family",
    categoryLabel: "Family Member",
    title: "Response to Family Member",
    channel: "email",
    subject: "Supporting Your Loved One — {{facility_name}}",
    body: `Dear {{name}},

Thank you for reaching out on behalf of your loved one. We know how difficult this time can be for the entire family, and we commend you for seeking help.

At {{facility_name}}, we work closely with families throughout the treatment process. Here's what we can help with:

• A confidential assessment to determine the right level of care
• Insurance verification and financial options
• Family support resources and visiting information
• A tour (in-person or virtual) of our facility

We're here to answer any questions. Please call us at {{phone}} or reply to this email.

With compassion,
{{your_name}}
{{facility_name}} Admissions Team`,
  },
];

export const templateCategories = [
  { key: "initial", label: "Initial Outreach" },
  { key: "follow-up", label: "Follow-Up" },
  { key: "insurance", label: "Insurance Verification" },
  { key: "scheduling", label: "Tour & Assessment" },
  { key: "family", label: "Family Member" },
] as const;
