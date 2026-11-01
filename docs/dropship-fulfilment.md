# Dropship fulfilment architecture — development proposal

**Status: design only; no live ordering, payment or supplier API connection.**

## Commercial model
My Little Project is the retailer and customer support contact. An approved fulfilment supplier dispatches the **entire kit in one box** directly to the customer, potentially in plain or supplier-branded packaging. A component distributor is not eligible merely because it sells individual parts. Suppliers must be verified for complete-kit SKU, stock, UK shipping, product compliance, returns, customer-data handling and order integration.

## Customer experience
1. Product page: explain direct supplier dispatch and possible supplier packaging.
2. Checkout: select an eligible complete-kit offer and disclose the **actual selected supplier name**, shipping price and delivery estimate before the customer pays. No placeholder supplier names.
3. Confirm payment server-side using verified payment-provider events.
4. Create a single fulfilment order using an idempotency key. Lock the supplier and offer snapshot. Never change the fulfilment supplier after payment without customer agreement.
5. Submit to supplier only when the order is confirmed and eligible. On failure, hold for manual review; do not automatically switch supplier or submit twice.
6. Share dispatch and tracking notifications, with My Little Project handling customer service and statutory consumer obligations.

## Supplier selection
Only offers with approved supplier, approved complete-kit SKU, valid stock, supported delivery destination, confirmed delivery charge and sufficiently fresh price data may compete. Compare **landed cost** (kit + shipping + handling + applicable tax adjustments) against selling price and fees. Enforce minimum margin and delivery constraints; do not select solely on cheapest unit cost. When no eligible offer exists, do not take payment for an immediately fulfilled order.

## Data separation
- Master components and project BOM are independent of suppliers.
- Fulfilment suppliers and kit-level offers are private, not in the public /api/catalogue response.
- Fulfilment orders capture immutable supplier and cost snapshots, payment references and state.
- Payment webhook signatures, supplier API secrets, customer addresses and personal data need a separate security/privacy review.
- Never treat a successful browser redirect as proof of payment.
- Order states should include awaiting_payment, paid, queued, submitted, dispatched, delivered, exception, cancelled, refunded.
- Supplier API calls must use idempotency keys where supported, with reconciliation before retry if outcome is unknown.

## Release gates
Verify complete kit packaging, UK consumer rights, product safety/UKCA or CE where applicable, WEEE and battery shipping where relevant, insurance, supplier data processing, returns, real stock feeds, supplier ordering terms, webhook signature checks, concurrency and refund flow. Do not promote development Clerk credentials or prototype catalogue to production.
