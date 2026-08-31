# THE NEGOTIATOR — CATEGORY & BUSINESS CMS (ADMIN CONTENT MANAGEMENT)
Version: 1.0
Status: Proposed addition to foundation set
Extends: 02_PRODUCT_REQUIREMENTS.md, 05_BUSINESS_PARTNER_SYSTEM.md, 08_PLATFORM_ARCHITECTURE.md, 09_ADMIN_BUSINESS_CUSTOMER_PORTALS.md

## 1. Purpose
Give Administrators (and, where appropriate, Operations Managers) full ability to create, edit, and manage **business categories** and **businesses** directly from the Admin Portal — without engineering involvement.

Today, categories exist only as a static example list (05_BUSINESS_PARTNER_SYSTEM.md, Section 2) and businesses are only created through the partner application/verification flow. Neither is a managed, editable record set. This document defines the CMS layer that makes both fully admin-controlled.

## 2. Why This Matters
- Category expansion is explicitly called out as a growth lever (05, Section 2 and 14_GO_TO_MARKET.md, Section 10) but there is currently no way to add a category without a code change.
- Business onboarding volume will outpace what a single hardcoded flow can support once partner acquisition scales (14, Section 4).
- The Admin Portal spec (09) lists "Businesses" and "Partner agreements" as admin areas but does not currently define CRUD-level control over them.
- Without this, every new category or bulk business addition becomes an engineering ticket instead of an operational task.

## 3. Scope
### In scope
- Full CRUD (create, read, update, archive/delete) for **Business Categories**
- Full CRUD for **Business** records, independent of the public partner-application flow
- Assignment of one or more categories to a business
- Category-specific request fields
- Bulk import/export for businesses
- Admin-side publish/unpublish control (staging vs. customer-visible)

### Out of scope (for this addition)
- Self-service category/business creation by businesses themselves (still admin-mediated)
- Automated business discovery or scraping
- Any AI-assisted categorization (remains subject to the general AI-governance constraint in 08, Section 10)

## 4. Category Management

