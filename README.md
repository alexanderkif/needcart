# NeedCart

Shared shopping lists for iOS, Android, and web from a single codebase.

**Implementation status:** [docs/STATUS.md](docs/STATUS.md) — what is done, what is partial, and what remains before release.

**First web deployment:** <https://needcart.vercel.app> (production auth redirect configuration is still pending).

- **Client:** Expo SDK 58, React Native 0.88, TypeScript, Expo Router, NativeWind 4.
- **Server state:** TanStack Query.
- **Backend:** Supabase (Postgres + RLS, Auth, Realtime, Storage, Edge Functions).
- **Auth:** email magic link, no passwords.
- **Languages:** English, Russian, Spanish, German, Portuguese (Brazil), French, Serbian (Latin), Italian. English is the fallback.
- **Themes:** light / dark / system, system by default.
- **Web:** SPA (`web.output: "single"`), deployed on Vercel.

The product plan and database schema live in [`docs/PLAN.md`](docs/PLAN.md) and [`docs/schema.sql`](docs/schema.sql).

Project convention: code, comments, commit messages, and documentation are written in English. User-facing translations live in `src/i18n/locales/*.json`; Russian UI strings belong in `ru.json` only.

## Agent and Git rules

See [AGENTS.md](AGENTS.md). AI agents must never commit, amend, push, deploy, or publish without an explicit request from the user. Leave changes in the working tree and ask first when a tool or build seems to require a commit or another remote action.

## Implemented

- Expo Router app structure with `(auth)`, `(app)`, and `(app)/(tabs)` route groups.
- Theming (light/dark/system, accent colors from the profile), with early theme bootstrap on web to avoid a flash.
- i18n for 8 languages (EN/RU reviewed, the rest are working AI drafts).
- Auth: magic link, "check your email" screen, `/auth/callback` supporting `code`, `token_hash`, and implicit tokens, plus `/auth/error`.
- Deep link `/join/CODE`: signed-in users land on the join screen with the code prefilled; signed-out users keep the code and return to it after sign-in. Joining is never automatic.
- Groups: list with budget, creation (currency/budget/period/timezone), join by code, settings, members and roles, invite-code rotation, categories, leave/delete.
- Items: create, edit, soft delete, search, filters, grouping by category, collapsible purchased section.
- Purchases: `purchase_item` / `reorder_item`, last 5 purchases in item details, optimistic updates.
- Budget: planned/spent/remaining/forecast from `group_overview`.
- Realtime: subscriptions for items, purchases, categories, members, and group; debounced cache invalidation.
- Profile: name, avatar (Storage), language, theme, accent color, sign out, account deletion through an Edge Function.
- Supabase: dedicated `needcart` schema, migration from `docs/schema.sql`, seed, `needcart-delete-account` Edge Function, and local config.
- Vercel/EAS/GitHub Actions configs and unit tests (Vitest).
- Branded family + cart icon set for the app, PWA, Android adaptive icon, favicon, and splash screen.

## Quick start

```bash
npm ci
cp .env.example .env
npm run web
```

`.env`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_APP_URL=
```

On web, `EXPO_PUBLIC_APP_URL` is optional: the app always uses `window.location.origin`, so magic links return to the current origin (localhost, a Vercel preview, or production). On native, the app falls back to `Linking.createURL` or uses `EXPO_PUBLIC_APP_URL` when set. For EAS builds, set it to the production web URL, e.g. `https://app.needcart.app`.

Without Supabase the app still starts, but shows a "Backend is not configured" banner and cannot sign in.

### Supabase

The app lives in a dedicated schema, **`needcart`**, not in `public`. This allows one Supabase database to host several projects without mixing tables. The client is already configured with `db: { schema: 'needcart' }`; `public` is untouched.

1. Create a project (choose the region closest to your users, e.g. Frankfurt).
2. Apply the migration:

   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```

   Alternatively, run `supabase/migrations/20261118000000_needcart_schema.sql` and then `supabase/migrations/20261120000000_item_unit_prices.sql` in SQL Editor/DBeaver.
3. If the migration was applied manually, mark it in Supabase CLI history; otherwise `supabase db push` will try to apply it again:

   ```bash
   npx supabase link --project-ref <ref>
   npx supabase migration repair --status applied 20261118000000
   ```

4. In Project Settings → API → **Exposed schemas**, add `needcart` (next to `public`, `graphql_public`).
5. In Auth → URL Configuration:
   - Site URL: the deployed web URL (for the first deploy, `https://<project>.vercel.app`).
   - Redirect URLs: `http://localhost:8081/**`, `http://localhost:3000/**` if you use that port, the deployed Vercel URL with `/**`, `needcart://**` (dev), and `exp://**` (Expo Go, dev).
