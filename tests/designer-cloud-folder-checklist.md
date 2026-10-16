# Designer packet folder regression checks

Use synthetic records in a test environment. Do not paste private tokens into reports.

- Packet A with an explicit Drive/Dropbox folder: button href equals only A's saved folder URL; opens in a new tab.
- Packet A with null, empty, or whitespace folder: no folder anchor and visible "No cloud folder linked".
- Packet A with a saved `/proof/<token>` for A or B: same missing-folder state. Repeat for `/designer/`, `/invoice/`, and `/upload-assets/` URLs.
- Admin folder entry rejects portal URLs before saving or emailing. Blank remains allowed; email uses the returned packet's folder field.
- Open A then B while A's packet request is delayed: A's response must not populate B's folder or packet link. A response with a mismatched quote ID must fail closed.
- Navigate between designer token routes with delayed responses: the older response must not overwrite the current packet.
- Designer tokens resolve only through `get_designer_packet_public`; proof tokens resolve only through the proof RPC. Cross-use must return invalid, never another record.
- Check the folder and missing-folder states at desktop and mobile widths, including keyboard access.

Automated URL checks: `node --test tests/designer-cloud-folder.test.mjs` (Node 24).
Build: `npm run build`.

This change requires no database migration or production record edits. Existing bad folder values are suppressed by the portal until an administrator supplies a real folder URL. External URL ownership and redirects cannot be inferred from the URL alone; verify the destination belongs to the current job when entering it.
