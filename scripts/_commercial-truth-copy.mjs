/**
 * _commercial-truth-copy.mjs
 *
 * The single canonical rewrite table for RehabLookup's public + provider
 * commercial copy, shared by:
 *
 *   • scripts/patch-commercial-truth-copy.mjs — the one-time bulk patcher that
 *     rewrites the prerendered corpus in public/ AND the generator sources in
 *     scripts/ that produce it
 *   • the generators themselves, indirectly: they are patched by the same table
 *     so a future `npm run generate:*` cannot reintroduce the old wording
 *
 * Why a shared table instead of hand-edits
 * ────────────────────────────────────────
 * The indexable surface is ~46.7k prerendered HTML files in public/ that Vercel
 * serves directly (cleanUrls + static-before-rewrite), plus the ~10 generator
 * scripts that emit them. Editing only the generators leaves the live HTML
 * false; editing only the HTML means the next regeneration undoes the fix. Both
 * have to move together, from one reviewed list.
 *
 * Anchor design
 * ─────────────
 * Every pattern is anchored on wording that does NOT cross a `${...}` template
 * boundary, so the same regex matches the generator source and the rendered
 * HTML. Where a placeholder sits mid-sentence, `PH` below matches either the
 * literal `${expr}` or the interpolated text.
 *
 * The canonical commercial contract these rewrites encode:
 *   FREE        directory presence
 *   PRO         enhances the facility profile + provider tools
 *   FEATURED    separately purchased, clearly labeled sponsored exposure
 *   VERIFIED    earned independently of payment
 *   ORGANIC     never for sale
 *   INQUIRIES   direct facility inquiries, not sold leads
 */

/**
 * Matches a span that is either a template placeholder or the text it renders
 * to — including spans that mix both, like `${countyName}, ${stateName}` in the
 * generator and "Kootenai County, Idaho" in the emitted HTML.
 */
const PH = String.raw`(?:\$\{[^}]*\}|[A-Za-z0-9'’.,\- ]){1,80}?`;

/**
 * Ordered [pattern, replacement, note]. Order matters: longer / more specific
 * sentences run before the short generic stems that would otherwise swallow
 * them and produce a weaker rewrite.
 */
