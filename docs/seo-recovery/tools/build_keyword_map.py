"""Cluster GSC queries into keyword opportunities and map each cluster to a destination.

Usage: python3 -I build_keyword_map.py <gsc_queries.csv> <inventory.csv> <out.csv>

Evidence base: GSC Performance "Queries" export (top 1,000 queries, 16 months to 2026-11-20).
No third-party search volume or difficulty data was available; those columns say so explicitly.
"""
import csv, re, sys, collections

q_fn, inv_fn, out_fn = sys.argv[1:4]
STATES = {"alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA", "colorado": "CO",
          "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
          "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS", "kentucky": "KY", "louisiana": "LA",
          "maine": "ME", "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
          "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
          "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
          "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA",
          "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX",
          "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
          "wisconsin": "WI", "wyoming": "WY"}
ABBR = {v.lower(): k for k, v in STATES.items() if v.lower() not in ("in", "me", "or", "oh", "hi", "ok", "co", "pa", "de", "la", "ma", "ga", "al", "id", "md", "mo", "ms")}
ABBR.update({"ct": "connecticut", "nh": "new hampshire", "nj": "new jersey", "ny": "new york", "nm": "new mexico", "nc": "north carolina", "sc": "south carolina"})
slug = lambda s: s.replace(" ", "-")

inv = [r for r in csv.DictReader(open(inv_fn))]
paths = {r["path"] for r in inv}
cities = {}  # city name -> (state slug, city slug) from real city hubs
for r in inv:
    seg = [s for s in r["path"].split("/") if s]
    if r["category"] == "city_hub" and len(seg) == 3:
        cities.setdefault(seg[2].replace("-", " "), (seg[1], seg[2]))

TOPICS = [  # (regex, topic, treatment-types slug or special)
    (r"rehab marketing|marketing|seo\b|census|admissions|conversion|lead gen|get more patients|advertis|profitab|referral", "b2b_provider_growth", "b2b"),
    (r"list (my|your) facility|claim|add (my|your) (rehab|facility)", "b2b_listing", "b2b_list"),
    (r"suboxone|bupren", "suboxone_buprenorphine", "mat"), (r"methadone", "methadone_otp", "mat"),
    (r"\bmat\b|medication assisted", "mat", "mat"),
    (r"detox", "detox", "detox-programs"), (r"\biop\b|intensive outpatient", "iop", "outpatient-programs"),
    (r"\bphp\b|partial hosp", "php", "outpatient-programs"), (r"outpatient", "outpatient", "outpatient-programs"),
    (r"inpatient|residential", "inpatient_residential", "residential-inpatient"),
    (r"dual diagnosis|co-occurring|mental health", "dual_diagnosis", "dual-diagnosis-treatment"),
    (r"sober living|halfway", "sober_living", "sober-living"),
    (r"medicaid", "medicaid", "ins:medicaid-rehab"), (r"medicare", "medicare", "ins:medicare-rehab"),
    (r"tricare", "tricare", "ins:tricare-rehab"),
    (r"aetna|cigna|blue cross|bcbs|anthem|united ?health|humana|kaiser|ambetter|molina|wellcare|oscar|magellan|highmark", "commercial_insurance", "ins:carrier"),
    (r"insurance|cost|price|afford|cheap|low cost|free|state funded|sliding", "cost_free_state_funded", "free-rehab"),
    (r"\balc\b.*\blist\b", "intent_mismatch_adult_licensed_care", "none"),
    (r"alcohol|alcoholic", "alcohol", "alcohol-rehabilitation"),
    (r"opioid|heroin|fentanyl|oxy|painkiller", "opioid", "mat"),
    (r"meth\b|cocaine|crack|benzo|xanax|marijuana|kratom|adderall", "other_substance", "drug-addiction"),
    (r"teen|adolescent|youth|young adult", "teen_young_adult", "special"), (r"veteran", "veterans", "veterans-rehab"),
    (r"women|woman|pregnan", "women", "womens-rehab"), (r"\bmen\b|\bmens\b", "men", "mens-rehab"),
    (r"luxury|executive", "luxury_executive", "none"), (r"christian|faith", "faith_based", "none"),
    (r"what is|how to|how do|signs|symptom|withdrawal|vs\b|versus|guide|compare|therapy|software|emr", "informational", "info"),
    (r"united kingdom|\buk\b|abroad|international|foreign|europe|canada|australia", "international", "info"),
    (r"rehab|treatment|recovery|addiction|drug|substance", "general_rehab", "general"),
]

