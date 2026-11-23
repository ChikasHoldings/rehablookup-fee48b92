"""Phase 1 reassessment of SEO_PAGE_DECISIONS.csv (2026-11-23).

Usage: python3 -I reassess_decisions.py <SEO_URL_INVENTORY.csv> <SEO_PAGE_DECISIONS.csv> <out.csv> <summary.json>

What it adds to the Phase 0 proposals (which are NOT executed):
  * phase1_class — the six owner-requested classes:
      KEEP AND IMPROVE | MERGE INTO RELEVANT PAGE | 301 REDIRECT TO TRUE EQUIVALENT |
      PERMANENTLY REMOVE WITH 404/410 | RETAIN BUT NOINDEX | REQUIRES MORE INVESTIGATION
  * evidence_gaps — what we could NOT check for this URL (backlinks, full GSC history, GA4 landing data)
  * destination_check — for any redirect/merge target: exists / prerendered / indexable / not itself
    a redirect source / not itself slated for removal or merge (no chains)
  * confidence — downgraded where evidence is incomplete
  * approval_status — every destructive row stays PENDING_OWNER_APPROVAL
"""
import csv, json, sys, collections

inv_fn, dec_fn, out_fn, sum_fn = sys.argv[1:5]
inv = {r["path"]: r for r in csv.DictReader(open(inv_fn))}
rows = list(csv.DictReader(open(dec_fn)))
action_of = {r["path"]: r["recommended_action"] for r in rows}

TRUE_EQUIVALENT_RULES = {"R21", "R29"}  # duplicate state page; city-swapped provider page -> /for-providers
GENERIC_COMBO_PREFIXES = {"drug-rehab", "alcohol-rehab", "rehab-centers", "detox", "detox-centers", "iop",
                          "outpatient-rehab", "inpatient-rehab", "php", "mat-clinic", "sober-living"}
REMOVING = ("DELETE", "MERGE", "301")

def dest_check(target):
    if not target:
        return "no destination"
    t = target.split(" ")[0].split("?")[0]
    r = inv.get(t)
    if not r:
        return "FAIL: destination not in inventory"
    if r["prerendered"] != "yes":
        return "FAIL: destination not prerendered"
    if r["noindex"] == "yes":
        return "FAIL: destination is noindex"
    if r["redirect_target_vercel_json"]:
        return "FAIL: destination is itself a redirect source"
    a = action_of.get(t, "")
    if a.split(" ")[0] in REMOVING:
        return "FAIL: destination is itself slated for removal/merge (chain)"
    return "OK"

def classify(r):
    a, rule, cat = r["recommended_action"], r["rule"], r["category"]
    if a.startswith("IMPROVE") or a.startswith("KEEP"):
        return "KEEP AND IMPROVE"
    if a.startswith("NOINDEX"):
        return "RETAIN BUT NOINDEX"
    if a.startswith("INVESTIGATE"):
        return "REQUIRES MORE INVESTIGATION"
    if a.startswith("DELETE"):
        return "PERMANENTLY REMOVE WITH 404/410"
    if a.startswith("301"):
        if rule in TRUE_EQUIVALENT_RULES:
            return "301 REDIRECT TO TRUE EQUIVALENT"
        if cat == "city_combo":
            pre = r["path"].strip("/").rsplit("-in-", 1)[0]
            return "301 REDIRECT TO TRUE EQUIVALENT" if pre in GENERIC_COMBO_PREFIXES and r["replacement_url"] else "MERGE INTO RELEVANT PAGE"
        return "MERGE INTO RELEVANT PAGE"
    if a.startswith("MERGE"):
        return "MERGE INTO RELEVANT PAGE"
    return "REQUIRES MORE INVESTIGATION"

GAPS = ("no backlink data; GSC page export is top-1,000 only (a URL outside it had <=11 impressions in 16 months, "
        "not zero); no GA4 landing-page or referral data per URL")

out = []
summary = collections.defaultdict(collections.Counter)
dest_fail = collections.Counter()
for r in rows:
    cls = classify(r)
    destructive = cls in ("MERGE INTO RELEVANT PAGE", "301 REDIRECT TO TRUE EQUIVALENT", "PERMANENTLY REMOVE WITH 404/410")
    dc = dest_check(r["replacement_url"]) if cls in ("MERGE INTO RELEVANT PAGE", "301 REDIRECT TO TRUE EQUIVALENT") else ""
    if dc.startswith("FAIL") or dc == "no destination":
        dest_fail[(r["category"], dc)] += 1
        if cls != "PERMANENTLY REMOVE WITH 404/410":
            cls = "REQUIRES MORE INVESTIGATION"
    conf = r["confidence"]
    if cls == "PERMANENTLY REMOVE WITH 404/410":
        conf = "medium (pending backlink check + full-history GSC page export)"
    r2 = dict(r)
    r2.update(phase1_class=cls, destination_check=dc, evidence_gaps=GAPS if destructive or cls.startswith("REQUIRES") else "",
              confidence=conf,
              approval_status=("PENDING_OWNER_APPROVAL — not authorized in Phase 1" if destructive else r["approval_status"]))
    out.append(r2)
    summary[r["category"]][cls] += 1

fields = list(rows[0].keys()) + ["phase1_class", "destination_check", "evidence_gaps"]
with open(out_fn, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(out)
tot = collections.Counter()
for c in summary.values(): tot.update(c)
json.dump({"by_category": {k: dict(v) for k, v in summary.items()}, "totals": dict(tot),
           "destination_failures": {f"{k[0]} | {k[1]}": v for k, v in dest_fail.items()}},
          open(sum_fn, "w"), indent=1)
print("totals:", dict(tot))
print("destination failures:", dict(dest_fail))
