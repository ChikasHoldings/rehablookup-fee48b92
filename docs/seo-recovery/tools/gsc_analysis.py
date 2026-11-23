import csv,re,sys,collections,json
# Usage: python3 -I gsc_analysis.py <SEO_URL_INVENTORY.csv> <Performance-on-Search__Pages.csv> <Performance-on-Search__Queries.csv>
INV, PAGES, QUERIES = sys.argv[1:4]
inv={r['path']:r for r in csv.DictReader(open(INV))}
pages=list(csv.DictReader(open(PAGES)))
agg=collections.defaultdict(lambda:[0,0,0.0,0])
for p in pages:
    path=p['Top pages'].replace('https://rehablookup.com','').rstrip('/') or '/'
    cat=inv.get(path,{}).get('category','(not in inventory)')
    c,i,pos=float(p['Clicks']),float(p['Impressions']),float(p['Position'])
    a=agg[cat]; a[0]+=c;a[1]+=i;a[2]+=pos*i;a[3]+=1
tot=sum(a[1] for a in agg.values())
print('PAGES export by category (16 months, top 1000 pages)')
for k,a in sorted(agg.items(), key=lambda kv:-kv[1][1]):
    print(f"{k:38} pages={a[3]:4d} clicks={a[0]:4.0f} impr={a[1]:7.0f} ({100*a[1]/tot:4.1f}%) wpos={a[2]/a[1]:5.1f}")
print('\nTop 25 pages by impressions:')
for p in sorted(pages,key=lambda r:-float(r['Impressions']))[:25]:
    path=p['Top pages'].replace('https://rehablookup.com','')
    print(f"{float(p['Impressions']):6.0f} {float(p['Clicks']):3.0f} pos={float(p['Position']):5.1f} {path}  [{inv.get(path.rstrip('/') or '/',{}).get('category','?')}]")
# queries
q=list(csv.DictReader(open(QUERIES)))
def intent(s):
    s=s.lower()
    if 'rehablookup' in s or 'rehab lookup' in s: return 'brand'
    if re.search(r'marketing|get more patients|admissions|seo for|advertis|lead|census|profitab|referral', s): return 'b2b_provider'
    if re.search(r'insurance|medicaid|medicare|aetna|cigna|blue cross|bcbs|tricare|humana|united|cost|price|free|afford|state funded|low cost', s): return 'cost_insurance'
    if re.search(r'detox|inpatient|outpatient|iop|php|residential|sober|mat\b|methadone|suboxone|dual diagnosis|intensive', s): return 'level_of_care'
    if re.search(r'alcohol|drug|opioid|heroin|meth|cocaine|fentanyl|benzo|xanax|marijuana|kratom', s): return 'substance'
    if re.search(r'\b(in|near)\b|county|city|' + '|'.join(['texas','florida','california','colorado','arkansas','arizona','ohio','new ','michigan','georgia','tennessee']), s): return 'local_generic'
    if re.search(r'what|how|why|is |does|can |signs|symptom|withdraw|vs', s): return 'informational'
    return 'other_navigational'
qa=collections.defaultdict(lambda:[0,0,0.0,0])
for r in q:
    k=intent(r['Top queries']); c,i,pos=float(r['Clicks']),float(r['Impressions']),float(r['Position'])
    a=qa[k]; a[0]+=c;a[1]+=i;a[2]+=pos*i;a[3]+=1
print('\nQUERY export by intent (top 1000 queries)')
for k,a in sorted(qa.items(), key=lambda kv:-kv[1][1]):
    print(f"{k:20} queries={a[3]:4d} clicks={a[0]:3.0f} impr={a[1]:6.0f} wpos={a[2]/a[1]:5.1f}")
print('\nTop 30 queries by impressions:')
for r in sorted(q,key=lambda r:-float(r['Impressions']))[:30]:
    print(f"{float(r['Impressions']):5.0f} {float(r['Clicks']):2.0f} pos={float(r['Position']):5.1f} {r['Top queries']} [{intent(r['Top queries'])}]")
print('\nQueries with position <= 20 (striking distance / already-visible):')
for r in sorted([r for r in q if float(r['Position'])<=20], key=lambda r:-float(r['Impressions']))[:30]:
    print(f"{float(r['Impressions']):5.0f} {float(r['Clicks']):2.0f} pos={float(r['Position']):5.1f} {r['Top queries']}")
