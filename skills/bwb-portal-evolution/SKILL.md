---
name: bwb-portal-evolution
description: Use this skill when modernizing Blue Woods Brands, SlapWrapz, rep, customer, production, or client portals into the approved Compassion-style portal system. Preserve every working route and workflow, reuse what already exists, and implement exactly one approved change at a time.
---

# BWB Portal Evolution

Use this skill to move the BWB ecosystem toward one coherent portal system without rebuilding or destabilizing the portals that already work.

The approved first-generation visual and structural reference is the Compassion Ministries backend proof:

- public proof route: `/compassion-backend-proof`
- protected BWB client workspace: `/admin?tab=clients`
- primary reference component: `src/components/admin/CompassionMinistriesWorkspace.tsx`
- public proof wrapper: `src/pages/CompassionBackendProof.tsx`

Treat this implementation as the **structural north star**, not as a template whose client-specific colors, wording, or data must be copied everywhere.

## Core Direction

BWB portals should feel like parts of one system:

- a clear branded header or command-center band;
- a stable workspace navigation area;
- modular white cards on a calm neutral background;
- visible status pills and current priorities;
- direct links between front end, backend, reports, proofs, tasks, and approvals;
- responsive behavior that works on desktop and mobile;
- explicit separation between public proofs and protected operational data.

Each portal keeps its own brand identity, purpose, permissions, content, and workflows. The shared direction is the **layout system, clarity, hierarchy, and interaction pattern**.

## Non-Negotiable Rules

1. **Make one change at a time.**
   A change is one visual adjustment, one workflow adjustment, one route adjustment, or one data connection. Do not combine unrelated work into the same pass.

2. **Preserve working behavior.**
   Do not remove, rename, replace, or rewrite working routes, forms, database calls, proof flows, approvals, uploads, emails, authentication, or production tools unless the user explicitly approves that exact change.

3. **Reuse before rebuilding.**
   Inspect the current portal and reuse its components, state, routes, data, assets, and safeguards. Adapt the shell around the working system instead of creating a competing portal.

4. **Do not perform a broad redesign from a general preference.**
   When the user says a portal should “go in this direction,” establish the migration plan, then implement only the first approved atomic change.

5. **Keep real backend data protected.**
   A public proof may use safe demonstration data and browser-local draft controls. Never expose authenticated records, customer data, donor data, admin RPCs, private files, tokens, or production controls in a public route.

6. **Approval is not production release.**
   A user-approved visual concept is separate from database migration, public publishing, payment activation, email activation, or production-ready status.

7. **Keep rollback simple.**
   Every implementation pass must be isolated enough to revert without undoing unrelated portal work.

## What Counts as One Change

Valid single changes:

- add the approved command-center header to one portal;
- convert one portal’s navigation into the shared sidebar pattern;
- restyle one existing status area into reusable status cards;
- add one public-safe proof route;
- connect one approved YouTube field to one story-video display;
- extract one proven card or navigation component for reuse;
- repair one mobile navigation defect.

Changes that must be separated:

- redesign the sidebar **and** connect a database;
- rebuild the dashboard **and** change authentication;
- restyle every portal in one deployment;
- replace current quote logic while changing the visual shell;
- publish a public proof while exposing live admin records;
- migrate routes, permissions, and data in the same pass.

When a request contains multiple changes, create a queue and execute only the first approved item.

## Required Intake Before Editing

For the target portal, identify:

- portal name;
- current route or public URL;
- protected or public status;
- primary source files;
- existing users and roles;
- current working workflows;
- existing integrations;
- exact single requested change;
- elements explicitly out of scope;
- proof or approval method;
- rollback point.

Use this change ticket:

```text
Portal:
Route:
Portal type:
Current behavior to preserve:
Single change for this pass:
Files expected to change:
Acceptance check:
Explicitly out of scope:
Rollback point:
Next queued change:
```

Do not begin a broad migration without filling this ticket from the repo and the user’s latest direction.

## Portal Types

### 1. BWB Master Admin

Purpose: central control for Blue Woods Brands.

Preserve and organize existing capabilities such as:

