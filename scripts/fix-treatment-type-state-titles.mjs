/**
 * Fix duplicate titles for treatment-type state and city pages.
 * These pages have generic "{StateName} — RehabLookup" or "{CityName} — RehabLookup" titles.
 * We update them to include the treatment type for uniqueness.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';

const PUBLIC_DIR = new URL('../public', import.meta.url).pathname;

// Treatment type slug → human-readable label mapping
const TREATMENT_TYPE_LABELS = {
  'faith-based-rehab': 'Faith-Based Rehab',
  'fentanyl-rehab': 'Fentanyl Rehab',
  'free-rehab': 'Free Rehab',
  'luxury-rehab': 'Luxury Rehab',
  'mens-rehab': "Men's Rehab",
  'sober-living': 'Sober Living',
  'veterans-rehab': 'Veterans Rehab',
  'womens-rehab': "Women's Rehab",
  // Also fix city pages for these types
  'alcohol-rehabilitation': 'Alcohol Rehabilitation',
  'detox-programs': 'Detox Programs',
  'dual-diagnosis-treatment': 'Dual Diagnosis Treatment',
  'outpatient-programs': 'Outpatient Programs',
};

// State slug → proper name mapping
const STATE_NAMES = {
  'alabama': 'Alabama', 'alaska': 'Alaska', 'arizona': 'Arizona', 'arkansas': 'Arkansas',
  'california': 'California', 'colorado': 'Colorado', 'connecticut': 'Connecticut',
  'delaware': 'Delaware', 'florida': 'Florida', 'georgia': 'Georgia', 'hawaii': 'Hawaii',
  'idaho': 'Idaho', 'illinois': 'Illinois', 'indiana': 'Indiana', 'iowa': 'Iowa',
  'kansas': 'Kansas', 'kentucky': 'Kentucky', 'louisiana': 'Louisiana', 'maine': 'Maine',
  'maryland': 'Maryland', 'massachusetts': 'Massachusetts', 'michigan': 'Michigan',
  'minnesota': 'Minnesota', 'mississippi': 'Mississippi', 'missouri': 'Missouri',
  'montana': 'Montana', 'nebraska': 'Nebraska', 'nevada': 'Nevada',
  'new-hampshire': 'New Hampshire', 'new-jersey': 'New Jersey', 'new-mexico': 'New Mexico',
  'new-york': 'New York', 'north-carolina': 'North Carolina', 'north-dakota': 'North Dakota',
  'ohio': 'Ohio', 'oklahoma': 'Oklahoma', 'oregon': 'Oregon', 'pennsylvania': 'Pennsylvania',
  'rhode-island': 'Rhode Island', 'south-carolina': 'South Carolina',
  'south-dakota': 'South Dakota', 'tennessee': 'Tennessee', 'texas': 'Texas',
  'utah': 'Utah', 'vermont': 'Vermont', 'virginia': 'Virginia', 'washington': 'Washington',
  'west-virginia': 'West Virginia', 'wisconsin': 'Wisconsin', 'wyoming': 'Wyoming',
  'district-of-columbia': 'Washington D.C.',
};

function toTitleCase(str) {
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function updateHtmlMeta(filepath, newTitle, newDescription) {
  let content = readFileSync(filepath, 'utf-8');
  
  // Replace <title>
  content = content.replace(/<title>[^<]*<\/title>/, `<title>${newTitle}</title>`);
  
  // Replace og:title
  content = content.replace(/<meta property="og:title" content="[^"]*"/, 
    `<meta property="og:title" content="${newTitle}"`);
  
  // Replace twitter:title
  content = content.replace(/<meta name="twitter:title" content="[^"]*"/, 
    `<meta name="twitter:title" content="${newTitle}"`);
  
  // Replace description
  content = content.replace(/<meta name="description" content="[^"]*"/, 
    `<meta name="description" content="${newDescription}"`);
  
  // Replace og:description
  content = content.replace(/<meta property="og:description" content="[^"]*"/, 
    `<meta property="og:description" content="${newDescription}"`);
  
  writeFileSync(filepath, content, 'utf-8');
}

let fixedCount = 0;
let skippedCount = 0;

const treatmentTypesDir = join(PUBLIC_DIR, 'treatment-types');

for (const [typeSlug, typeLabel] of Object.entries(TREATMENT_TYPE_LABELS)) {
  const typeDir = join(treatmentTypesDir, typeSlug);
  
  let stateEntries;
  try {
    stateEntries = readdirSync(typeDir);
  } catch {
    continue;
  }
  
  for (const stateEntry of stateEntries) {
    if (stateEntry.endsWith('.html')) continue; // Skip state-level .html files (handled separately)
    
    const stateDir = join(typeDir, stateEntry);
    const stateStat = statSync(stateDir);
    if (!stateStat.isDirectory()) continue;
    
    const stateName = STATE_NAMES[stateEntry] || toTitleCase(stateEntry);
    
    // Check for state-level index.html
    const stateIndexPath = join(stateDir, 'index.html');
    let stateIndexExists = false;
    try {
      statSync(stateIndexPath);
      stateIndexExists = true;
    } catch {}
    
    if (stateIndexExists) {
      const content = readFileSync(stateIndexPath, 'utf-8');
      const currentTitle = content.match(/<title>([^<]*)<\/title>/)?.[1] || '';
      
      // Only fix if it's a generic state-only title
      if (currentTitle === `${stateName} — RehabLookup` || currentTitle.toLowerCase() === `${stateEntry} — rehablookup`) {
        const newTitle = `${typeLabel} in ${stateName} — Find Programs | RehabLookup`;
        const newDesc = `Find ${typeLabel.toLowerCase()} programs in ${stateName}. Browse accredited facilities, compare treatment options, and start your recovery journey with RehabLookup.`;
        updateHtmlMeta(stateIndexPath, newTitle, newDesc);
        fixedCount++;
      } else {
        skippedCount++;
      }
    }
    
    // Check for city-level pages within this state directory
    let cityEntries;
    try {
      cityEntries = readdirSync(stateDir);
    } catch {
      continue;
    }
    
    for (const cityEntry of cityEntries) {
      if (cityEntry === 'index.html') continue;
      
      const cityPath = join(stateDir, cityEntry);
      const cityStat = statSync(cityPath);
      
      let cityHtmlFiles = [];
      if (cityStat.isDirectory()) {
        // city/index.html pattern
        const cityIndexPath = join(cityPath, 'index.html');
        try {
          statSync(cityIndexPath);
          cityHtmlFiles.push(cityIndexPath);
        } catch {}
      } else if (cityEntry.endsWith('.html')) {
        cityHtmlFiles.push(cityPath);
      }
      
      for (const cityHtmlPath of cityHtmlFiles) {
        const content = readFileSync(cityHtmlPath, 'utf-8');
        const currentTitle = content.match(/<title>([^<]*)<\/title>/)?.[1] || '';
        
        // Only fix if it's a generic city-only title (no treatment type info)
        if (currentTitle.match(/^[A-Z][a-z]+(?: [A-Z][a-z]+)* — RehabLookup$/) && 
            !currentTitle.includes(typeLabel) && !currentTitle.includes('in ')) {
          // Extract city name from canonical URL
          const canonicalMatch = content.match(/href="https:\/\/rehablookup\.com\/([^"]+)"/);
          const urlParts = canonicalMatch ? canonicalMatch[1].split('/') : [];
          const citySlug = urlParts[urlParts.length - 1] || '';
          const cityName = toTitleCase(citySlug);
          
          const newTitle = `${typeLabel} in ${cityName}, ${stateName} — Find Programs | RehabLookup`;
          const newDesc = `Find ${typeLabel.toLowerCase()} programs in ${cityName}, ${stateName}. Browse accredited facilities, compare treatment options, and start your recovery journey with RehabLookup.`;
          updateHtmlMeta(cityHtmlPath, newTitle, newDesc);
          fixedCount++;
        } else {
          skippedCount++;
        }
      }
    }
  }
}

console.log(`\n✅ Fixed: ${fixedCount} files`);
console.log(`⏭️  Skipped (already unique): ${skippedCount} files`);
