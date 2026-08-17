#!/usr/bin/env python3
"""
Generate supabase/functions/stripe-webhook/index.ts from the canonical
entrypoint by inlining its transitively-required _shared modules.

WHY
───
`supabase functions deploy --use-api` uploads only the entrypoint file; its
server-side bundler cannot resolve local relative imports. So the deployable
artifact must be a single file with zero local imports — only `https://esm.sh/`
URL imports, which the bundler does handle.

SOURCE vs ARTIFACT
──────────────────
    supabase/functions/stripe-webhook/entrypoint.ts   ← human-maintained SOURCE
    supabase/functions/_shared/*.ts                   ← human-maintained SOURCE
    supabase/functions/stripe-webhook/index.ts        ← GENERATED artifact

The source files are only ever READ. The artifact is only ever WRITTEN. That
separation is the whole point of this rewrite.

The previous version of this script had three defects that together made the
webhook non-reproducible:

  1. It read and wrote the SAME path (index.ts), so it fed its own output back
     in. Each run re-inlined every module on top of the copies the previous run
     had already inlined: 405,745 bytes vs 200,319, with duplicate
     `activateProBenefits` declarations. Not idempotent, and did not compile.
  2. `SHARED_DIR` pointed at `supabase/functions/stripe-webhook/_shared`, a
     directory deleted in c9c8fbc436. The canonical modules live in
     `supabase/functions/_shared`. The script raised FileNotFoundError.
  3. It inlined EVERY .ts file in that directory rather than the entrypoint's
     transitive closure, and the generated header told maintainers to re-run
     `scripts/inline-stripe-webhook-shared.sh`, which does not exist.

Because the generator could not be run, changes had to be hand-applied to the
generated artifact. That is how index.ts came to carry three unresolved
relative imports (stripe-subscription-period, pro-checkout-facility, sentry),
silently breaking the zero-local-import guarantee this script exists to provide.

WHAT IT DOES
────────────
  • Starts at entrypoint.ts and follows relative imports transitively.
  • Resolves each import as a real path and REFUSES anything that does not land
    inside supabase/functions/_shared — an unrelated Edge-function helper can
    never be pulled in by a stray `../other-fn/util.ts`.
  • Emits modules in dependency-first (topological) order.
  • Strips every relative import; hoists and MERGES URL imports per URL so a
    name imported by several modules is declared exactly once (a plain
    dedupe-by-line would emit both `import { createClient, SupabaseClient }`
    and `import type { SupabaseClient }` from supabase-js — a duplicate
    binding).
  • Deterministic: same inputs → byte-identical output.

USAGE
─────
    python3 scripts/inline-stripe-webhook-shared.py --write
    python3 scripts/inline-stripe-webhook-shared.py --check

  --write   regenerate index.ts in place
  --check   build the expected bytes in memory, compare against the committed
            index.ts, write NOTHING, exit 1 on drift

Exit codes
    0  wrote successfully / no drift
    1  drift (--check), or a resolution error
"""

import argparse
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FN_DIR = os.path.join(ROOT, "supabase", "functions", "stripe-webhook")
SHARED_DIR = os.path.join(ROOT, "supabase", "functions", "_shared")
ENTRY = os.path.join(FN_DIR, "entrypoint.ts")
OUT = os.path.join(FN_DIR, "index.ts")

REGEN_COMMAND = "python3 scripts/inline-stripe-webhook-shared.py --write"
CHECK_COMMAND = "python3 scripts/inline-stripe-webhook-shared.py --check"

