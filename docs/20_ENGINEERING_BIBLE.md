# THE NEGOTIATOR — ENGINEERING BIBLE
Version: 1.0

## 1. Engineering Goal
Build reliable software that enables professional human Negotiators to operate at scale.

## 2. Core Principles
- Human workflow first
- Security by default
- Auditability
- Clear domain boundaries
- Explicit permissions
- Minimal data exposure
- Mobile-responsive customer experience
- Operational speed for Negotiators
- Avoid premature automation

## 3. Proposed Technology
Frontend:
- Next.js
- React
- TypeScript
- Tailwind CSS
- Accessible component library

Backend:
- NestJS
- TypeScript
- REST API
- PostgreSQL
- Prisma

Infrastructure:
- Managed cloud deployment
- Object storage
- Background jobs
- Monitoring
- Error tracking
- Backups

## 4. Architecture
Suggested modules:
- Auth
- Users
- Customers
- Businesses
- Partners
- Agreements
- Negotiations
- Messages
- Offers
- Transactions
- Payments
- Notifications
- Documents
- Reviews
- Disputes
- Audit

## 5. Authorization
Roles:
- Customer
- Negotiator
- Senior Negotiator
- Partnership Manager
- Operations Manager
- Finance
- Admin
- Super Admin

Implement least privilege.

## 6. Internal Data Protection
Partner agreements and internal negotiation intelligence must never leak through customer-facing APIs.

## 7. API Design
Use:
- Versioning
- Validation
- Consistent error format
- Idempotency for financial operations
- Pagination
- Rate limits
- Authorization checks

## 8. File Uploads
Securely validate:
- MIME type
- File size
- Extension
- Malware risk
- Access permissions

## 9. Messaging
Messages should be:
- Case-scoped
- Timestamped
- Attributable
- Auditable
- Protected by role

## 10. Audit
Log:
- Login
- Role changes
- Case creation
- Assignment
- Offer creation
- Offer modification
- Acceptance
- Payment
- Refund
- Dispute
- Agreement changes
- Sensitive-data access

## 11. Testing
Minimum:
- Unit tests
- Integration tests
- API tests
- Permission tests
- Critical end-to-end tests

## 12. Deployment
Use:
- Development
- Staging
- Production

Never test unreviewed destructive operations against production data.

## 13. Disaster Recovery
Define:
- Backup frequency
- Retention
- Recovery Point Objective
- Recovery Time Objective
- Restore testing

Values are TBD.

## 14. Engineering Rule
Do not build a feature simply because it is technically interesting.
Every feature must support:
- Customer value
- Negotiator productivity
- Business participation
- Trust
- Revenue
- Scalability
