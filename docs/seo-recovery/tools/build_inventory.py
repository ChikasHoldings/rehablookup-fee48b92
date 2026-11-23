"""Build the RehabLookup URL inventory from every available source.

Usage: python3 -I build_inventory.py <repo_or_build_dir> <gsc_pages_csv> <gsc_indexed_csv> <facility_paths_txt> <out_csv>

  <repo_or_build_dir>   directory containing public/, prerender-manifest.ts and vercel.json
                        (use a production-equivalent build worktree for deployed-state numbers)
  <gsc_pages_csv>       docs/seo-recovery/data/gsc-*/Performance-on-Search__Pages.csv
  <gsc_indexed_csv>     docs/seo-recovery/data/gsc-*/Coverage-Valid__Table.csv
  <facility_paths_txt>  one /center/<slug> path per line (from the built sitemap-facilities.xml or the edge function)

Sources reconciled:
  - prerendered HTML in <repo>/public (committed corpus)
  - <repo>/public/sitemap.xml + sitemap-extras.xml (committed)
  - live facility sitemap fetched from the Supabase edge function (data/live-facility-paths.txt)
  - <repo>/prerender-manifest.ts
  - GSC Performance "Pages" export (16 months) and Page-indexing "Indexed" sample
  - vercel.json redirect sources
"""
import csv, hashlib, json, os, re, sys, collections

repo, GSC_PAGES, GSC_IDX, FAC_PATHS, out_csv = sys.argv[1:6]
PUB = os.path.join(repo, "public")
BASE = "https://rehablookup.com"

STATE_WORDS = set("""alabama alaska arizona arkansas california colorado connecticut delaware florida georgia
hawaii idaho illinois indiana iowa kansas kentucky louisiana maine maryland massachusetts
michigan minnesota mississippi missouri montana nebraska nevada new hampshire jersey mexico
york north carolina dakota ohio oklahoma oregon pennsylvania rhode island south tennessee
texas utah vermont virginia washington west wisconsin wyoming district columbia dc county
city town""".split())
STATES = set("""alabama alaska arizona arkansas california colorado connecticut delaware florida georgia
hawaii idaho illinois indiana iowa kansas kentucky louisiana maine maryland massachusetts michigan
minnesota mississippi missouri montana nebraska nevada new-hampshire new-jersey new-mexico new-york
north-carolina north-dakota ohio oklahoma oregon pennsylvania rhode-island south-carolina south-dakota
tennessee texas utah vermont virginia washington west-virginia wisconsin wyoming district-of-columbia""".split())

DROPPABLE = re.compile(r"<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?</\1>", re.I)
TAG = re.compile(r"<[^>]+>")
ENTITY = re.compile(r"&[a-z#0-9]+;", re.I)
WORD = re.compile(r"[a-z][a-z'-]+")
BODY = re.compile(r"<body\b[^>]*>([\s\S]*)</body>", re.I)
TITLE = re.compile(r"<title[^>]*>([\s\S]*?)</title>", re.I)
def meta(name_attr, html):
    m = re.search(r'<meta\s+[^>]*(?:name|property)=["\']%s["\'][^>]*>' % re.escape(name_attr), html, re.I)
    if not m: return ""
    c = re.search(r'content=["\']([^"\']*)["\']', m.group(0), re.I)
    return c.group(1).strip() if c else ""
CANON = re.compile(r'<link\s+[^>]*rel=["\']canonical["\'][^>]*>', re.I)
H1 = re.compile(r"<h1\b[^>]*>([\s\S]*?)</h1>", re.I)
CENTER_HREF = re.compile(r'href=["\'](?:https://rehablookup\.com)?(/center/[a-z0-9-]+)["\']', re.I)
LDJSON = re.compile(r'<script[^>]*application/ld\+json[^>]*>([\s\S]*?)</script>', re.I)

def norm_path(p):
    p = p.split("#")[0].split("?")[0]
    if not p.startswith("/"): p = "/" + p
    if len(p) > 1: p = p.rstrip("/")
    return p

