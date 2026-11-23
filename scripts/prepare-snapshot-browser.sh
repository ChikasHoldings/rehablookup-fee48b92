#!/usr/bin/env bash
# Provision a Chromium for scripts/render-crawler-snapshots.mjs on the Vercel
# build image (Amazon Linux). Uses the Playwright already in dependencies and
# the OS package manager for Chromium's shared libraries. Browsers are kept in
# node_modules/.cache so Vercel's build cache reuses them between deploys.
#
# Fail-soft by design: if anything here fails, the snapshot step finds no
# browser, logs it, and crawlers keep the generator HTML (the pre-existing
# behaviour). It never fails the build.
set -u
if [ -z "${VERCEL:-}" ]; then
  echo "[snapshot-browser] not a Vercel build — skipping (local runs use an installed browser or CHROMIUM_PATH)."
  exit 0
fi
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$PWD/node_modules/.cache/ms-playwright}"
if command -v dnf >/dev/null 2>&1; then
  dnf install -y -q nss nspr atk at-spi2-atk cups-libs libdrm libxkbcommon libXcomposite \
    libXdamage libXfixes libXrandr libXext libX11 libxcb mesa-libgbm pango cairo alsa-lib \
    >/dev/null 2>&1 && echo "[snapshot-browser] system libraries installed" \
    || echo "[snapshot-browser] dnf install did not complete (continuing)"
fi
npx playwright install chromium-headless-shell >/dev/null 2>&1 \
  && echo "[snapshot-browser] chromium-headless-shell ready in $PLAYWRIGHT_BROWSERS_PATH" \
  || echo "[snapshot-browser] browser download did not complete (continuing)"
exit 0
