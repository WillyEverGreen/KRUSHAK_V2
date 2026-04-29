# Krushak Mobile App Plan (Offline-first)

Date: 2026-04-28

## 1) Goals and non-negotiables
- Full feature parity with current web app (Home, Diagnose, Diagnose Result, My Farm, Market, News, Chat, Care Guides, FAQ, Profile, Auth).
- Offline-capable experience for every screen: view cached data without network; allow core actions offline with sync on reconnect.
- UI parity with current web app and the provided screenshots: same layout rhythm, card styles, colors, and iconography.
- Works smoothly on low-end Android devices and low-connectivity networks.
- Secure storage for user session and sensitive data.

## 2) Visual direction (from the reference screenshots)
- Light background, rounded cards, and soft elevation (no heavy shadows).
- Green/teal accents for CTAs, badges, and key metrics.
- Bottom navigation bar as the primary navigation element.
- Header area with greeting or title + subtle secondary info (location/weather).
- Cards arranged in vertical sections with compact spacing and clear typography hierarchy.
- List rows for news/market with small tags or metadata chips.

Design system actions:
- Extract the current web tokens (colors, spacing, radii, type sizes) from the web theme and re-map into a mobile design token file.
- Define a component kit: Card, SectionHeader, MetricPill, ListRow, Tag, PrimaryButton, SecondaryButton, EmptyState.

## 3) Mobile approach (recommended)
Recommended: React Native + Expo
- Proper native app behavior (offline storage, push notifications, background sync).
- Shared JS/TS logic with the web client (API functions, data shaping).
- Faster iteration with Expo development tooling.

Alternative (fastest time-to-market): Capacitor wrapper
- Quick native packaging of the current PWA.
- Lower effort, but offline storage and native UX are limited and less robust.

Decision: proceed with React Native + Expo unless you explicitly want Capacitor.

## 3.1) Chosen sync approach — MongoDB Realm Sync (Option A)
- We will use MongoDB Realm Sync (Atlas + Realm SDK) as the mobile sync engine.
- Rationale: Realm provides first-class local DB + automatic bi-directional sync to Atlas, built-in conflict handling, and a React Native SDK which reduces custom sync work and speeds development of an offline-first app.

What this changes in the plan:
- Mobile storage will be backed by Realm Local DB instead of (or alongside) SQLite. Realm will be the single local source of truth for synced collections (crops, livestock, reminders, diagnoses, news cache, market cache, chat history if desired).
- The existing REST backend remains for server-only features (AI analysis orchestration, admin endpoints, and any server-only logic). We will keep both: Atlas (with Realm Sync) for mobile sync, and the Express API for existing web clients and server-side workflows.
- Authentication: enable an authentication provider in Realm (Email/Password or Custom JWT). We'll prefer configuring Realm to accept the same JWTs issued by your server (using Realm's Custom JWT provider) so users have one account across web and mobile.
- Schema & API: define Realm object schemas that mirror Mongoose models and add `createdAt`, `updatedAt`, and `deletedAt` fields to ease sync and delta queries.

Important implementation notes & constraints:
- Expo compatibility: Realm's native module requires a native build. We can continue using Expo but will build with EAS (Expo Application Services) or use the Bare workflow. EAS Build lets us keep the managed workflow while adding native modules.
- Image storage: large images should be stored via `expo-file-system` locally and referenced from Realm records; uploads to your Express server (for AI analysis) can still occur via the REST endpoints.
- Conflict handling: configure Realm Flexible Sync (preferred) or Partition-based sync depending on the access model. Flexible Sync is recommended for per-user subsets and dynamic queries.
- Server coexistence: maintain your existing MongoDB Atlas cluster; enable Realm App (App Services) against the same Atlas cluster so that data lives in the same Atlas collections the server already uses.

Realm rollout phases (insert into implementation phases)
- Atlas + Realm App setup (1 day): create Realm App, link to Atlas cluster, enable Flexible Sync, configure rules/permissions.
- Schema mapping & rules (1-2 days): translate Mongoose models to Realm object schemas and define read/write rules per collection.
- Auth integration (1 day): configure Realm auth provider to accept existing JWTs (Custom JWT) so web and mobile accounts match.
- Client integration (2-4 days): add `realm` to the Expo app (EAS build), initialize sync, write small sync demos for `diagnoses` and `reminders`.
- Migration & QA (2-3 days): test sync correctness, conflict scenarios, image upload flows, and offline queueing for AI analysis.

Backwards compatibility guidance
- Keep your Express REST API as-is for the web frontend. Mobile sync writes will appear in Atlas and therefore be visible to the server and web clients.
- For fields that are mobile-only, keep them optional in server schemas and do not assume their presence in web UI.
- Use server-side indexes on `updatedAt` and `deletedAt` to support fast delta queries for any non-synced endpoints.

Security & governance
- Define Realm rules to restrict access to user-owned documents only.
- Use TLS and set appropriate IP/network rules for Atlas.
- Monitor quota/usage on Atlas and Realm Sync; plan for backups and retention policies.

## 4) Feature inventory to carry over (from current app)
Screens and modules to port:
- Auth (login/register)
- Home dashboard (weather summary, stats, quick actions)
- Diagnose (image upload + analysis) and Diagnose Result
- My Farm (crops, livestock, reminders)
- Market prices
- News
- Chat assistant
- Care guides
- FAQ
- Profile

