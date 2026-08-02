# Project: mypadel

Padel tennis event management SPA + Supabase Edge Functions backend proxy.

## Tech Stack

- **Frontend:** React 19, TypeScript 6, Vite 8, MUI 9 (Material UI)
- **Backend:** Supabase Edge Functions (Deno), proxying to `sunsetpadel.at` (Netlify)
- **Linter:** Oxlint (not ESLint)
- **Build:** `tsc -b && vite build`
- **E2E tests:** Playwright (`@playwright/test`), Chromium only
- **No router, no state management library, no data-fetching library (no React Query/SWR)**

## Directory Structure

```
mypadel/
├── index.html                  # SPA entry point
├── package.json
├── vite.config.ts              # Vite config with custom auth proxy plugin
├── tsconfig.json               # TS project references
├── tsconfig.app.json           # App code (ES2023, React JSX)
├── tsconfig.node.json          # Node tooling
├── .oxlintrc.json              # Oxlint rules (react + typescript plugins)
├── playwright.config.ts        # Playwright config, auto-starts vite dev server
├── tests/app/                  # Playwright e2e tests (API mocked via ./setup/worldTest.ts)
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/                        # Frontend source
│   ├── main.tsx                # Entry: renders <App /> into #root
│   ├── App.tsx                 # THE ONLY component (~160 lines)
│   ├── App.css                 # Events table styles
│   ├── index.css               # Global styles, CSS variables, dark mode
│   └── assets/
└── supabase/
    ├── config.toml             # Full Supabase project configuration
    └── functions/
        ├── hello-world/index.ts
        ├── me/index.ts         # "Who am I" edge function
        ├── proxy/index.ts      # Core proxy edge function -> sunsetpadel.at
        └── .temp/              # Build artifacts
```

## Key Details

### Frontend (src/App.tsx)

- **Entire UI is a single component** — no component decomposition, no hooks/, no services/ dirs.
- **One fetch call** in the app: `fetchEvents()` hits the Supabase Edge Function proxy.
- **Hardcoded Supabase URL:** `https://cpfgugbirflalcjuludp.supabase.co/functions/v1/proxy/.netlify/functions/events`
- **Auth:** `x-myko-auth` header, key stored in `localStorage` under `myko-auth-key`.
- **Fetch is triggered manually** by button click — no auto-loading, no polling, no caching.
- **Event model** has ~20 fields, but the table only renders title, date, and status.

### Backend (supabase/functions/)

- `proxy/index.ts`: Authenticates via `x-myko-auth` vs `MYKO_SECRET` env var, validates path against allow-list (`TARGET_PROXY_PATHES`), forwards to `TARGET_PROXY` (sunsetpadel.at).
- `me/index.ts`: Auth check endpoint.

## NPM Scripts

- `dev` — `vite`
- `build` — `tsc -b && vite build`
- `lint` — `oxlint`
- `preview` — `vite preview`
- `test:e2e` — `playwright test`
- `test:e2e:ui` — `playwright test --ui`

## No typecheck script

Run `tsc -b` directly or use `npm run build` to type-check.

## Git workflow

Commit all changes progressively at all times. Keep commit messages simple.