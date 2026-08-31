# THE NEGOTIATOR — PORTAL SPECIFICATIONS
Version: 1.1

## CUSTOMER PORTAL

### Dashboard
- Active negotiations
- Recent offers
- Completed deals
- Notifications

### New Request
- What do you want?
- Business/seller
- Category (drives category-specific fields below)
- Link
- Upload
- Quantity
- Location
- Date
- Target
- Maximum
- Notes
- Category-specific fields, rendered dynamically based on selected category (see `22_CATEGORY_AND_BUSINESS_CMS.md`, Section 4.2)

### Negotiation Detail
- Request
- Negotiator
- Status
- Customer messages
- Updates
- Offers
- Decision buttons

### Offer
- Final price
- Original reference price where verified
- Included value
- Conditions
- Expiration
- Accept
- Decline
- Negotiate Again

## NEGOTIATOR PORTAL

### Dashboard
- New cases
- Assigned cases
- Awaiting business
- Awaiting customer
- Expiring offers
- Escalations

### Case Workspace
- Customer profile
- Request
- Authorization
- Research
- Internal partner information
- Internal notes
- Business communications
- Offers
- Counteroffers
- Customer communication
- Audit trail

### Internal Business View
- Business profile
- Category/categories
- Relationship owner
- Partner status
- Agreement information
- Negotiation history
- Contact records
- Performance

Negotiators have read-only access to category and business records; category and business management (create/edit/publish) is restricted to the Admin CMS — see Admin Portal, "Categories & Businesses" below.

## BUSINESS PORTAL

### Dashboard
- Requests
- Pending responses
- Active deals
- Completed deals
- Performance

### Request
- Customer requirements necessary for fulfillment
- Request details
- Offer response
- Counteroffer

Businesses should not see internal Negotiator notes or customer maximums unless explicitly authorized.

## ADMIN PORTAL

### Core Areas
- Users
- Customers
- Negotiators
- Businesses
- **Categories & Businesses (CMS)** — new section, detailed below
- Partner agreements
- Negotiation cases
- Offers
- Transactions
- Payments
- Disputes
- Reviews
- Reports
- Settings
- Audit logs

### Categories & Businesses (CMS)
Full detail in `22_CATEGORY_AND_BUSINESS_CMS.md`. Summary of the admin UI:

**Categories tab**
- List view of all categories (status, customer-visible flag, business count, case volume)
- Create/edit form: name, description, icon/image, parent category, display order, status
- Category-specific request field configuration (add/remove/reorder fields, set required/optional)
- Drag-to-reorder display priority
- Publish / unpublish toggle
- Archive

**Businesses tab**
- List view of all businesses (filterable by category, status, relationship owner, publish status)
- Create/edit form: profile, categories, locations, contacts, verification status
- Link to partner agreement
- Publish / unpublish toggle (independent of verification status)
- Suspend / terminate with reason code
- Bulk import (CSV/spreadsheet) and bulk export
- Internal notes and audit trail

This CMS section governs the same underlying `Category` and `Business` records referenced elsewhere in the Admin Portal (e.g., Negotiation Case management, Partner Agreement management) — it is the management interface for those records, not a separate data set.

## UX RULE
Every role sees only the information necessary to perform its job.
