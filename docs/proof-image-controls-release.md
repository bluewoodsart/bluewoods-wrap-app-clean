# Proof and office image controls — release checklist

This branch is a draft and must not be deployed without validation.

- Customer full-screen zoom, fit reset and original-image link.
- Office image preview uses Radix Dialog instead of a raw overlay outside the parent modal.
- Explicit upload-customer-proofs action and add-existing-images-to-proof controls.
- Per-image and per-message bulk deletion with explicit permanent-file warning.
- Cleanup queue keeps failed file removal retryable; deleting a database reference is not reported as deleting a storage object.
- Files referenced elsewhere (including historical proofs, file indexes, and quote uploads) are conservatively retained.
- Existing office messages remain as history when their attachments are removed.

## Deployment prerequisites

1. Run the build and API TypeScript checks. Local execution was unavailable when this draft was created.
2. Apply db/office-image-cleanup.sql to a test database, verify role restrictions and rollback/error paths, then generate a migration through the Supabase CLI before production installation.
3. Configure SUPABASE_SERVICE_ROLE_KEY server-side only. The endpoint also needs the existing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
4. Test on iOS Safari and Android Chrome: nested preview closes with X/Close, returns focus to the order, does not navigate back, and supports screen-reader navigation.
5. Test one and multiple deletion, mixed protected/unreferenced files, invalid/foreign note IDs, non-staff accounts, missing secrets, storage failure and retry.
6. Resolve concurrent-reference creation before production storage cleanup: the current conservative reference scan and Storage delete are separate operations. Test/serialize proof promotion and cleanup across staff sessions so no new proof can reference a file being deleted.
7. Confirm file-index retention behavior with the owner: an indexed file is treated as in use even when it is absent from the visible office message. Do not remove historical/index references blindly to force a storage deletion.
8. Verify that add-to-proof retries do not duplicate successful images, including partial failures, multi-mode orders, missing proof tokens and concurrent staff operations.

No storage files have been deleted by this work. Nika's three current designs were added to the live proof set separately at the owner's request; the old bright-pink proof remains inactive.
