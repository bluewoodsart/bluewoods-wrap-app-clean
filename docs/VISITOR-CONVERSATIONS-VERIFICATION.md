# Verification — October 24, 2026

Story: visitor explains their purpose → server validates and saves an exchange →
explicit follow-up creates one CRM inquiry → Admin Marketing shows that inquiry's
status and rep assignment within the authorized site.

## Passed

- `npm run test:conversations`: 12 tests, including HTTP method/payload handling,
  server-derived site identity, secret hashing, disabled intake, rate-limit errors,
  anonymous browsing without CRM insertion, same-request retries, wrong session
  token and cross-site denial, scoped staff access, CRM creation and outcome access,
  transactional failure rollback, expired-record denial and cleanup.
- PostgreSQL behavior runs in PGlite against a minimal existing-schema fixture.
  The migration itself is executed, not simulated as string assertions.
- `npm run build`: production bundle succeeds.
- Targeted ESLint for new API, validation and React components: passes.
- Targeted TypeScript compilation for API and shared server validation: passes.
- Headless installed Edge at 390×844: `/start` renders, no horizontal overflow or
  uncaught page errors, failed submission retains text, retry uses the same request
  ID, follow-up captures explicit contact request, UTM source reaches request body.
  Browser API responses were mocked; this is not a deployed end-to-end result.
- Read-only inspection of the live BWB schema confirmed `quote_requests` fields,
  constraints and existing RLS conventions. No live schema/data writes performed.
- `git diff --check`: passes.

## Remaining release verification

- Apply migration in a preview/test database with the real surrounding schema,
  configure the server credentials and site origin, schedule retention cleanup,
  then verify browser → actual API → actual database → authenticated Admin.
- Test CRM assignment and status changes through the existing authenticated UI.
- Test staff and partner isolation against real accounts before adding partner sites.
- Full-project `tsc --noEmit -p tsconfig.app.json` is not clean: errors remain in
  LogoUpload, MergedVehicleStep, StaffFeed, StorageBucketAPI, AdminStatus,
  LoginPlaceholder and RepPortal. These locations concern pre-existing customer
  types, event types and RPC typing, outside the conversation change. The new
  Vite ambient types fix the previously missing `ImportMeta.env` declaration.
- Existing build warning: outdated Browserslist data. No unrelated dependency update.

The live website has not been changed. Intake and the homepage invitation default
to disabled. The assistant is a deterministic guide, not a deployed AI model.
