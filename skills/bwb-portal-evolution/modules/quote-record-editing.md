# CRM Quote Record Editing

## Purpose

Allow authorized Blue Woods Brands staff to open an existing quote inside the CRM, correct the saved customer or quote information, and save those changes back to the **same CRM record**.

This is not a separate customer editor and it must not create a replacement quote.

## Required user flow

```text
Open Quote
    ↓
Edit Quote
    ↓
Existing customer and quote fields become editable
    ↓
Save Quote Changes
    ↓
The same quote_requests record is updated
    ↓
CRM list, detail view, rep/admin views, and audit timeline reflect the change
```

## Editable scope

### Customer information

- Customer name
- Company
- Email
- Phone
- Preferred contact method

### Vehicle-wrap quote information

- Vehicle type
- Year
- Make
- Model
- Manual vehicle description
- Service requested
- Budget
- Artwork status
- Project notes

### Banner quote information

- Width, height, and unit
- Quantity
- Indoor/outdoor use
- Sides
- Grommets
- Hemmed edges
- Pole pockets
- Material preference
- Design needed
- Deadline
- Delivery method
- Banner text
- Brand colors
- Placement notes
- AI/design prompt
- Notes

### Signage quote information

- Material
- Width, height, and unit
- Quantity
- Sign text
- Notes

### Sticker/decal quote information

- Decal type
- Material
- Width, height, and unit
- Quantity
- Application surface
- Finish
- Decal text
- Notes

## Immutable or separately controlled data

Editing a quote does not automatically change:

- Quote/order number
- Product type
- Assigned representative
- Status
- Proof approval
- Production release
- Payment records or payment links
- Uploaded files
- Designer packets
- Follow-up tasks
- Internal dialogue
- Customer proof token

Those remain separate CRM actions with their own permissions and safeguards.

## Data behavior

- Update the existing `quote_requests` row by ID.
- Preserve unknown or future `quote_data` keys instead of replacing the JSON with a reduced object.
- Keep `quoteId`, `productType`, and `companyName` canonical in `quote_data`.
- Keep matching `customer_files` contact fields synchronized.
- Refresh the open detail record and CRM list immediately after save.
- Write a `quote_record_updated` event listing the sections that changed.
- Do not resend the original quote-submission emails when an admin corrects a record.

## Authorization

- Owner admin: may edit.
- Staff: may edit.
- Sales rep: read-only unless a future, separately approved rep-editing workflow is added.
- Public/customer sessions: may not execute the editing RPC.

Authorization must be enforced in both the interface and the database RPC.

## Interface rules

- Use one visible **Edit Quote** action inside the open quote.
- Prefill every field from the current CRM record.
- Clearly state that saving updates the same record and does not create another quote.
- Require explicit **Save Quote Changes** or **Cancel**.
- Keep the normal read-only summary visible when the editor is closed.
- Show success and error states without closing the quote modal.
- Preserve desktop and mobile usability.

## Acceptance checklist

- [ ] An authorized user can open a quote and enter edit mode.
- [ ] Existing data is prefilled.
- [ ] Customer fields save to the same record.
- [ ] Product-specific quote fields save to the same record.
- [ ] The quote ID does not change.
- [ ] The product type does not change.
- [ ] Unknown `quote_data` fields remain intact.
- [ ] The CRM list and open detail view update immediately.
- [ ] Linked customer-file contact data stays synchronized.
- [ ] An audit event is written after a real change.
- [ ] Original submission emails are not resent.
- [ ] Anonymous users cannot execute the RPC.
- [ ] Existing proof, payment, upload, status, and production workflows still work.
