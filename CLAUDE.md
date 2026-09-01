# The Negotiator — CLAUDE.md
## Full-System Build Context for Claude Code

This file orients an engineering agent building **the entire Negotiator platform** — not just the hero landing prototype in this repo's `src/`. Read this first, then pull the specific docs referenced per phase below as you work.

## What "the entire system" means

Per `docs/00_MASTER_INDEX.md` and `docs/15_LAUNCH_ROADMAP.md`, the full system is four connected surfaces plus the operating layer behind them:

1. **Customer Portal** — request submission, ticket/magic-link tracking, offer review, decision, deal history
2. **Negotiator Portal** — case workspace for human Negotiators (this is a human-powered platform — see Non-Negotiable #2 below)
3. **Business Portal** — request inbox, offer/counteroffer submission for partner businesses
4. **Admin Portal** — users, categories, businesses, agreements, cases, payments, disputes, audit (the Category & Business CMS lives here)

Do not build these as independent apps with duplicated logic. `docs/08_PLATFORM_ARCHITECTURE.md` defines one shared domain model (`NegotiationCase`, `Offer`, `Business`, `Category`, etc.) that all four portals read/write through role-scoped APIs.

## Non-negotiable rules (apply to every surface, every phase)

1. **Never state or imply a guaranteed or specific savings/outcome** in any copy, mock data, or placeholder content unless it's a real, substantiated result. `docs/01_BUSINESS_BIBLE.md` §14, `docs/10_BRAND_BIBLE.md` §16.
2. **Human-powered only.** No autonomous/AI-driven negotiation logic, anywhere, in the initial build. `docs/00_MASTER_INDEX.md` (Human-First Constraint), `docs/15_LAUNCH_ROADMAP.md` Phase 6.
3. **Internal commercial data never reaches customer-facing code paths** — partner pricing, margins, negotiation strategy, unpublished categories/businesses. Enforce via explicit DTOs, not field filtering after the fact. `docs/08_PLATFORM_ARCHITECTURE.md` §5.
4. **Customer identity is ticket-based, not account-based.** Magic-link, single-case-scoped, revoked at terminal status. No password-first customer flows. `docs/02_PRODUCT_REQUIREMENTS.md` §6a, `docs/03_CUSTOMER_JOURNEY.md` §3/§10.
5. **Post-closure record access is never self-service.** Always routes through Support with identity + approval verification logged. `docs/03_CUSTOMER_JOURNEY.md` §10.1, `docs/07_OPERATIONS_AND_ORG.md` §6.1.
6. **A `TBD` in `docs/21_OPEN_DECISIONS.md` is not a decision.** Surface it back to the user rather than resolving it silently in code.
7. **Category and business creation is admin-mediated only** — no self-service creation by businesses themselves in this scope. `docs/22_CATEGORY_AND_BUSINESS_CMS.md` §3.

## Doc map by build concern

| You're building... | Read these first |
|---|---|
| Anything — orientation | `00_MASTER_INDEX.md`, `01_BUSINESS_BIBLE.md` |
| Data model / API / entities | `08_PLATFORM_ARCHITECTURE.md`, `19_INTERNAL_DATA_DICTIONARY.md` |
| Customer request flow, tracking, dashboard | `03_CUSTOMER_JOURNEY.md`, `02_PRODUCT_REQUIREMENTS.md` §3, §6a, §7 |
| Negotiator case workspace | `04_NEGOTIATION_OPERATING_SYSTEM.md`, `02_PRODUCT_REQUIREMENTS.md` §4 |
| Business portal, offers/counteroffers | `05_BUSINESS_PARTNER_SYSTEM.md`, `06_PARTNER_AGREEMENT_FRAMEWORK.md`, `02_PRODUCT_REQUIREMENTS.md` §5 |
| Admin portal, Category & Business CMS | `09_ADMIN_BUSINESS_CUSTOMER_PORTALS.md`, `22_CATEGORY_AND_BUSINESS_CMS.md` |
| Any UI screen, component, or copy | `11_UX_UI_SYSTEM.md`, `10_BRAND_BIBLE.md` |
| Roles, permissions, staffing, SOPs | `07_OPERATIONS_AND_ORG.md`, `20_ENGINEERING_BIBLE.md` §5 |
| Payments, fees, unit economics | `12_REVENUE_AND_UNIT_ECONOMICS.md` |
| Security, fraud, disputes, verification | `13_TRUST_RISK_COMPLIANCE.md` |
| Analytics/KPIs | `16_MEASUREMENT_ANALYTICS.md` |
| Terms, consent, legal-adjacent copy | `18_CUSTOMER_TERMS_FRAMEWORK.md` (flag for legal review, don't ship as final) |
| Engineering standards, stack, auth, audit | `20_ENGINEERING_BIBLE.md` |
| Anything marked unresolved | `21_OPEN_DECISIONS.md` — check before assuming |

Source-of-truth priority when docs conflict (`00_MASTER_INDEX.md`): approved business decisions → product requirements → operating procedures → brand/UX → technical implementation.

## Recommended build order

Following `docs/15_LAUNCH_ROADMAP.md`:

**Phase 1 — Concierge MVP** (manual-heavy, prove the model)
- Customer: simple request form + status page (no full portal yet)
- Internal: case list, negotiator assignment, negotiation records — can be spreadsheet/admin-tool-level, not a full app
- Category/business setup can be manual (spreadsheet or direct DB entry) — CMS isn't required yet (`22_CATEGORY_AND_BUSINESS_CMS.md` §10)

**Phase 2 — Platform MVP** (this is where most of the doc set applies)
- Customer Portal (full, per `02_PRODUCT_REQUIREMENTS.md` §3 + §6a)
- Negotiator Portal (`02` §4)
- Business Portal (`02` §5)
- Admin Portal including Category & Business CMS (`02` §6, `09`, `22`)
- Notifications, offer system, audit system, basic analytics

**Phase 3 — Transaction Infrastructure**
- Payments, deal confirmation, receipts, refunds, partner settlement

**Phase 4+ — Network Expansion / Integrations / Automation**
- Only after gate criteria in `15_LAUNCH_ROADMAP.md` are met — do not build ahead of validated demand

Do not skip ahead to Phase 3+ features (payments, integrations) before the Phase 2 core loop (request → assign → negotiate → offer → decide → close) works end to end with the ticket-based access model.

## Core entities to model first

From `08_PLATFORM_ARCHITECTURE.md` §4: `User`, `CustomerProfile`, `Business`, `Category`, `CategoryField`, `BusinessCategory`, `PartnerAgreement`, `Negotiator`, `NegotiationCase`, `Message`, `Offer`, `CustomerAuthorization`, plus the ticket-access entities `NegotiationTicket`, `AccessToken`, `CustomerAccount` (§4.3), and `AuditLog`. Get the case status lifecycle right first (`02_PRODUCT_REQUIREMENTS.md` §7) — nearly everything else hangs off it.

## Brand quick-reference

- Promise: **"You ask. We negotiate."**
- Primary CTA copy: **"Negotiate This For Me"**
- Palette (working default, Option 2/Bright Corporate): Cobalt `#123FA9`, Amber `#F5A623`, Cream `#F7F5F0`
- Typography: Liberation Sans (primary), Lora (secondary/editorial)
- Mark: mustache-and-hat "o" character — see `src/NegotiatorMark.tsx` in this repo for a working implementation

## This repo's current state vs. the full system

This repo currently contains **only the hero landing page prototype** (`src/App.tsx`, `src/NegotiatorMark.tsx`). It is not the platform itself — treat it as one visual reference point for the Customer Portal's entry screen, not as an architectural starting point. When building the real Customer Portal, follow `08_PLATFORM_ARCHITECTURE.md`'s suggested stack (Next.js/React/TypeScript/Tailwind frontend, NestJS/PostgreSQL/Prisma backend), not the Vite+Parcel artifact-bundling setup used for this prototype.

## When in doubt

Surface the gap explicitly — cite the relevant doc and section, and if it's genuinely unresolved, point to `21_OPEN_DECISIONS.md` rather than deciding it yourself.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