def classify(path):
    """Return (category, template_family)."""
    if path == "/": return "home", "/"
    seg = [s for s in path.split("/") if s]
    h = seg[0]
    n = len(seg)
    m = re.match(r"^(.*?)-in-([a-z0-9-]+)$", h)
    if h == "center": return "facility_profile", "/center/*"
    if h == "rehab-centers":
        if n == 1: return "directory_hub", "/rehab-centers"
        if n == 2: return "state_hub", "/rehab-centers/{state}"
        if seg[2] == "articles": return "state_article", "/rehab-centers/{state}/articles/*"
        if seg[2] == "county":
            if n == 4: return "county_hub", "/rehab-centers/{state}/county/{county}"
            return "county_x_service", "/rehab-centers/{state}/county/{county}/{service}"
        if n == 3: return "city_hub", "/rehab-centers/{state}/{city}"
        return "rehab_centers_other", "/rehab-centers/**"
    if h == "insurance":
        if n == 1: return "insurance_hub", "/insurance"
        if n == 2: return "insurance_carrier", "/insurance/{carrier}"
        if n == 3: return "insurance_x_state", "/insurance/{carrier}/{state}"
        if n >= 4 and seg[3] == "county": return "insurance_x_county", "/insurance/{carrier}/{state}/county/{county}"
        return "insurance_x_city", "/insurance/{carrier}/{state}/{city}"
    if h == "rehab-marketing":
        if n <= 2: return "provider_marketing_state", "/rehab-marketing/{state}"
        if n == 3: return "provider_marketing_topic", "/rehab-marketing/{x}/{y}"
        if n == 4: return "provider_marketing_county", "/rehab-marketing/{state}/county/{county}"
        if n == 5: return "provider_marketing_county_x_service", "/rehab-marketing/{state}/county/{county}/{service}"
        return "provider_marketing_county_x_insurance", "/rehab-marketing/{state}/county/{county}/insurance/{payer}"
    if h == "treatment-types":
        if n == 1: return "treatment_hub", "/treatment-types"
        if n == 2: return "treatment_type", "/treatment-types/{type}"
        if n == 3: return "treatment_x_state", "/treatment-types/{type}/{state}"
        return "treatment_x_city", "/treatment-types/{type}/{state}/{city}"
    if h in ("resources",): return ("resource_article" if n >= 2 else "resource_hub"), "/resources/*"
    if h in ("provider-guides",): return ("provider_guide" if n >= 2 else "provider_guide_hub"), "/provider-guides/*"
    if h in ("us-rehab",): return "international", "/us-rehab/*"
    if h in ("news", "authors", "blog"): return "editorial_misc", "/" + h + "/*"
    if m:
        pre = m.group(1)
        if pre in ("list-your-facility", "get-more-patients", "for-providers"):
            return "provider_city_landing", f"/{pre}-in-{{city}}"
        if pre == "best-rehab-centers": return "best_in_city", "/best-rehab-centers-in-{city}"
        if pre.startswith("what-to-expect"): return "content_static", f"/{h}"
        return "city_combo", f"/{pre}-in-{{city}}"
    if h.endswith("-near-me"):
        if n == 1: return "near_me_national", f"/{h}"
        if n == 2: return "near_me_state", f"/{h}/{{state}}"
        if seg[2] == "county": return "near_me_county", f"/{h}/{{state}}/county/{{county}}"
        return "near_me_city", f"/{h}/{{state}}/{{city}}"
    if n == 2 and seg[1] in STATES:
        return "specialty_x_state", f"/{h}/{{state}}"
    if n == 3 and seg[1] in STATES:
        return "specialty_x_city", f"/{h}/{{state}}/{{city}}"
    if h in ("provider", "admin", "login", "auth", "account", "signup", "provider-login", "provider-signup", "forgot-password"):
        return "auth_private", f"/{h}/*"
    if n == 1: return "content_static", "/{static}"
    return "other", "/" + h + "/*"

def load_sitemap(fn):
    if not os.path.exists(fn): return set()
    s = open(fn, encoding="utf-8").read()
    return {norm_path(u.replace(BASE, "")) for u in re.findall(r"<loc>([^<]+)</loc>", s)}

