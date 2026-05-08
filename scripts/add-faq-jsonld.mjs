#!/usr/bin/env node
/**
 * add-faq-jsonld.mjs
 *
 * Adds FAQPage JSON-LD structured data to news.html and rehab-score.html.
 * The FAQ content already exists in both pages as .ns-faq-q / .ns-faq-a
 * CSS-class paragraphs. This script extracts those Q&A pairs and wraps
 * them in a schema.org FAQPage JSON-LD block, inserted just before </head>.
 *
 * Google's FAQ rich result requirements:
 *  - @type: FAQPage
 *  - mainEntity: array of Question objects
 *  - Each Question: @type: Question, name: (question text), acceptedAnswer: { @type: Answer, text: (answer text) }
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");

// The two files that need FAQPage JSON-LD
const TARGET_FILES = [
  { file: join(PUBLIC_DIR, "news.html"), pageUrl: "https://rehablookup.com/news" },
  { file: join(PUBLIC_DIR, "rehab-score.html"), pageUrl: "https://rehablookup.com/rehab-score" },
];

// The FAQ Q&A pairs (same on both pages)
const FAQ_PAIRS = [
  {
    question: "How much does rehab cost?",
    answer: "The cost of rehab varies widely depending on the type of program, length of stay, and location. Many insurance plans cover substance abuse treatment under the Mental Health Parity Act. Free and state-funded programs are also available. RehabLookup helps you find options that fit your budget, including facilities that accept Medicaid, Medicare, and sliding-scale fees.",
  },
  {
    question: "How long does rehab take?",
    answer: "Treatment duration depends on the severity of addiction and the type of program. Detox typically lasts 3–10 days, while inpatient rehab programs range from 28 to 90 days. Outpatient programs may continue for 3–6 months or longer. Research shows that longer treatment durations are associated with better long-term recovery outcomes.",
  },
  {
    question: "Does insurance cover addiction treatment?",
    answer: "Yes. Under the Affordable Care Act and Mental Health Parity Act, most insurance plans are required to cover substance abuse treatment. Major insurers including Aetna, Blue Cross Blue Shield, Cigna, United Healthcare, Humana, and Kaiser Permanente provide coverage for detox, inpatient, and outpatient programs. Medicaid and Medicare also cover treatment in many states.",
  },
  {
    question: "What is the difference between inpatient and outpatient rehab?",
    answer: "Inpatient rehab requires patients to live at the treatment facility full-time, providing 24/7 structured care and supervision. Outpatient rehab allows patients to attend therapy sessions while continuing to live at home. Inpatient is recommended for severe addictions, while outpatient works well for mild to moderate cases or as a step-down from residential care.",
  },
  {
    question: "Can I find free rehab near me?",
    answer: "Yes. Many states offer publicly funded treatment centers that provide free or low-cost services. SAMHSA-funded programs, faith-based organizations, and non-profit treatment centers also offer free options. Use RehabLookup to filter by \"free\" or \"Medicaid-accepted\" to find affordable options near you.",
  },
];

function buildFaqJsonLd(pageUrl) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "url": pageUrl,
    "mainEntity": FAQ_PAIRS.map(({ question, answer }) => ({
      "@type": "Question",
      "name": question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": answer,
      },
    })),
  };
  return `    <script type="application/ld+json">\n${JSON.stringify(schema, null, 6)}\n    </script>`;
}

for (const { file, pageUrl } of TARGET_FILES) {
  let html = readFileSync(file, "utf8");

  // Check if FAQPage JSON-LD already exists
  if (html.includes('"@type": "FAQPage"') || html.includes('"@type":"FAQPage"')) {
    console.log(`ℹ️  ${file} already has FAQPage JSON-LD — skipping`);
    continue;
  }

  const jsonLd = buildFaqJsonLd(pageUrl);
  const insertBefore = "</head>";
  const idx = html.lastIndexOf(insertBefore);
  if (idx === -1) {
    console.error(`❌ ${file}: </head> not found`);
    continue;
  }

  html = html.slice(0, idx) + jsonLd + "\n  " + html.slice(idx);
  writeFileSync(file, html, "utf8");
  console.log(`✅ Added FAQPage JSON-LD to ${file}`);
}

console.log("\nDone.");
