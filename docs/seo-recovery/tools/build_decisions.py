"""Generate SEO_PAGE_DECISIONS.csv from the URL inventory + internal link graph.

Usage: python3 -I build_decisions.py <inventory.csv> <linkgraph.csv> <out.csv>

Every destructive action (DELETE / 301 REDIRECT / MERGE) is emitted with
approval_status=PENDING_OWNER_APPROVAL. Nothing in this file has been executed.
Rule codes are documented in docs/seo-recovery/SEO_MASTER_AUDIT.md §Decision rules.
"""
import csv, sys, collections

inv_fn, lg_fn, out_fn = sys.argv[1:4]
rows = list(csv.DictReader(open(inv_fn)))
lg = {r["path"]: r for r in csv.DictReader(open(lg_fn))}
paths = {r["path"] for r in rows}

# Topic data support, measured 2026-11-22 against the live facility tables and staged SAMHSA facets.
#   NOW     = supported by current facility_services / facility_insurance tags
#   SAMHSA  = not in current tags, but present in staged SAMHSA facets (Phase 3 import work required)
#   NONE    = no data source can support a facility-matching claim
SUPPORT = {
    "detox": "NOW", "24-7-detox": "NONE", "alcohol-rehab": "NOW", "drug-rehab": "NOW", "rehab": "NOW",
    "outpatient-rehab": "NOW", "iop": "NOW", "php": "NOW", "inpatient-rehab": "SAMHSA", "dual-diagnosis": "NOW",
    "mat-clinic": "NOW", "methadone-clinic": "SAMHSA", "suboxone-clinic": "SAMHSA", "opioid-rehab": "SAMHSA",
    "medicaid-rehab": "NOW", "medicare-rehab": "NOW", "tricare-rehab": "NOW", "free-rehab": "SAMHSA",
    "low-cost-rehab": "NOW", "affordable-rehab": "NOW", "sober-living": "SAMHSA", "womens-rehab": "SAMHSA",
    "mens-rehab": "SAMHSA", "veterans-rehab": "SAMHSA", "teen-rehab": "SAMHSA", "young-adult-rehab": "SAMHSA",
    "seniors-rehab": "SAMHSA", "lgbtq-rehab": "SAMHSA", "court-ordered-rehab": "SAMHSA",
}
NEAR_ME_TARGET = {  # near-me family -> canonical state-level consolidation target pattern
    "detox": "/treatment-types/detox-programs/{s}", "24-7-detox": "/treatment-types/detox-programs/{s}",
    "alcohol-rehab": "/treatment-types/alcohol-rehabilitation/{s}", "drug-rehab": "/rehab-centers/{s}",
    "rehab": "/rehab-centers/{s}", "outpatient-rehab": "/treatment-types/outpatient-programs/{s}",
    "iop": "/treatment-types/outpatient-programs/{s}", "php": "/treatment-types/outpatient-programs/{s}",
    "inpatient-rehab": "/treatment-types/residential-inpatient/{s}",
    "dual-diagnosis": "/treatment-types/dual-diagnosis-treatment/{s}",
    "sober-living": "/treatment-types/sober-living/{s}", "medicaid-rehab": "/insurance/medicaid-rehab/{s}",
    "medicare-rehab": "/insurance/medicare-rehab/{s}", "tricare-rehab": "/insurance/tricare-rehab/{s}",
    "free-rehab": "/treatment-types/free-rehab/{s}", "low-cost-rehab": "/treatment-types/free-rehab/{s}",
    "affordable-rehab": "/treatment-types/free-rehab/{s}", "womens-rehab": "/treatment-types/womens-rehab/{s}",
    "mens-rehab": "/treatment-types/mens-rehab/{s}", "veterans-rehab": "/treatment-types/veterans-rehab/{s}",
}
SPECIALTY_STATE_TARGET = {"detox-centers": "/treatment-types/detox-programs/{s}",
                          "medicaid-rehab": "/insurance/medicaid-rehab/{s}",
                          "medicare-rehab": "/insurance/medicare-rehab/{s}"}
