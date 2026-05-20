# RehabLookup

A directory and intake platform that helps individuals and families find
verified drug and alcohol treatment centers across the United States.

**Production:** https://rehablookup.com

## Tech stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS + shadcn-ui
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions, Realtime)
- **Hosting:** Vercel (static frontend + edge rewrites)
- **Payments:** Stripe
- **Email:** Resend

## Local development

The only requirements are Node.js & npm
([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
# Clone the repository
git clone <repo url>
cd rehablookup-fee48b92

# Install dependencies
npm i

# Start the dev server (auto-reload + preview at http://localhost:8080)
npm run dev
```

### Useful scripts

```sh
npm run dev           # Vite dev server
npm run build         # Production build
npm run preview       # Serve the production build locally
npx tsc --noEmit      # Typecheck without emitting
npx vitest run        # Run the test suite once
npx vitest            # Watch mode
```

## Deployment

The app is deployed via Vercel. The `vercel.json` at the repo root pins
the build command, redirects (legacy slug → canonical), rewrites
(SPA fallback `/(.*) → /index.html`), and HTTP headers (CSP, HSTS,
Content-Type rules for `apple-app-site-association`, etc.).

Edge functions live under `supabase/functions/` and are deployed via
`supabase functions deploy <name>` (CI runs this on push to the
deployment branch).

Database migrations live under `supabase/migrations/` with timestamped
file names. They apply through `supabase db push` or via the
`apply_migration` MCP tool used during admin workflows.

## Custom domains

The production domain (`rehablookup.com`) is configured in Vercel. To
add additional domains, use the Vercel dashboard → Project Settings →
Domains.
