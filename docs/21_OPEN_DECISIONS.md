# THE NEGOTIATOR — OPEN DECISIONS
Version: 1.3

This document prevents assumptions from silently becoming business rules.

## Business
- Legal company structure: TBD
- Launch country/countries: TBD
- Initial category focus: TBD
- Final mission wording: TBD
- Final vision wording: TBD

## Revenue
- Customer fee: TBD
- Business fee: TBD
- Success fee percentage: TBD
- Subscription: TBD
- Payment flow: TBD
- Refund model: TBD

## Operations
- Negotiator staffing model: TBD
- Working hours: TBD
- SLA targets: TBD
- Escalation thresholds: TBD
- High-value transaction threshold: TBD

## Partnerships
- Partner agreement duration: TBD
- Commercial agreement templates: TBD
- Minimum partner standards: TBD
- Exclusivity: TBD
- Geographic restrictions: TBD

## Product
- Exact MVP feature set: TBD
- Messaging channels: TBD
- Customer verification level: TBD
- Business verification level: TBD
- Payment providers: TBD
- Booking integrations: TBD

## Category & Business CMS
- Whether category creation requires Admin approval or can be done by Operations/Partnerships directly: TBD
- Whether sub-categories are needed at launch or can be deferred: TBD
- Bulk import file format and validation rules: TBD
- Whether a business can belong to categories across multiple, unrelated verticals at once, and how that affects Negotiator routing: TBD
- Retention policy for archived categories and terminated businesses: TBD

## Customer Access & Tracking
- Magic-link token lifetime while a case is active: TBD
- Whether an active-case magic link is single-use (re-issued each visit) or reusable until case closure: TBD
- Resend/rate-limiting rules for magic-link requests (to prevent abuse without frustrating legitimate customers): TBD
- Whether SMS is offered as a fallback delivery channel for the tracking link where email is unreliable: TBD

**Resolved:** Post-closure record retrieval always routes through Customer Support, with the customer's identity and approval verified before the record is re-sent — never self-service or a re-issuable link. See `03_CUSTOMER_JOURNEY.md`, Section 10.1, and `07_OPERATIONS_AND_ORG.md`, Section 6.

**Resolved:** The optional persistent account (Section 6b, `11_UX_UI_SYSTEM.md`) is offered from two points, never from the request form itself: the live case dashboard (a dismissible, skippable card) and the closure-summary email (a one-line CTA). Requesting a login link find-or-creates the account and backfills any existing tickets sharing that email; every later request from a known email links up automatically with no customer action. This keeps the feature additive per Section 6b — it can never block submitting or tracking a single request. See `src/server/services/customer-accounts.ts`.

## Technology
- Hosting provider: TBD
- Authentication provider: TBD
- Email provider: TBD
- SMS provider: TBD
- File storage: TBD
- Analytics stack: TBD

## Brand
- Final logo: TBD
- Colors: TBD
- Fonts: TBD
- Tagline: TBD
- Domain: TBD

## Legal
- Customer terms: TBD
- Partner agreement: TBD
- Privacy policy: TBD
- Data retention: TBD
- Consumer protection requirements: TBD
- Tax structure: TBD

## Important Rule
A TBD must be validated before being treated as a final requirement.