sm_main = load_sitemap(os.path.join(PUB, "sitemap.xml"))
sm_extras = load_sitemap(os.path.join(PUB, "sitemap-extras.xml"))
live_fac = {norm_path(l.strip()) for l in open(FAC_PATHS) if l.strip()}
manifest = {norm_path(p) for p in re.findall(r'"(/[^"]*)"', open(os.path.join(repo, "prerender-manifest.ts")).read())}

gsc = {}
with open(GSC_PAGES) as f:
    for r in csv.DictReader(f):
        p = norm_path(r["Top pages"].replace(BASE, "") or "/")
        gsc[p] = (float(r["Clicks"] or 0), float(r["Impressions"] or 0), float(r["Position"] or 0))
gsc_idx = {}
with open(GSC_IDX) as f:
    for r in csv.DictReader(f):
        gsc_idx[norm_path(r["URL"].replace(BASE, "") or "/")] = r["Last crawled"][:10]

vj = json.load(open(os.path.join(repo, "vercel.json")))
redir_rx = []
for r in vj.get("redirects", []):
    src = r["source"]
    rx = "^" + re.sub(r":[a-zA-Z_]+\*?", "[^/]+", src.replace("(.*)", ".*")) + "/?$"
    try: redir_rx.append((re.compile(rx), r["destination"], src))
    except re.error: pass
def redirect_of(p):
    for rx, dest, src in redir_rx:
        if rx.match(p): return dest
    return ""

# ---- walk prerendered corpus ----
rows = {}
clusters = collections.Counter()
for root, dirs, files in os.walk(PUB):
    for fn in files:
        if not fn.endswith(".html"): continue
        full = os.path.join(root, fn)
        rel = full[len(PUB):].replace(os.sep, "/")
        p = rel[:-len("/index.html")] if rel.endswith("/index.html") else rel[:-5]
        p = norm_path(p or "/")
        if p in ("/index",): p = "/"
        try: html = open(full, encoding="utf-8", errors="replace").read()
        except Exception: continue
        t = TITLE.search(html); title = re.sub(r"\s+", " ", t.group(1)).strip() if t else ""
        cm = CANON.search(html)
        canon = ""
        if cm:
            h = re.search(r'href=["\']([^"\']*)["\']', cm.group(0)); canon = h.group(1) if h else ""
        ncanon = len(CANON.findall(html))
        robots = meta("robots", html)
        desc = meta("description", html)
        h1m = H1.findall(html)
        h1 = re.sub(r"\s+", " ", TAG.sub(" ", h1m[0])).strip() if h1m else ""
        b = BODY.search(html); body = b.group(1) if b else html
        txt = re.sub(r"\s+", " ", ENTITY.sub(" ", TAG.sub(" ", DROPPABLE.sub(" ", body)))).strip()
        words = len(txt.split())
        own = set(re.sub(r"[^a-z]+", " ", rel.lower()).split())
        toks = [w for w in WORD.findall(txt.lower()) if w not in own and w not in STATE_WORDS]
        hsh = hashlib.sha1(" ".join(toks).encode()).hexdigest()[:12]
        clusters[hsh] += 1
        fac_links = len(set(CENTER_HREF.findall(html)))
        ld_types = sorted(set(re.findall(r'"@type"\s*:\s*"([A-Za-z]+)"', " ".join(LDJSON.findall(html)))))
        rows[p] = dict(url=BASE + (p if p != "/" else "/"), path=p, source_file=rel.lstrip("/"),
                       title=title, title_len=len(title), meta_description_len=len(desc), h1=h1[:120],
                       canonical=canon, canonical_count=ncanon,
                       canonical_self=("yes" if canon.rstrip("/") == (BASE + p).rstrip("/") else ("missing" if not canon else "NO")),
                       meta_robots=robots, noindex=("yes" if "noindex" in robots.lower() else "no"),
                       body_words=words, facility_links=fac_links, body_cluster=hsh, jsonld_types="|".join(ld_types))

# add URLs known from other sources but not prerendered
for p in (sm_main | sm_extras | live_fac | set(gsc) | set(gsc_idx)):
    if p not in rows:
        rows[p] = dict(url=BASE + p, path=p, source_file="", title="", title_len="", meta_description_len="", h1="",
                       canonical="", canonical_count="", canonical_self="", meta_robots="", noindex="",
                       body_words="", facility_links="", body_cluster="", jsonld_types="")

