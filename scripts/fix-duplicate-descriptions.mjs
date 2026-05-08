/**
 * Fix duplicate meta descriptions across pre-rendered HTML pages.
 * Pages with the generic fallback description get unique descriptions derived from their titles.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PUBLIC_DIR = new URL('../public', import.meta.url).pathname;

// The generic fallback description that needs to be replaced
const GENERIC_DESC = 'Find addiction treatment resources and rehab centers. RehabLookup helps you find accredited facilities, verify insurance, and start recovery.';

// Files to process (relative to public dir, with leading slash from check-unique-meta output)
const FILES_TO_FIX = [
  '/12-step-facilitation-therapy.html',
  '/addiction-and-relationships-guide.html',
  '/alcohol-withdrawal-symptoms.html',
  '/benzo-withdrawal-symptoms.html',
  '/best-rehab-centers-in-alabama.html',
  '/best-rehab-centers-in-alaska.html',
  '/best-rehab-centers-in-arizona.html',
  '/best-rehab-centers-in-arkansas.html',
  '/best-rehab-centers-in-colorado.html',
  '/best-rehab-centers-in-connecticut.html',
  '/best-rehab-centers-in-delaware.html',
  '/best-rehab-centers-in-hawaii.html',
  '/best-rehab-centers-in-idaho.html',
  '/best-rehab-centers-in-indiana.html',
  '/best-rehab-centers-in-iowa.html',
  '/best-rehab-centers-in-kansas.html',
  '/best-rehab-centers-in-louisiana.html',
  '/best-rehab-centers-in-maine.html',
  '/best-rehab-centers-in-maryland.html',
  '/best-rehab-centers-in-massachusetts.html',
  '/best-rehab-centers-in-minnesota.html',
  '/best-rehab-centers-in-mississippi.html',
  '/best-rehab-centers-in-missouri.html',
  '/best-rehab-centers-in-montana.html',
  '/best-rehab-centers-in-nebraska.html',
  '/best-rehab-centers-in-new-hampshire.html',
  '/best-rehab-centers-in-new-jersey.html',
  '/best-rehab-centers-in-new-mexico.html',
  '/best-rehab-centers-in-north-dakota.html',
  '/best-rehab-centers-in-oklahoma.html',
  '/best-rehab-centers-in-oregon.html',
  '/best-rehab-centers-in-rhode-island.html',
  '/best-rehab-centers-in-south-carolina.html',
  '/best-rehab-centers-in-south-dakota.html',
  '/best-rehab-centers-in-tennessee.html',
  '/best-rehab-centers-in-utah.html',
  '/best-rehab-centers-in-vermont.html',
  '/best-rehab-centers-in-virginia.html',
  '/best-rehab-centers-in-washington.html',
  '/best-rehab-centers-in-west-virginia.html',
  '/best-rehab-centers-in-wisconsin.html',
  '/bpd-and-addiction-treatment.html',
  '/chronic-pain-and-addiction-treatment.html',
  '/cocaine-withdrawal-symptoms.html',
  '/equine-therapy-for-addiction.html',
  '/faith-based-vs-secular-rehab.html',
  '/family-therapy-for-addiction.html',
  '/fentanyl-withdrawal-symptoms.html',
  '/group-therapy-for-addiction.html',
  '/how-much-does-rehab-cost.html',
  '/how-to-choose-between-inpatient-and-outpatient.html',
  '/how-to-choose-rehab.html',
  '/how-to-pay-for-rehab-without-insurance.html',
  '/luxury-vs-standard-rehab.html',
  '/meditation-therapy-for-addiction.html',
  '/meth-withdrawal-symptoms.html',
  '/ocd-and-addiction-treatment.html',
  '/opioid-withdrawal-timeline.html',
  '/recovery-support-groups-guide.html',
  '/rehab-for-families.html',
  '/rehab-for-seniors-guide.html',
  '/rehab-vs-self-detox.html',
  '/schizophrenia-and-addiction-treatment.html',
  '/short-term-vs-long-term-rehab.html',
  '/signs-of-alcohol-addiction.html',
  '/signs-of-benzo-addiction.html',
  '/signs-of-drug-addiction.html',
  '/signs-of-fentanyl-addiction.html',
  '/signs-of-meth-addiction.html',
  '/signs-of-opioid-addiction.html',
  '/talking-to-your-employer-about-rehab.html',
  '/understanding-rehab-levels-of-care.html',
  '/what-happens-after-rehab.html',
  '/what-is-detox.html',
  '/what-is-dual-diagnosis.html',
  '/what-is-intensive-outpatient.html',
  '/what-is-iop.html',
  '/what-is-mat.html',
  '/what-is-php.html',
  '/what-is-residential-treatment.html',
  '/what-is-sober-living.html',
  '/what-to-expect-in-rehab.html',
  '/yoga-therapy-for-addiction.html',
  '/alcohol-rehab.html',
  '/alcohol-rehab-centers.html',
  '/drug-rehab.html',
  '/drug-rehab-centers.html',
  '/us-rehab/best-rehab-usa.html',
  '/providers/resources.html',
];

// Also process all provider-guides pages
import { readdirSync } from 'fs';
const providerGuideFiles = readdirSync(join(PUBLIC_DIR, 'provider-guides'))
  .filter(f => f.endsWith('.html'))
  .map(f => `/provider-guides/${f}`);

const allFiles = [...FILES_TO_FIX, ...providerGuideFiles];

/**
 * Generate a unique description from a page title.
 * Strategy: derive a contextual description from the title text.
 */
