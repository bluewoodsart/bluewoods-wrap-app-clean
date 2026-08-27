# Customer Information Editing

## Purpose

Allow authorized Blue Woods Brands staff to correct customer identity and contact information from an existing quote or project record without rebuilding the quote or changing unrelated operational data.

## Atomic scope

This module edits only:

- Customer name
- Company name
- Email address
- Phone number
- Preferred contact method

It does not change the quote number, product, assigned representative, price, payment status, proof status, uploads, vehicle information, production status, or approval state.

## Data rules

- Store the person's actual name in `customer_name`.
- Store relationship context, such as “Alonzo's sister,” in an internal note rather than combining it with the customer's name.
- Company is optional and remains normalized in `quote_data.companyName` for compatibility with existing quote flows.
- Keep matching `customer_files` contact fields synchronized with the quote request.
- Every actual change creates a `customer_information_updated` audit event.

## Authorization

Only authenticated active users with the `owner_admin` or `staff` role may save changes. Sales representatives and public users remain read-only.

## Interface behavior

1. Display the existing customer details normally.
2. Show **Edit Customer** only to authorized users.
3. Open an inline editor for the five supported fields.
4. Require explicit **Save Customer** or **Cancel**.
5. Validate required fields before saving.
6. Update the visible quote record immediately after a successful save.
7. Preserve all unrelated quote information and controls.

## Backend behavior

Use `update_quote_customer_information_admin(...)` rather than direct browser table updates. The RPC:

- Rechecks the active admin role on the server.
- Validates field lengths and preferred-contact values.
- Locks the quote row during the update.
- Synchronizes matching customer-file contact data.
- Records which fields changed and who made the correction.
- Is executable by `authenticated` users only; the role check still limits actual use to owner/staff admins.

## Test checklist

- Owner admin can open and cancel the editor without changing data.
- Owner admin can save a corrected customer name.
- Company can be added, changed, or cleared.
- Email, phone, and preferred contact update correctly.
- The quote number and all operational fields remain unchanged.
- The quote list and open modal show the saved values immediately.
- A `customer_information_updated` event appears after a real change.
- Linked customer-file contact data remains synchronized.
- Sales-rep and public sessions cannot execute the RPC.
- Desktop and mobile layouts remain usable.
