/**
 * facilityTruth.mjs — the single rulebook for what RehabLookup may say about
 * an independently operated treatment facility, in visible copy and in
 * structured data.
 *
 * Plain JS (with facilityTruth.d.mts types) so the browser bundle, the Node 20
 * sitemap/static-route CI job and the Node 22 generators all load ONE
 * implementation — the same pattern as src/lib/location/core.mjs.
 *
 * WHY THIS EXISTS (SEO recovery Phase 1, 2026-11-23)
 * ──────────────────────────────────────────────────
 * Both facility renderers (scripts/generate-facility-profiles-html.mjs for
 * crawlers and src/components/SEO.tsx → CenterProfile for visitors) hard-coded
 * attributes that no facility record supports: open 24/7, accepting new
 * patients, a Psychiatry specialty, "Cash/Credit Card" payment, a price range,
 * a shared slogan, "InStock" service offers, a consultation ReserveAction, and
 * an editorial "reviewedBy" stamped from updated_at. 99.8% of listings come
 * from a SAMHSA FindTreatment.gov import of facility-reported data that
 * RehabLookup has not independently verified.
 *
 * The rules:
 *   1. Emit a field only when a facility record supports it.
 *   2. Say where the information came from.
 *   3. Never present facility-reported or government-directory information as
 *      RehabLookup-verified.
 */

/** When the staged SAMHSA FindTreatment.gov scrape was taken (staged_samhsa.scraped_at). */
export const SAMHSA_SNAPSHOT_LABEL = "May 2026";

/**
 * Provenance classes, mirroring the four states the directory must keep
 * distinguishable:
 *   provider            — the facility manages the listing (claimed)
 *   government_directory — imported from SAMHSA FindTreatment.gov (facility-reported to SAMHSA)
 *   staff_entered       — created by RehabLookup staff or self-listed, not claimed
 * "Independently verified by RehabLookup" is deliberately NOT derivable from
 * any current field: no documented verification procedure exists yet, so no
 * listing is described that way.
 */
export function facilityProvenance(facility) {
  const claimed = Boolean(facility?.is_claimed);
  const source = String(facility?.data_source ?? "").toLowerCase();
  if (claimed) return "provider";
  if (source === "samhsa_import" || source.startsWith("samhsa")) return "government_directory";
  return "staff_entered";
}

/** Visible, plain-language provenance notice for a facility profile. */
export function provenanceNotice(facility) {
  switch (facilityProvenance(facility)) {
    case "government_directory":
      return (
        `Listing information comes from SAMHSA's FindTreatment.gov directory, as reported by the facility, ` +
        `and was imported in ${SAMHSA_SNAPSHOT_LABEL}. RehabLookup has not independently verified this ` +
        `facility's services, insurance, licensing, accreditation, or current availability. ` +
        `Please confirm details directly with the facility.`
      );
    case "provider":
      return (
        "This listing is managed by the facility, and its details are provided by the facility. " +
        "RehabLookup has not independently verified them. Please confirm details directly with the facility."
      );
    default:
      return (
        "Details on this listing may not be current, and RehabLookup has not independently verified them. " +
        "Please confirm details directly with the facility."
      );
  }
}

/** Short source label for the licensing / accreditation section. */
export function credentialSourceLabel(facility) {
  switch (facilityProvenance(facility)) {
    case "government_directory":
      return "as reported to SAMHSA";
    case "provider":
      return "as reported by the facility";
    default:
      return "not independently verified";
  }
}

/**
 * The SAMHSA importer wrote one templated description per listing:
 *   "<Name> is a licensed addiction treatment provider in <City>, <State>. …
 *    The facility is recognized by <A> and <B>. …"
 * Both sentences restate facility-reported SAMHSA fields as RehabLookup's own
 * assertion. This rewrites only those two machine-generated phrasings and
 * leaves every other word — and the stored record — untouched.
 */
export function presentListingDescription(description) {
  if (!description) return description ?? "";
  return String(description)
    .replace(/ is a licensed addiction treatment provider in /g, " is an addiction treatment provider in ")
    .replace(/ The facility is recognized by /g, " Its SAMHSA listing reports licensing or accreditation from ");
}

/** FAQ answer about licensing/accreditation, worded by provenance. */
export function credentialFaqAnswer(name, credentials, facility) {
  const list = joinList(credentials);
  const lead =
    facilityProvenance(facility) === "government_directory"
      ? `According to its listing in SAMHSA's FindTreatment.gov directory, ${name} reports licensing or accreditation from ${list}.`
      : `${name} lists ${list} on its profile.`;
  return `${lead} RehabLookup has not independently verified these credentials; you can confirm them directly with the issuing organization.`;
}

function joinList(arr) {
  const a = (arr ?? []).filter(Boolean);
  if (a.length <= 1) return a.join("");
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(", ")}, and ${a[a.length - 1]}`;
}

/**
 * Structured-data truth check. Returns a list of human-readable violations for
 * a facility JSON-LD node. `facts` is what the facility record actually holds;
 * omit it to run the record-independent checks only (used by the CI scan of
 * built HTML, which cannot see the database).
 */
export function findFacilitySchemaViolations(node, facts = {}) {
  const v = [];
  if (!node || typeof node !== "object") return v;
  const types = [].concat(node["@type"] ?? []);
  const isFacility = types.some((t) =>
    ["MedicalOrganization", "MedicalClinic", "MedicalBusiness", "LocalBusiness"].includes(t),
  );
  if (!isFacility) return v;

  if (node.openingHoursSpecification && !facts.hoursOfOperation) {
    v.push("openingHoursSpecification without facility hours data");
  }
  if ("isAcceptingNewPatients" in node && typeof facts.acceptingAdmissions !== "boolean") {
    v.push("isAcceptingNewPatients without facility admissions data");
  }
  if ("isAccessibleForFree" in node) v.push("isAccessibleForFree is not backed by facility data");
  if ([].concat(node.medicalSpecialty ?? []).some((s) => /psychiatr/i.test(String(s)))) {
    v.push("medicalSpecialty Psychiatry is not backed by facility data");
  }
  if (node.knowsAbout) v.push("knowsAbout boilerplate on a facility node");
  if (node.slogan) v.push("slogan on a facility node");
  if (node.priceRange) v.push("priceRange is not backed by facility data");
  if ([].concat(node.paymentAccepted ?? []).some((p) => /^(cash|credit card|insurance)$/i.test(String(p)))) {
    v.push("paymentAccepted contains generic values not from facility data");
  }
  if ([].concat(node.hasCredential ?? []).some((c) => c && c["@type"] === "EducationalOccupationalCredential")) {
    v.push("hasCredential misuses EducationalOccupationalCredential for facility licensing");
  }
  if (node.geo && (node.geo.latitude == null || node.geo.longitude == null)) {
    v.push("geo without coordinates");
  }
  if ([].concat(node.makesOffer ?? []).some((o) => o && o.availability)) {
    v.push("makesOffer asserts availability");
  }
  if ([].concat(node.potentialAction ?? []).some((a) => a && a["@type"] === "ReserveAction")) {
    v.push("ReserveAction implies bookable consultations");
  }
  if ((node.reviewedBy || node.lastReviewed) && !facts.editorialReview) {
    v.push("reviewedBy/lastReviewed without a documented editorial review");
  }
  return v;
}
