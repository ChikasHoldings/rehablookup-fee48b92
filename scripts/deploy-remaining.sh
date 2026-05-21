#!/usr/bin/env bash
# Deploy the round-30/31-patched functions still pending live deploy.
# Run from anywhere with SUPABASE_ACCESS_TOKEN exported (or after
# `supabase login`). Files are inlined for --use-api.
#
# Status as of 2026-05-18:
#   • admin-cancel-subscription       — DEPLOYED via MCP
#   • provider-self-cancel-subscription — DEPLOYED via MCP
#   • submit-qualified-lead           — DEPLOYED via MCP (v8)
#   • send-concierge-notifications    — DEPLOYED via MCP (v7)
#   • stripe-webhook                  — PENDING (172KB; exceeds MCP per-call budget)
#
# This script targets the remaining function. Pass `--all` to re-deploy
# the entire batch (idempotent — just bumps versions).
set -e
PROJECT_REF="mldbxpntzcjalgjmwnqa"
cd "$(dirname "$0")/.."

git pull origin claude/phase2-deployment-5WYOn

if [ "${1:-}" = "--all" ]; then
  FUNCTIONS=(
    stripe-webhook
    admin-cancel-subscription
    provider-self-cancel-subscription
    submit-qualified-lead
    send-concierge-notifications
  )
else
  FUNCTIONS=(
    stripe-webhook
  )
fi

failed=()
for fn in "${FUNCTIONS[@]}"; do
  echo ""
  echo "=== Deploying $fn ==="
  if supabase functions deploy "$fn" --use-api --project-ref "$PROJECT_REF"; then
    echo "  ✓ $fn deployed"
  else
    echo "  ✗ $fn FAILED — continuing"
    failed+=("$fn")
  fi
done

echo ""
echo "=== Verification ==="
supabase functions list --project-ref "$PROJECT_REF" | \
  awk -v fns="$(IFS='|'; echo "${FUNCTIONS[*]}")" '$1 ~ fns {print "  ", $1, "v"$4, $6}'

echo ""
if [ ${#failed[@]} -eq 0 ]; then
  echo "✓ All ${#FUNCTIONS[@]} deployed successfully"
else
  echo "✗ FAILED: ${failed[*]}"
  exit 1
fi