# `import ... from "<spec>";` — [\s\S] so multi-line specifier lists match.
IMPORT_RE = re.compile(
    r'^import\s+(?:type\s+)?(?P<clause>[\s\S]*?)\s*from\s*"(?P<spec>[^"]+)";[ \t]*\n?',
    re.M,
)


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def die(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def iter_imports(text):
    """Yield (match, clause, spec, is_type_only) for every import statement."""
    for m in IMPORT_RE.finditer(text):
        stmt = m.group(0)
        is_type_only = re.match(r"^import\s+type\b", stmt) is not None
        yield m, m.group("clause").strip(), m.group("spec"), is_type_only


def relative_deps(text, from_path):
    """Resolve this file's relative imports to absolute paths inside _shared.

    Returns a list of absolute paths, in source order, de-duplicated.
    Refuses any relative import that escapes _shared — that is what stops an
    unrelated Edge-function helper being inlined by accident.
    """
    out = []
    base = os.path.dirname(from_path)
    for _m, _clause, spec, _t in iter_imports(text):
        if not spec.startswith("."):
            continue
        target = os.path.normpath(os.path.join(base, spec))
        shared = os.path.normpath(SHARED_DIR)
        if os.path.commonpath([target, shared]) != shared:
            die(
                f"{os.path.relpath(from_path, ROOT)} imports {spec!r}, which resolves "
                f"outside supabase/functions/_shared. Only _shared modules may be "
                f"inlined into the webhook."
            )
        if not os.path.isfile(target):
            die(
                f"{os.path.relpath(from_path, ROOT)} imports {spec!r}, which does not "
                f"exist at {os.path.relpath(target, ROOT)}"
            )
        if target not in out:
            out.append(target)
    return out


def collect(entry_path):
    """Depth-first transitive closure of entry_path, dependency-first.

    Returns (ordered_shared_paths, {path: source}). The entrypoint itself is
    not included in the ordered list.
    """
    sources = {entry_path: read(entry_path)}
    order = []
    visiting = set()
    done = set()

    def visit(path, stack):
        if path in done:
            return
        if path in visiting:
            cycle = " → ".join(os.path.relpath(p, ROOT) for p in stack + [path])
            die(f"circular import among _shared modules: {cycle}")
        visiting.add(path)
        if path not in sources:
            sources[path] = read(path)
        for dep in relative_deps(sources[path], path):
            visit(dep, stack + [path])
        visiting.discard(path)
        done.add(path)
        if path != entry_path:
            order.append(path)

    visit(entry_path, [])
    return order, sources


def parse_url_import(clause, is_type_only):
    """Split an import clause into (default_name, [named specifiers])."""
    named = []
    default = None
    clause = clause.strip()
    brace = clause.find("{")
    if brace == -1:
        default = clause or None
    else:
        head = clause[:brace].rstrip().rstrip(",").strip()
        if head:
            default = head
        inner = clause[brace + 1 : clause.rindex("}")]
        for part in inner.split(","):
            part = " ".join(part.split())
            if part:
                # A per-specifier `type` prefix is dropped: the merged import is
                # emitted as a value import when any importer needs a value.
                named.append(re.sub(r"^type\s+", "", part))
    return default, named, is_type_only


def merge_url_imports(sources_in_order):
    """Merge all URL imports across files into one declaration per URL.

    Order is first-seen, which is deterministic because the file order is.
    """
    per_url = {}  # url -> {default, named (ordered), all_type_only}
    for text in sources_in_order:
        for _m, clause, spec, is_type_only in iter_imports(text):
            if spec.startswith("."):
                continue
            default, named, type_only = parse_url_import(clause, is_type_only)
            entry = per_url.setdefault(
                spec, {"default": None, "named": [], "all_type_only": True}
            )
            if default:
                if entry["default"] and entry["default"] != default:
                    die(
                        f"conflicting default import names for {spec!r}: "
                        f"{entry['default']!r} vs {default!r}"
                    )
                entry["default"] = default
            for n in named:
                if n not in entry["named"]:
                    entry["named"].append(n)
            if not type_only:
                entry["all_type_only"] = False

    lines = []
    for url, e in per_url.items():
        kw = "import type" if e["all_type_only"] else "import"
        parts = []
        if e["default"]:
            parts.append(e["default"])
        if e["named"]:
            parts.append("{ " + ", ".join(e["named"]) + " }")
        lines.append(f'{kw} {", ".join(parts)} from "{url}";')
    return lines


def strip_imports(text):
    """Remove every import statement (relative and URL) from a module body."""
    return IMPORT_RE.sub("", text)


# The entrypoint carries a header addressed to whoever edits the SOURCE ("edit
# this file, not index.ts"). Copied verbatim into the artifact that advice
# becomes false and points maintainers at the generated file. Drop the leading
# block comment when it is explicitly marked source-only; nothing else is
# treated specially, so an unmarked comment is always preserved.
SOURCE_ONLY_SENTINEL = "SOURCE-ONLY HEADER"


def strip_source_only_header(text):
    m = re.match(r"\s*/\*[\s\S]*?\*/\s*", text)
    if m and SOURCE_ONLY_SENTINEL in m.group(0):
        return text[m.end() :]
    return text


def generate():
    if not os.path.isfile(ENTRY):
        die(
            f"canonical entrypoint missing: {os.path.relpath(ENTRY, ROOT)}. "
            f"index.ts is generated and must never be used as the generator's input."
        )

    order, sources = collect(ENTRY)
    ordered_texts = [sources[p] for p in order] + [sources[ENTRY]]
    url_lines = merge_url_imports(ordered_texts)

    out = []
    out.append("// ⚠ AUTO-GENERATED — DO NOT EDIT THIS FILE ⚠")
    out.append("//")
    out.append("// Generated from supabase/functions/stripe-webhook/entrypoint.ts by")
    out.append("// scripts/inline-stripe-webhook-shared.py. The _shared modules below are")
    out.append("// inlined copies; their canonical sources live in")
    out.append("// supabase/functions/_shared/.")
    out.append("//")
    out.append("// Edit entrypoint.ts or the _shared originals, then regenerate:")
    out.append(f"//     {REGEN_COMMAND}")
    out.append("//")
    out.append("// Verify a committed artifact matches its source:")
    out.append(f"//     {CHECK_COMMAND}")
    out.append("//     npm run check:stripe-webhook-inline")
    out.append("//")
    out.append("// Inlining exists so `supabase functions deploy --use-api` — which uploads")
    out.append("// only the entrypoint — has no local relative imports to resolve.")
    out.append("")
    out.append("// ── URL imports (merged) ───────────────────────────────────")
    out.append("\n".join(url_lines) + "\n")

    for path in order:
        rel = os.path.relpath(path, os.path.join(ROOT, "supabase", "functions"))
        out.append(f"// ── inlined from {rel} ─────────────")
        out.append(strip_imports(sources[path]).strip() + "\n")

    out.append("// ── stripe-webhook entrypoint body ─────────────────────────")
    out.append(strip_imports(strip_source_only_header(sources[ENTRY])).strip() + "\n")

    return "\n".join(out), order


def main():
    ap = argparse.ArgumentParser(
        description="Inline _shared modules into the deployable stripe-webhook index.ts."
    )
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument(
        "--write", action="store_true", help="regenerate index.ts in place"
    )
    mode.add_argument(
        "--check",
        action="store_true",
        help="compare committed index.ts against generator output; write nothing",
    )
    args = ap.parse_args()

    final, order = generate()
    rel_out = os.path.relpath(OUT, ROOT)

    if args.check:
        if not os.path.isfile(OUT):
            die(f"{rel_out} does not exist. Run: {REGEN_COMMAND}")
        current = read(OUT)
        if current != final:
            print(
                f"✖ {rel_out} does not match generator output\n"
                f"    committed: {len(current)} bytes\n"
                f"    generated: {len(final)} bytes\n"
                f"  The generated webhook has drifted from entrypoint.ts / _shared.\n"
                f"  Regenerate and commit the result:\n"
                f"      {REGEN_COMMAND}",
                file=sys.stderr,
            )
            sys.exit(1)
        print(f"✓ {rel_out} matches generator output ({len(final)} bytes)")
        print(
            "  inlined: "
            + ", ".join(os.path.basename(p) for p in order)
        )
        return

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(final)
    print(
        f"✓ wrote {rel_out}: {len(final)} bytes\n"
        f"  from {os.path.relpath(ENTRY, ROOT)}\n"
        f"  inlined (dependency-first): "
        + ", ".join(os.path.basename(p) for p in order)
    )


if __name__ == "__main__":
    main()
