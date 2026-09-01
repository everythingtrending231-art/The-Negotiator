# THE NEGOTIATOR — PRODUCT REQUIREMENTS DOCUMENT
Version: 1.2
Status: Pre-MVP

## 1. Product Objective
Create a platform that allows a customer to submit a negotiation request and have a human Negotiator manage the request from intake through final offer.

## 2. Primary User Types
### Customer
Requests negotiation and decides whether to accept the final offer.

### Negotiator
In-house professional who manages customer cases.

### Senior Negotiator
Handles escalations, complex cases and high-value transactions.

### Business Partner
Participating business that receives and responds to negotiation requests.

### Operations Manager
Manages workflows, quality, partner relationships and performance.

### Administrator
Controls users, businesses, cases, agreements, payments, disputes, categories, and platform configuration.

## 3. Core MVP Customer Features
- Request submission (email only — no password/account required to submit)
- Product/service/booking information
- URL and image/file attachment
- Target price
- Maximum budget
- Desired date/time
- Quantity
- Location
- Notes
- Category-specific request fields, dynamically rendered based on the selected category (see Section 6 and `22_CATEGORY_AND_BUSINESS_CMS.md`)
- **Tracking ticket issuance** on submission, tied to the customer's email
- **Magic-link dashboard access** — passwordless login scoped to a single negotiation case (see Section 6a)
- Request status
- Assigned Negotiator
- Secure messaging
- Questions/clarifications
- Offer presentation
- Accept/decline
- Request another negotiation round
- **Access expiry at case closure**, with a final one-time email summary in place of continued dashboard access (see Section 6a)
- **Optional persistent account** (email-based, no password) linking multiple tickets for customers who want ongoing history — never required for a single request
- Rating/feedback (delivered post-closure via email)

## 4. Core MVP Negotiator Features
- Case inbox
- Case assignment
- Customer profile
- Request details
- Internal notes
- Business lookup
- Partner relationship lookup
- Internal commercial agreement lookup
- Negotiation history
- Communication logging
- Offer management
- Counteroffer management
- Customer approval request
- Escalation
- Case closure
- Savings/value calculation
- Audit trail

## 5. Core MVP Business Features
- Business application
- Verification
- Business profile
- Products/services
- Negotiation contact
- Offer submission
- Counteroffer
- Request acceptance/rejection
- Offer expiry
- Communication
- Deal history
- Agreement records where appropriate
- Performance reporting

## 6. Admin Features
- User management
- Role management
- Business verification
- Partner management
- Commercial agreement management
- Negotiation case management
- Negotiator assignment
- Offer oversight
- Payment/fee management
- Dispute management
- Fraud/risk flags
- Audit logs
- Analytics
- Content management
- System configuration
- **Category management (CMS)**: create, edit, publish/unpublish, reorder, and archive business categories; define category-specific request fields, without requiring engineering involvement. Full detail in `22_CATEGORY_AND_BUSINESS_CMS.md`.
- **Business management (CMS)**: create, edit, publish/unpublish, and manage business records directly (independent of the partner-application intake path), assign categories, attach partner agreements, bulk import/export. Full detail in `22_CATEGORY_AND_BUSINESS_CMS.md`.

## 6a. Customer Access Model (Tracking Ticket)
The MVP customer access model replaces upfront account creation with a lightweight, ticket-based flow:

1. Customer submits a request with an email address — no password.
2. System issues a Negotiation Ticket and emails a magic link scoped to that case.
3. The magic link grants dashboard access for the life of the case.
4. When the case reaches a terminal status (Accepted, Declined, Expired, Cancelled, Closed — Section 7), the magic link and dashboard access are deactivated.
5. A final one-time email summary (deal record, transaction details, savings, business details, support channel) is sent at closure, since dashboard access is gone.
6. A customer may optionally create a persistent, email-based account (same passwordless pattern) to view multiple tickets together. This is never required.

Security requirements for this model (link expiry, single-use vs. reusable tokens, resend limits) are defined in `20_ENGINEERING_BIBLE.md` and `08_PLATFORM_ARCHITECTURE.md`.

## 7. Core Status Model
Request:
- Draft
- Submitted
- Under Review
- Assigned
- Negotiating
- Awaiting Business
- Awaiting Customer
- Offer Ready
- Accepted
- Declined
- Expired
- Cancelled
- Completed
- Disputed
- Closed

Accepted, Declined, Expired, Cancelled, and Closed are terminal statuses that trigger dashboard access closure per Section 6a.

## 8. Customer Experience Rule
The interface must not expose internal partner agreements, internal discount structures, internal margins, business minimums, or negotiation strategy. Only categories and businesses explicitly published (customer-visible) via the admin CMS are shown to customers; see `22_CATEGORY_AND_BUSINESS_CMS.md`, Section 9.

## 9. Offer Object
Every offer should contain:
- Original stated price/value
- Final proposed price
- Currency
- Included goods/services
- Additional benefits
- Conditions
- Valid-until timestamp
- Payment terms
- Delivery/fulfillment terms
- Business
- Offer status
- Negotiator
- Customer decision

## 10. MVP Non-Goals
Do not initially build:
- Autonomous AI negotiation
- Complex automated bidding
- Large public product catalog
- Fully automated business procurement
- Advanced dynamic pricing
- Broad international payment infrastructure
- Guaranteed savings
- Self-service category/business creation by businesses themselves (category and business creation remains admin-mediated; see `22_CATEGORY_AND_BUSINESS_CMS.md`, Section 3)
- Mandatory password-based account creation for customers (superseded by the ticket/magic-link model in Section 6a)

## 11. Acceptance Criteria
A customer must be able to submit a request in minutes, using only an email address.
A customer must receive a working magic link that opens their case dashboard without a password.
A Negotiator must be able to take ownership of a case.
A Negotiator must be able to contact a business and log responses.
A customer must receive a clear final offer.
Dashboard access must automatically close when a case reaches a terminal status, and a closure email summary must be sent at that point.
Every material action must be auditable.
An admin must be able to create a new category and have it appear in the customer request flow without a code deployment.
An admin must be able to create, edit, and publish a business record directly, independent of the partner-application intake path.
