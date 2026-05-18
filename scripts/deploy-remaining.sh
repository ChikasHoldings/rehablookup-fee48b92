#!/usr/bin/env bash
# Deploy the 5 round-30/31-patched functions still pending live deploy.
# Run from the repo root with SUPABASE_ACCESS_TOKEN exported (or after
# `supabase login`). All 5 files are already inlined for --use-api.
set -e
PROJECT_REF="mldbxpntzcjalgjmwnqa"
cd "$(dirname "$0")"

git pull origin claude/phase2-deployment-5WYOn

# Order: most-critical first. stripe-webhook carries 8 fixes; the
# cancel pair shares the round-31 _shared/cancel-subscription.ts
# helper fix; submit-qualified-lead has 5 lead-pipeline fixes;
# send-concierge-notifications has 2 SMS retry patches.
FUNCTIONS=(
  stripe-webhook
  admin-cancel-subscription
  provider-self-cancel-subscription
  submit-qualified-lead
  send-concierge-notifications
)

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
  echo "✓ All 5 deployed successfully"
else
  echo "✗ FAILED: ${failed[*]}"
  exit 1
fi
