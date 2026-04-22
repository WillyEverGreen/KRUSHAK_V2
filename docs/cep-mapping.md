# CEP Mapping for Krushak MERN PWA

This document maps the current base application to the CEP criteria in requirements.md.

## WP1: Depth of Knowledge Required

- Modular REST API architecture using Express and MongoDB models for users, diagnosis records, and reminders.
- Authentication and authorization with JWT, role-aware middleware, and protected routes.
- PWA setup with service worker caching and installable manifest.
- Mobile-first screen architecture with route shell and subpages.

## WP2: Conflicting Requirements

- Security vs usability: guest read-only access is allowed through optional auth, while writes require valid JWT.
- Offline resilience vs consistency: NetworkFirst strategy with local fallback caches for core read APIs.
- Rich UI fidelity vs maintainability: shared theme tokens and reusable layout components keep Flutter-like design while preserving code modularity.

## WP3: Depth of Analysis

- Designed as two deployable services (client and API) with explicit separation of concerns.
- Data contracts are shaped around mobile workflows (home dashboard, diagnosis, reminders, market, advisory chat).
- Environment schema validation at startup avoids silent runtime misconfiguration.

## WP4: Familiarity of Issues

- PWA installability and offline cache behavior for low connectivity use cases.
- Guest vs authenticated behavior per endpoint and screen.
- Prepared stubs for cloud LLM integration while keeping deterministic local responses now.

## WP5: Applicable Codes

- RESTful route conventions under /api.
- Input validation with Zod.
- Password hashing with bcrypt.
- JWT authentication with role checks.
- Security middleware: Helmet, CORS, and rate limiting.

## WP6: Stakeholder Involvement

- Farmer user workflows: diagnosis, reminders, farm insights, market prices, and advisory chat.
- Admin stakeholder: /api/admin/summary for operational visibility.
- External system readiness: API structure is prepared for market/news/cloud AI integrations.

## WP7: Interdependence

- Frontend consumes backend APIs through a central service layer.
- Backend controllers combine data from multiple models.
- PWA runtime caching and local storage bridge frontend UX with backend availability.

## Current Scope

- Base app foundation is complete with mobile-first UI parity and MERN architecture.
- Cloud LLM scanning is intentionally deferred and can be connected through diagnose/chat service modules in the next phase.