fields = ["url", "path", "category", "template_family", "source_file", "prerendered", "in_prerender_manifest",
          "in_sitemap", "sitemap_file", "redirect_target_vercel_json", "gsc_clicks_16mo", "gsc_impressions_16mo",
          "gsc_avg_position", "gsc_indexed_sample", "gsc_last_crawled", "title", "title_len", "meta_description_len",
          "h1", "canonical", "canonical_count", "canonical_self", "meta_robots", "noindex", "body_words", "thin_lt_300w",
          "facility_links", "body_cluster", "body_cluster_size", "jsonld_types"]
out = []
for p, r in rows.items():
    cat, fam = classify(p)
    r["category"], r["template_family"] = cat, fam
    r["prerendered"] = "yes" if r["source_file"] else "no"
    r["in_prerender_manifest"] = "yes" if p in manifest else "no"
    sf = [n for n, s in (("sitemap.xml", sm_main), ("sitemap-extras.xml", sm_extras), ("sitemap-facilities(live)", live_fac)) if p in s]
    r["in_sitemap"] = "yes" if sf else "no"; r["sitemap_file"] = "|".join(sf)
    r["redirect_target_vercel_json"] = redirect_of(p)
    g = gsc.get(p)
    r["gsc_clicks_16mo"], r["gsc_impressions_16mo"], r["gsc_avg_position"] = (int(g[0]), int(g[1]), g[2]) if g else ("", "", "")
    r["gsc_indexed_sample"] = "yes" if p in gsc_idx else ""
    r["gsc_last_crawled"] = gsc_idx.get(p, "")
    r["thin_lt_300w"] = ("yes" if r["body_words"] != "" and r["body_words"] < 300 else ("no" if r["body_words"] != "" else ""))
    r["body_cluster_size"] = clusters.get(r["body_cluster"], "") if r["body_cluster"] else ""
    out.append(r)
out.sort(key=lambda r: (r["category"], r["path"]))
with open(out_csv, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
    w.writeheader(); w.writerows(out)

# summary by category
summ = collections.OrderedDict()
for r in out:
    s = summ.setdefault(r["category"], collections.Counter())
    s["urls"] += 1
    s["prerendered"] += r["prerendered"] == "yes"
    s["in_sitemap"] += r["in_sitemap"] == "yes"
    s["noindex"] += r["noindex"] == "yes"
    s["canon_not_self"] += r["canonical_self"] in ("NO", "missing")
    s["thin"] += r["thin_lt_300w"] == "yes"
    s["dup_body"] += (r["body_cluster_size"] not in ("", 1))
    s["zero_fac_links"] += (r["facility_links"] == 0)
    s["redirected"] += bool(r["redirect_target_vercel_json"])
    s["gsc_pages_w_impr"] += r["gsc_impressions_16mo"] != ""
    s["gsc_impr"] += r["gsc_impressions_16mo"] or 0
    s["gsc_clicks"] += r["gsc_clicks_16mo"] or 0
    s["gsc_indexed_sample"] += r["gsc_indexed_sample"] == "yes"
json.dump({k: dict(v) for k, v in summ.items()}, open(out_csv.replace(".csv", "_summary.json"), "w"), indent=1)
hdr = ["urls", "prerendered", "in_sitemap", "noindex", "canon_not_self", "thin", "dup_body", "zero_fac_links", "redirected", "gsc_pages_w_impr", "gsc_impr", "gsc_clicks", "gsc_indexed_sample"]
print("category".ljust(40) + "".join(h[:9].rjust(10) for h in hdr))
tot = collections.Counter()
for k, v in sorted(summ.items(), key=lambda kv: -kv[1]["urls"]):
    print(k.ljust(40) + "".join(str(v[h]).rjust(10) for h in hdr)); tot.update(v)
print("TOTAL".ljust(40) + "".join(str(tot[h]).rjust(10) for h in hdr))
print("manifest", len(manifest), "sitemap.xml", len(sm_main), "extras", len(sm_extras), "live facilities", len(live_fac))
