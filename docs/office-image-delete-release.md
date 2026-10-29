# Office Dialogue image deletion — pending backend installation

Do not merge or deploy until the backend checks below pass.

Adds individual Delete buttons, selection and Delete selected, and Delete all images in group in the existing Office Dialogue gallery. The group message is preserved when attachments are removed. A confirmation explains permanent deletion. Cleanup uses the authenticated Storage API; it never deletes storage.objects via SQL. Shared references are retained, and failed storage cleanup can be retried even after the last group disappears.

## Database state

The office_image_cleanup_queue migration is installed. Its source is db/office-image-cleanup-queue.sql. Do not rerun that file on production. The cleanup queue is empty and no customer images were deleted during implementation.

The connector repeatedly returned `McpServerError: Invalid or expired requestState` when installing the detach function. db/office-image-delete-functions.sql has NOT been installed. Do not enable the controls until it is installed and tested.

## Required verification before release

- Install remaining functions using a working migration connection; confirm all three public RPCs exist.
- Test within rollback transactions: unauthenticated, inactive and unauthorized users denied; owner/staff permitted; wrong quote, wrong note and foreign URL rejected.
- Verify partial group deletion preserves remaining image order and updates legacy imageUrl/imageName. Verify last image deletion preserves a nonempty message.
- Verify shared proof, invoice, uploaded_files and other attachment references retain bytes.
- Review concurrency: all attachment writers must participate in the URL advisory lock and guard. Test attachment insert/update racing cleanup; extend guards to any newly identified attachment tables before release.
- Upload disposable test files through Storage API, detach/delete and verify bytes no longer download. Simulate failed storage removal, retry, verify cleanup status. Do not use real customer files as fixtures.
- Check authorized Storage SELECT/DELETE policies, Supabase security advisors, desktop/mobile preview and delete targets, then hosted build and production deployment.

No extra serverless endpoint or service key is introduced. The existing hosting function limit is preserved.
