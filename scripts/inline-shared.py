"""
Inline _shared dependencies into a Supabase edge function so it can
deploy via `--use-api` (server-side bundler) without resolving local
relative imports. Idempotent — re-run any time the canonical _shared
modules change.

Usage:
    python3 scripts/inline-shared.py <function-name>

Example:
    python3 scripts/inline-shared.py submit-qualified-lead
"""
import os, re, sys

if len(sys.argv) != 2:
    print("usage: inline-shared.py <function-name>", file=sys.stderr)
    sys.exit(1)

fn_name = sys.argv[1]
fn_dir = f"supabase/functions/{fn_name}"
src_path = f"{fn_dir}/index.ts"
shared_root = "supabase/functions/_shared"

def read(p):
    with open(p) as f:
        return f.read()

# Discover which _shared modules the entrypoint actually imports.
# Anchor on line-start `^import` so we don't match the same string
# inside a usage-docstring comment (which would otherwise cause an
# already-inlined file to re-inline the same module on re-run).
entry = read(src_path)
shared_imports = re.findall(
    r'^import\s+[^;]+?\s+from\s+"\.\./_shared/([^"]+\.ts)"',
    entry,
    flags=re.M,
)
print(f"Entry imports {len(shared_imports)} _shared module(s): {shared_imports}", file=sys.stderr)
if not shared_imports:
    # Either there are no _shared deps OR the file is already inlined.
    # If we see the auto-generated header marker, refuse to re-inline.
    if "AUTO-GENERATED HEADER" in entry and "inlined from _shared/" in entry:
        print("File appears already inlined; refusing to re-inline. "
              "Edit the canonical _shared sources + this file's entrypoint, "
              "then drop the inlined sections + re-run.", file=sys.stderr)
        sys.exit(2)

# Transitively collect deps from _shared imports.
to_visit = list(shared_imports)
visited = set()
shared_files = {}
while to_visit:
    name = to_visit.pop(0)
    if name in visited: continue
    visited.add(name)
    path = os.path.join(shared_root, name)
    if not os.path.exists(path):
        print(f"  ⚠ skipping missing {path}", file=sys.stderr)
        continue
    content = read(path)
    shared_files[name] = content
    # Find sibling relative imports inside this file
    for m in re.finditer(r'^import\s+[^;]+?\s+from\s+"\./([^"]+\.ts)"', content, flags=re.M):
        sib = m.group(1)
        if sib not in visited:
            to_visit.append(sib)

print(f"Total _shared modules to inline: {len(shared_files)}", file=sys.stderr)

# Topological sort: a module before any module that imports it
def topo(modules):
    visited_topo = set()
    order = []
    def visit(name):
        if name in visited_topo or name not in modules: return
        visited_topo.add(name)
        for m in re.finditer(r'from "\./([^"]+\.ts)"', modules[name]):
            sib = m.group(1)
            if sib in modules: visit(sib)
        order.append(name)
    for k in modules: visit(k)
    return order

order = topo(shared_files)
print(f"Topo order: {order}", file=sys.stderr)

# Hoist URL imports (https://esm.sh/...) into a single dedup'd block.
def hoist_url_imports(text):
    urls = []
    def take(m):
        urls.append(m.group(0))
        return ""
    out = re.sub(r'^import\s+[^;]+?\s+from\s+"https?://[^"]+";\s*\n', take, text, flags=re.M)
    return out, urls

def strip_relative_imports(text):
    """Strip single-line + multi-line `import { ... } from "./..." | "../..."` blocks."""
    # Single-line variant
    text = re.sub(
        r'^import\s*(?:\{[^}]*\}|[A-Za-z_][\w]*)\s*from\s*"\.{1,2}/[^"]+";\s*\n',
        '',
        text,
        flags=re.M,
    )
    # Multi-line variant (matches across lines, non-greedy)
    text = re.sub(
        r'^import\s*\{[^}]*?\}\s*from\s*"\.{1,2}/[^"]+";\s*\n',
        '',
        text,
        flags=re.M | re.S,
    )
    return text

# Strip from entry + each shared.
entry_no_url, entry_urls = hoist_url_imports(entry)
entry_clean = strip_relative_imports(entry_no_url)

clean_shared = {}
all_urls = list(entry_urls)
for name in order:
    src, urls = hoist_url_imports(shared_files[name])
    src = strip_relative_imports(src)
    clean_shared[name] = src
    all_urls.extend(urls)

# Dedup URL imports while preserving order.
seen = set()
dedup_urls = []
for line in all_urls:
    key = line.strip()
    if key not in seen:
        seen.add(key)
        dedup_urls.append(line)

# Assemble final single-file output.
sections = []
sections.append("// ⚠ AUTO-GENERATED HEADER ⚠")
sections.append(f"// _shared modules have been inlined into this file so that")
sections.append(f"// `supabase functions deploy --use-api` (server-side bundler)")
sections.append(f"// can deploy without resolving local relative imports. The")
sections.append(f"// canonical sources live under supabase/functions/_shared/ —")
sections.append(f"// don't edit the inlined copies below; edit the originals and")
sections.append(f"// re-run `python3 scripts/inline-shared.py {fn_name}`.")
sections.append("")
sections.append("// ── URL imports (dedup'd) ──────────────────────────────────")
sections.append("".join(dedup_urls).rstrip() + "\n")

for name in order:
    sections.append(f"// ── inlined from _shared/{name} ─────────────")
    sections.append(clean_shared[name].rstrip() + "\n")

sections.append(f"// ── {fn_name} entrypoint body ─────────────────────────")
sections.append(entry_clean.rstrip() + "\n")

final = "\n".join(sections)
with open(src_path, "w") as f:
    f.write(final)

print(f"Wrote {src_path}: {len(final)} bytes", file=sys.stderr)
