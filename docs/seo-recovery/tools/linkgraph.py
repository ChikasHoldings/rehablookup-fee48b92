# Usage: python3 -I linkgraph.py <build_dir>/public <SEO_URL_INVENTORY.csv> <out_linkgraph.csv>
import os,re,sys,csv,collections
pub=sys.argv[1]; inv=sys.argv[2]; out=sys.argv[3]
HREF=re.compile(r'href="(?:https://rehablookup\.com)?(/[^"#?]*)"')
inbound=collections.Counter(); outdeg={}
def norm(p): return p.rstrip('/') or '/'
for root,_,files in os.walk(pub):
    for fn in files:
        if not fn.endswith('.html'): continue
        rel=os.path.join(root,fn)[len(pub):]
        src=norm(rel[:-11] if rel.endswith('/index.html') else rel[:-5])
        h=open(os.path.join(root,fn),encoding='utf-8',errors='replace').read()
        b=re.search(r'<body[^>]*>(.*)</body>',h,re.S); h=b.group(1) if b else h
        links={norm(x) for x in HREF.findall(h)}-{src}
        outdeg[src]=len(links)
        for l in links: inbound[l]+=1
rows=list(csv.DictReader(open(inv)))
cat=collections.defaultdict(list)
for r in rows:
    if r['prerendered']!='yes': continue
    cat[r['category']].append(inbound.get(r['path'],0))
print('category'.ljust(38),'pages','orphans(0 in)','median_in','p90_in')
for k,v in sorted(cat.items(), key=lambda kv:-len(kv[1])):
    v=sorted(v); n=len(v)
    print(k.ljust(38), str(n).rjust(6), str(sum(1 for x in v if x==0)).rjust(10), str(v[n//2]).rjust(8), str(v[int(n*.9)]).rjust(8))
with open(out,'w',newline='') as f:
    w=csv.writer(f); w.writerow(['path','inbound_internal_links','outbound_internal_links'])
    for r in rows:
        if r['prerendered']=='yes': w.writerow([r['path'],inbound.get(r['path'],0),outdeg.get(r['path'],0)])
print('top linked:', inbound.most_common(12))
