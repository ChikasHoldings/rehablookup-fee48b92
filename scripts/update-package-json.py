#!/usr/bin/env python3
"""Update package.json to add generate:resources-html to build:vercel and build scripts."""
import json

with open('package.json', 'r') as f:
    pkg = json.load(f)

scripts = pkg.get('scripts', {})

# Add the new script entry
scripts['generate:resources-html'] = 'node scripts/generate-resources-html.mjs'

# Update build:vercel to include the new script
build_vercel = scripts.get('build:vercel', '')
if 'generate:resources-html' not in build_vercel:
    scripts['build:vercel'] = build_vercel.replace(
        'npm run generate:facility-profiles-html &&',
        'npm run generate:facility-profiles-html && npm run generate:resources-html &&'
    )

# Update the full build script too
build_full = scripts.get('build', '')
if 'generate:resources-html' not in build_full:
    scripts['build'] = build_full.replace(
        'npm run generate:facility-profiles-html &&',
        'npm run generate:facility-profiles-html && npm run generate:resources-html &&'
    )

pkg['scripts'] = scripts

with open('package.json', 'w') as f:
    json.dump(pkg, f, indent=2)
    f.write('\n')

print('package.json updated successfully.')
print('generate:resources-html script:', scripts.get('generate:resources-html'))
print()
print('build:vercel:', scripts.get('build:vercel'))
