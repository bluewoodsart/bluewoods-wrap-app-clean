---
name: bwb-lead-campaigns
description: Recover and organize BWB business leads from authorized mailboxes and public research into the shared backend, with separate food-truck, Christmas-window, and yearly campaign records. Use for seasonal reactivation, lead imports, and recording user-confirmed booking dates and prices.
---

# BWB lead campaigns

Use the existing protected Marketing > Email & Lead Research workspace as the shared home. Read [backend.md](references/backend.md) before imports or schema work. Reuse contacts across campaigns; preserve each season's evidence, notes, amounts, and outcome. Never reset old campaign rows to represent a new year.

## Choose the working view
Examples: all food-truck leads; Christmas Windows 2025 history; Christmas Windows 2026 bookings; related follow-ups. Resolve "last year" from the current user date. An old customer is a reactivation candidate, not automatically booked this season. Campaign populations are updated when requested; the skill is not a scheduled automation.

## Recover mailbox leads
Verify the connected mailbox with Gmail get_profile before each account pass. User-requested accounts include Blue Woods Art, A. Bussey, and Mural Painting Atlanta. Do not infer exact addresses from spoken names. A message to another account does not mean that mailbox was searched. Opening Gmail in a browser does not switch the connector.

Search both sent and received messages, including archived mail. Start with the requested season, then broaden date bounds and spelling variants when evidence is sparse. Examples: Christmas, Xmas, holiday, window/windows, painting, storefront, snow, Santa, quote, invoice, and known customer names. Read candidate conversations before extracting stage, date, price, or payment. Follow every pagination token for the chosen query or report the remaining cursor.

Save only relevant business contact and deal facts with mailbox, message/thread link, source date/year, research date, and an evidence summary. Exclude newsletters and unrelated personal material. Record mailbox/query coverage and unavailable accounts in the campaign playbook. No matches in one query is not proof of no customers.

## Identity and seasons
Match normalized email plus business/name and location context. Shared inboxes and different branches require review. Reuse a confirmed contact_id for repeat campaigns; source_id should be stable within a campaign so retries cannot duplicate imports. Preserve conflicting contacts for review. Do not overwrite user-entered notes, drafts, current dates, or current prices during research refreshes.

Separate historical quoted price, historical paid amount, current agreed price, and current deposit actually paid. Unknown amounts remain null, not zero. Historical scope/price options belong in historical_price_notes with dates and sources. Never put a historical quote into current agreed_price or interpret a requested deposit as paid. Mark scheduled only from a confirmed date supplied by the user or clear current-season agreement.

## Local discovery
For "closest", search around the user's origin before ranking the existing list. Include supplied map candidates and qualify manufacturers versus food operators or print shops. State the searched area and coverage. Store distance basis, source coordinates, and uncertainty; straight-line estimates are not road mileage or driving time. Never label one list's nearest record the nearest business in the whole market.

For Christmas windows, first recover prior customer relationships, then identify additional local storefronts with observable window frontage and an appropriate business contact. A plausible storefront is a candidate, not confirmed demand. Ask about scope rather than inventing quotes or availability.

## Operate and report
Record user-supplied bookings as customer/name, campaign/year, date, agreed price, and deposit paid when known. Saving a lead date does not create a calendar event. Summarize counts by campaign and clearly separate found, contacted, responded, quoted, scheduled, and completed. Existing sent mail can establish contacted; a draft cannot.

Keep mailbox-derived records in the protected database, never the public repository or frontend bundle. Research and saving do not authorize outreach. Draft messages when requested, and send only with explicit authorization for the actual message and recipient. Use Chrome when a browser is needed and available.

