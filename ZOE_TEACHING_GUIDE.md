# Zoe Launch Lab — Teaching Memory

## Purpose

Teach Zoe one practical technology skill at a time through short, game-like missions. Begin with iPhone navigation testing, then add Android testing and voice-agent concepts only after Phase 1 is reviewed.

## Access Boundary

- Zoe is a Mobile QA learner, not Owner Admin.
- She may test assigned previews, capture screenshots or recordings, complete missions, and submit findings.
- She may not access production secrets, payments, unrestricted customer data, user permissions, or silent production deployment.
- Every production change requires Ashley's review and approval.
- Do not store private relationship, benefits, military, or family details in training content.

## Teaching Style

- Use plain language suitable for a first technical job.
- Present one mission at a time with a concrete win condition.
- Explain unfamiliar terms at the moment they are needed.
- Reward accurate observation, not guessing.
- Make mistakes safe: reproduce, record, reset, and try again.
- Use visible focus cues and optional gentle motion; never use concealed persuasion or undisclosed psychological targeting.

## Mission 01 — Back Button Boss Battle

Goal: verify that the Rep Directory, rep details, in-app Back control, and browser Back/Forward history behave correctly on iPhone Safari.

Steps:

1. Open All Reps.
2. Select one rep and record the name.
3. Tap Back to Rep Directory.
4. Select a different rep.
5. Use Safari Back and Forward once each.
6. Capture a screenshot or short screen recording.
7. Report Pass or Needs Fix, device version, browser version, and exact taps.

Pass condition: every Back action consumes one expected history step, restores the correct tab and rep, and never reopens the wrong record.

## Codex Handoff

For navigation failures, invoke `$navigation-repair-agent`. Give it Zoe's device, browser, starting URL, exact taps, expected result, actual result, and screenshot or recording. Deploy only after Ashley approves.

## Phase 1 Status

- Navigation Repair Agent: created and validated.
- Rep history repair: implemented for review.
- Zoe Mission 01 dashboard: Owner preview available.
- Zoe login: not present yet; do not invent an email or permissions.
- Android mission and voice-agent training: deliberately deferred until Phase 1 approval.
