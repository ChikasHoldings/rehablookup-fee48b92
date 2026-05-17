"""
Inline all _shared dependencies into stripe-webhook/index.ts so the
function has zero local relative imports. Only `https://esm.sh/...`
imports survive — the --use-api bundler handles URL imports fine.
"""
import os, re, sys

FN_DIR = "supabase/functions/stripe-webhook"
SRC = f"{FN_DIR}/index.ts"
SHARED_DIR = f"{FN_DIR}/_shared"

def read(path):
    with open(path) as f:
        return f.read()

# 1. Collect all _shared files in topological order so each file's
#    exports come BEFORE the files that import them.
def relative_imports(text):
    """Return list of bare module names this file imports relatively."""
    out = []
    # match: ... } from "./foo.ts";  OR  ... } from "../foo/bar.ts";
    for m in re.finditer(r'from\s+"(\.{1,2}/[^"]+\.ts)"', text):
        path = m.group(1)
        # Strip path components — we only care about the basename
        base = os.path.basename(path)
        out.append(base.replace(".ts", ""))
    return out

shared_files = {}
for f in sorted(os.listdir(SHARED_DIR)):
    if f.endswith(".ts"):
        name = f.replace(".ts", "")
        shared_files[name] = read(os.path.join(SHARED_DIR, f))

# Topo sort: a module before any module that imports it.
def topo(modules):
    # modules: {name: source}. Edge from importer → imported.
    visited = set()
    order = []
    def visit(m):
        if m in visited or m not in modules: return
        visited.add(m)
        for dep in relative_imports(modules[m]):
            if dep in modules: visit(dep)
        order.append(m)
    for m in modules: visit(m)
    return order

order = topo(shared_files)
print("Inline order:", order, file=sys.stderr)

# 2. Strip the relative imports + URL imports out of each shared module.
#    We'll re-emit a single dedup'd set of URL imports at the top.
url_imports = []  # list of full import lines, dedup'd by import line
def hoist_url_imports(text):
    """Yank `import ... from "https://...";` lines and return the remaining text."""
    nonlocal_imports = []
    def take(m):
        nonlocal_imports.append(m.group(0))
        return ""
    out = re.sub(r'^import\s+[^;]+?\s+from\s+"https?://[^"]+";\s*\n', take, text, flags=re.M)
    return out, nonlocal_imports

def strip_relative_imports(text):
    # Remove single-line and multi-line `import {...} from "./..." | "../..."` blocks
    return re.sub(
        r'^import\s*(?:\{[^}]*\}|[A-Za-z_][\w]*)\s*from\s*"\.{1,2}/[^"]+";\s*\n',
        '',
        text,
        flags=re.M,
    )

# Process the entrypoint
entry = read(SRC)
entry_no_url, entry_url_imports = hoist_url_imports(entry)
entry_clean = strip_relative_imports(entry_no_url)

# Process shared modules
clean_shared = {}
all_url_imports = list(entry_url_imports)
for name in order:
    src = shared_files[name]
    src, urls = hoist_url_imports(src)
    src = strip_relative_imports(src)
    clean_shared[name] = src
    all_url_imports.extend(urls)

# Dedup URL imports while preserving order
seen = set()
dedup_urls = []
for line in all_url_imports:
    if line not in seen:
        seen.add(line)
        dedup_urls.append(line)

# 3. Build the final single-file output: URL imports → shared bodies → entrypoint body
sections = []
sections.append("// ⚠ AUTO-GENERATED HEADER ⚠")
sections.append("// _shared modules have been inlined into this file so that")
sections.append("// `supabase functions deploy --use-api` (server-side bundler)")
sections.append("// doesn't need to resolve any local relative imports. The")
sections.append("// canonical sources live under supabase/functions/_shared/ —")
sections.append("// don't edit the inlined copies below; edit the originals and")
sections.append("// re-run `scripts/inline-stripe-webhook-shared.sh`.")
sections.append("")
sections.append("// ── URL imports (dedup'd) ──────────────────────────────────")
sections.append("".join(dedup_urls).rstrip() + "\n")

for name in order:
    sections.append(f"// ── inlined from _shared/{name}.ts ─────────────")
    sections.append(clean_shared[name].rstrip() + "\n")

sections.append("// ── stripe-webhook entrypoint body ─────────────────────────")
sections.append(entry_clean.rstrip() + "\n")

final = "\n".join(sections)
with open(SRC, "w") as f:
    f.write(final)

print(f"Wrote {SRC}: {len(final)} bytes", file=sys.stderr)