GOV_PAYERS = {"medicaid-rehab", "medicare-rehab", "tricare-rehab"}
DATA_TT = {"detox-programs", "outpatient-programs", "dual-diagnosis-treatment", "alcohol-rehabilitation", "drug-addiction"}
SAMHSA_TT = {"residential-inpatient", "sober-living", "free-rehab", "womens-rehab", "mens-rehab", "veterans-rehab"}

# city slug -> [city hub paths with real inventory]; city-combo slugs sometimes carry a state suffix (aurora-co)
CITY_HUBS = collections.defaultdict(list)
for _r in rows:
    _s = [x for x in _r["path"].split("/") if x]
    if _r["category"] == "city_hub" and len(_s) == 3 and _r["facility_links"] not in ("", "0"):
        CITY_HUBS[_s[2]].append(_r["path"])
        abbr = {"texas": "tx", "colorado": "co", "illinois": "il", "california": "ca", "florida": "fl", "georgia": "ga",
                "missouri": "mo", "maryland": "md", "south-carolina": "sc", "north-carolina": "nc", "arizona": "az",
                "arkansas": "ar", "west-virginia": "wv", "vermont": "vt", "mississippi": "ms", "louisiana": "la"}.get(_s[1])
        if abbr: CITY_HUBS[f"{_s[2]}-{abbr}"].append(_r["path"])

def ev(r):
    return bool(r["gsc_impressions_16mo"]) or r["gsc_indexed_sample"] == "yes"

def first_existing(*cands):
    for c in cands:
        if c and c in paths: return c
    return ""

