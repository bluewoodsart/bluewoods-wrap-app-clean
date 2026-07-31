# BWB Staff Social — Agent Workstream

## Purpose

This file is the working brief for the agent responsible only for the BWB F.A.T.E. Staff Social system. Use it to start a dedicated Codex task without loading the quote, pricing, proof, or rep-portal workstreams into that task.

The social system is a private staff feed shared by the main admin portal and rep portals. Owner Admin can review all conversations. Other users see posts addressed to everyone, their friends, themselves, or specifically to them.

## Start Every Social Task With This Context

> Work only on the BWB F.A.T.E. Staff Social workstream described in `SOCIAL_AGENT.md`. Preserve existing quote, rep portal, proof, pricing, and public landing behavior. Inspect the current implementation before editing. Keep desktop, Android, and iPhone behavior aligned. Do not deploy unless the user asks or has given deployment permission for the session.

## Current User Experience

- Every staff member has a social homepage with an editable wide header, accent color, introduction, and their own post history.
- Staff post from My Social Home, then the post enters the shared Live Team Feed under the selected audience rules.
- Staff can create a post with text, an optional web link, and one image or video.
- Desktop users can paste a screenshot into the post field with Ctrl+V.
- Phone users can upload or capture a photo or video.
- Videos play inline with controls in the feed. The first model accepts MP4, WEBM, and MOV up to 50 MB.
- Links may begin with `www.`, `http://`, or `https://`.
- Audience options are Everyone on the Team, All My Friends, Specific People, and Only Me.
- Owner Admin controls friend connections and can see the full feed.
- Staff can Like, Love, Dislike, and comment.
- Email notifications are sent for new posts, comments, and reactions.
- The Share control is currently a disabled placeholder labeled “Share soon.”
- The feed loads 10 posts initially and can load 10 older posts at a time.
- A niche-based Customer Idea Library lets staff choose a real customer, select an industry idea, generate a working QR preview, attach a logo/reference, and save the opportunity to the customer’s job. Sharing to Staff Feed is a secondary option.

## Known Issue — Large Screenshots

The current browser code rejects images larger than 10 MB and shows:

> The screenshot must be smaller than 10 MB.

This is not a Supabase outage. It is a client-side size check in `src/components/StaffFeed.tsx`. It can affect high-resolution PNG screenshots and modern phone photos.

Recommended fix for the social agent:

1. Automatically resize and compress PNG/JPEG/WEBP images in the browser before upload.
2. Preserve GIF files without canvas conversion so animation is not destroyed.
3. Target a maximum long edge of approximately 2400 pixels and an upload size below 8 MB.
4. Prefer WebP or JPEG output for photographic images; preserve PNG when transparency is important.
5. Show “Optimizing image…” while processing.
6. If optimization still cannot reduce the file below the limit, show a clear actionable message.
7. Test pasted screenshots, file uploads, and phone camera photos on iPhone Safari and Android Chrome.

Do not solve this by only increasing the browser limit. Supabase Storage and mobile upload reliability still require sensible file sizes.

## Primary Files Owned by This Workstream

- `src/components/StaffFeed.tsx` — feed UI, uploads, audience selection, reactions, comments, and pagination.
- `supabase-staff-social-feed.sql` — tables, policies, storage bucket rules, and feed RPC functions.
- `api/send-staff-feed-notification.ts` — email notifications for posts, comments, and reactions.
- `public/staff-feed/bwb-fate-staff-social.png` — BWB F.A.T.E. social banner.

## Shared Integration Files — Edit Carefully

- `src/pages/Admin.tsx` — mounts the Staff Feed tab in Main Admin.
- `src/pages/RepPortal.tsx` — mounts the Staff Feed in rep portals.
- `src/App.tsx` — global routes and providers.
- `src/lib/supabase.ts` — shared Supabase client.

Changes to shared integration files can collide with the Rep Agent, Pricing Agent, or Admin Agent. Keep edits small and coordinate before changing navigation, authentication, or shared page layout.

## Data and Security Rules

- Never place Supabase service-role keys or Resend secrets in frontend code.
- Keep audience enforcement in database RPCs and row-level security, not only in React.
- Owner Admin may see all posts and comments.
- Non-owner users may only receive content allowed by the audience rules.
- A reaction must be unique per user and post.
- Users must not be able to impersonate another author.
- Attachment paths must remain private and use short-lived signed URLs.
- Never expose one user’s private attachment to a user outside the post audience.
- Email notification recipients must follow the same audience rules as the feed.