- staff activity;
- quote requests;
- reps;
- production;
- pricing;
- approvals;
- clients;
- shared products, automations, and proofs.

The preferred direction is a command-center shell with clear separation between **BWB Operations** and **Client Workspaces**. Do not remove existing admin functions while improving the shell.

### 2. Client Backend Workspace

Purpose: one organized administrative home for a client.

Preferred structure:

- branded client header;
- front-end and report actions;
- workspace navigation;
- dashboard;
- reports or audits;
- marketing;
- operational modules;
- tasks and approvals;
- files and settings.

The Compassion Ministries workspace is the first approved reference for this type.

### 3. Rep Portal

Purpose: help a rep sell, track, follow up, submit ideas, review approvals, and understand earnings.

Keep rep-specific workflows intact. Apply the shared system only where it improves hierarchy, navigation, status visibility, and mobile usability.

### 4. Customer Quote, Proof, Invoice, or Upload Portal

Purpose: complete one customer task with minimal friction.

Do not overload customer-facing portals with the full backend workspace layout. Reuse the shared visual language, but keep customer flows simple, focused, and task-specific.

### 5. Production Portal

Purpose: move approved work into production safely.

Production readiness, artwork approval, print files, measurements, assets, and job status must remain separate from concept approval.

### 6. Public Proof

Purpose: allow remote review without login.

Public proofs must:

- clearly state that they are proofs;
- use demonstration or intentionally public content only;
- avoid protected database access;
- avoid real administrative actions;
- explain whether controls are browser-local demonstrations;
- link to the corresponding front end when useful.

## Shared Portal Anatomy

Use this anatomy when appropriate for the portal type:

### Proof or Environment Banner

A compact top notice communicates one of the following:

- public proof;
- preview environment;
- protected admin;
- production environment;
- demo controls only.

### Command-Center Header

Include:

- portal or client identity;
- short purpose statement;
- environment or generation badge;
- one or two primary actions;
- clear brand treatment.

Avoid filling the header with many secondary controls.

### Workspace Navigation

Desktop:

- stable left navigation for complex backends;
- active state with strong contrast;
- icon plus clear label;
- grouped sections when the list becomes long.

Mobile:

- horizontal scroll, drawer, or compact expandable navigation;
- no clipped labels;
- touch targets of at least 44 pixels;
- primary actions remain visible.

### Main Content Surface

Use:

- a clear section eyebrow;
- one page title;
- one concise explanation;
- a restrained action area;
- modular cards below.

### Status Cards

Status cards should answer:

- what is this area;
- what is its current state;
- what needs to happen next;
- who owns the next action when known.

Use consistent status language such as:

- Live
- In Progress
- Waiting
- Needs Review
- Not Connected
- Planned
- Complete
- Approved
- Production Ready

Do not describe a design proof as connected, submitted, paid, or production ready when it is not.

### Priority Queue

Show a small number of immediate tasks. Link to the complete task area instead of placing every task on the dashboard.

### Audit and Activity Areas

Where relevant, display:

- audit progress;
- unresolved findings;
- completed work;
- recent approvals;
- recent portal activity.

## Visual System

The Compassion proof establishes these structural cues:

- neutral light-gray application background;
- white content surfaces;
- deep branded command-center band;
- one strong accent color;
- restrained borders and shadows;
- rounded cards and panels;
- compact uppercase eyebrows;
- large, direct page titles;
- concise explanatory copy;
- color-coded status pills;
- generous spacing and clear grouping.

For other portals:

- preserve the client or BWB color system;
- do not automatically use Compassion green and red;
- use the current brand’s primary, secondary, and accent colors;
- keep contrast accessible;
- keep decorative effects secondary to clarity.

## Reuse Order

Use this order before creating new UI:

1. Reuse the target portal’s existing component.
2. Reuse a proven shared BWB component.
3. Adapt a component from the Compassion reference.
4. Extract a new shared component from a proven implementation.
5. Create a new component only when the first four options do not fit.

Do not create duplicate versions of navigation, status pills, client headers, proof banners, task rows, or report cards without checking for an existing reusable implementation.