Key APIs to integrate:
- /auth/* for login/register
- /home, /weather
- /diagnose/* (analyze, catalog, advisory, recent, records)
- /farm/* (reminders, crops, livestock)
- /market/prices
- /news
- /chat/*

## 5) Offline-first strategy (per feature)
All screens must render meaningful content offline. Online-only actions should be queued or clearly indicated.

Auth
- Offline: allow viewing cached profile and last session if token exists and not expired.
- Online required: login/register, token refresh, profile updates.

Home
- Offline: show cached home summary + last known weather.
- Online: refresh on app open and on pull-to-refresh.

Diagnose
- Offline: allow photo capture and store locally, show last analysis results.
- Online: send image to server for AI analysis, then store results locally.
- Queue: if offline, save pending analysis and auto-submit on reconnect.

Diagnose Result
- Offline: render from local cache for previous diagnoses.

My Farm (crops, livestock, reminders)
- Offline: full CRUD against local DB with a sync queue.
- Online: background sync using a conflict-safe strategy (see Sync section).

Market Prices
- Offline: show cached results for last searches/filters.
- Online: refresh with new data.

News
- Offline: show cached articles; open details from cached content.
- Online: refresh feed.

Chat
- Offline: show past chat history, allow draft messages but do not send.
- Online: send chat, store response locally.

Care Guides and FAQ
- Offline: ship as bundled JSON or download a language pack and cache in local DB.

Profile
- Offline: show cached profile and settings.
- Online: update profile and language prefs.

## 6) Mobile app architecture
Layers:
- UI: React Native screens + shared UI components.
- State: Zustand for session + UI state; React Query (optional) for online fetches.
- Data: Local DB (SQLite) as the single source of truth for offline content.
- Sync: background job that pushes local changes and pulls server updates.

Recommended local storage stack:
- expo-sqlite for a local database.
- expo-secure-store for tokens.
- expo-file-system for image storage.

Local DB tables (suggested):
- user
- crops
- livestock
- reminders
- diagnoses (includes image path, analysis summary, timestamps)
- news_articles
- market_prices
- chat_messages
- care_guides
- faq_items
- sync_queue (outbox)

## 7) Sync design (offline writes + conflict handling)
Goal: users can add/edit/delete farm data offline and sync later without data loss.

Client strategy:
- Write all changes to local DB immediately.
- Add a queue item for each mutation (create/update/delete).
- On reconnect or app resume, process queue in FIFO order.

Server changes (recommended):
- Add updatedAt and deletedAt to relevant models.
- Add bulk endpoints for crops, livestock, reminders, diagnoses records.
- Support delta pull: ?since=timestamp to fetch only changed items.
- Use last-write-wins by updatedAt for simple conflicts.
- Return conflict records so the client can flag them in UI if needed.

## 8) UI parity plan
- Extract design tokens from current web theme (colors, spacing, radii).
- Build a mobile component kit that mirrors web components:
	- Card, SectionHeader, NavBar, PrimaryButton, Tag, MetricPill, ListItem, EmptyState.
- Port the screens in the same order and layout structure:
	1) Home
	2) Diagnose + Result
	3) My Farm
	4) Market
	5) News
	6) Chat
	7) Care Guides
	8) FAQ
	9) Profile
	10) Auth

## 9) Implementation phases and deliverables

Phase 0: Alignment (1-2 days)
- Confirm mobile approach (Expo).
- Finalize offline requirements per feature.
- Inventory the UI elements to mirror from the web app.
Deliverables: design token list + component checklist.

Phase 1: Project setup (2-3 days)
- Create Expo app + navigation (bottom tabs + stack).
- Add Zustand store, API client, and base theme tokens.
- Add SecureStore + SQLite initialization.
Deliverables: running shell app with empty screens and nav.

Phase 2: Core UI kit + navigation (3-5 days)
- Build reusable components (Card, ListRow, Tag, buttons).
- Implement theme-based typography and spacing.
Deliverables: component catalog + visual parity checks.

Phase 3: Auth + Profile (3-4 days)
- Port login/register screens.
- Store token securely; cache profile in local DB.
Deliverables: working auth and profile flow.

Phase 4: Home + Weather (3-4 days)
- Port Home screen, show cached data offline.
- Implement weather cache and stale indicator.
Deliverables: offline-capable home dashboard.

Phase 5: Diagnose + Result (5-7 days)
- Implement camera/gallery image capture.
- Upload for analysis when online; store analysis locally.
- Add pending analysis queue for offline.
Deliverables: end-to-end diagnosis flow.

Phase 6: My Farm (6-8 days)
- Port crops, livestock, reminders screens.
- Full offline CRUD with sync queue.
Deliverables: offline farm management with background sync.

Phase 7: Market + News + Care Guides + FAQ (4-6 days)
- Cache results locally for offline reading.
- Add quick filters and search.
Deliverables: offline browsing for all content modules.

Phase 8: Chat (3-4 days)
- Online-only chat with cached history.
- Disable send while offline with friendly hint.
Deliverables: AI chat parity.

Phase 9: QA, performance, and release prep (5-7 days)
- Offline stress tests and airplane mode tests.
- Performance profiling (cold start, list rendering).
- Store assets, icons, splash, app signing.
Deliverables: release candidate builds.

## 10) Testing checklist (minimum)
- App opens and renders all screens offline.
- Offline CRUD for crops/livestock/reminders syncs correctly.
- Diagnose queue processes on reconnect.
- News/Market cache shows correct stale labels.
- Token stored securely, logout clears local data.
- Low memory behavior on Android (image caching, list virtualization).

## 11) Risks and mitigations
- AI features require internet: provide offline queue + clear messaging.
- Data conflicts: last-write-wins + server conflict response list.
- Storage size: compress images on device, limit cache size, TTL eviction.

## 12) Acceptance criteria
- 100% feature parity with current web app.
- Offline experience for every screen with clear state indicators.
- UI visual parity with current web app and reference screenshots.
- Android release build passes internal QA on at least 3 low-end devices.

