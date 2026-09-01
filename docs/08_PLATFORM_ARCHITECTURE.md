# THE NEGOTIATOR — PLATFORM ARCHITECTURE
Version: 1.2
Status: Proposed technical direction

## 1. Principle
The software supports human Negotiators; it does not replace them in the initial version.

## 2. Suggested Stack
This is a proposed baseline and should be validated during technical discovery.

Frontend:
- Next.js
- React
- TypeScript
- Tailwind CSS
- Component system such as shadcn/ui

Backend:
- NestJS
- TypeScript
- REST API initially
- WebSockets or realtime layer where useful

Database:
- PostgreSQL
- Prisma ORM

Infrastructure:
- Containerized deployment
- Managed PostgreSQL
- Object storage for uploads
- Secure secrets management
- Monitoring/logging
- Automated backups

## 3. Core Domains
- Identity
- Customers
- Businesses
- Categories
- Partners
- Commercial Agreements
- Negotiation Cases
- Negotiators
- Messages
- Offers
- Counteroffers
- Transactions
- Payments
- Documents
- Reviews
- Disputes
- Notifications
- Audit Logs

## 4. Core Entities
User
CustomerProfile
Business
Category
CategoryField
BusinessCategory
BusinessContact
PartnerAgreement
Negotiator
NegotiationCase
NegotiationParticipant
NegotiationEvent
Message
Offer
OfferItem
CustomerAuthorization
Transaction
Payment
Attachment
Review
Dispute
Notification
AuditLog

### 4.1 New Entities — Category & Business CMS
Added to support full admin management of categories and businesses. Full functional detail in `22_CATEGORY_AND_BUSINESS_CMS.md`.

**Category**
- id, name, description, icon/image, parentCategoryId (nullable, supports sub-categories), displayOrder, status (Draft/Active/Archived), customerVisible (boolean), createdBy, createdAt, updatedBy, updatedAt

**CategoryField**
- id, categoryId, fieldName, fieldType, required (boolean), displayOrder

**BusinessCategory** (join table)
- businessId, categoryId

### 4.2 Extended Entity — Business
`Business` gains the following fields to support the CMS:
- categoryIds (via `BusinessCategory` join table, many-to-many)
- customerVisible (boolean)
- publishStatus (Draft/Published/Unpublished)

### 4.3 New Entities — Ticket-Based Customer Access
Added to support passwordless, ticket-scoped customer access in place of upfront account creation (see `02_PRODUCT_REQUIREMENTS.md`, Section 6a and `03_CUSTOMER_JOURNEY.md`, Sections 3 and 10).

**NegotiationTicket**
- id, negotiationCaseId, customerEmail, status (Active/Closed), createdAt, closedAt

**AccessToken** (magic link)
- id, ticketId, tokenHash, issuedAt, expiresAt, singleUse (boolean), usedAt (nullable), revokedAt (nullable)
- Tokens are scoped to exactly one `NegotiationCase` via its `NegotiationTicket`; a token never grants access beyond that case.
- On case closure, all outstanding tokens for that ticket are revoked immediately (`revokedAt` set), independent of their `expiresAt`.

**CustomerAccount** (optional, persistent)
- id, email, createdAt
- Nullable link from `NegotiationTicket.customerAccountId` — a ticket can exist entirely without an account; an account, when created, aggregates tickets sharing its email rather than the reverse.

## 5. Data Separation
Customer-facing services must not expose:
- Internal partner pricing
- Internal margins
- Internal negotiation notes
- Business minimums
- Private commercial terms
- Internal contacts
- Internal risk scores
- Unpublished categories or businesses (`customerVisible = false` or `publishStatus != Published`)
- Any `NegotiationCase` data through a revoked or expired `AccessToken`

Use explicit API DTOs and authorization boundaries.

## 6. Auditability
Every material action should record:
- Actor
- Timestamp
- Case
- Action
- Before/after where applicable
- Related entity
- Source/channel

This includes category and business create/edit/publish/status-change actions performed through the CMS, and access-token issuance, use, and revocation events.

## 7. Security
Minimum requirements:
- MFA for staff
- Role-based access control
- Encryption in transit
- Encryption at rest where supported
- Secure file handling
- Rate limiting
- Session security
- Audit logs
- Backups
- Least privilege
- Secrets management
- **Magic-link token security**: tokens stored hashed (never plaintext), scoped to a single case, time-limited, rate-limited on issuance/resend, and revoked immediately on case closure. Exact token lifetime, single-use vs. multi-use behavior while a case is active, and resend throttling limits are TBD — see `21_OPEN_DECISIONS.md`, Customer Access & Tracking.

## 8. Notification Channels
Potential:
- Email
- SMS
- Push
- In-app
- WhatsApp where legally/technically supported

Email is the required baseline channel for the MVP, since magic-link access and closure summaries both depend on it (see `03_CUSTOMER_JOURNEY.md`, Sections 3 and 10).

## 9. Integration Philosophy
Start with manual workflows where practical.
Build APIs only when volume justifies them.

## 10. Future Automation
Potential future automation:
- Case classification
- Research assistance
- Drafting
- Reminder automation
- Analytics
- Business matching

Any future AI capability must remain subject to explicit product approval and governance. This includes any future automated or AI-assisted category suggestion or business classification — not part of the initial CMS scope.
