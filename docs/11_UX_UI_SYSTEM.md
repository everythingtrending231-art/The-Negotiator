# THE NEGOTIATOR — UX/UI SYSTEM
Version: 1.2

## 1. UX North Star
The customer should be able to ask:
> “Can you negotiate this for me?”
with minimal friction.

## 2. Primary CTA
### NEGOTIATE THIS FOR ME

Secondary:
- View negotiation
- Ask a question
- Negotiate again
- Accept offer
- Decline

## 3. Customer Information Architecture
- Home
- New Negotiation
- My Negotiation (ticket-scoped dashboard, accessed via magic link — see Section 6a)
- Offers
- Messages
- Deals
- Optional Profile (only exists if the customer has created a persistent account — see Section 6b)
- Help

## 4. Negotiator Information Architecture
- Work Queue
- My Cases
- Escalations
- Businesses
- Partner Agreements
- Reports
- Messages
- Profile

## 5. Business Information Architecture
- Requests
- Offers
- Deals
- Business Profile
- Products/Services
- Relationship
- Reports
- Settings

## 6. Customer Request UI
Keep required fields minimal.
Required:
- What do you want?
- How can we identify it?
- Email address (this is the only identity input required to submit — see Section 6a)

Optional:
- Category (drives category-specific fields, see `22_CATEGORY_AND_BUSINESS_CMS.md`)
- Target
- Maximum
- Date
- Quantity
- Notes

No password field appears anywhere in the request flow.

## 6a. Ticket-Based Access UI
Since customers do not create a password-based account to submit a request, the UI must support a magic-link access pattern:

- **Post-submission screen**: confirms the request was received and states that a tracking link has been emailed — this screen is not itself the dashboard.
- **Magic-link landing**: clicking the emailed link opens directly into the case dashboard for that ticket; no login form.
- **Resend link**: a simple “email me my tracking link” affordance, in case the original email is lost, available for as long as the case is active.
- **Expired-link state**: if a customer clicks a link after the case has closed, the UI should explain clearly that the case is closed, point to the closure email summary already sent, and offer a support contact — never a raw “invalid link” error.
- **Status language stays human** (see Section 7) even in access-related messaging — e.g. “This negotiation has been completed. We've emailed you the details,” not “Token expired.”

## 6b. Optional Persistent Account UI
A customer may optionally link multiple tickets to one email-based account (same passwordless, magic-link pattern — no new mechanism to design). Where this option is surfaced (at submission, at closure, or on a later visit) is an open decision — see `21_OPEN_DECISIONS.md`, Customer Access & Tracking. Until resolved, design should treat this as additive and skippable, never a blocker to submitting or tracking a single request.

## 7. Status Language
Use human language:
- Received
- Reviewing
- Your Negotiator is working on it
- Waiting for the business
- We have an offer
- Final offer ready
- Completed — you'll find the details in your email

Avoid technical statuses in the customer UI, including around access (see Section 6a, Expired-link state).

## 8. Offer Design
Hierarchy:
1. Final offer
2. What is included
3. Customer benefit
4. Conditions
5. Expiration
6. Business
7. Decision

## 9. Internal UX
Negotiators need information density and speed.
Prioritize:
- Split-view case workspace
- Timeline
- Business contact panel
- Internal notes
- Offer builder
- Customer communication
- Audit trail

## 10. Accessibility
Target WCAG 2.2 AA where practical.
Requirements:
- Keyboard support
- Adequate contrast
- Clear focus states
- Semantic labels
- Error explanations (including expired/closed ticket states, per Section 6a)
- Screen-reader support
- Responsive layouts

## 11. Design Principle
The customer-facing product should feel simpler than the internal operating system.
Complexity belongs behind the scenes — including the mechanics of ticket issuance, magic-link tokens, and access expiry, none of which the customer should need to think about.