export const REWRITES = [
  // ── Provider commercial claims ────────────────────────────────────────────
  // These are the outright contract violations: Pro described as buying
  // organic rank, RehabLookup described as verifying every facility before it
  // is published, and "lead analytics" implying sold leads.
  [
    new RegExp(
      String.raw`Our placement is editorial, not bid-based — facilities don't pay for admission slots\. Pro listings get priority placement on the ${PH} directory pages families are actually searching, plus enriched profile content and lead analytics\.`,
      "g",
    ),
    "Organic directory position is determined independently and is never purchased. Pro enhances the facility profile and unlocks provider tools such as listing analytics; Featured is a separately purchased, clearly labeled sponsored placement.",
    "Pro described as buying organic rank",
  ],
  [
    /Editorial placement, not bid-based auctions\. Pro listings get priority on insurance-specific directory pages and enriched profile content showing accepted plans, network status, and verification flow\./g,
    "Organic directory position is determined independently and is never purchased. Pro enhances the facility profile — including the plans and network status a facility reports — and unlocks provider tools; Featured is a separately purchased, clearly labeled sponsored placement.",
    "Pro described as buying organic rank on insurance pages",
  ],
  [
    /Claim your free listing or upgrade to Pro for priority placement, enriched profile content, and lead analytics\. We verify every facility for state licensing and JCAHO\/CARF accreditation before publishing\./g,
    "Claim your free listing to keep your facility's directory information current. Pro enhances the profile and unlocks provider tools such as listing analytics; Featured is separately purchased, clearly labeled sponsored exposure. Organic position is never sold, and verification is earned independently of payment.",
    "purchasable ranking + blanket pre-publication verification promise",
  ],
  [
    /Our directory is editorially curated, not lead-broker-driven\. We do not sell admission slots; placement is earned through accreditation, licensing, and clinical quality\./g,
    "RehabLookup is a directory, not a lead broker. Organic directory position is determined independently and is never purchased.",
    "unverifiable ranking-methodology claim",
  ],
  [
    /Free basic listings are available\. Pro plans \(\$399\/mo\) include priority placement, verified inquiries, and a 20% discount on lead unlocks\./g,
    "Basic directory presence is free. Pro enhances your facility profile and provider tools. Featured is purchased separately as clearly labeled sponsored exposure, and organic directory position is never for sale.",
    "priority placement + verified inquiries + lead unlocks",
  ],
  // Whole-sentence forms run first so the rewritten meta description stays
  // inside the 165-char budget check-seo-meta.mjs enforces. Composing the
  // generic stem with the separate EKRA rule below overshot it by ~50 chars.
  [
    /fill more beds with verified directory placement\. EKRA-compliant referrals, no lead-broker fees, claim your free listing today\./g,
    "claim your free directory listing. Families contact your facility directly, and organic position is never sold.",
    "census-increase promise + referral framing (meta description)",
  ],
  [
    /fill more beds via verified directory placement\. EKRA-compliant referrals from families searching for in-network/g,
    "claim your free directory listing. Inquiries come directly from families searching for in-network",
    "census-increase promise + referral framing (insurance meta description)",
  ],
  [
    new RegExp(String.raw`fill more beds (?:with|via) verified directory placement`, "g"),
    "reach families searching for treatment with a claimed directory listing",
    "census-increase promise",
  ],
  [
    /Verified directory placement, geo-targeted visibility/g,
    "A claimed directory listing, geo-targeted visibility",
    "verified placement as a purchasable product",
  ],
  [
    /Reach families searching for addiction treatment in your county with verified directory placement and EKRA-compliant referrals\./g,
    "Families searching for treatment in your county can find and contact you directly.",
    "verified placement + referral framing (meta description)",
  ],
  [
    /verified directory placement and EKRA-compliant referrals/g,
    "a claimed directory listing and inquiries sent directly to your facility",
    "verified placement + referral framing",
  ],
  [
    /EKRA-compliant referrals from families searching for in-network/g,
    "inquiries sent directly to your facility by families searching for in-network",
    "RehabLookup framed as making referrals",
  ],
  [
    /EKRA-compliant referrals, no lead-broker fees, claim your free listing today\./g,
    "Families contact your facility directly. Basic directory presence is free — claim your listing today.",
    "referral framing",
  ],
  // Residual sweep — runs after every specific sentence above so it only
  // catches the fragment forms those rules left behind.
  [
    /,? and EKRA-compliant referrals\./g,
    ", and direct family inquiries.",
    "RehabLookup framed as making referrals",
  ],
  [
    new RegExp(String.raw`RehabLookup connects ${PH} treatment providers with families actively searching for addiction care\.`, "g"),
    "RehabLookup lists treatment providers so families searching for addiction care can find and contact them directly.",
    "RehabLookup framed as connecting/matching",
  ],
  [
    /Add your addiction treatment facility in (\$\{[^}]*\}|[A-Za-z .'’\-]{1,40}) to RehabLookup's verified provider directory\. Thousands of patients and families search for rehab centers in (\$\{[^}]*\}|[A-Za-z .'’\-]{1,40}) every month\./g,
    "Add your addiction treatment facility in $1 to RehabLookup's provider directory so families searching for care in $2 can find and contact you directly.",
    "unsupported monthly-search volume claim",
  ],
  [
    /RehabLookup's verified provider directory/g,
    "RehabLookup's provider directory",
    "verified inventory claim",
  ],

  // ── Blanket verification / vetting process promises ───────────────────────
  [
    /All listed facilities are verified for state licensure and accreditation\./g,
    "Listings show state licensure and accreditation details when a facility reports them. Confirm current licensing with the facility or the issuing state authority.",
    "blanket pre-listing verification promise",
  ],
  [
    /We verify all facilities for state licensure and accreditation before listing\./g,
    "Listings show state licensure and accreditation details when a facility reports them. Confirm current licensing with the facility or the issuing state authority.",
    "blanket pre-listing verification promise",
  ],
  [
    /All listed facilities have been verified for insurance acceptance\./g,
    "Insurance details are reported by each facility. Confirm network status with the facility and your insurer before admission.",
    "blanket insurance verification promise",
  ],
  [
    /RehabLookup verifies accreditation, licensing, and quality for every listed facility\./g,
    "RehabLookup lists the accreditation and licensing details each facility reports. Confirm them with the facility or the issuing authority.",
    "blanket verification claim",
  ],
  [
    /Each program is checked for proper licensing, accreditation, and quality of care\./g,
    "Licensing and accreditation details are shown when a program reports them. Confirm them with the program or the issuing authority.",
    "blanket per-program checking promise",
  ],
  [
    /RehabLookup verifies accreditation, licensing, and quality/g,
    "RehabLookup lists accreditation and licensing details reported by each facility",
    "blanket verification claim",
  ],
  [
    new RegExp(String.raw`Every ${PH} (?:program|facility) in our directory is checked for state licensing, current accreditation \(Joint Commission or CARF\), and active clinical (?:staff )?credentials\.`, "g"),
    "Listings show state licensing, accreditation and clinical credential details when a facility reports them; confirm them with the facility or the issuing authority.",
    "blanket per-facility checking promise",
  ],
  [
    /We filter out unverified listings and do not sell admission slots — providers can't pay for placement, which keeps the directory editorially independent\./g,
    "Organic directory position is determined independently and is never purchased.",
    "unverifiable filtering claim",
  ],
  [
    /We do not sell admission slots; providers can't pay for placement\. Pages are editorially curated, not lead-broker auctions\./g,
    "Organic directory position is determined independently and is never purchased.",
    "lead-broker framing",
  ],

  // ── Directory-wide "verified inventory" claims (seeker-facing) ────────────
  [
    /verified addiction treatment directory covering accredited facilities, insurance options, and recovery resources/g,
    "addiction treatment directory covering facility listings, insurance information and recovery resources",
    "whole-directory verification claim",
  ],
  [
    /Our verified directory covers accredited facilities across all 50 states\./g,
    "Our directory lists treatment centers across all 50 states.",
    "whole-directory verification claim",
  ],
  [
    /Compare verified, accredited addiction treatment facilities\./g,
    "Compare addiction treatment facility listings.",
    "whole-directory verification claim",
  ],
  [
    /Compare verified facilities and verify insurance coverage\./g,
    "Compare facility listings and check insurance coverage.",
    "whole-directory verification claim",
  ],
  [
    /Our directory includes verified facilities with detailed information on treatment programs, insurance acceptance, and amenities\./g,
    "Our directory includes facility listings with information on treatment programs, insurance acceptance and amenities as reported by each facility.",
    "whole-directory verification claim",
  ],
  [
    /Our directory includes verified in-network facilities for/g,
    "Our directory includes listings for facilities that report in-network coverage for",
    "whole-directory verification claim",
  ],
  [
    /Compare verified facilities, verify insurance, and start recovery today\./g,
    "Compare facility listings, check insurance, and contact facilities directly.",
    "whole-directory verification claim",
  ],
  [
    /Our verified directory helps you locate/g,
    "Our directory helps you locate",
    "whole-directory verification claim",
  ],
  [
    /Our verified directory helps you compare/g,
    "Our directory helps you compare",
    "whole-directory verification claim",
  ],
  [
    /Compare verified addiction treatment programs, verify insurance, and get help today\./g,
    "Compare addiction treatment listings, check insurance, and contact facilities directly.",
    "whole-directory verification claim",
  ],
  [
    /Our verified directory includes licensed facilities offering evidence-based addiction treatment\./g,
    "Our directory includes listings for facilities offering evidence-based addiction treatment.",
    "whole-directory verification claim",
  ],
  [
    /Our verified directory covers all licensed facilities/g,
    "Our directory lists facilities",
    "whole-directory verification claim",
  ],
  [
    /RehabLookup provides verified facility listings with detailed program information\./g,
    "RehabLookup provides facility listings with program information as reported by each facility.",
    "whole-directory verification claim",
  ],
  [
    /Compare verified treatment facilities near you\./g,
    "Compare treatment facility listings near you.",
    "whole-directory verification claim",
  ],
  [
    /Compare verified local facilities, check insurance coverage, and start recovery today\./g,
    "Compare local facility listings, check insurance coverage, and contact facilities directly.",
    "whole-directory verification claim",
  ],
  [
    /RehabLookup connects you with verified rehab facilities offering/g,
    "RehabLookup lists rehab facilities offering",
    "whole-directory verification claim + connector framing",
  ],
  [
    /RehabLookup lists verified ((?:[a-z'’\-]+ ){0,3})(rehab|sober living|detox centers|dual diagnosis treatment|outpatient rehab|inpatient rehab) facilities/g,
    "RehabLookup lists $1$2 facilities",
    "whole-directory verification claim",
  ],
  [
    /Use our free directory to search verified ((?:[a-z'’\-]+ ){0,3})rehab centers/g,
    "Use our free directory to search $1rehab center listings",
    "whole-directory verification claim",
  ],
  [
    /RehabLookup's directory includes verified, accredited facilities/g,
    "RehabLookup's directory includes facility listings",
    "whole-directory verification claim",
  ],
  [
    /RehabLookup's verified directory/g,
    "RehabLookup's directory",
    "whole-directory verification claim",
  ],
  [
    /Filter verified treatment centers/g,
    "Filter treatment center listings",
    "whole-directory verification claim",
  ],
  [
    /(?<![\w-])[Bb]rowse verified addiction treatment facilities/g,
    "Browse addiction treatment facility listings",
    "whole-directory verification claim",
  ],
  [
    /(?<![\w-])[Ss]earch verified addiction treatment facilities/g,
    "Search addiction treatment facility listings",
    "whole-directory verification claim",
  ],
  [
    /Use our directory to compare verified facilities/g,
    "Use our directory to compare facility listings",
    "whole-directory verification claim",
  ],
  [
    /directory lets you compare verified facilities/g,
    "directory lets you compare facility listings",
    "whole-directory verification claim",
  ],
  [
    /Compare verified addiction treatment facilities/g,
    "Compare addiction treatment facility listings",
    "whole-directory verification claim",
  ],
  [
    /Find verified drug rehab centers offering/g,
    "Find drug rehab center listings offering",
    "whole-directory verification claim",
  ],
  [
    /Verified rehab centers serving/g,
    "Rehab center listings serving",
    "whole-directory verification claim",
  ],
  [
    /expert-verified listings/g,
    "editorially reviewed directory listings",
    "whole-directory verification claim",
  ],
  // Title/description stems: "Verified <City>, <ST> treatment options" and
  // "Verified <City>, <ST> — compare programs…". The leading adjective is the
  // whole problem; the rest of the string is fine.
  [
    /(?<=^|["'>\s—|])Verified ((?:[A-Z][A-Za-z.'’\-]*\s){1,4}[A-Z]{2}) (treatment options|—)/g,
    "$1 $2",
    "city inventory described as verified",
  ],
  [
    /(?<=^|["'>\s—|])Verified ([A-Z][A-Za-z.'’\- ]{1,40}, [A-Z]{2}) —/g,
    "$1 —",
    "city inventory described as verified",
  ],

  // ── React source: live counts labelled "verified" ────────────────────────
  // The most dangerous shape in src/: a live `facilities.length` rendered next
  // to the word "Verified", so the page asserts that every matched listing is
  // verified. public_facilities.verified is Pro-gated and a handful of records
  // carry it, so the count is a LISTING count in every one of these.
  [
    /\$\{facilities\.length\}\+ verified (facilities|programs|treatment facilities)/g,
    "${facilities.length}+ $1",
    "live count labelled verified",
  ],
  [
    /\$\{facilities\.length\} verified (facilities|programs)/g,
    "${facilities.length} $1",
    "live count labelled verified",
  ],
  [
    /\$\{facilities\.length\} verified \$\{config\.treatmentType\.toLowerCase\(\)\}/g,
    "${facilities.length} ${config.treatmentType.toLowerCase()}",
    "live count labelled verified",
  ],
  [
    /\$\{facilities\.length\}\+ verified treatment facilities/g,
    "${facilities.length}+ treatment facility listings",
    "live count labelled verified",
  ],
  [
    /facilityCount === 1 \? "Verified Program" : "Verified Programs"/g,
    'facilityCount === 1 ? "Program Listed" : "Programs Listed"',
    "live count labelled verified",
  ],
  [
    /cityCenters\.length === 1 \? "Verified Facility" : "Verified Facilities"/g,
    'cityCenters.length === 1 ? "Facility Listed" : "Facilities Listed"',
    "live count labelled verified",
  ],
  [
    /stateCenters\.length === 1 \? "Verified Facility" : "Verified Facilities"/g,
    'stateCenters.length === 1 ? "Facility Listed" : "Facilities Listed"',
    "live count labelled verified",
  ],
  [
    /stateCenters\.length === 1 \? "Verified" : "Verified"/g,
    'stateCenters.length === 1 ? "Listed" : "Listed"',
    "live count labelled verified",
  ],

  // The /near-me family shares one shape: a live count, then the word
  // "verified" applied to the whole result set. The `: "verified"` branch of
  // the inner ternary is unreachable (the outer guard already proved the count
  // is > 0), so it is dropped rather than reworded.
  [
    /facilities\.length \+ "\+" : "verified"/g,
    'facilities.length + "+" : ""',
    "unreachable verified fallback on a live count",
  ],
  [
    /\} verified (treatment facilities|facilities) (offering|specializing|serving)/g,
    "} $1 $2",
    "live count labelled verified",
  ],
  [
    /(\$\{facilities\.length > 0 \? facilities\.length \+ "\+" : ""\}) verified /g,
    "$1 ",
    "live count labelled verified",
  ],
  [
    /of \$\{(cityCenters|stateCenters)\.length\} verified \$\{\1\.length === 1 \? "facility" : "facilities"\}/g,
    'of ${$1.length} listed ${$1.length === 1 ? "facility" : "facilities"}',
    "live count labelled verified",
  ],
  [
    /\$\{facilityCount \|\| "several"\} verified /g,
    '${facilityCount || "several"} listed ',
    "live count labelled verified",
  ],

  // ── Generic residual stems ───────────────────────────────────────────────
  // Run last so the specific sentences above win. These catch the same claim
  // in wording variants that were not individually enumerated.
  [
    /\bverified,?\s+accredited\s+(facilities|centers|centres)\b/g,
    "accredited $1",
    "whole-directory verification claim",
  ],
  [
    /\bcompare verified facilities\b/gi,
    "compare facility listings",
    "whole-directory verification claim",
  ],

  // ── SEO recovery Phase 1 (2026-11-23): retired insurance-verification tool ─
  // RehabLookup does not verify insurance for visitors. The prerendered corpus
  // (~9.5k files) and five generators still advertised "our free insurance
  // verification tool". Replace it with accurate, actionable guidance.
  [
    /Call the member services number on the back of your insurance card, or use our free insurance verification tool to check your coverage before starting treatment\./g,
    "Call the member services number on the back of your insurance card to check your coverage before starting treatment, and confirm with the facility that it accepts your plan.",
    "retired insurance-verification tool",
  ],
  [
    /Use our free insurance verification tool to check your benefits and find in-network facilities\./g,
    "Call the member services number on your insurance card to confirm your benefits and ask which facilities are in network.",
    "retired insurance-verification tool",
  ],
  [
    /Use our free insurance verification tool to check your benefits before starting treatment\./g,
    "Call the member services number on your insurance card to check your benefits before starting treatment.",
    "retired insurance-verification tool",
  ],
  [
    /Use our free insurance verification tool to find in-network facilities\./g,
    "Call the member services number on your insurance card to ask which facilities are in your plan's network.",
    "retired insurance-verification tool",
  ],
  [
    /Use our free insurance verification tool to check your benefits\./g,
    "Call the member services number on your insurance card to confirm your benefits.",
    "retired insurance-verification tool",
  ],
  [
    /Many facilities offer same-day admissions and free insurance verification\./g,
    "Ask each facility about current wait times and how it confirms insurance coverage.",
    "retired insurance-verification tool + unsupported same-day claim",
  ],
  [
    /Free insurance verification available\./g,
    "Confirm coverage with your insurance plan and the facility.",
    "retired insurance-verification tool",
  ],
  [
    /Free insurance verification\./g,
    "Confirm coverage with your plan.",
    "retired insurance-verification tool",
  ],

  // ── SEO recovery Phase 1: listings described as accredited / expert-verified ─
  // Listings come from facility-reported SAMHSA data and are not verified by
  // RehabLookup. These rules remove the directory-level claim only; advice such
  // as "look for an accredited program" is deliberately left alone.
  [
    /Compare accredited local facilities, verify insurance, and get help today/g,
    "Compare local facility listings and contact programs directly",
    "directory described as accredited + retired verification",
  ],
  [
    /Compare accredited facilities, verify insurance, and (?:get help|start recovery) today/g,
    "Compare facility listings and contact programs directly",
    "directory described as accredited + retired verification",
  ],
  [
    /\bSearch accredited addiction treatment centers\b/g,
    "Search addiction treatment center listings",
    "directory described as accredited",
  ],
  [
    /\bCompare accredited addiction treatment facilities\b/g,
    "Compare addiction treatment facility listings",
    "directory described as accredited",
  ],
  [
    /\bconnects you with accredited rehab centers\b/g,
    "helps you find rehab center listings",
    "directory described as accredited",
  ],
  [
    /\bRehabLookup connects you with accredited facilities\b/g,
    "RehabLookup lists facilities",
    "directory described as accredited",
  ],
  [
    /\bRehabLookup helps you find accredited treatment programs\b/g,
    "RehabLookup helps you find treatment programs",
    "directory described as accredited",
  ],
  [
    /\blists accredited rehab centers\b/g,
    "lists rehab centers",
    "directory described as accredited",
  ],
  [
    /\bCompare accredited facilities\b/g,
    "Compare facility listings",
    "directory described as accredited",
  ],
  [
    /\bFind accredited /g,
    "Find ",
    "directory described as accredited",
  ],
  [
    /— Find Accredited Programs \|/g,
    "— Find Programs |",
    "directory described as accredited (title)",
  ],
  [
    /\bFind Accredited /g,
    "Find ",
    "directory described as accredited (title case)",
  ],
  [
    /\bCompare Accredited /g,
    "Compare ",
    "directory described as accredited (title case)",
  ],
  [
    /\bhelps patients find accredited, licensed facilities\b/g,
    "helps patients find facility listings",
    "directory described as accredited (lowercase)",
  ],
  [
    /\b(the directory|our directory) to (find|compare) accredited /g,
    "$1 to $2 ",
    "directory described as accredited (lowercase)",
  ],
  [
    /\bRehabLookup helps you (find|compare) accredited /g,
    "RehabLookup helps you $1 ",
    "directory described as accredited (lowercase)",
  ],
  [
    /\bExpert-verified listings\b/g,
    "Directory listings",
    "listings described as expert-verified",
  ],
];

export default REWRITES;