def parse(q):
    s = " " + q.lower().strip() + " "
    state = None
    for name in sorted(STATES, key=len, reverse=True):
        if f" {name} " in s: state = name; s = s.replace(f" {name} ", " "); break
    if not state:
        for ab, name in ABBR.items():
            if re.search(rf"\b{ab}\b", s): state = name; s = re.sub(rf"\b{ab}\b", " ", s); break
    if not state:  # ambiguous 2-letter codes only when they are the last token or follow "in"
        m = re.search(r"(?:\bin\s+|\s)(al|co|de|ga|hi|id|la|ma|md|me|mo|ms|oh|ok|or|pa)\s*$", s)
        if m:
            code = m.group(1).upper(); name = next((k for k, v in STATES.items() if v == code), None)
            if name: state = name; s = s[:m.start(1)] + " "
    city = None
    for cname in sorted(cities, key=len, reverse=True):
        if len(cname) > 3 and f" {cname} " in s:
            city = cname; s = s.replace(f" {cname} ", " ")
            if not state: state = cities[cname][0].replace("-", " ")
            break
    topic, dest = "unclassified", "general"
    for rx, t, d in TOPICS:
        if re.search(rx, s): topic, dest = t, d; break
    return state, city, topic, dest

def destination(state, city, topic, dest):
    ss = slug(state) if state else None
    cs = cities.get(city, (None, None))[1] if city else None
    if dest == "b2b": return "/provider-guides/rehab-marketing-strategies", "optimize"
    if dest == "b2b_list": return "/for-providers", "optimize"
    if dest == "info": return "/resources (matching article)", "optimize/create"
    if dest == "none": return (f"/rehab-centers/{ss}" if ss else "/rehab-centers"), "do not target (no data support)"
    if dest.startswith("ins:"):
        if dest == "ins:carrier": return "/insurance/{carrier} (coverage guide)", "optimize"
        base = "/insurance/" + dest[4:]
        return (f"{base}/{ss}" if ss and f"{base}/{ss}" in paths else base), "optimize"
    if dest == "mat": return (f"/rehab-centers/{ss}" if ss else "/rehab-centers") + " -> future state MAT/OTP page (Phase 3)", "create (data-backed)"
    if dest in ("general", "special", "drug-addiction"):
        if ss and cs and f"/rehab-centers/{ss}/{cs}" in paths: return f"/rehab-centers/{ss}/{cs}", "optimize"
        if ss: return f"/rehab-centers/{ss}", "optimize"
        return "/rehab-centers (restore indexable root)", "optimize"
    tt = f"/treatment-types/{dest}"
    if ss and cs and f"{tt}/{ss}/{cs}" in paths: return f"{tt}/{ss}/{cs}", "optimize"
    if ss and f"{tt}/{ss}" in paths: return f"{tt}/{ss}", "optimize"
    return tt, "optimize"

def intent_of(topic, city, state):
    if topic.startswith("b2b"): return "commercial (B2B provider)", "Audience B: providers"
    if topic == "informational": return "informational", "Audience A: seekers/families"
    if topic in ("commercial_insurance", "medicaid", "medicare", "tricare", "cost_free_state_funded"): return "commercial investigation (cost/coverage)", "Audience A"
    if city or state: return "transactional-local (find facility)", "Audience A"
    return "commercial investigation", "Audience A"

