#!/usr/bin/env node
/**
 * Generate static HTML for all remaining missing public routes.
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const BASE_URL = "https://rehablookup.com";
let count = 0;

function escHtml(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function html({ urlPath, title, metaTitle, metaDescription, h1, content, breadcrumbs, faqs }) {
  const canonical = `${BASE_URL}${urlPath}`;
  const st = escHtml(metaTitle || title);
  const sd = escHtml(metaDescription);
  const bcHtml = breadcrumbs ? breadcrumbs.map((b,i) => `<li><a href="${b.url}">${escHtml(b.name)}</a>${i<breadcrumbs.length-1?" &rsaquo; ":""}</li>`).join("") : "";
  const bcSchema = breadcrumbs ? `<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:breadcrumbs.map((b,i)=>({"@type":"ListItem",position:i+1,name:b.name,item:`${BASE_URL}${b.url}`}))})}</script>` : "";
  const faqSchema = (faqs && faqs.length) ? `<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"FAQPage",mainEntity:faqs.map(f=>({"@type":"Question",name:f.q,acceptedAnswer:{"@type":"Answer",text:f.a}}))})}</script>` : "";
  const faqHtml = (faqs && faqs.length) ? `<section aria-labelledby="faq-heading"><h2 id="faq-heading">Frequently Asked Questions</h2>${faqs.map(f=>`<article><h3>${escHtml(f.q)}</h3><p>${escHtml(f.a)}</p></article>`).join("")}</section>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${st}</title>
  <meta name="description" content="${sd}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${st}">
  <meta property="og:description" content="${sd}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="RehabLookup">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${st}">
  <meta name="twitter:description" content="${sd}">
  <link rel="icon" type="image/png" href="/favicon.png">
  ${bcSchema}
  <style>
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:0 auto;padding:32px 20px;color:#1a2b4a;line-height:1.7}
    h1{font-size:2rem;color:#1B365D;margin-bottom:12px}
    h2{font-size:1.4rem;color:#1B365D;margin-top:28px}
    p{color:#333;margin-bottom:16px}
    a{color:#2563eb;text-decoration:none}
    a:hover{text-decoration:underline}
    .breadcrumbs{font-size:.85rem;color:#666;margin-bottom:20px}
    .breadcrumbs ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:4px}
    footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:.8rem;color:#888}
  </style>
</head>
<body>
  <header><a href="/" aria-label="RehabLookup Home">RehabLookup</a></header>
  ${bcHtml ? `<nav class="breadcrumbs" aria-label="Breadcrumb"><ul>${bcHtml}</ul></nav>` : ""}
  <main>
    <h1>${escHtml(h1||title)}</h1>
    ${content}
    <p style="margin-top:24px"><a href="/rehab-centers">Browse All Treatment Centers</a> &middot; <a href="/concierge">Get Personalized Help</a> &middot; <a href="/">Home</a></p>
  </main>
  <footer><p>&copy; 2026 RehabLookup. All rights reserved. <a href="/privacy-policy">Privacy</a> &middot; <a href="/terms-of-service">Terms</a></p></footer>
</body>
</html>`;
}

async function write(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  count++;
}

// Page definitions for all missing routes
const pages = [
  // Core pages
  { path: "/about", title: "About RehabLookup", desc: "Learn about RehabLookup's mission to connect people with accredited addiction treatment centers across the United States.", bc: [{ name: "Home", url: "/" }, { name: "About", url: "/about" }] },
  { path: "/contact", title: "Contact Us", desc: "Get in touch with RehabLookup. Questions about treatment, provider listings, or our services. We're here to help.", bc: [{ name: "Home", url: "/" }, { name: "Contact", url: "/contact" }] },
  { path: "/faq", title: "Frequently Asked Questions", desc: "Common questions about addiction treatment, insurance coverage, rehab centers, and how RehabLookup helps you find the right program.", bc: [{ name: "Home", url: "/" }, { name: "FAQ", url: "/faq" }] },
  { path: "/how-it-works", title: "How RehabLookup Works", desc: "Learn how RehabLookup connects you with accredited rehab centers. Search, compare, verify insurance, and get matched with treatment programs.", bc: [{ name: "Home", url: "/" }, { name: "How It Works", url: "/how-it-works" }] },
  { path: "/concierge", title: "Concierge Placement Service", desc: "Free personalized treatment placement. Our concierge team matches you with accredited rehab centers based on your needs, insurance, and preferences.", bc: [{ name: "Home", url: "/" }, { name: "Concierge", url: "/concierge" }] },
  { path: "/resources", title: "Addiction Recovery Resources", desc: "Free resources for addiction recovery including guides, articles, and tools. Education on treatment options, insurance, and the recovery process.", bc: [{ name: "Home", url: "/" }, { name: "Resources", url: "/resources" }] },
  { path: "/locations", title: "Find Rehab Centers by Location", desc: "Browse addiction treatment centers by state and city. Find accredited rehab programs near you across all 50 states.", bc: [{ name: "Home", url: "/" }, { name: "Locations", url: "/locations" }] },
  { path: "/insurance", title: "Insurance Coverage for Rehab", desc: "Learn how your insurance covers addiction treatment. Verify benefits for major carriers including Aetna, BCBS, Cigna, UnitedHealthcare, and more.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }] },
  { path: "/treatment-types", title: "Addiction Treatment Types", desc: "Explore different types of addiction treatment including inpatient rehab, outpatient programs, detox, dual diagnosis, and specialty programs.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }] },
  { path: "/rehab-centers", title: "Find Rehab Centers Near You", desc: "Search accredited addiction treatment centers across the United States. Compare facilities, verify insurance, and start your recovery journey.", bc: [{ name: "Home", url: "/" }, { name: "Rehab Centers", url: "/rehab-centers" }] },
  { path: "/cost-estimator", title: "Rehab Cost Estimator", desc: "Estimate the cost of addiction treatment. Compare pricing for inpatient, outpatient, and detox programs. Check insurance coverage.", bc: [{ name: "Home", url: "/" }, { name: "Cost Estimator", url: "/cost-estimator" }] },
  { path: "/privacy-policy", title: "Privacy Policy", desc: "RehabLookup's privacy policy. How we collect, use, and protect your personal information. HIPAA compliance and data security.", bc: [{ name: "Home", url: "/" }, { name: "Privacy Policy", url: "/privacy-policy" }] },
  { path: "/terms-of-service", title: "Terms of Service", desc: "RehabLookup terms of service. Usage guidelines, disclaimers, and legal information for our addiction treatment directory.", bc: [{ name: "Home", url: "/" }, { name: "Terms of Service", url: "/terms-of-service" }] },
  { path: "/international", title: "International Patients | US Rehab for Foreign Patients", desc: "Addiction treatment in the USA for international patients. Visa guidance, travel coordination, and placement at accredited American rehab centers.", bc: [{ name: "Home", url: "/" }, { name: "International", url: "/international" }] },
  { path: "/placement-help", title: "Treatment Placement Help", desc: "Get free help finding the right rehab center. Our placement specialists match you with accredited programs based on your needs.", bc: [{ name: "Home", url: "/" }, { name: "Placement Help", url: "/placement-help" }] },
  { path: "/request-help", title: "Request Treatment Help", desc: "Request personalized help finding addiction treatment. Our team connects you with accredited rehab centers that match your needs.", bc: [{ name: "Home", url: "/" }, { name: "Request Help", url: "/request-help" }] },

  // Treatment hub pages
  { path: "/alcohol-rehab-centers", title: "Alcohol Rehab Centers", desc: "Find accredited alcohol rehab centers near you. Compare inpatient, outpatient, and detox programs for alcohol addiction treatment.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Alcohol Rehab Centers", url: "/alcohol-rehab-centers" }] },
  { path: "/drug-rehab-centers", title: "Drug Rehab Centers", desc: "Find verified drug rehab centers offering detox, inpatient, and outpatient programs. Compare facilities and start recovery.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Drug Rehab Centers", url: "/drug-rehab-centers" }] },
  { path: "/detox-centers", title: "Medical Detox Centers", desc: "Find medically supervised detox centers with 24/7 care. Safe withdrawal management for alcohol, opioids, and other substances.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Detox Centers", url: "/detox-centers" }] },
  { path: "/inpatient-rehab", title: "Inpatient Rehab Programs", desc: "Find residential inpatient rehab programs with 24/7 care. Compare accredited facilities and begin your recovery journey.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Inpatient Rehab", url: "/inpatient-rehab" }] },
  { path: "/outpatient-rehab", title: "Outpatient Rehab Programs", desc: "Find flexible outpatient rehab programs including IOP and PHP. Continue working while getting evidence-based addiction treatment.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Outpatient Rehab", url: "/outpatient-rehab" }] },
  { path: "/dual-diagnosis-treatment", title: "Dual Diagnosis Treatment Centers", desc: "Find specialized dual diagnosis treatment centers treating addiction and co-occurring mental health disorders simultaneously.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Dual Diagnosis", url: "/dual-diagnosis-treatment" }] },
  { path: "/free-rehab-centers", title: "Free Rehab Centers Near You", desc: "Find free and low-cost rehab centers near you. State-funded programs, Medicaid-accepting facilities, and nonprofit treatment options.", bc: [{ name: "Home", url: "/" }, { name: "Free Rehab Centers", url: "/free-rehab-centers" }] },
  { path: "/medicaid-rehab-centers", title: "Medicaid Rehab Centers", desc: "Find rehab centers that accept Medicaid insurance. Learn what Medicaid covers for addiction treatment in your state.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Medicaid Rehab", url: "/medicaid-rehab-centers" }] },

  // Treatment type sub-pages
  { path: "/treatment-types/alcohol-rehabilitation", title: "Alcohol Rehabilitation Programs", desc: "Explore alcohol rehabilitation programs including detox, inpatient, outpatient, and aftercare. Find the right level of care for recovery.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Alcohol Rehabilitation", url: "/treatment-types/alcohol-rehabilitation" }] },
  { path: "/treatment-types/drug-addiction", title: "Drug Addiction Treatment", desc: "Comprehensive drug addiction treatment programs. Evidence-based care for opioid, stimulant, and polysubstance use disorders.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Drug Addiction", url: "/treatment-types/drug-addiction" }] },
  { path: "/treatment-types/drug-addiction-treatment", title: "Drug Addiction Treatment Programs", desc: "Find drug addiction treatment programs with evidence-based approaches. Detox, inpatient, outpatient, and MAT options.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Drug Addiction Treatment", url: "/treatment-types/drug-addiction-treatment" }] },
  { path: "/treatment-types/detox-programs", title: "Medical Detox Programs", desc: "Find medically supervised detox programs for safe withdrawal. 24/7 monitoring, medication-assisted protocols, and compassionate care.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Detox Programs", url: "/treatment-types/detox-programs" }] },
  { path: "/treatment-types/residential-inpatient", title: "Residential Inpatient Treatment", desc: "Explore residential inpatient treatment programs with 24/7 care, structured therapy, and supportive recovery environments.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Residential Inpatient", url: "/treatment-types/residential-inpatient" }] },
  { path: "/treatment-types/outpatient-programs", title: "Outpatient Treatment Programs", desc: "Find outpatient addiction treatment programs including IOP and PHP. Flexible scheduling while receiving evidence-based care.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Outpatient Programs", url: "/treatment-types/outpatient-programs" }] },
  { path: "/treatment-types/dual-diagnosis", title: "Dual Diagnosis Treatment", desc: "Specialized treatment for co-occurring addiction and mental health disorders. Integrated care addressing both conditions simultaneously.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Dual Diagnosis", url: "/treatment-types/dual-diagnosis" }] },
  { path: "/treatment-types/dual-diagnosis-treatment", title: "Dual Diagnosis Treatment Programs", desc: "Find dual diagnosis treatment programs for co-occurring disorders. Integrated mental health and addiction care at accredited facilities.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Dual Diagnosis Treatment", url: "/treatment-types/dual-diagnosis-treatment" }] },
  { path: "/treatment-types/holistic-therapy", title: "Holistic Addiction Therapy", desc: "Explore holistic addiction treatment approaches including yoga, meditation, acupuncture, art therapy, and nutritional counseling.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Holistic Therapy", url: "/treatment-types/holistic-therapy" }] },
  { path: "/treatment-types/holistic-treatment", title: "Holistic Treatment Programs", desc: "Find holistic treatment programs combining traditional and complementary therapies for whole-person addiction recovery.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Holistic Treatment", url: "/treatment-types/holistic-treatment" }] },
  { path: "/treatment-types/luxury-rehab", title: "Luxury Rehab Programs", desc: "Explore luxury rehab programs with premium amenities, private accommodations, and world-class clinical care for addiction recovery.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Luxury Rehab", url: "/treatment-types/luxury-rehab" }] },

  // Legacy treatment redirects (still need HTML for crawlers)
  { path: "/treatment/detox", title: "Detox Treatment Programs", desc: "Medical detoxification programs for safe substance withdrawal. Find accredited detox centers with 24/7 medical supervision.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Detox", url: "/treatment/detox" }] },
  { path: "/treatment/dual-diagnosis", title: "Dual Diagnosis Treatment", desc: "Treatment for co-occurring addiction and mental health conditions. Find integrated dual diagnosis programs at accredited facilities.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Dual Diagnosis", url: "/treatment/dual-diagnosis" }] },

  // Substance-specific
  { path: "/benzodiazepine-addiction-treatment", title: "Benzodiazepine Addiction Treatment", desc: "Find specialized benzodiazepine addiction treatment centers. Medical detox with tapering protocols, therapy, and long-term recovery support.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Benzodiazepine Treatment", url: "/benzodiazepine-addiction-treatment" }] },
  { path: "/cocaine-addiction-treatment", title: "Cocaine Addiction Treatment", desc: "Find cocaine addiction treatment programs offering evidence-based therapy, behavioral interventions, and comprehensive recovery support.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Cocaine Treatment", url: "/cocaine-addiction-treatment" }] },
  { path: "/heroin-addiction-treatment", title: "Heroin Addiction Treatment", desc: "Find heroin addiction treatment centers offering MAT, medical detox, inpatient rehab, and long-term recovery programs.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Heroin Treatment", url: "/heroin-addiction-treatment" }] },
  { path: "/meth-addiction-treatment", title: "Meth Addiction Treatment", desc: "Find methamphetamine addiction treatment centers with specialized detox, behavioral therapy, and comprehensive recovery programs.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Meth Treatment", url: "/meth-addiction-treatment" }] },
  { path: "/opioid-addiction-treatment", title: "Opioid Addiction Treatment", desc: "Find opioid addiction treatment programs with MAT (Suboxone, methadone, Vivitrol), medical detox, and evidence-based recovery care.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Opioid Treatment", url: "/opioid-addiction-treatment" }] },
  { path: "/prescription-drug-rehab", title: "Prescription Drug Rehab", desc: "Find prescription drug addiction treatment centers. Specialized programs for painkiller, benzodiazepine, and stimulant dependence.", bc: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: "Prescription Drug Rehab", url: "/prescription-drug-rehab" }] },

  // Near-me pages
  { path: "/alcohol-rehab-near-me", title: "Alcohol Rehab Near Me", desc: "Find alcohol rehab centers near you. Compare local inpatient, outpatient, and detox programs for alcohol addiction.", bc: [{ name: "Home", url: "/" }, { name: "Alcohol Rehab Near Me", url: "/alcohol-rehab-near-me" }] },
  { path: "/drug-rehab-near-me", title: "Drug Rehab Near Me", desc: "Find drug rehab centers near you. Local addiction treatment programs with detox, inpatient, and outpatient options.", bc: [{ name: "Home", url: "/" }, { name: "Drug Rehab Near Me", url: "/drug-rehab-near-me" }] },
  { path: "/detox-near-me", title: "Detox Centers Near Me", desc: "Find medical detox centers near you. 24/7 supervised withdrawal management for alcohol, opioids, and other substances.", bc: [{ name: "Home", url: "/" }, { name: "Detox Near Me", url: "/detox-near-me" }] },
  { path: "/inpatient-rehab-near-me", title: "Inpatient Rehab Near Me", desc: "Find inpatient rehab programs near you. Residential treatment with 24/7 care, structured therapy, and supportive environment.", bc: [{ name: "Home", url: "/" }, { name: "Inpatient Rehab Near Me", url: "/inpatient-rehab-near-me" }] },
  { path: "/outpatient-rehab-near-me", title: "Outpatient Rehab Near Me", desc: "Find outpatient rehab programs near you. Flexible IOP and PHP treatment options while maintaining daily responsibilities.", bc: [{ name: "Home", url: "/" }, { name: "Outpatient Rehab Near Me", url: "/outpatient-rehab-near-me" }] },
  { path: "/outpatient-near-me", title: "Outpatient Programs Near Me", desc: "Find outpatient addiction treatment near you. Flexible programs including IOP and PHP with evidence-based care.", bc: [{ name: "Home", url: "/" }, { name: "Outpatient Near Me", url: "/outpatient-near-me" }] },
  { path: "/dual-diagnosis-near-me", title: "Dual Diagnosis Treatment Near Me", desc: "Find dual diagnosis treatment centers near you. Integrated care for co-occurring addiction and mental health disorders.", bc: [{ name: "Home", url: "/" }, { name: "Dual Diagnosis Near Me", url: "/dual-diagnosis-near-me" }] },
  { path: "/dual-diagnosis-rehab-near-me", title: "Dual Diagnosis Rehab Near Me", desc: "Find dual diagnosis rehab centers near you treating addiction and mental health conditions simultaneously.", bc: [{ name: "Home", url: "/" }, { name: "Dual Diagnosis Rehab Near Me", url: "/dual-diagnosis-rehab-near-me" }] },
  { path: "/free-rehab-near-me", title: "Free Rehab Centers Near Me", desc: "Find free and low-cost rehab centers near you. State-funded, Medicaid, and nonprofit addiction treatment options.", bc: [{ name: "Home", url: "/" }, { name: "Free Rehab Near Me", url: "/free-rehab-near-me" }] },
  { path: "/luxury-rehab-near-me", title: "Luxury Rehab Near Me", desc: "Find luxury rehab centers near you with premium amenities, private accommodations, and world-class addiction treatment.", bc: [{ name: "Home", url: "/" }, { name: "Luxury Rehab Near Me", url: "/luxury-rehab-near-me" }] },
  { path: "/faith-based-rehab-near-me", title: "Faith-Based Rehab Near Me", desc: "Find faith-based rehab centers near you. Christian and spiritual addiction treatment programs with counseling and support.", bc: [{ name: "Home", url: "/" }, { name: "Faith-Based Rehab Near Me", url: "/faith-based-rehab-near-me" }] },
  { path: "/court-ordered-rehab-near-me", title: "Court-Ordered Rehab Near Me", desc: "Find court-ordered rehab programs near you. Licensed treatment facilities that meet legal requirements for mandated treatment.", bc: [{ name: "Home", url: "/" }, { name: "Court-Ordered Rehab Near Me", url: "/court-ordered-rehab-near-me" }] },
  { path: "/fentanyl-rehab-near-me", title: "Fentanyl Rehab Near Me", desc: "Find fentanyl addiction treatment centers near you. Specialized medical detox and MAT programs for fentanyl dependence.", bc: [{ name: "Home", url: "/" }, { name: "Fentanyl Rehab Near Me", url: "/fentanyl-rehab-near-me" }] },
  { path: "/medicaid-rehab-near-me", title: "Medicaid Rehab Near Me", desc: "Find Medicaid-accepting rehab centers near you. Addiction treatment covered by Medicaid insurance in your state.", bc: [{ name: "Home", url: "/" }, { name: "Medicaid Rehab Near Me", url: "/medicaid-rehab-near-me" }] },
  { path: "/mens-rehab-near-me", title: "Men's Rehab Near Me", desc: "Find men's rehab centers near you. Gender-specific addiction treatment programs designed for men's unique recovery needs.", bc: [{ name: "Home", url: "/" }, { name: "Men's Rehab Near Me", url: "/mens-rehab-near-me" }] },
  { path: "/womens-rehab-near-me", title: "Women's Rehab Near Me", desc: "Find women's rehab centers near you. Gender-specific addiction treatment with trauma-informed care and family support.", bc: [{ name: "Home", url: "/" }, { name: "Women's Rehab Near Me", url: "/womens-rehab-near-me" }] },
  { path: "/teen-rehab-near-me", title: "Teen Rehab Near Me", desc: "Find adolescent and teen rehab centers near you. Age-appropriate addiction treatment with family therapy and academic support.", bc: [{ name: "Home", url: "/" }, { name: "Teen Rehab Near Me", url: "/teen-rehab-near-me" }] },
  { path: "/veterans-rehab-near-me", title: "Veterans Rehab Near Me", desc: "Find rehab centers for veterans near you. VA-affiliated and military-focused addiction treatment with PTSD and trauma care.", bc: [{ name: "Home", url: "/" }, { name: "Veterans Rehab Near Me", url: "/veterans-rehab-near-me" }] },
  { path: "/sober-living-near-me", title: "Sober Living Homes Near Me", desc: "Find sober living homes near you. Structured recovery housing with peer support and accountability for lasting sobriety.", bc: [{ name: "Home", url: "/" }, { name: "Sober Living Near Me", url: "/sober-living-near-me" }] },
  { path: "/suboxone-clinic-near-me", title: "Suboxone Clinics Near Me", desc: "Find Suboxone clinics near you for medication-assisted treatment. Licensed providers offering buprenorphine for opioid addiction.", bc: [{ name: "Home", url: "/" }, { name: "Suboxone Clinics Near Me", url: "/suboxone-clinic-near-me" }] },
  { path: "/methadone-clinic-near-me", title: "Methadone Clinics Near Me", desc: "Find methadone clinics near you for opioid addiction treatment. Licensed OTP programs with medication-assisted treatment.", bc: [{ name: "Home", url: "/" }, { name: "Methadone Clinics Near Me", url: "/methadone-clinic-near-me" }] },

  // Insurance pages
  { path: "/insurance/aetna", title: "Aetna Insurance for Rehab", desc: "Find rehab centers that accept Aetna insurance. Learn about Aetna's addiction treatment coverage and verify your benefits.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Aetna", url: "/insurance/aetna" }] },
  { path: "/insurance/aetna-rehab", title: "Aetna Rehab Coverage", desc: "Aetna insurance coverage for addiction treatment. Find in-network rehab centers, verify benefits, and understand your coverage.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Aetna Rehab", url: "/insurance/aetna-rehab" }] },
  { path: "/insurance/anthem", title: "Anthem Insurance for Rehab", desc: "Find rehab centers accepting Anthem insurance. Coverage details for addiction treatment including detox and residential programs.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Anthem", url: "/insurance/anthem" }] },
  { path: "/insurance/anthem-rehab", title: "Anthem Rehab Coverage", desc: "Anthem insurance coverage for rehab and addiction treatment. Find in-network facilities and verify your benefits.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Anthem Rehab", url: "/insurance/anthem-rehab" }] },
  { path: "/insurance/bcbs", title: "Blue Cross Blue Shield for Rehab", desc: "Find rehab centers that accept BCBS insurance. Coverage for detox, inpatient, outpatient, and mental health treatment.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "BCBS", url: "/insurance/bcbs" }] },
  { path: "/insurance/bcbs-treatment", title: "BCBS Treatment Coverage", desc: "Blue Cross Blue Shield coverage for addiction treatment. Find in-network rehab centers and understand your BCBS benefits.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "BCBS Treatment", url: "/insurance/bcbs-treatment" }] },
  { path: "/insurance/cigna", title: "Cigna Insurance for Rehab", desc: "Find rehab centers accepting Cigna insurance. Learn about coverage for detox, residential, and outpatient treatment.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Cigna", url: "/insurance/cigna" }] },
  { path: "/insurance/cigna-rehab", title: "Cigna Rehab Coverage", desc: "Cigna insurance coverage for addiction rehab. Find in-network treatment centers and verify your behavioral health benefits.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Cigna Rehab", url: "/insurance/cigna-rehab" }] },
  { path: "/insurance/humana", title: "Humana Insurance for Rehab", desc: "Find rehab centers accepting Humana insurance. Coverage for substance abuse treatment including detox and rehabilitation.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Humana", url: "/insurance/humana" }] },
  { path: "/insurance/humana-rehab", title: "Humana Rehab Coverage", desc: "Humana insurance coverage for addiction treatment and rehab. Find in-network facilities and understand your benefits.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Humana Rehab", url: "/insurance/humana-rehab" }] },
  { path: "/insurance/kaiser", title: "Kaiser Permanente for Rehab", desc: "Find rehab centers in the Kaiser Permanente network. Learn about coverage for addiction treatment and behavioral health.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Kaiser", url: "/insurance/kaiser" }] },
  { path: "/insurance/kaiser-rehab", title: "Kaiser Rehab Coverage", desc: "Kaiser Permanente coverage for addiction rehab. Find covered treatment centers and understand your behavioral health benefits.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Kaiser Rehab", url: "/insurance/kaiser-rehab" }] },
  { path: "/insurance/medicaid", title: "Medicaid for Rehab", desc: "Find rehab centers accepting Medicaid. Learn what Medicaid covers for addiction treatment including detox and residential care.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Medicaid", url: "/insurance/medicaid" }] },
  { path: "/insurance/medicaid-rehab", title: "Medicaid Rehab Coverage", desc: "Medicaid coverage for addiction treatment and rehab. State-by-state coverage details and facility finder.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Medicaid Rehab", url: "/insurance/medicaid-rehab" }] },
  { path: "/insurance/medicare", title: "Medicare for Rehab", desc: "Find rehab centers accepting Medicare. Coverage details for addiction treatment under Medicare Part A and Part B.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Medicare", url: "/insurance/medicare" }] },
  { path: "/insurance/medicare-rehab", title: "Medicare Rehab Coverage", desc: "Medicare coverage for addiction rehab treatment. Understand Part A, Part B, and Medicare Advantage benefits for substance abuse.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Medicare Rehab", url: "/insurance/medicare-rehab" }] },
  { path: "/insurance/united-healthcare", title: "UnitedHealthcare for Rehab", desc: "Find rehab centers accepting UnitedHealthcare. Coverage for addiction treatment including detox, inpatient, and outpatient.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "UnitedHealthcare", url: "/insurance/united-healthcare" }] },
  { path: "/insurance/united-healthcare-rehab", title: "UnitedHealthcare Rehab Coverage", desc: "UnitedHealthcare coverage for addiction rehab. Find in-network treatment facilities and verify your behavioral health benefits.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "UHC Rehab", url: "/insurance/united-healthcare-rehab" }] },
  { path: "/does-insurance-cover-rehab", title: "Does Insurance Cover Rehab?", desc: "Learn how health insurance covers addiction treatment under the Mental Health Parity Act. Verify your benefits for detox, inpatient, and outpatient rehab.", bc: [{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Does Insurance Cover Rehab?", url: "/does-insurance-cover-rehab" }] },

  // Comparison & cost pages
  { path: "/inpatient-vs-outpatient-rehab", title: "Inpatient vs Outpatient Rehab", desc: "Compare inpatient and outpatient rehab programs. Understand differences in cost, structure, effectiveness, and which is right for you.", bc: [{ name: "Home", url: "/" }, { name: "Inpatient vs Outpatient", url: "/inpatient-vs-outpatient-rehab" }] },
  { path: "/detox-vs-rehab", title: "Detox vs Rehab: Key Differences", desc: "Understand the differences between detox and rehab. Learn when you need each, what to expect, and how they work together in recovery.", bc: [{ name: "Home", url: "/" }, { name: "Detox vs Rehab", url: "/detox-vs-rehab" }] },
  { path: "/private-vs-public-rehab", title: "Private vs Public Rehab", desc: "Compare private and public rehab programs. Costs, quality, wait times, and outcomes to help you choose the right treatment.", bc: [{ name: "Home", url: "/" }, { name: "Private vs Public Rehab", url: "/private-vs-public-rehab" }] },
  { path: "/rehab-cost", title: "How Much Does Rehab Cost?", desc: "Understand the cost of rehab. Average prices for detox, inpatient, outpatient programs. Insurance coverage and payment options.", bc: [{ name: "Home", url: "/" }, { name: "Rehab Cost", url: "/rehab-cost" }] },

  // US Rehab international pages
  { path: "/us-rehab", title: "US Rehab for International Patients", desc: "Addiction treatment in the United States for international patients. World-class rehab centers, visa guidance, and placement assistance.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }] },
  { path: "/us-rehab/best-rehab-usa", title: "Best Rehab Centers in USA", desc: "Discover the best addiction treatment centers in America. Top-rated facilities with proven outcomes and world-class clinical care.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Best Rehab USA", url: "/us-rehab/best-rehab-usa" }] },
  { path: "/us-rehab/luxury-rehab-america", title: "Luxury Rehab in America", desc: "Five-star luxury addiction treatment in America. Private suites, gourmet dining, spa amenities, and world-class clinical care.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Luxury Rehab", url: "/us-rehab/luxury-rehab-america" }] },
  { path: "/us-rehab/private-rehab-america", title: "Private Rehab in America", desc: "Maximum privacy addiction treatment in America. Anonymous intake, secluded locations, and celebrity-level confidentiality.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Private Rehab", url: "/us-rehab/private-rehab-america" }] },
  { path: "/us-rehab/executive-rehab", title: "Executive Rehab USA", desc: "Executive addiction treatment for CEOs and professionals. Work-friendly rehab with private offices and flexible scheduling.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Executive Rehab", url: "/us-rehab/executive-rehab" }] },
  { path: "/us-rehab/canadian-patients", title: "US Rehab for Canadian Patients", desc: "Addiction treatment in the USA for Canadians. Skip wait times, access world-class care, and get help with travel and admission.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Canadian Patients", url: "/us-rehab/canadian-patients" }] },
  { path: "/us-rehab/uk-patients", title: "US Rehab for UK Patients", desc: "Addiction treatment in America for UK patients. Access US rehab centers, visa guidance, and placement assistance from Britain.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "UK Patients", url: "/us-rehab/uk-patients" }] },
  { path: "/us-rehab/european-patients", title: "US Rehab for European Patients", desc: "Addiction treatment in the USA for European patients. World-class American rehab centers with international patient support.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "European Patients", url: "/us-rehab/european-patients" }] },
  { path: "/us-rehab/australian-patients", title: "US Rehab for Australian Patients", desc: "Addiction treatment in America for Australian patients. Access innovative US programs, visa guidance, and travel coordination.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Australian Patients", url: "/us-rehab/australian-patients" }] },
  { path: "/us-rehab/uae-middle-east", title: "US Rehab for UAE & Middle East Patients", desc: "Confidential addiction treatment in America for patients from UAE, Saudi Arabia, and the Middle East. Maximum privacy and cultural sensitivity.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "UAE & Middle East", url: "/us-rehab/uae-middle-east" }] },
  { path: "/us-rehab/international-patients", title: "International Patient Guide | US Rehab", desc: "Complete guide for international patients seeking addiction treatment in the USA. Visa, travel, insurance, and placement assistance.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "International Patients", url: "/us-rehab/international-patients" }] },
  { path: "/us-rehab/alcohol-rehab-usa", title: "Alcohol Rehab in USA", desc: "Find the best alcohol rehab programs in the United States. Medical detox, inpatient, and outpatient treatment for international patients.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Alcohol Rehab USA", url: "/us-rehab/alcohol-rehab-usa" }] },
  { path: "/us-rehab/drug-rehab-usa", title: "Drug Rehab in USA", desc: "Top drug rehabilitation centers in America. Evidence-based treatment for all substance use disorders with international patient support.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Drug Rehab USA", url: "/us-rehab/drug-rehab-usa" }] },
  { path: "/us-rehab/dual-diagnosis-usa", title: "Dual Diagnosis Treatment USA", desc: "Specialized dual diagnosis treatment in America for international patients with co-occurring addiction and mental health disorders.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Dual Diagnosis USA", url: "/us-rehab/dual-diagnosis-usa" }] },
  { path: "/us-rehab/celebrity-rehab-usa", title: "Celebrity Rehab USA", desc: "Exclusive celebrity rehab centers in America. Maximum privacy, VIP amenities, and world-class addiction treatment for high-profile individuals.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Celebrity Rehab", url: "/us-rehab/celebrity-rehab-usa" }] },
  { path: "/us-rehab/luxury-rehab-california", title: "Luxury Rehab in California", desc: "Premium luxury rehab centers in California. Malibu, Beverly Hills, and coastal treatment facilities with five-star amenities.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Luxury Rehab California", url: "/us-rehab/luxury-rehab-california" }] },
  { path: "/us-rehab/luxury-rehab-florida", title: "Luxury Rehab in Florida", desc: "Luxury addiction treatment in Florida. Palm Beach, Miami, and beachfront rehab centers with premium amenities and clinical excellence.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Luxury Rehab Florida", url: "/us-rehab/luxury-rehab-florida" }] },
  { path: "/us-rehab/luxury-rehab-arizona", title: "Luxury Rehab in Arizona", desc: "Luxury rehab in Arizona's healing desert landscapes. Scottsdale and Sedona treatment centers with world-class care and premium amenities.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Luxury Rehab Arizona", url: "/us-rehab/luxury-rehab-arizona" }] },
  { path: "/us-rehab/malibu-rehab", title: "Malibu Rehab Centers", desc: "Find exclusive rehab centers in Malibu, California. Oceanfront luxury treatment with world-class clinical care and private accommodations.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Malibu Rehab", url: "/us-rehab/malibu-rehab" }] },

  // Standalone international pages
  { path: "/affordable-rehab-in-usa", title: "Affordable Rehab in USA", desc: "Find affordable addiction treatment in the United States. Quality accredited programs at competitive prices with payment options.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Affordable Rehab", url: "/affordable-rehab-in-usa" }] },
  { path: "/fast-admission-rehab-usa", title: "Fast Admission Rehab USA", desc: "Same-day and rapid admission to top US rehab centers. Immediate intake, 24/7 medical staff, and expedited placement.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Fast Admission", url: "/fast-admission-rehab-usa" }] },
  { path: "/same-day-detox-usa", title: "Same-Day Detox USA", desc: "Same-day medical detox at accredited US facilities. Immediate intake, 24/7 supervision, and FDA-approved withdrawal protocols.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Same-Day Detox", url: "/same-day-detox-usa" }] },
  { path: "/top-detox-centers-usa", title: "Top Detox Centers USA", desc: "America's highest-rated medical detox centers. Accredited facilities with board-certified physicians and proven outcomes.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Top Detox Centers", url: "/top-detox-centers-usa" }] },
  { path: "/confidential-rehab-usa", title: "Confidential Rehab USA", desc: "Maximum privacy addiction treatment in the USA. Anonymous intake, secluded locations, and enhanced confidentiality protocols.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Confidential Rehab", url: "/confidential-rehab-usa" }] },
  { path: "/can-foreigners-go-to-rehab-in-usa", title: "Can Foreigners Go to Rehab in USA?", desc: "Yes, foreigners can attend rehab in the USA. Learn about visa requirements, costs, admission process, and international patient support.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Foreigners in US Rehab", url: "/can-foreigners-go-to-rehab-in-usa" }] },
  { path: "/best-rehab-centers-in-usa", title: "Best Rehab Centers in USA", desc: "Find the best addiction treatment centers in America. Top-rated, accredited facilities with proven outcomes.", bc: [{ name: "Home", url: "/" }, { name: "Best Rehab USA", url: "/best-rehab-centers-in-usa" }] },
  { path: "/best-rehab-centers-in-usa-for-foreigners", title: "Best US Rehab for Foreigners", desc: "Top American rehab centers welcoming international patients. Visa support, cultural sensitivity, and world-class treatment.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Best for Foreigners", url: "/best-rehab-centers-in-usa-for-foreigners" }] },
  { path: "/luxury-rehab-centers-usa", title: "Luxury Rehab Centers USA", desc: "Discover luxury rehab centers in America. Five-star amenities, private accommodations, and premium addiction treatment.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Luxury Rehab USA", url: "/luxury-rehab-centers-usa" }] },
  { path: "/private-rehab-usa", title: "Private Rehab USA", desc: "Confidential private rehab in the United States. Discreet admission, secluded facilities, and maximum privacy for recovery.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Private Rehab", url: "/private-rehab-usa" }] },
  { path: "/cost-of-rehab-in-usa-for-international-patients", title: "Cost of Rehab in USA for International Patients", desc: "Understand rehab costs in America for international patients. Pricing, payment options, and financial planning for US addiction treatment.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Cost for International Patients", url: "/cost-of-rehab-in-usa-for-international-patients" }] },
  { path: "/paying-for-rehab-in-usa-without-insurance", title: "Paying for Rehab in USA Without Insurance", desc: "Options for paying for rehab without insurance. Self-pay rates, financing, scholarships, and affordable treatment alternatives in America.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Paying Without Insurance", url: "/paying-for-rehab-in-usa-without-insurance" }] },
  { path: "/travel-to-usa-for-rehab", title: "Travel to USA for Rehab", desc: "Complete guide to traveling to the USA for addiction treatment. Visa requirements, travel tips, and what to expect on arrival.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "Travel Guide", url: "/travel-to-usa-for-rehab" }] },
  { path: "/rehab-in-usa-for-canadians", title: "Rehab in USA for Canadians", desc: "Addiction treatment in America for Canadian patients. Skip wait times, access world-class US rehab centers with placement assistance.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "For Canadians", url: "/rehab-in-usa-for-canadians" }] },
  { path: "/rehab-in-usa-for-uk-patients", title: "Rehab in USA for UK Patients", desc: "Addiction treatment in America for British patients. Access innovative US programs, visa guidance, and personalized placement.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "For UK Patients", url: "/rehab-in-usa-for-uk-patients" }] },
  { path: "/rehab-in-usa-for-international-patients", title: "Rehab in USA for International Patients", desc: "Complete guide for international patients seeking rehab in America. Visa, costs, admission, and placement assistance.", bc: [{ name: "Home", url: "/" }, { name: "US Rehab", url: "/us-rehab" }, { name: "For International Patients", url: "/rehab-in-usa-for-international-patients" }] },
];

async function main() {
  console.log(`[missing-html] Generating ${pages.length} static HTML pages...`);
  
  for (const p of pages) {
    const content = `<p>${escHtml(p.desc)}</p>`;
    const h = html({
      urlPath: p.path,
      title: p.title,
      metaTitle: `${p.title} | RehabLookup`,
      metaDescription: p.desc,
      h1: p.title,
      content,
      breadcrumbs: p.bc,
    });
    
    // Determine file path
    const cleanPath = p.path.replace(/^\//, "");
    const filePath = path.join(publicDir, `${cleanPath}.html`);
    await write(filePath, h);
  }

  console.log(`[missing-html] Generated ${count} static HTML pages`);
}

main().catch((err) => { console.error(err); process.exit(1); });