function generateDescription(title, urlPath) {
  // Remove the " | RehabLookup" or " — RehabLookup" suffix
  const cleanTitle = title
    .replace(/ \| RehabLookup$/i, '')
    .replace(/ — RehabLookup$/i, '')
    .trim();
  
  // Best rehab centers in {State}
  const bestRehab = cleanTitle.match(/^Best Rehab Centers In (.+)$/i);
  if (bestRehab) {
    return `Discover the top-rated rehab centers in ${bestRehab[1]}. Compare accredited addiction treatment facilities, read reviews, and find the right program for your recovery needs.`;
  }
  
  // Signs of {X} addiction
  const signsOf = cleanTitle.match(/^Signs Of (.+) Addiction$/i);
  if (signsOf) {
    return `Learn the warning signs of ${signsOf[1].toLowerCase()} addiction. Understand behavioral, physical, and psychological symptoms to identify when professional treatment may be needed.`;
  }
  
  // {X} withdrawal symptoms
  const withdrawal = cleanTitle.match(/^(.+) Withdrawal Symptoms?$/i);
  if (withdrawal) {
    return `Understand ${withdrawal[1].toLowerCase()} withdrawal symptoms, timeline, and what to expect during detox. Learn how medical supervision can make withdrawal safer and more manageable.`;
  }
  
  // What is {X}
  const whatIs = cleanTitle.match(/^What Is (.+)$/i);
  if (whatIs) {
    return `Learn what ${whatIs[1].toLowerCase()} is, how it works, and who it's for. Explore this addiction treatment option and find programs near you with RehabLookup.`;
  }
  
  // How to {X}
  const howTo = cleanTitle.match(/^How To (.+)$/i);
  if (howTo) {
    return `Find out how to ${howTo[1].toLowerCase()}. Get expert guidance, practical tips, and resources to help navigate addiction treatment decisions with confidence.`;
  }
  
  // How much does {X} cost
  const howMuch = cleanTitle.match(/^How Much Does (.+) Cost$/i);
  if (howMuch) {
    return `Find out how much ${howMuch[1].toLowerCase()} costs, what affects pricing, and how to pay for treatment. Explore insurance, financing, and free rehab options.`;
  }
  
  // {X} therapy for addiction
  const therapy = cleanTitle.match(/^(.+) Therapy For Addiction$/i);
  if (therapy) {
    return `Explore ${therapy[1].toLowerCase()} therapy as an addiction treatment approach. Learn how this method works, its benefits, and find programs that offer it near you.`;
  }
  
  // {X} and addiction treatment
  const coOccurring = cleanTitle.match(/^(.+) And Addiction Treatment$/i);
  if (coOccurring) {
    return `Learn about treating ${coOccurring[1].toLowerCase()} alongside addiction. Find dual diagnosis programs that address co-occurring conditions and support lasting recovery.`;
  }
  
  // {X} vs {Y}
  const vsMatch = cleanTitle.match(/^(.+) Vs\.? (.+)$/i);
  if (vsMatch) {
    return `Compare ${vsMatch[1].toLowerCase()} and ${vsMatch[2].toLowerCase()} to find the right addiction treatment approach. Learn the key differences and which option may be best for your situation.`;
  }
  
  // Rehab for {X}
  const rehabFor = cleanTitle.match(/^Rehab For (.+)$/i);
  if (rehabFor) {
    return `Find specialized rehab programs for ${rehabFor[1].toLowerCase()}. Explore treatment options, support resources, and accredited facilities tailored to specific needs.`;
  }
  
  // Provider guides
  if (urlPath.includes('/provider-guides/')) {
    return `${cleanTitle}: Expert guidance for addiction treatment providers. Access strategies, compliance resources, and best practices to grow and improve your rehab facility.`;
  }
  
  // Generic fallback based on title
  return `${cleanTitle}: Expert addiction treatment information and resources from RehabLookup. Find accredited rehab centers, compare programs, and start your recovery journey today.`;
}

let fixedCount = 0;
let skippedCount = 0;
let notFoundCount = 0;

for (const urlPath of allFiles) {
  const filepath = join(PUBLIC_DIR, urlPath);
  
  let content;
  try {
    content = readFileSync(filepath, 'utf-8');
  } catch {
    notFoundCount++;
    continue;
  }
  
  // Check if this file has the generic description
  if (!content.includes(GENERIC_DESC)) {
    skippedCount++;
    continue;
  }
  
  // Extract title
  const titleMatch = content.match(/<title>([^<]+)<\/title>/);
  if (!titleMatch) {
    skippedCount++;
    continue;
  }
  
  const title = titleMatch[1];
  const newDesc = generateDescription(title, urlPath);
  
  // Replace all occurrences of the generic description
  content = content.split(GENERIC_DESC).join(newDesc);
  
  writeFileSync(filepath, content, 'utf-8');
  fixedCount++;
}

console.log(`\n✅ Fixed: ${fixedCount} files`);
console.log(`⏭️  Skipped (already unique): ${skippedCount} files`);
console.log(`⚠️  Not found: ${notFoundCount} files`);