## Atomic Migration Workflow

### Step 1 — Inspect

Read the target route, page component, child components, data calls, auth checks, and mobile behavior.

### Step 2 — Record the Baseline

Document:

- what currently works;
- what must not change;
- the current route;
- the current build/deployment state;
- the exact user complaint or desired improvement.

When useful, capture a baseline screenshot.

### Step 3 — Choose One Change

State the single change in one sentence. List all other requests as queued work.

### Step 4 — Create a Savepoint

Use a focused commit or branch when available. The commit message should identify the portal and atomic change.

Recommended format:

```text
<portal>: <single change>
```

### Step 5 — Implement Minimally

Change only the files needed for the approved item. Preserve existing props, route behavior, API calls, permissions, and data contracts.

### Step 6 — Verify

At minimum:

- run the production build;
- confirm the target route loads;
- confirm the original workflow still functions;
- inspect desktop and mobile behavior;
- check console or build errors;
- verify no protected data entered a public proof.

### Step 7 — Publish a Proof

Use the appropriate method:

- authenticated admin route for real internal review;
- public-safe proof route for remote review;
- preview deployment when production should remain unchanged.

### Step 8 — Request Approval on That Change Only

Ask whether the single change is approved. Do not silently continue into the next migration item.

### Step 9 — Log the Result

Record:

- change completed;
- route reviewed;
- build/deployment result;
- user approval status;
- next queued change.

Then stop.

## Public and Protected Separation

Maintain two distinct concepts:

### Protected Portal

May contain:

- authenticated data;
- operational records;
- customer, donor, volunteer, or rep information;
- real tasks and approvals;
- publishing controls;
- integrations and production actions.

### Public Proof

May contain:

- safe sample content;
- approved public organization details;
- demonstration controls;
- browser-local draft state;
- visual layout and workflow concepts.

Never use a public proof as a shortcut around authentication.

## Data and Integration Gates

Do not connect these merely because the UI exists:

- payment processing;
- donation submission;
- email sending;
- text messaging;
- file uploads;
- CRM writes;
- Supabase writes;
- public publishing;
- accounting actions;
- production approval;
- commission eligibility.

Each integration is its own approved change with validation, error handling, permissions, and rollback.

## Accessibility and Mobile Requirements

Every portal change must preserve or improve:

- keyboard access;
- visible focus states;
- descriptive labels;
- readable contrast;
- minimum touch targets;
- non-clipped mobile navigation;
- responsive card stacking;
- usable forms without horizontal scrolling;
- clear distinction between links, buttons, statuses, and disabled actions.

## Acceptance Checklist

Before presenting a change:

- [ ] The target portal and route were confirmed.
- [ ] Existing working behavior was inventoried.
- [ ] Only one approved change was implemented.
- [ ] Existing routes and integrations were preserved.
- [ ] Shared components were reused where possible.
- [ ] The production build succeeded.
- [ ] The target route was checked.
- [ ] Desktop behavior was checked.
- [ ] Mobile behavior was checked.
- [ ] Protected data remains protected.
- [ ] Proof language accurately describes what is and is not connected.
- [ ] A rollback point exists.
- [ ] Remaining requests are queued, not silently implemented.
- [ ] The user is shown the result and asked to approve that change only.

## First Recommended BWB Migration Sequence

Do not execute this whole sequence at once. Use it as the queue:

1. Inventory the current BWB Admin and identify the safest shell-only improvement.
2. Extract the proven client command-center header as a reusable BWB component.
3. Extract the workspace navigation pattern.
4. Standardize status pills and summary cards.
5. Apply the shell to the BWB Clients area.
6. Review and approve.
7. Apply one approved shell element to one rep portal.
8. Review and approve.
9. Apply the system portal by portal, preserving each portal’s workflows and brand.

## Done Criteria

A portal evolution pass is complete only when:

- one requested change is implemented;
- the existing workflow still works;
- build and route verification pass;
- public/protected boundaries remain intact;
- the proof is visible to the user;
- the user has a clear approval decision;
- the next change remains queued rather than bundled into the current pass.