6. Connect SMTP (Resend/Postmark) and configure SPF/DKIM/DMARC. The built-in Supabase email provider is capped at 2 messages per hour per project; the app shows a clear 429 message and cooldown, but production needs custom SMTP.
7. Deploy the Edge Function:

   ```bash
   npx supabase functions deploy needcart-delete-account
   ```

8. Generate types when the project is available:

   ```bash
   npx supabase gen types typescript --project-id <ref> --schema needcart > src/types/database.ts
   ```

   The current types in `src/types/database.ts` are written by hand from the schema so the app can build before the project is connected.

If an older public version of the schema was applied before, it remains in `public` and does not interfere: the app reads and writes only `needcart`. You can remove the old objects manually after verification.

If **Data API → Exposed tables / Exposed functions** changes cause `permission denied for table ...` or `permission denied for function is_group_member`, run `supabase/grants/needcart_api_grants.sql` in SQL Editor/DBeaver. The Data API integration manages grants and can revoke `EXECUTE` from internal RLS helpers that are not in the "Exposed functions" list.

If the project already had `auth.users` before the schema was installed, their profiles are created lazily on first sign-in (RLS allows inserting only the user's own row). The `needcart_on_auth_user_created` trigger covers new users only. A bulk backfill of all `auth.users` is not needed because a shared database may contain users from other apps.

### Local Supabase

Requires Docker Desktop and Supabase CLI:

```bash
npx supabase start
npx supabase db reset   # applies migrations and seed.sql
```

Inbucket/Mailpit: `http://localhost:54324`. Test users: `alice@example.com`, `bob@example.com`, group "Home" with invite code `ABCD2345EFGH`.

For auth-flow testing, point `.env.local` at the local API URL and anon key from `npx supabase status`. Local Auth captures every message in Inbucket/Mailpit and has no external email quota, so you can request links for many addresses without hitting the 2/hour hosted-project limit. The per-address 60-second and per-IP Auth limits still exist; adjust the local rate limits in `supabase/config.toml` only when a test needs it.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npx expo export --platform web
```

CI in `.github/workflows/ci.yml` runs lint, typecheck, unit tests, `expo-doctor`, and the web export.

## Deployment

### Web (Vercel)

Deploying through GitHub is the normal workflow: Vercel creates a Preview deployment for every PR and a Production deployment for `main`. A separate GitHub Actions deploy job is unnecessary when Vercel is connected to the repository. Keep secrets in Vercel Environment Variables, never in git.

Vercel project settings:

| Setting | Value |
|---|---|
| Framework Preset | **Other** (do not choose Expo/Next.js) |
| Root Directory | repository root |
| Install Command | `npm ci` |
| Build Command | `npm run export:web` |
| Output Directory | `dist` |
| Node.js | `22.x` (or an available LTS 20.19+) |

`npm run export:web` first runs `expo export --platform web`, then `scripts/post-export-web.js`, which injects the theme bootstrap, manifest, and meta tags into `dist/index.html`. Do not replace it with bare `npx expo export` — the head markup would be lost.

`vercel.json` already contains these values, the SPA rewrite, and the `.well-known` headers. If Vercel suggests a different build command or framework, override it with the values above.

#### PWA system chrome

The installed app uses `display: "standalone"` and a neutral black `theme_color` (`#121212`) for the Android system bars and iOS status bar. The app draws its own header/tab bar inside the safe-area insets; the system Home/Back gestures remain available.

Fullscreen is intentionally not used: it hides the system navigation and exit affordances, which is a poor trade-off for a shopping list. If an installed PWA keeps an old system-bar color after upgrading, remove and re-add it from the home screen (or clear the PWA's site data) so the new manifest is picked up.

#### Environment Variables

You can start on the free Vercel domain: `https://needcart.vercel.app` (if available; otherwise Vercel adds a suffix). A custom domain such as `app.needcart.app` can be connected later.

Production:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_APP_URL` — **not required for web**. On web the app always uses the current origin. Set it later only for native EAS builds.

Preview:

- the same Supabase URL and anon key;
- leave `EXPO_PUBLIC_APP_URL` unset so preview magic links return to the preview domain.

Never add to Vercel:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `POSTGRES_PASSWORD` / `POSTGRES_URL*`

The client does not need them. `SUPABASE_SERVICE_ROLE_KEY` lives only inside the Supabase Edge Function.

#### Auth redirect configuration

Supabase rejects an `emailRedirectTo` value that is not allowlisted and falls back to the project's **Site URL**. This is why a magic link can point to `http://localhost:3000` even when the app requested the Vercel callback URL.

In Supabase Dashboard → Authentication → URL Configuration:

1. Set **Site URL** to the deployed web URL, e.g. `https://needcart.vercel.app`.
2. Add **Redirect URLs**:
   - `https://needcart.vercel.app/**`
   - `http://localhost:8081/**`
   - `http://localhost:3000/**` (if you run the web app on that port)
   - `https://*.vercel.app/**` for preview deployments, if your project accepts wildcards
   - `needcart://**` and `exp://**` for native development
3. Save the settings and request a **new** magic link. Links already sent keep the old redirect target.
4. Open the link in the same browser that requested it. PKCE magic links store a verifier in that browser; opening them in another browser or device fails.

If the link still contains `redirect_to=http://localhost:3000`, check that you requested it from the deployed origin, not from a local dev server, and that the deployed URL is present in Redirect URLs.

#### First deploy checklist

1. `git push -u origin main`.
2. Import the repository in Vercel, choose Framework Preset **Other**, and use the settings above.
3. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to Production (and Preview).
4. Copy the assigned `https://<project>.vercel.app` URL into Supabase Auth Site URL and Redirect URLs.
5. Verify `/sign-in` and the magic link, a direct refresh of `/groups/<id>`, `/auth/callback`, and `/join/CODE`.
6. Connect `app.needcart.app` only after the Vercel deployment is stable.
7. If the project is commercial, use Vercel Pro; Hobby is fine for a personal project.

### iOS / Android (EAS)

Recommended order: **web → Android → iOS**.

Android can wait: EAS Build runs in the cloud, so Android Studio is not required locally. A preview build is enough to install an APK; publishing to Google Play requires a Google Play Developer account.

iOS can also be built **without a Mac** through EAS Build, but it requires an Apple Developer Program membership ($99/year) and an Apple ID/team for signing, TestFlight, and the App Store. Without an Apple account you cannot build and distribute an iOS app; the code is already cross-platform.

```bash
# Android preview APK
eas build --profile preview --platform android

# Android production
eas build --profile production --platform android
eas submit --profile production --platform android

# iOS — when an Apple Developer account is available
eas build --profile preview --platform ios
eas build --profile production --platform ios
eas submit --profile production --platform ios
```

Bundle ID / package: `app.needcart`. Add `EXPO_PUBLIC_*` variables to EAS secrets/environment for the relevant profile. Universal links (`app.needcart.app`) can be deferred until the first native build.

### Universal links

Before release, replace the placeholders:

- `public/.well-known/apple-app-site-association` — `YOUR_APPLE_TEAM_ID`.
- `public/.well-known/assetlinks.json` — `YOUR_ANDROID_SHA256_FINGERPRINT` (debug and release).
- Verify that the files are served with `Content-Type: application/json` and without redirects:

  ```bash
  curl -I https://app.needcart.app/.well-known/apple-app-site-association
  curl -I https://app.needcart.app/.well-known/assetlinks.json
  ```

Native auth testing requires a development build (`expo-dev-client`), not Expo Go.

## Decisions made at kickoff

- The backend was not connected initially: the project used `.env` placeholders and hand-written database types.
- All application objects live in the `needcart` schema; `public` is untouched.
- Project-global objects are namespaced too: bucket `needcart-avatars`, Edge Function `needcart-delete-account`, auth trigger `needcart_on_auth_user_created`.
- Bundle ID / package: `app.needcart`.
- The `/join/CODE` invite link is part of MVP; QR codes are post-MVP.
- All 8 languages were added at once; EN/RU are the reference translations, the rest need native-speaker review.
- Passwords are not used.
- Vercel hosts only the web build; iOS/Android are built with EAS.

## Remaining before release

- Configure Supabase Auth Site URL/Redirect URLs for the deployed Vercel domain.
- Configure production SMTP and verify magic links.
- Run EAS development/preview builds and verify magic links on iOS/Android.
- Replace universal-link placeholders and verify deep links.
- Add pgTAP/SQL RLS tests to CI.
- Have native speakers review `es/de/pt-BR/fr/sr-Latn/it` translations.
- Add Sentry, privacy policy, terms, and store metadata/screenshots.
- Add Maestro E2E tests and a seeded CI scenario.
- Post-MVP: push notifications, offline mutation queue, multiple lists per group, QR invites, barcode/receipt OCR, social sign-in, spending analytics, widgets, PWA service worker.