def decide(r):
    p, cat = r["path"], r["category"]
    seg = [s for s in p.split("/") if s]
    has_ev = ev(r)
    fl = int(r["facility_links"] or 0) if r["facility_links"] not in ("",) else 0
    state = seg[1] if len(seg) > 1 else ""
    D = lambda action, rule, why, conf, repl="", phase="2": (action, rule, why, conf, repl, phase)
    redir_or_delete = lambda target, rule, why: (
        D("301 REDIRECT", rule, why + " Has GSC impression/index evidence, so consolidate.", "high", target)
        if has_ev and target else D("DELETE (410)", rule, why + " No GSC evidence, no inbound links needed.", "high"))

    if cat == "home": return D("IMPROVE", "R01", "Homepage is the SPA shell for every client; fix stale noscript copy (account wording) and ensure server-rendered core content.", "high", phase="1")
    if cat == "facility_profile":
        if r["prerendered"] != "yes":
            return D("DELETE (404 — already)", "R02", "Facility URL known to GSC but not in the live facility set; middleware already returns 404 to crawlers. Verify, keep out of sitemap.", "medium", phase="1")
        return D("IMPROVE", "R03", "Core asset. Remove fabricated schema (24/7 hours, accepting patients, Psychiatry), add data-provenance labels, fix orphaning (link from city/county hubs).", "high", phase="1")
    if cat == "state_hub": return D("IMPROVE", "R04", "50% of all impressions at avg pos ~75; lists only ~12 facilities. Full paginated inventory, level-of-care breakdowns from real data, remove 'accredited/verified' overclaims.", "high", phase="3")
    if cat == "directory_hub": return D("IMPROVE", "R05", "/rehab-centers 301s to noindexed /search-results; restore an indexable directory root linking all 50 states (breadcrumb target of every profile).", "high", phase="1")
    if cat == "city_hub":
        if fl > 0: return D("IMPROVE", "R06", "City hub with real exact-match inventory: keep, enrich, link every facility.", "high", phase="3")
        return D("MERGE", "R07", "City hub with zero exact-match facilities: consolidate into state hub (or county hub with inventory once city->county mapping exists).", "medium", f"/rehab-centers/{state}")
    if cat == "county_hub":
        if fl > 0: return D("KEEP", "R08", "County hub with real inventory.", "medium", phase="3")
        return D("MERGE", "R09", "County hub with zero facilities: consolidate into state hub.", "medium", f"/rehab-centers/{state}")
    if cat == "county_x_service":
        return redir_or_delete(first_existing("/" + "/".join(seg[:4])) or f"/rehab-centers/{state}", "R10",
                               "County x service page: 99.9% duplicate body, zero facility links, zero inbound links.")
    if cat in ("near_me_county", "near_me_city"):
        fam = seg[0][:-len("-near-me")]
        t = NEAR_ME_TARGET.get(fam, "/rehab-centers/{s}").format(s=state)
        return redir_or_delete(first_existing(t, f"/rehab-centers/{state}"), "R11",
                               "Near-me county/city page: ~420 pages per family share 2 bodies, zero facility links, orphaned.")
    if cat == "near_me_state":
        fam = seg[0][:-len("-near-me")]
        t = NEAR_ME_TARGET.get(fam)
        if t:
            return D("MERGE", "R12", f"Near-me state page duplicates a canonical state x topic page (cannibalization). Topic data support: {SUPPORT.get(fam,'NONE')}.", "medium", first_existing(t.format(s=state), f"/rehab-centers/{state}"))
        if fam in ("mat-clinic", "methadone-clinic", "suboxone-clinic", "opioid-rehab"):
            return D("INVESTIGATE", "R13", "MAT/OTP intent has real demand and SAMHSA data support; decide canonical state-level MAT/OTP page in Phase 3 before consolidating.", "medium", f"/rehab-centers/{state}", "3")
        return redir_or_delete(f"/rehab-centers/{state}", "R14", f"Near-me state page for a topic with no facility data support ({fam}).")
    if cat == "near_me_national": return D("INVESTIGATE", "R15", "National topic page; overlaps treatment-types/insurance hubs. Editorial dedupe review.", "medium", phase="4")
    if cat == "treatment_hub": return D("IMPROVE", "R16", "Crawler HTML is a generic 178-word shell; must link all treatment types.", "high", phase="1")
    if cat == "treatment_type": return D("IMPROVE", "R17", "National level-of-care page; keep as educational + directory entry, medical review required.", "high", phase="4")
    if cat in ("treatment_x_state", "treatment_x_city"):
        tt = seg[1]
        if tt in DATA_TT: return D("IMPROVE", "R18", "Data-backed level of care; inject real matching facilities (currently zero facility links), fix orphaning.", "high", phase="3")
        if tt in SAMHSA_TT: return D("INVESTIGATE", "R19", "Supportable only after SAMHSA facet re-import (service setting / special programs). Keep until Phase 3 decision.", "medium", phase="3")
        return redir_or_delete(f"/treatment-types/{tt}", "R20", f"Treatment type '{tt}' has no data source (cannot truthfully match facilities).")
    if cat in ("specialty_x_state", "specialty_x_city"):
        fam = seg[0]
        if cat == "specialty_x_state" and fam in SPECIALTY_STATE_TARGET:
            return D("301 REDIRECT", "R21", "Duplicate of canonical state-level page (cannibalization).", "high", first_existing(SPECIALTY_STATE_TARGET[fam].format(s=state), f"/rehab-centers/{state}"))
        return redir_or_delete(first_existing("/" + fam, f"/rehab-centers/{state}"), "R22",
                               f"Specialty x location page ({fam}): no facility data, 100% templated, orphaned.")
    if cat == "insurance_hub": return D("IMPROVE", "R23", "Crawler HTML is a generic shell; must link carrier guides.", "high", phase="1")
    if cat == "insurance_carrier": return D("IMPROVE", "R24", "Keep as coverage education guide; remove 'we verify your insurance' claims; no facility-acceptance claims without data.", "high", phase="4")
    if cat == "insurance_x_state":
        if seg[1] in GOV_PAYERS: return D("IMPROVE", "R25", "Government payer acceptance is in facility data (Medicaid 2,746 / Medicare 1,820 / Tricare 1,432); rebuild as real matching list.", "high", phase="3")
        return D("MERGE", "R26", "Commercial carrier x state: carrier acceptance data exists for <=5 facilities nationally; page cannot truthfully list in-network facilities.", "high", "/" + "/".join(seg[:2]))
    if cat in ("insurance_x_county", "insurance_x_city"):
        tgt = first_existing("/" + "/".join(seg[:3])) if seg[1] in GOV_PAYERS else first_existing("/" + "/".join(seg[:2]))
        return redir_or_delete(tgt, "R27", "Insurance x county/city: 5,016-page identical cluster, zero facility links, no carrier data.")
    if cat.startswith("provider_marketing"):
        return redir_or_delete("/provider-guides/rehab-marketing-strategies", "R28",
                               "B2B provider-marketing doorway page (6,700 pages, 28 distinct bodies); no search demand at county level.")
    if cat == "provider_city_landing": return D("301 REDIRECT", "R29", "City-swapped provider acquisition page; identical intent to /for-providers.", "high", "/for-providers")
    if cat == "provider_guide": return D("IMPROVE", "R30", "Real B2B demand (avg pos 37). Crawler HTML is a templated shell while SPA has the article: prerender real content, add hub, dedupe overlapping guides.", "high", phase="1")
    if cat == "city_combo":
        pre, city = seg[0].rsplit("-in-", 1)
        hubs = CITY_HUBS.get(city, [])
        hub = hubs[0] if len(hubs) == 1 else ""
        if r["redirect_target_vercel_json"]:
            return D("301 REDIRECT (retarget)", "R31", "Currently 301s to noindexed /search-results?location=; retarget to the matching city hub if it has inventory, else 410." + ("" if hub else " City hub match ambiguous/missing — resolve manually."), "medium", hub)
        if has_ev and not hub:
            return D("INVESTIGATE", "R32", f"City combo '{pre}-in-{{city}}' has GSC evidence but no unambiguous city hub to consolidate into.", "medium", "", "2")
        return redir_or_delete(hub, "R32", f"City combo '{pre}-in-{{city}}': 288 pages on 2 bodies, zero facility links, 95% orphaned.")
    if cat == "best_in_city": return D("INVESTIGATE", "R33", "'Best' ranking sorted by paid plan, no methodology. Rewrite without ranking claim or merge into state hub.", "medium", f"/rehab-centers/{seg[0].split('-in-')[-1]}" if seg else "", "2")
    if cat in ("resource_article", "state_article", "content_static", "international", "editorial_misc", "resource_hub"):
        dup = r["body_cluster_size"] not in ("", "1")
        return D("INVESTIGATE", "R34", "Editorial page: queue for content/medical review." + (" Crawler HTML shares a body with other pages (likely generic shell) — verify parity with SPA." if dup else ""), "medium", phase="4")
    if cat == "auth_private": return D("NOINDEX (keep)", "R35", "Private/auth surface; keep noindex + disallow.", "high", phase="-")
    return D("INVESTIGATE", "R99", "Unclassified URL.", "low", phase="2")

