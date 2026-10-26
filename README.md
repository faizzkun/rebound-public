# rebound-public — REBOUND Public Accountability Dashboard

No sign-in required for published content. Dark-first, Jet Black `#000000`,
White `#FFFFFF`, Neon Lime `#D7E317`, Dark Gray `#1A1A1A`, Poppins.

## What was built

- **Profile header** — display name, bio, mission, goals from
  `public_profile_view`, with the Rebound R logo (`public/logo.svg`) and the
  tagline "Missed today? Rebound tomorrow."
- **Discipline score trend** — dependency-free SVG bar chart from
  `public_daily_summaries_view` (finalized published summaries only), with the
  latest published score and the average across published days.
- **Category sections** — prayer counts, reading minutes, workout sessions,
  deep-work minutes, habit completion rates, and published life events, each
  reading only its own view and each showing an empty/unpublished state when
  its visibility toggle is off (the view then returns nothing — the app never
  invents data).
- **Achievements** — computed only from verified published records (published
  streak, focus minutes, workout sessions, reading minutes, full-prayer days).
  If nothing qualifies: "No achievements published yet."
- **Visitor messages** — approved messages from `public_messages_view`, plus a
  submission form: validated 1–500 characters, inserted into `public_messages`
  with `status='pending'` (the anon policy only allows pending) and `owner_id`
  taken from `public_profile_view`. The form shows a clear "awaiting
  moderation, not published yet" note, throttles to one message per hour per
  browser (localStorage), and never reveals the owner's email or any identifier.
- **No mock/sample production data** — every section has an empty state when
  nothing is published.

## Environment variables (names only — never commit real values)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (fallback: `VITE_SUPABASE_ANON_KEY`)

See `.env.example`. If these are unset, the app shows a "not connected yet"
notice instead of content. No key is hardcoded or printed anywhere in code.

## The 9 allowlisted views used (migration 003 only)

1. `public_profile_view`
2. `public_daily_summaries_view`
3. `public_prayer_view`
4. `public_reading_view`
5. `public_workout_view`
6. `public_focus_view`
7. `public_habits_view`
8. `public_life_events_view`
9. `public_messages_view`

The single sanctioned write is the visitor-message insert into
`public_messages` with `status='pending'` (required by the spec; the anon
insert policy rejects anything else). The app never reads private source
tables: no finance, journal, self-control, sleep, nutrition, grooming,
learning notes, or prayer notes — those have no public view by design.

## Intentionally not done yet

- No deployment and no GitHub push (out of scope for this build task).
- No auth, no sign-in page — public content only.
- No live-data QA against a real Supabase project (the build was verified
  locally; views are expected to exist once migration 003 is applied).
- No chart library, no Tailwind, no extra dependencies beyond
  `@supabase/supabase-js` (already in `package.json`).
- No PWA manifest/service worker for the public app (not required here).
- The private app (`apps/app/`), `supabase/` migrations, and the Digital
  Product project were not touched.

## Build

Command (run inside this folder):

```bash
npm install
npm run build
```

Result (verified 2026-10-26): `tsc --noEmit && vite build` passed with no
TypeScript errors. Output in `dist/` (`index.html`, `logo.svg`,
`assets/index-*.js`, `assets/index-*.css`).
