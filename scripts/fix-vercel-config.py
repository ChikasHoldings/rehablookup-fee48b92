#!/usr/bin/env python3
"""
Fix vercel.json to resolve the cleanUrls + middleware 404 conflict.

ROOT CAUSE:
  cleanUrls: true forces Vercel to serve /foo from dist/foo.html strictly.
  When the middleware returns next() for a Googlebot request on a
  non-prerendered path, Vercel looks for dist/foo.html, finds nothing,
  and returns a 404. The SPA fallback rewrite only applies to requests
  the middleware rewrites to /.

THE FIX:
  1. Remove cleanUrls: true  — stop forcing strict .html file lookups.
  2. Keep the SPA fallback rewrite (/(.*) → /index.html) — this now
     applies to ALL requests that don't match a real file in dist/,
     including Googlebot requests on non-prerendered paths.
  3. The middleware still routes crawlers to next() for prerendered paths
     (Vercel finds the .html file naturally) and next() for non-prerendered
     paths (Vercel falls through to the SPA rewrite → index.html → React
     sets the correct canonical).

RESULT:
  - Prerendered paths: Vercel serves dist/foo.html (correct canonical baked in)
  - Non-prerendered paths: Vercel serves dist/index.html (React sets canonical)
  - Human visitors: middleware rewrites to / → SPA shell (unchanged)
  - No more 404s for Googlebot on any valid route.
"""
import json
import sys

with open('vercel.json') as f:
    config = json.load(f)

# 1. Remove cleanUrls — this is the root cause of the 404s
if 'cleanUrls' in config:
    del config['cleanUrls']
    print("✓ Removed cleanUrls: true")

# 2. Ensure the SPA fallback rewrite is present and correct
#    This rewrite catches all paths not matched by a real file in dist/
config['rewrites'] = [
    {"source": "/(.*)", "destination": "/index.html"}
]
print("✓ Confirmed SPA fallback rewrite: /(.*) → /index.html")

# 3. Ensure trailingSlash is false (prevents duplicate content)
config['trailingSlash'] = False
print("✓ Confirmed trailingSlash: false")

# Write back
with open('vercel.json', 'w') as f:
    json.dump(config, f, indent=2)
    f.write('\n')

print("\n✓ vercel.json updated successfully")
print("\nKey change: Removed cleanUrls: true")
print("  Before: Vercel strictly required dist/foo.html for /foo → 404 if missing")
print("  After:  Vercel falls through to SPA rewrite → dist/index.html → React handles routing")
