# THE NEGOTIATOR — INTERNAL DATA DICTIONARY
Version: 1.1

## Customer
A person using The Negotiator to request negotiation services.

## Negotiator
An in-house professional representing a customer.

## Negotiation Case
The complete operational record for one customer request.

## Business
A seller/provider of products or services.

## Partner
A business participating in The Negotiator network.

## Partner Agreement
An internal commercial arrangement between The Negotiator and a business.

## Negotiation Request
Customer's initial request to negotiate a purchase, service or booking.

## Offer
A business's proposed commercial terms presented for customer consideration.

## Counteroffer
A revised proposed offer made during negotiation.

## Customer Authorization
The limits and instructions provided by the customer.

## Target Price
Customer's preferred price.

## Maximum Budget
Highest price customer has authorized, subject to terms.

## Reservation Point
The customer's walk-away threshold.

## BATNA
Best Alternative To a Negotiated Agreement.

## Customer Benefit
The measurable improvement obtained relative to a defensible reference point.

## Price Savings
Difference between a verified reference price and final price.

## Additional Value
Benefits beyond price reduction.

## Total Customer Benefit
Price savings plus defensible value of additional benefits.

## Deal
An accepted offer.

## Transaction
The financial or fulfillment event associated with a deal.

## Internal Commercial Intelligence
Confidential partner terms, business relationships, negotiation history, pricing information and strategy.

## Negotiator Notes
Private operational notes that should not be exposed to customers or businesses unless specifically authorized.

## Case Status
Current stage of a negotiation case.

## Offer Expiry
Timestamp after which the offer is no longer guaranteed.

## Tracking Ticket
The customer-facing reference issued at request submission, tied to the customer's email address, used to access the case dashboard via magic link without a password. One ticket corresponds to one Negotiation Case. See `02_PRODUCT_REQUIREMENTS.md`, Section 6a, and `08_PLATFORM_ARCHITECTURE.md`, Section 4.3.

## Access Token (Magic Link)
A time-limited, single-purpose credential emailed to the customer that grants dashboard access scoped to exactly one Tracking Ticket. Revoked automatically when the associated case reaches a terminal status.

## Terminal Status
A Case Status from which a negotiation case does not continue: Accepted, Declined, Expired, Cancelled, or Closed. Reaching a terminal status triggers Access Token revocation and the Closure Summary.

## Closure Summary
The final one-time email sent to the customer when a case reaches a terminal status, containing the deal record, transaction details, final value/savings, business details, and support channel — issued because dashboard access ends at this point.

## Customer Account (Persistent)
An optional, email-based, passwordless account a customer may create to link multiple Tracking Tickets together for ongoing history. Never required to submit or track a single request.
