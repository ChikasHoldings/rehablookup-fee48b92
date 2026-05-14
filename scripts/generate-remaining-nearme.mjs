#!/usr/bin/env node
/**
 * generate-remaining-nearme.mjs
 * Generates the 29 near-me root pages that are in the sitemap but not
 * covered by generate-seo-html.mjs's nearMePages array.
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GA_MEASUREMENT_ID } from "./_ga.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const BASE_URL = "https://rehablookup.com";

const pages = [
  { slug: "24-7-detox-near-me", title: "24/7 Detox Near Me", desc: "Find 24/7 medical detox centers near you. Immediate admission, around-the-clock supervised withdrawal management for alcohol, opioids, and other substances." },
  { slug: "30-day-rehab-near-me", title: "30-Day Rehab Near Me", desc: "Find 30-day rehab programs near you. Short-term residential treatment with medical detox, therapy, and aftercare planning." },
  { slug: "60-day-rehab-near-me", title: "60-Day Rehab Near Me", desc: "Find 60-day rehab programs near you. Extended residential treatment for deeper recovery and skill-building." },
  { slug: "90-day-rehab-near-me", title: "90-Day Rehab Near Me", desc: "Find 90-day rehab programs near you. Long-term residential treatment for lasting recovery from addiction." },
  { slug: "aetna-rehab-near-me", title: "Aetna Rehab Near Me", desc: "Find rehab centers near you that accept Aetna insurance. In-network addiction treatment for detox, inpatient, and outpatient programs." },
  { slug: "benzo-rehab-near-me", title: "Benzo Rehab Near Me", desc: "Find benzodiazepine rehab centers near you. Medically supervised detox and treatment for Xanax, Valium, and Klonopin dependence." },
  { slug: "blue-cross-rehab-near-me", title: "Blue Cross Rehab Near Me", desc: "Find rehab centers near you that accept Blue Cross Blue Shield insurance. In-network addiction treatment programs." },
  { slug: "cigna-rehab-near-me", title: "Cigna Rehab Near Me", desc: "Find rehab centers near you that accept Cigna insurance. In-network addiction treatment for detox, inpatient, and outpatient programs." },
  { slug: "cocaine-rehab-near-me", title: "Cocaine Rehab Near Me", desc: "Find cocaine addiction treatment centers near you. Evidence-based therapy, behavioral interventions, and comprehensive recovery programs." },
  { slug: "emergency-rehab-near-me", title: "Emergency Rehab Near Me", desc: "Find emergency rehab admissions near you. Same-day and next-day intake for urgent addiction treatment needs." },
  { slug: "first-responder-rehab-near-me", title: "First Responder Rehab Near Me", desc: "Find rehab programs near you designed for first responders. Confidential treatment for police, firefighters, EMTs, and military personnel." },
  { slug: "heroin-rehab-near-me", title: "Heroin Rehab Near Me", desc: "Find heroin addiction treatment centers near you. MAT, medical detox, inpatient rehab, and long-term recovery programs." },
  { slug: "humana-rehab-near-me", title: "Humana Rehab Near Me", desc: "Find rehab centers near you that accept Humana insurance. In-network addiction treatment programs for detox and rehabilitation." },
  { slug: "immediate-rehab-near-me", title: "Immediate Rehab Near Me", desc: "Find rehab centers near you with immediate availability. Same-day admissions for urgent addiction treatment." },
  { slug: "kratom-rehab-near-me", title: "Kratom Rehab Near Me", desc: "Find kratom addiction treatment centers near you. Medical withdrawal management and evidence-based recovery programs." },
  { slug: "lgbtq-rehab-near-me", title: "LGBTQ+ Rehab Near Me", desc: "Find LGBTQ+-affirming rehab centers near you. Gender-inclusive addiction treatment with culturally competent care." },
  { slug: "low-cost-rehab-near-me", title: "Low-Cost Rehab Near Me", desc: "Find affordable and low-cost rehab centers near you. Sliding-scale fees, state-funded programs, and nonprofit treatment options." },
  { slug: "marijuana-rehab-near-me", title: "Marijuana Rehab Near Me", desc: "Find marijuana addiction treatment centers near you. Evidence-based programs for cannabis use disorder." },
  { slug: "medicare-rehab-near-me", title: "Medicare Rehab Near Me", desc: "Find rehab centers near you that accept Medicare. Addiction treatment covered under Medicare Part A and Part B." },
  { slug: "meth-rehab-near-me", title: "Meth Rehab Near Me", desc: "Find methamphetamine addiction treatment centers near you. Specialized detox, behavioral therapy, and recovery programs." },
  { slug: "opioid-rehab-near-me", title: "Opioid Rehab Near Me", desc: "Find opioid addiction treatment centers near you. MAT, Suboxone, methadone, and comprehensive recovery programs." },
  { slug: "prescription-drug-rehab-near-me", title: "Prescription Drug Rehab Near Me", desc: "Find prescription drug addiction treatment near you. Specialized programs for painkiller, benzo, and stimulant dependence." },
  { slug: "same-day-rehab-near-me", title: "Same-Day Rehab Near Me", desc: "Find rehab centers near you with same-day admissions. Immediate intake for urgent addiction treatment needs." },
  { slug: "seniors-rehab-near-me", title: "Senior Rehab Near Me", desc: "Find rehab programs near you designed for seniors and older adults. Age-appropriate addiction treatment with medical expertise." },
  { slug: "short-term-rehab-near-me", title: "Short-Term Rehab Near Me", desc: "Find short-term rehab programs near you. 28-30 day residential treatment with detox, therapy, and aftercare planning." },
  { slug: "tricare-rehab-near-me", title: "Tricare Rehab Near Me", desc: "Find rehab centers near you that accept Tricare insurance. Addiction treatment for military members, veterans, and their families." },
  { slug: "united-healthcare-rehab-near-me", title: "UnitedHealthcare Rehab Near Me", desc: "Find rehab centers near you that accept UnitedHealthcare insurance. In-network addiction treatment programs." },
  { slug: "xanax-rehab-near-me", title: "Xanax Rehab Near Me", desc: "Find Xanax addiction treatment centers near you. Medically supervised tapering, detox, and comprehensive recovery programs." },
  { slug: "young-adult-rehab-near-me", title: "Young Adult Rehab Near Me", desc: "Find young adult rehab programs near you. Age-appropriate addiction treatment for adults ages 18-30." },
];

function escHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildHtml(slug, title, desc) {
  const urlPath = "/" + slug;
  const canonical = BASE_URL + urlPath;
  const safeTitle = escHtml(title);
  const safeDesc = escHtml(desc);
  const bcSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://rehablookup.com/" },
      { "@type": "ListItem", position: 2, name: title, item: canonical },
    ],
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} — Find Local Treatment | RehabLookup</title>
  <meta name="description" content="${safeDesc}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="RehabLookup">
  <meta property="og:image" content="https://rehablookup.com/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="https://rehablookup.com/og-image.jpg">
  <link rel="icon" type="image/png" href="/favicon.png">
  <script type="application/ld+json">${bcSchema}</script>
  <style>
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:0 auto;padding:32px 20px;color:#1a2b4a;line-height:1.7}
    h1{font-size:2rem;color:#1B365D;margin-bottom:12px}
    h2{font-size:1.4rem;color:#1B365D;margin-top:28px}
    p{color:#333;margin-bottom:16px}
    a{color:#2563eb;text-decoration:none}
    a:hover{text-decoration:underline}
    .cta{background:#eff6ff;border:1px solid #bfdbfe;border-radius:.75rem;padding:1.5rem;margin:2rem 0;text-align:center}
    .btn{display:inline-block;padding:.6rem 1.4rem;border-radius:.5rem;font-weight:600;background:#2563eb;color:#fff;margin:.25rem;text-decoration:none}
    footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:.8rem;color:#888}
  </style>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:true});</script>
</head>
<body>
  <header style="padding:12px 0 20px;border-bottom:1px solid #e5e7eb;margin-bottom:20px">
    <a href="/" style="font-weight:700;font-size:1.25rem;color:#1B365D;text-decoration:none">RehabLookup</a>
  </header>
  <main>
    <h1>${safeTitle}</h1>
    <p>${safeDesc}</p>
    <h2>How to Find Treatment Near You</h2>
    <p>Enter your city, zip code, or state to find nearby facilities. Filter by insurance, treatment type, and amenities to find the right program for your needs.</p>
    <h2>Browse by State</h2>
    <p>Select your state to find ${safeTitle.toLowerCase()} in your area:</p>
    <p>
      <a href="/${slug}/california">California</a> &middot;
      <a href="/${slug}/florida">Florida</a> &middot;
      <a href="/${slug}/texas">Texas</a> &middot;
      <a href="/${slug}/new-york">New York</a> &middot;
      <a href="/${slug}/ohio">Ohio</a> &middot;
      <a href="/${slug}/pennsylvania">Pennsylvania</a> &middot;
      <a href="/${slug}/illinois">Illinois</a> &middot;
      <a href="/${slug}/georgia">Georgia</a>
    </p>
    <h2>Insurance Coverage</h2>
    <p>Most major insurance plans cover addiction treatment under the Mental Health Parity and Addiction Equity Act. Use our free insurance verification tool to check your benefits before starting treatment.</p>
    <div class="cta">
      <h2>Search Treatment Centers Now</h2>
      <p>Find accredited rehab centers in your area.</p>
      <a href="/search-results" class="btn">Search Centers</a>
      <a href="/concierge" class="btn" style="background:#fff;color:#2563eb;border:1px solid #2563eb">Get Free Help</a>
    </div>
    <p><a href="/rehab-centers">Browse All States</a> &middot; <a href="/resources">Recovery Resources</a> &middot; <a href="/">Home</a></p>
  </main>
  <footer><p>&copy; 2026 RehabLookup. All rights reserved. <a href="/privacy-policy">Privacy Policy</a> &middot; <a href="/terms-of-service">Terms of Service</a></p></footer>
</body>
</html>`;
}

async function writePage(slug, title, desc) {
  const html = buildHtml(slug, title, desc);
  const flatPath = path.join(publicDir, `${slug}.html`);
  await mkdir(path.dirname(flatPath), { recursive: true });
  await writeFile(flatPath, html, "utf8");
  // Single flat .html — see generate-seo-html.mjs for rationale.
}

let count = 0;
for (const { slug, title, desc } of pages) {
  await writePage(slug, title, desc);
  count++;
}
console.log(`Generated ${count} remaining near-me pages`);
