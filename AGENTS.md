# Project: mypadel

Padel tennis event management SPA + Supabase Edge Functions backend proxy.

**Primary users access the app from a mobile browser (iPhone 12).** UI is designed and tested mobile-first.

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
│   ├── App.tsx                 # Top-level component: state + wiring (~90 lines)
│   ├── api.ts                  # axios instance, proxy URLs, ensureCookieAuth, types
│   ├── ics.ts                  # iCalendar (.ics) generation + filenames + download helper
│   ├── components/             # Extracted UI components
│   │   ├── CredentialsButton.tsx  # Credentials button + 3-field dialog
│   │   ├── EventsTable.tsx        # Events table rendering
│   │   ├── EventDetailCell.tsx    # Per-event participation + Actions dropdown (Show JSON, Add to Calendar, Open Event)
│   │   └── ParticipationCell.tsx  # participants/max formatting
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

### Frontend (src/)

- **Mobile-first:** the main audience uses a phone browser — iPhone 12 viewport (375×812, Safari). Keep layouts usable and readable at small widths.
- **`App.tsx` holds state + wiring; UI is split into `src/components/`.** Credentials (auth key + email + password) are saved via the single `CredentialsButton` dialog; localStorage keys: `myko-auth-key`, `myko-cred-email`, `myko-cred-password`.
- **One fetch call** in the app: `fetchEvents()` hits the Supabase Edge Function proxy.
- **Proxy base:** `PROXY_BASE` in `src/api.ts` — `/dev-proxy/` in dev (forwarded by the Vite dev-server proxy)
- **Dev server** the default dev server port (5173) should be always be used by agents. Under no circumstances should the agent try accessing other ports, especially pointing browser to 9999. Agent should not try to start the dev server itself and should ask the user to do so if needed.
- **Auth:** `x-myko-auth` header, key stored in `localStorage` under `myko-auth-key`.
- **Fetch is triggered manually** by button click — no auto-loading, no polling, no caching.
- **Event model** has ~20 fields, but the table only renders title, date, and status.

### Backend (supabase/functions/)

- `proxy/index.ts`: Authenticates via `x-myko-auth` vs `MYKO_SECRET` env var, validates path against allow-list (`TARGET_PROXY_PATHES`), forwards to `TARGET_PROXY` (sunsetpadel.at).
- `me/index.ts`: Auth check endpoint.

## NPM Scripts

- `dev` — `vite` (no proxy; used by Playwright; should not be used by the agents)
- `build` — `tsc -b && vite build`
- `lint` — `oxlint`
- `preview` — `vite preview` (should not be used by the agents)
- `test:e2e` — `playwright test`
- `test:e2e:ui` — `playwright test --ui`

## No typecheck script

Run `tsc -b` directly or use `npm run build` to type-check.

## Git workflow

Commit all changes progressively at all times, importantly - also before running lints and verifications. Keep commit messages simple.

## File access

Don't access any files outside the working (repo) directory. If need to create a temporary file, use a local `./tmp` rather than `/tmp`. 