### 4.1 Category Record
Each category should store:
- Category ID
- Name
- Description
- Icon/image
- Parent category (optional — supports sub-categories, e.g., "Travel & Tours" > "Car Rentals")
- Display order
- Status: Draft / Active / Archived
- Customer-visible flag (a category can exist and hold businesses internally before it's exposed to customers)
- Created by / created date / last modified by / last modified date

### 4.2 Category-Specific Request Fields
Different categories need different request information (03_CUSTOMER_JOURNEY.md defines a generic request; this extends it per category). Examples:
- Hotels: check-in date, check-out date, number of guests, room type
- Car Rentals: pickup date, return date, vehicle type, pickup location
- Electronics: model/spec, quantity, condition preference
- Professional Services: scope description, timeline, deliverables

The CMS should let an admin define, per category, which optional fields appear on the customer request form, without a code change. Required base fields (from 02_PRODUCT_REQUIREMENTS.md, Section 3) remain constant across all categories.

### 4.3 Category Lifecycle
Draft → Active (customer-visible) → Archived (hidden, historical data retained)

An archived category should not delete existing negotiation cases or businesses tied to it — only prevent new requests against it.

### 4.4 Category Admin Actions
- Create category
- Edit category details and fields
- Reorder categories (display priority)
- Publish / unpublish (toggle customer visibility)
- Archive category
- View businesses and case volume per category

## 5. Business Management

### 5.1 Business Record (extends 08_PLATFORM_ARCHITECTURE.md, Section 4 — `Business` entity)
Each business should store:
- Business ID
- Legal/display name
- Description
- Logo/images
- One or more assigned categories
- Locations (one or more, where relevant)
- Contact(s) — name, role, phone, email
- Verification status (Prospect / Qualified / Verified / Active / Suspended / Terminated — per 05, Section 10)
- Linked partner agreement (references 06_PARTNER_AGREEMENT_FRAMEWORK.md record, where one exists)
- Relationship owner (internal staff member)
- Internal notes
- Performance summary (response rate, acceptance rate, disputes — per 05, Section 9)
- Customer-visible flag (a business can be onboarded and verified before being exposed to customer requests)
- Created by / created date / last modified by / last modified date

### 5.2 Business Admin Actions
- Create a business record directly (in addition to the existing partner-application intake path in 05, Section 3)
- Edit business profile and category assignments
- Change verification/lifecycle status, with audit logging (per 08, Section 6)
- Attach or update a partner agreement
- Publish / unpublish (toggle customer visibility independent of verification status, so a verified business can still be held back from launch)
- Suspend or terminate, with reason code and effective date
- Bulk import businesses via CSV/spreadsheet (name, category, contact, location, status)
- Bulk export for reporting or migration

### 5.3 Relationship to the Existing Partner Lifecycle
This CMS does not replace the partner acquisition and qualification process defined in 05_BUSINESS_PARTNER_SYSTEM.md — it gives admins a direct way to create, edit, and manage the resulting records at any stage, including businesses that were onboarded manually (phone, email, in-person) rather than through a self-serve application.

## 6. Data Model Additions
New/updated entities for 08_PLATFORM_ARCHITECTURE.md, Section 4:

| Entity | Notes |
|---|---|
| `Category` | New entity. Fields per Section 4.1 above. |
| `CategoryField` | New entity. Defines category-specific request form fields (field name, type, required flag, category ID). |
| `Business` | Existing entity, extended: add `categoryIds` (many-to-many via a join table), `customerVisible` flag, `publishStatus`. |
| `BusinessCategory` | New join table linking `Business` to `Category` (many-to-many). |

## 7. Admin Portal UI Additions (extends 09_ADMIN_BUSINESS_CUSTOMER_PORTALS.md)

### New Admin Portal section: "Categories & Businesses"
- **Categories tab**: list view, create/edit form, drag-to-reorder, publish toggle
- **Businesses tab**: list view (filterable by category, status, relationship owner), create/edit form, bulk import/export, publish toggle
- **Category detail view**: businesses in this category, case volume, request-field configuration
- **Business detail view**: profile, category assignments, agreement link, verification status control, performance summary, internal notes, audit trail

This sits alongside the existing Admin Portal core areas (Users, Customers, Negotiators, Businesses, Partner agreements, etc.) rather than replacing them — it upgrades "Businesses" and adds "Categories" from a list to a fully managed CMS.

## 8. Permissions
Per 20_ENGINEERING_BIBLE.md, Section 5 (roles) and least-privilege principle:
- **Admin / Super Admin**: full CRUD on categories and businesses
- **Operations Manager**: edit business records, cannot create/archive categories (TBD — validate during role design)
- **Business Partnerships**: edit assigned businesses, propose new categories for Admin approval (TBD)
- **Negotiator**: read-only access to category and business records needed for casework; no CMS access

## 9. Customer-Facing Impact
- New Request flow (03_CUSTOMER_JOURNEY.md, Section 2) should dynamically render category-specific fields defined in Section 4.2 above once a customer selects or is matched to a category.
- Customer-visible category and business lists must only show records where `customerVisible = true` and `publishStatus = Published` — internal onboarding activity stays invisible to customers until explicitly released, consistent with the data separation rule in 08, Section 5.

## 10. Roadmap Placement
This belongs in **Phase 2 — Platform MVP** (15_LAUNCH_ROADMAP.md), alongside the Admin Portal build-out, not Phase 1 (Concierge MVP), where category and business setup can remain a manual/internal process (spreadsheet or direct database entry) until the Admin Portal exists.

## 11. Open Decisions to Add to 21_OPEN_DECISIONS.md
- Whether category creation requires Admin approval or can be done by Operations/Partnerships directly
- Whether sub-categories are needed at launch or can be deferred
- Bulk import file format and validation rules
- Whether a business can belong to categories across multiple, unrelated verticals at once, and how that affects Negotiator routing
- Retention policy for archived categories and terminated businesses

## 12. Acceptance Criteria
- An admin can create a new category and have it appear as a selectable option in the customer request flow, without a code deployment.
- An admin can create, edit, and publish a business record directly, independent of the partner-application intake path.
- An admin can bulk-import a list of businesses and have them appear correctly categorized and attributed.
- Every category and business create/edit/status-change action is captured in the audit log per 08, Section 6.
- No unpublished category or business is visible to customers.
