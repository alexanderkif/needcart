# NeedCart — implementation status

- **Updated:** November 19, 2026
- **Plan:** [PLAN.md](./PLAN.md)
- **Schema:** [schema.sql](./schema.sql)

Legend: ✅ done · 🟡 partial · ⬜ not started · ⏸ post-MVP

## Summary

- **MVP slice of stages 1–5:** functionally implemented.
- **Stage 6:** partial — 8 languages and themes exist, but 6 translations need review and there has been no accessibility audit.
- **Stage 7:** not complete — the first Vercel deployment is live, but production auth redirect configuration, EAS builds, universal links, and store assets are still pending.
- **Production backend:** the app is connected to a real Supabase project; the `needcart` schema and Edge Function are deployed. The web build is live at <https://needcart.vercel.app>.

## Stages

| Stage | Status | Comment |
|---|---|---|
| 0. Decisions and accounts | 🟡 | Brand, email-only auth, currencies, 8 languages, and themes are fixed. Supabase and the Vercel project exist. Domain, trademark, and EAS accounts are not confirmed. |
| 1. Foundation | 🟡 | Expo SDK 58, TypeScript, Expo Router, NativeWind, themes, i18n, base components, CI config, web export. iOS/Android builds have not run yet. |
| 2. Database and auth | 🟡 | `needcart` schema, RLS, RPC, profiles, auth trigger, magic link, callback. No RLS/pgTAP tests in CI; native magic link is not verified. |
| 3. Groups | ✅ | List, creation, join by code, settings, members, roles, invite code, categories. Verified through API/DB. |
| 4. Items and categories | 🟡 | CRUD, soft delete, search, filters, categories, realtime subscriptions, optimistic updates. Realtime on two real devices has not been captured as a dedicated test. |
| 5. Purchases and budget | ✅ | `purchase_item`, `reorder_item`, history, budget view, currency, periods. DB smoke and API E2E passed. |
| 6. Localization and themes | 🟡 | All 8 locale files, light/dark/system, accent-derived background, responsive web. EN/RU reviewed; the rest are AI drafts. No full accessibility audit or 8-language screen review. |
| 7. Release | 🟡 | `needcart-delete-account` Edge Function is deployed and tested. No EAS builds, Vercel production deploy, universal links, store metadata, privacy/terms pages, or Sentry. |

## Detailed checklist

### 0. Decisions and accounts

- [x] Name NeedCart, repo `needcart`, bundle ID `app.needcart`
- [x] Email magic link as the only auth method in MVP
- [x] 8 languages, English primary
- [x] Light/dark/system, system by default
- [x] Unit price per item, integer cents; line total = unit price × quantity
- [x] `/join/CODE` link in MVP, no auto-join
- [ ] Domain `needcart.app` purchased and DNS configured
- [ ] NeedCart trademark checked
- [ ] Vercel project and EAS project created
- [x] Custom SMTP configured in Supabase (Resend), project email limit raised to 100/hour
- [ ] SMTP delivery, domain verification, SPF/DKIM/DMARC confirmed
- [ ] Supabase region confirmed for the target audience (current project is in `us-east-1`)

### 1. Foundation

- [x] Expo SDK 58 + React Native 0.88 + TypeScript
- [x] Expo Router (`src/app`), typed routes
- [x] NativeWind 4 + theme tokens
- [x] i18n foundation for 8 languages
- [x] Base UI components
- [x] `lint`, `typecheck`, unit tests, `expo-doctor`, web export
- [x] CI workflow file
- [ ] CI actually runs in GitHub Actions
- [ ] iOS/Android dev build runs on a device

### 2. Database and auth

- [x] `needcart` schema in a separate schema; `public` untouched
- [x] 6 tables, `group_overview` view, 21 functions, 17 RLS policies
- [x] Realtime publication for 5 tables
- [x] Storage bucket `needcart-avatars` + 4 policies
- [x] Auth trigger `needcart_on_auth_user_created`
- [x] RLS helpers, grants, service_role access
- [x] `create_group`, `join_group_by_code`, `leave_group`, `rotate_invite_code`, `purchase_item`, `reorder_item`
- [x] DB smoke test for RLS/RPC with two users (rollback)
- [x] REST API E2E against real Supabase
- [x] Lazy profile creation for existing auth users
- [x] Magic link / callback / protected routes in code
- [x] Handle auth 429 responses with a localized cooldown and project email-limit message
- [ ] Magic link verified on real iOS/Android
- [ ] pgTAP/RLS tests added to CI
- [x] Auth Site URL and Redirect URLs configured for `https://needcart.vercel.app` (verified via Admin API)
- [ ] Production SMTP delivery confirmed end-to-end
- [ ] Supabase migration history marked through `migration repair`

### 3. Groups

- [x] Group list with budget and counters
- [x] Group creation + default local categories
- [x] Join by 12-character code
- [x] `/join/CODE`, pending code after sign-in
- [x] Group settings: name/description/currency/budget/timezone
- [x] Members and roles: owner/admin/member
- [x] Remove member, leave, delete group
- [x] Rotate invite code
- [x] Categories: CRUD, color, icon, order
- [ ] UI scenario with two live users formally completed

### 4. Items and categories

