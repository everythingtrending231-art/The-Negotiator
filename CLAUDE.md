# The Negotiator — Claude Code Project Context

This file orients Claude Code (or any engineering agent) working in this repository. It is not a replacement for the foundation docs in `/docs` — it's the map to them.

## What this repo is

This repo currently contains the **hero landing page prototype** (`src/`, bundled via `bundle-artifact.sh`) for The Negotiator, plus the **full foundation documentation set** (`/docs`) that governs product, brand, operations, and engineering decisions for the platform.

## Read this first

Before making product, copy, or architecture decisions, read:
- `docs/00_MASTER_INDEX.md` — map of all 22 foundation docs and the source-of-truth priority order when documents conflict
- `docs/01_BUSINESS_BIBLE.md` — what The Negotiator is/is not, core promise, trust principles
- `docs/10_BRAND_BIBLE.md` — voice, tone, visual direction, trust language rules
- `docs/20_ENGINEERING_BIBLE.md` — engineering principles and standards for this codebase

## Non-negotiable rules for anything shipped from this repo

These come directly from the foundation docs and apply to every UI string, mock, and piece of content generated here — not just backend logic:

1. **Never state or imply a guaranteed or specific savings/outcome** (e.g., a percentage off, a dollar amount, "secured") unless it is a real, substantiated result tied to an actual case. This applies to marketing copy, placeholder/mock UI content, and example data alike. See `docs/01_BUSINESS_BIBLE.md` §14 (Non-Negotiable Trust Principles) and `docs/10_BRAND_BIBLE.md` §16 (Trust Language).
2. **The initial platform is human-operated.** Do not build, imply, or mock autonomous/AI-driven negotiation. See `docs/00_MASTER_INDEX.md` (Human-First Constraint) and `docs/15_LAUNCH_ROADMAP.md` (Phase 6 note).
3. **Never expose internal commercial data** (partner pricing, margins, negotiation strategy, unpublished categories/businesses) through any customer-facing surface, including prototypes. See `docs/08_PLATFORM_ARCHITECTURE.md` §5 (Data Separation).
4. **Customer access is ticket-based, not account-based.** No password-first flows for customers; magic-link access scoped to a single case, revoked at case closure. See `docs/02_PRODUCT_REQUIREMENTS.md` §6a and `docs/03_CUSTOMER_JOURNEY.md` §3/§10.
5. **A `TBD` in `docs/21_OPEN_DECISIONS.md` is not a green light.** Treat it as unresolved; flag it back to the user rather than silently deciding it in code or copy.

## Brand quick-reference (see `docs/10_BRAND_BIBLE.md` for full detail)

- Promise: **"You ask. We negotiate."**
- Primary CTA: **"Negotiate This For Me"**
- Palette (current working default, Option 2 / Bright Corporate direction): Cobalt `#123FA9`, Amber `#F5A623`, Cream `#F7F5F0`
- Typography: Liberation Sans (primary), Lora (secondary/editorial)
- Mark: the "o" in Negotiator as a small inspector character — handlebar mustache in amber, compact fedora — see `docs/10_BRAND_BIBLE.md` and current mark implementation in `src/NegotiatorMark.tsx`

## This prototype's current state

- `src/App.tsx` — hero landing page: split layout, mustache-and-hat mark, two-tier CTA, value badges (Lower Price / Better Terms / Added Value), decorative squiggle motifs (cobalt loops, replacing an earlier full-page spinning-spiral concept that was nulled by the user)
- `src/NegotiatorMark.tsx` — reusable SVG component for the character mark
- Floating "status" card is intentionally **process-focused, not outcome-promising** (rule #1 above) — do not reintroduce specific savings figures into hero/marketing surfaces without an explicit, substantiated basis

## Open design/product decisions relevant to future work here

Pulled from `docs/21_OPEN_DECISIONS.md` — do not treat these as settled:
- Final logo, colors, fonts, tagline, domain
- Whether the optional persistent customer account is offered at submission, closure, or later
- Magic-link token lifetime, single-use vs. reusable, resend rate limits
- Exact MVP feature set, messaging channels, verification levels

## When in doubt

Priority order for resolving conflicts (from `docs/00_MASTER_INDEX.md`):
1. Approved business decisions
2. Product requirements
3. Operating procedures
4. Brand and UX
5. Technical implementation

If a task requires a decision not covered by the docs, surface it explicitly rather than assuming — consistent with how `21_OPEN_DECISIONS.md` is meant to be used.