clusters = collections.OrderedDict()
for r in csv.DictReader(open(q_fn)):
    q = r["Top queries"]; st, ci, tp, d = parse(q)
    key = (tp, st or "", ci or "")
    if not st and not ci and tp in ("general_rehab", "unclassified", "informational", "international"):
        key = (tp, "", "", " ".join(sorted(w for w in re.findall(r"[a-z0-9]+", q.lower()) if w not in ("in", "near", "me", "the", "a", "for", "of", "best", "top"))))
    c = clusters.setdefault(key, dict(qs=[], clicks=0.0, impr=0.0, posw=0.0, dest=d))
    i = float(r["Impressions"]); c["qs"].append((i, q)); c["clicks"] += float(r["Clicks"]); c["impr"] += i
    c["posw"] += float(r["Position"]) * i

fields = ["cluster_id", "primary_keyword", "related_variations", "query_count", "topic", "search_intent", "target_audience",
          "location_state", "location_city", "gsc_impressions_16mo", "gsc_clicks_16mo", "gsc_weighted_avg_position",
          "search_volume_evidence", "ranking_competition_evidence", "recommended_destination_url", "create_or_optimize",
          "existing_competing_pages", "priority", "content_requirements", "internal_linking_opportunities", "status"]
rows = []
for n, ((tp, st, ci, *_), c) in enumerate(sorted(clusters.items(), key=lambda kv: -kv[1]["impr"]), 1):
    c["qs"].sort(reverse=True)
    dest, act = destination(st, ci, tp, c["dest"])
    intent, aud = intent_of(tp, ci, st)
    pos = c["posw"] / c["impr"] if c["impr"] else 0
    pr = "P1" if c["impr"] >= 300 and c["dest"] not in ("none",) else ("P2" if c["impr"] >= 60 else "P3")
    if c["dest"] == "none": pr = "P4 (do not target)"
    competing = "near-me, specialty and city-combo variants of the same topic/location (cannibalization; see SEO_PAGE_DECISIONS.csv)" if st else ""
    req = {"b2b": "Original provider-growth guidance; no fabricated benchmarks; link to /for-providers and claim flow.",
           "mat": "List only facilities whose SAMHSA record shows OTP/methadone or buprenorphine; cite SAMHSA; state-specific OTP regulation notes reviewed by a clinician.",
           "info": "Evidence-based answer with SAMHSA/NIDA/NIAAA citations; medical review by a named, credentialed reviewer before publish.",
           "none": "No data source supports facility matching for this attribute; answer only via general guidance on state hub.",
           }.get(c["dest"], "Real matching facility list (exact location), counts from data, level-of-care/payment facets from facility records, data-provenance note, no 'verified/accredited' claims unless per-listing evidence.")
    links = "From state hub + city/county hubs + matching facility profiles (breadcrumb + related links)" if st else "From hub pages and related guides"
    rows.append(dict(cluster_id=f"KW{n:04d}", primary_keyword=c["qs"][0][1],
                     related_variations=" | ".join(q for _, q in c["qs"][1:8]), query_count=len(c["qs"]), topic=tp,
                     search_intent=intent, target_audience=aud, location_state=st, location_city=ci,
                     gsc_impressions_16mo=int(c["impr"]), gsc_clicks_16mo=int(c["clicks"]), gsc_weighted_avg_position=round(pos, 1),
                     search_volume_evidence="GSC impressions only (16 mo, incl. pre-collapse period); no third-party volume data available",
                     ranking_competition_evidence=f"Current avg position {pos:.0f}; no third-party difficulty data",
                     recommended_destination_url=dest, create_or_optimize=act, existing_competing_pages=competing,
                     priority=pr, content_requirements=req, internal_linking_opportunities=links, status="PROPOSED"))
with open(out_fn, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(rows)
cnt = collections.Counter(r["topic"] for r in rows)
print("clusters:", len(rows), "| by priority:", collections.Counter(r["priority"] for r in rows))
print(cnt.most_common())