fields = ["url", "path", "category", "template_family", "recommended_action", "rule", "rationale", "confidence",
          "replacement_url", "approval_required", "approval_status", "target_phase", "gsc_impressions_16mo",
          "gsc_clicks_16mo", "gsc_avg_position", "gsc_indexed_sample", "facility_links", "inbound_internal_links",
          "body_cluster_size", "in_sitemap"]
counts = collections.Counter(); impr = collections.Counter()
with open(out_fn, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields); w.writeheader()
    for r in rows:
        a, rule, why, conf, repl, phase = decide(r)
        destructive = a.split(" ")[0] in ("DELETE", "301", "MERGE")
        w.writerow(dict(url=r["url"], path=r["path"], category=r["category"], template_family=r["template_family"],
                        recommended_action=a, rule=rule, rationale=why, confidence=conf, replacement_url=repl,
                        approval_required="yes" if destructive else "no",
                        approval_status="PENDING_OWNER_APPROVAL" if destructive else "NOT_REQUIRED (normal code review)",
                        target_phase=phase, gsc_impressions_16mo=r["gsc_impressions_16mo"], gsc_clicks_16mo=r["gsc_clicks_16mo"],
                        gsc_avg_position=r["gsc_avg_position"], gsc_indexed_sample=r["gsc_indexed_sample"],
                        facility_links=r["facility_links"], inbound_internal_links=lg.get(r["path"], {}).get("inbound_internal_links", ""),
                        body_cluster_size=r["body_cluster_size"], in_sitemap=r["in_sitemap"]))
        key = a.split(" (")[0]
        counts[key] += 1; impr[key] += int(r["gsc_impressions_16mo"] or 0)
for k, v in counts.most_common(): print(f"{k:28}{v:7}  gsc_impr={impr[k]}")
print("TOTAL", sum(counts.values()))
