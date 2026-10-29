# Office Dialogue image deletion

Individual Delete, selection with Delete selected, and Delete all images in group are available in the Office Dialogue gallery. Written messages remain when images are removed. Staff confirm permanent deletion; shared files are retained. Storage failures can be retried even when the group has disappeared.

## Installed database changes
The queue, deletion functions, storage deletion lock, and pending-only retry query are installed. The SQL files in db record these migrations; do not rerun CREATE statements on the production database.

## Verification
Hosted preview build passed. Rollback fixture tests passed for anonymous/unauthorized denial, mismatched quote and foreign-image rejection, partial deletion and legacy image fields, missing-object cleanup, message preservation, external URLs, empty group removal, shared-reference retention, scoped Storage authorization, and attachment guard rejection during deletion. No customer images were deleted. Cleanup queue was verified empty after tests.

Browser verification was unavailable because the browser runtime failed to initialize. An actual disposable-file Storage API deletion and mobile tapping have not been exercised; SQL authorization and state transitions were verified. UI uses the existing authenticated Supabase SDK to remove storage bytes, then checks database object existence rather than trusting the client response.

The optional preservation of customer_files metadata IDs referenced by designer packets was not installed after connector failures. Existing FK behavior sets that ID null; the packet file URL remains and shared-reference scanning prevents storage deletion.
