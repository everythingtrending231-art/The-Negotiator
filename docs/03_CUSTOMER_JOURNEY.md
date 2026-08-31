# THE NEGOTIATOR — CUSTOMER JOURNEY
Version: 1.3

## Core Journey
**Want something → Ask The Negotiator → Human Negotiator works → Offer → Customer decides**

## 1. Discovery
Customer learns:
> “You don't have to negotiate yourself. We can negotiate it for you.”

## 2. Request
Primary CTA:
### NEGOTIATE THIS FOR ME

Request inputs:
- What are you trying to buy/book/get?
- Category (drives category-specific fields; see `22_CATEGORY_AND_BUSINESS_CMS.md`)
- Business or seller, if known
- Link/photo/quote
- Desired quantity
- Desired date
- Location
- Ideal price, if known
- Maximum budget, if known
- Important requirements
- Deadline
- Email address (required — this is the only identity input needed to submit; see Section 3, Tracking & Access Model)

No password or account setup is required to submit a request. Email is the single required identity field.

## 3. Submission Confirmation & Tracking Ticket
On submission, the customer receives:
> “We've received your negotiation request. A Negotiator will review it and get to work.”

Along with this, the customer is issued a **Negotiation Ticket** (see `19_INTERNAL_DATA_DICTIONARY.md`, Tracking Ticket) — a unique case reference tied to their email address.

Dashboard access works as follows:
- A **magic link** is emailed to the customer (no password to create or remember).
- Clicking the link opens the case dashboard, scoped to that one negotiation.
- The link/ticket remains valid for as long as the case is active.
- The customer can request the link be resent to the same email at any time while the case is active.

This replaces a traditional account-creation step with a lighter-weight, ticket-based access model, consistent with the product's goal of letting a customer submit a request in minutes (see `02_PRODUCT_REQUIREMENTS.md`, Section 11).

## 4. Assignment
Customer sees, via the ticket dashboard:
- Negotiation ID
- Assigned Negotiator
- Status
- Estimated next update window

## 5. Clarification
Negotiator asks only questions necessary to conduct the negotiation. Clarification requests are delivered by email (with a link back into the dashboard) as well as shown in-dashboard.

## 6. Negotiation
Customer receives meaningful updates, not unnecessary internal detail.

Example:
> “We're currently negotiating with the provider.”

> “We've received an offer and are working to improve it.”

Status updates are pushed by email and reflected in the dashboard for as long as the ticket remains active.

## 7. Offer
Offer presentation should clearly show:
- What the customer gets
- Final price
- What is included
- Conditions
- Expiration
- Savings/value where substantiated

## 8. Decision
Actions:
- Accept
- Decline
- Ask us to negotiate again
- Ask a question

## 9. Acceptance
Customer confirms acceptance.

If payment/booking is supported:
- Proceed to transaction flow.

If external fulfillment:
- Provide clear instructions and record the accepted offer.

## 10. Completion & Access Closure
Once a case reaches a terminal status (Accepted, Declined, Expired, Cancelled, or Closed — per `02_PRODUCT_REQUIREMENTS.md`, Section 7), the tracking ticket and dashboard access are closed.

At closure, the customer receives a **final one-time email summary** containing:
- Deal record
- Transaction details
- Final value/savings
- Business details
- Support channel for any follow-up

The dashboard link becomes inactive after closure. The customer should not be left without a record — the email summary is the durable artifact once dashboard access ends.

### 10.1 Post-Closure Record Retrieval
If a customer needs their record again after closure (e.g., months later, for tax, warranty, or dispute purposes), this is **not self-service**. The request is always handled by Customer Support, not automatically re-issued through the dashboard or a new magic link.

Process:
1. Customer contacts Support and asks for their closed case record.
2. Support verifies the customer's identity/ownership of the case (matching the case to the customer's email and any other verification Support requires).
3. Support confirms the customer's approval to release the record before sending it.
4. Support re-sends the closure summary (or equivalent record) directly to the customer, logged as a support action.

This keeps closed-case data access deliberate and auditable rather than reachable via a standing or re-issuable link. See `07_OPERATIONS_AND_ORG.md`, Section 6, for the Support-side SOP.

## 11. Optional Persistent Account
A ticket is sufficient for a single negotiation and requires no account. A customer who wants to track multiple negotiations, or view history across past deals, may optionally create a lightweight account (email-based, no password required — same magic-link pattern) that links their tickets together.

Creating this optional account is never required to submit a request or track an active case. Whether this is offered at request time, at closure, or only on return visits is an open decision — see `21_OPEN_DECISIONS.md`.

## 12. Feedback
Ask:
- Did The Negotiator save you money?
- Did The Negotiator improve the deal?
- How was your Negotiator?
- Would you use The Negotiator again?

Feedback requests are sent by email after case closure, since dashboard access has ended by this point.

## UX Principle
The customer should never feel responsible for conducting the negotiation themselves, and should never need to manage a password to track a single request.
