# Project: mypadel

Padel tennis event management SPA + Supabase Edge Functions backend proxy.

**Primary users access the app from a mobile browser (iPhone 12).** UI is designed and tested mobile-first.

## Tech Stack

- **Frontend:** React 19, TypeScript 6, Vite 8, MUI 9 (Material UI)
- **Routing:** react-router-dom v7 (BrowserRouter); routes: `/` events view, `/elo-history` ELO history page; `public/_redirects` provides the Netlify SPA fallback
- **Data fetching:** @tanstack/react-query
- **Backend:** Supabase Edge Functions (Deno), proxying to `sunsetpadel.at` (Netlify)
- **Linter:** Oxlint (not ESLint)
- **Build:** `tsc -b && vite build`
- **E2E tests:** Playwright (`@playwright/test`), Chromium only
- **No state management library**

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
│   ├── main.tsx                # Entry: providers + BrowserRouter + <App />
│   ├── App.tsx                 # Router shell: shared header row (credentials, fetch, ELO chip) + routes
│   ├── api.ts                  # axios instance, proxy URLs, ensureCookieAuth, types
│   ├── ics.ts                  # iCalendar (.ics) generation + filenames + download helper
│   ├── eventTracking.ts        # IndexedDB known-event store (per-source keys like `sunset:`/`meetup:`) + first-fetch ack + new-id detection
│   ├── components/             # Extracted UI components
│   │   ├── CredentialsButton.tsx  # Credentials button + 3-field dialog
│   │   ├── AckAllButton.tsx       # "Ack all N new events" button above a tab table
│   │   ├── OnlyNewToggle.tsx      # "Only new" filter toggle next to the ack-all button
│   │   ├── EventsView.tsx         # `/` route: events queries + filtering + alerts + tabs
│   │   ├── EventsTable.tsx        # Events table rendering (sunset) + SunsetRow
│   │   ├── EventDetailCell.tsx    # Per-event participation + Actions dropdown (Show JSON, Add to Calendar, Open Event)
│   │   ├── MeetupTable.tsx        # Meetup table rendering + MeetupRow
│   │   ├── CombinedTable.tsx      # Combined (sunset + meetup) chronological view
│   │   ├── EloHistoryPage.tsx     # `/elo-history` route: profile summary + past events list
│   │   ├── EloHistoryRow.tsx      # Past-event row; fetches match table on click to reveal ELO delta
│   │   └── ParticipationCell.tsx  # participants/max formatting
│   ├── meetup.ts               # Meetup helpers (wolfgang/visible/rsvp/attendance)
│   ├── App.css                 # Events table styles
│   ├── index.css               # Global styles, CSS variables, dark mode
│   └── assets/
├── netlify/
│   └── functions/
│       └── proxy.ts            # Netlify Function proxy -> TARGET_PROXY env var (MYKO_SECRET auth, no cookies)
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
- **`App.tsx` is the router shell** (shared header row: credentials, fetch, ELO chip); route views live in `src/components/` (`EventsView`, `EloHistoryPage`). Credentials (auth key + email + password) are saved via the single `CredentialsButton` dialog; localStorage keys: `myko-auth-key`, `myko-cred-email`, `myko-cred-password`.
- **One fetch call** in the app: `fetchEvents()` hits the Supabase Edge Function proxy.
- **Proxy base:** `PROXY_BASE` in `src/api.ts` — `/dev-proxy/` in dev (forwarded by the Vite dev-server proxy)
- **Dev server** the default dev server port (5173) should be always be used by agents. Under no circumstances should the agent try accessing other ports, especially pointing browser to 9999. Agent should not try to start the dev server itself and should ask the user to do so if needed.
- **Auth:** `x-myko-auth` header, key stored in `localStorage` under `myko-auth-key`.
- **Fetch is triggered manually** by button click — no auto-loading, no polling, no caching.
- **Event model** has ~20 fields, but the table only renders title, date, and status.
- **New-event tracking:** after each fetch, fetched event IDs are diffed against the IndexedDB known-key store (`src/eventTracking.ts`), where each known event is a separate record keyed `sunset:<id>` or `meetup:<id>` (so both sources can share raw IDs). The first-ever fetch acks every event; later unknown keys get a tab badge, a `new` label + per-row `ack` button in the main tables, and an `Ack all N new events` button above the tab's table. An `Only new` toggle next to it filters the tab's table down to the new entries (per tab, auto-off when no new events remain).

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

## E2E Testing Conventions

- **No hardcoded timeouts in tests.** Never use `page.waitForTimeout(...)` or `setTimeout`-based sleeps. The test timeout is short (3000ms), so a real-time wait either flushes the budget or needlessly slows the suite.
- To verify behavior over time, prefer:
  - **Time travel:** install the clock with `page.clock.install()` **before navigation**, then advance it instantly with `page.clock.fastForward(...)` / `page.clock.runFor(...)`.
  - **Polling:** rely on Playwright's auto-retrying `expect(...)` assertions (which poll until their own timeout), or `expect.poll(...)` for custom retries.
- Prefer deterministic assertions that auto-retry over any explicit waiting.

## No typecheck script

Run `tsc -b` directly or use `npm run build` to type-check.

## Git workflow

Commit all changes progressively at all times, importantly - also before running lints and verifications. Keep commit messages simple.

## File access

Don't access any files outside the working (repo) directory. If need to create a temporary file, use a local `./tmp` rather than `/tmp`. 