- [x] Add/edit/soft delete
- [x] Free-text quantity with leading-number multiplier, unit price
- [x] Categories and category filter
- [x] Search by name/description
- [x] Filters: all/active/purchased
- [x] Grouping by category, purchased section
- [x] Optimistic purchase/reorder/delete updates
- [x] Realtime subscriptions and debounced invalidation
- [x] Fixed `priceCents`/`categoryId` → `price_cents`/`category_id` mapping
- [ ] Realtime verified on two devices/tabs with measured latency
- [ ] E2E test for create/edit

### 5. Purchases and budget

- [x] `purchase_item` with idempotency and history
- [x] `reorder_item` preserving history
- [x] Last 5 purchases in item details
- [x] History retention: all purchases from the last month + last 5 per item
- [x] Group budget: planned/spent/remaining/forecast
- [x] Currency and formatting via `Intl`
- [x] Week/month/none periods and timezone
- [x] Compact budget in the header + detail sheet
- [ ] Spending analytics by category (post-MVP)

### 6. Localization, themes, UI

- [x] 8 locale files: en, ru, es, de, pt-BR, fr, sr-Latn, it
- [x] English fallback, device locale on first sign-in
- [x] Light/dark/system
- [x] Accent presets + accent-derived background
- [x] Web: theme before first render, no flash
- [x] One compact header: budget/members/filters/search/settings as buttons
- [x] Focus state for input/textarea/select: accent border around the whole field
- [x] Responsive: mobile tabs, desktop sidebar
- [x] PWA system chrome: neutral black theme color, standalone display, safe-area insets
- [x] Adaptive/PWA icons fit Samsung squircle masks with a safe margin
- [x] Base accessibility labels and touch targets
- [ ] Native-speaker review of es/de/pt-BR/fr/sr-Latn/it translations
- [ ] All screens reviewed in 8 languages and both themes
- [ ] Full accessibility audit (VoiceOver/TalkBack, contrast, dynamic type)
- [x] Branded family + cart icon set (app, PWA, adaptive, splash)
- [x] White-background app icon, favicon, Android adaptive icon, PWA icons
- [x] Use the branded icon on sign-in and the desktop sidebar
- [ ] Store screenshots and iOS dark/tinted icon variants

### 7. Release

- [x] `needcart-delete-account` Edge Function deployed
- [x] Account deletion E2E: 409 for owned groups, group/account deletion, no-group scenario
- [x] Web SPA export + Vercel config
- [x] `eas.json` profiles
- [x] App icon, favicon, Android adaptive icon, PWA icons
- [x] PWA manifest: standalone display, black system theme color, maskable icons
- [x] Vercel production deploy at <https://needcart.vercel.app>
- [ ] Supabase Auth Site URL and Redirect URLs for the deployed domain
- [ ] EAS development/preview/production builds
- [ ] Universal links: Apple Team ID and Android SHA-256
- [ ] SMTP domain verification, SPF/DKIM/DMARC, and delivery test
- [ ] Privacy policy and terms pages
- [ ] App Store / Play Store metadata, light/dark screenshots
- [ ] Sentry integration
- [ ] Store review / TestFlight / internal testing

## Post-MVP (intentionally deferred)

- [ ] Push notifications (⏸)
- [ ] Full offline support with a mutation queue (⏸)
- [ ] Multiple lists per group (⏸)
- [ ] QR invite code (⏸)
- [ ] Barcodes, receipt photos, OCR (⏸)
- [ ] Google/Apple Sign In (⏸)
- [ ] Spending analytics, recurring lists, widgets (⏸)
- [ ] PWA service worker (⏸)

## Tests and checks

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test` - 36 unit tests
- [x] `npx expo-doctor` — 20/20
- [x] `npm run export:web`
- [x] DB smoke RLS/RPC
- [x] REST API E2E (auth → group → item → overview)
- [x] Edge Function E2E (owned groups, delete account)
- [ ] pgTAP/RLS tests in CI
- [ ] Maestro E2E
- [ ] Two-device realtime test
- [ ] Accessibility audit
- [ ] Sentry staging verification

## Known limitations

- PKCE magic links cannot be reliably opened on a **different** device: request the link on the device where you sign in. Cross-device flows need `token_hash`/OTP.
- Custom SMTP (Resend) is configured with a 100/hour project email limit. The per-address 60-second cooldown and per-IP Auth limits still apply; verify Resend domain/SPF/DKIM/DMARC before production.
- Supabase falls back to the project Site URL when `emailRedirectTo` is not in Auth → Redirect URLs. If the Site URL is still `http://localhost:3000`, production magic links point to localhost. Add the deployed Vercel URL to Site URL and Redirect URLs, then request a new link.
- 6 translations are AI drafts and have not been reviewed by native speakers.
- Universal links still contain placeholders (`YOUR_APPLE_TEAM_ID`, `YOUR_ANDROID_SHA256_FINGERPRINT`).
- Migrations were applied manually; before using `supabase db push`, mark `20261118000000`, `20261120000000`, and `20261121000000` as applied with `npx supabase migration repair`.
- If Data API exposed tables/functions change, run `supabase/grants/needcart_api_grants.sql`; otherwise RLS helpers can lose `EXECUTE`.
- The real Supabase project is in `us-east-1`; reconsider this for an EU audience.

## Next priorities

1. Supabase Auth Site URL/Redirect URLs; magic links currently fall back to `http://localhost:3000`.
2. EAS dev build and magic-link verification on iOS/Android.
3. Universal links and production auth redirect URLs.
4. pgTAP/RLS tests in CI.
5. Sentry, privacy/terms, and store metadata.
6. Store screenshots and iOS dark/tinted icon variants.