## Current Supabase Interface

The frontend currently calls these RPCs:

- `get_staff_feed_bootstrap_v1`
- `get_staff_feed_posts_v1`
- `create_staff_feed_post_v1`
- `set_staff_feed_reaction_v1`
- `add_staff_feed_comment_v1`
- `set_staff_friendship_admin_v1`
- `get_staff_social_profile_v1`
- `update_staff_social_profile_v1`

The attachment bucket is:

- `staff-feed`

Before changing an RPC signature, update the SQL and every frontend caller together. Database changes require explicit user approval unless approval has already been granted for the current session.

## Workstream Boundaries

The Social Agent may change:

- Posts, comments, reactions, sharing, friends, audiences, notifications, attachments, social layout, social accessibility, and social mobile behavior.

The Social Agent should not independently change:

- Quote creation or quote continuation.
- Pricing Sandbox calculations.
- Lead assignment and quote status rules.
- Customer proof portals.
- Rep authentication or public rep landing pages.
- Production database structures unrelated to Staff Social.

If a requested social feature needs one of those areas, document the dependency and coordinate with the agent that owns it.

## Product Backlog

### Priority 0 — Reliability

- Automatically optimize screenshots and phone photos larger than 10 MB.
- Upgrade videos larger than 6 MB to resumable uploads before raising the current 50 MB model limit.
- Add video thumbnails or transcoding only if real usage shows raw phone video is too slow across browsers.
- Add upload progress and retry behavior.
- Prevent duplicate posts caused by repeated taps on mobile.
- Confirm notifications do not email the person who performed the action.
- Confirm signed image URLs refresh after expiration.

### Priority 1 — Core Social

- Add centrally managed library templates so Owner Admin can create, edit, publish, and retire customer-growth ideas without a code deployment.
- Add a people directory so staff can open another teammate's social homepage from the live feed.
- Add admin controls for a default header, profile completeness, and inappropriate-media removal.
- Add finished presentation/mockup generation using the customer’s logo and chosen library template.
- Implement Share to another staff member or audience.
- Add unread notification counts inside the portals.
- Add a notification center with direct links to the post or comment.
- Allow more than one image per post.
- Add post editing and deletion with proper permissions.

### Priority 2 — Organization

- Add mentions such as `@Trapstar Customs LG`.
- Add pinned posts and announcements.
- Add search and filters by person, date, and post type.
- Add direct or small-group conversations if approved as a separate feature.

## Definition of Done

A social change is complete only when:

1. The focused lint check passes for every changed TypeScript/TSX file.
2. `npm.cmd run build` passes.
3. The feature works in Main Admin and a rep portal where applicable.
4. Audience privacy is verified with at least an Owner Admin and one Sales Rep account.
5. Desktop Chrome, Android Chrome, and iPhone Safari interactions are checked for touch size, scrolling, keyboard behavior, and image upload.
6. No quote, pricing, proof, or rep navigation behavior changes unexpectedly.
7. Any SQL migration is saved in the repository and the applied production state is recorded.
8. If deployed, the production deployment ID and verification result are recorded in the task handoff.

## Voice-enabled field rule

All meaningful free-form writing fields added to Staff Social should use the shared microphone control described in `VOICE_INPUT_STANDARD.md`. This includes post composers, comments, replies, and future message fields. Normal typing remains available, microphone use is always user-initiated, and sensitive or structured fields are excluded.

## Recommended Agent Separation

- **Social Agent:** this file and the social files listed above.
- **Rep Agent:** rep portal, assigned work, rep actions, and rep mobile behavior.
- **Pricing Agent:** Pricing Sandbox, pricing rules, estimates, and quote math.
- **Admin/Jobs Agent:** Main Admin job list, job detail, assignment, and statuses.
- **Proof Agent:** proofs, approvals, revisions, deposits, and customer proof portal.
- **Public Pages Agent:** branded landing pages and public intake experience.

Use separate Codex tasks or Git worktrees when two agents may edit shared files at the same time. Do not let two agents deploy overlapping changes without first reconciling and testing the combined build.

## Social Task Handoff Template

At the end of a social task, report:

- User-facing change:
- Files changed:
- Database changes:
- Tests completed:
- Mobile checks:
- Deployment ID and URL:
- Remaining risks or next action:
