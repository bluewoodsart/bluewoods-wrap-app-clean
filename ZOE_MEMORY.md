# Zoe Portal — Durable Project Memory

Last updated: July 19, 2026

## Purpose

This file is the handoff source for every Zoe-only Codex task. Read it before changing Zoe's welcome page, rep portal, training missions, social experience, rewards, or permissions.

## Identity and access

- Display name: Zoe Bigboy
- Login email: atomicadvertisingagency@gmail.com
- Role: sales_rep
- Rep slug: zoe
- Account is active and linked to its Supabase Auth user.
- Zoe is a training-level rep, not an Owner Admin.
- Production changes still require Ashley's approval.
- Do not store or surface private relationship, marriage, military-benefit, or family details in the product.

## Live routes

- Private welcome/sign-in page: https://www.slapwrapz.com/zoe
- Alternate sign-in route: https://www.slapwrapz.com/zoe/login
- Authenticated rep portal: https://www.slapwrapz.com/rep
- Zoe must receive only the data allowed to her sales-rep account.

## Current visual direction

- Original game-inspired design; do not copy Fortnite, Epic Games, Catwoman, or other protected characters or trade dress.
- Palette: deep navy, electric cyan, violet/fuchsia, and a bright yellow primary action button.
- Character is based on the user-supplied Zoe photograph.
- Current character has an original feline-eared black eye mask and gothic black outfit.
- Current flight version uses one downward cyan energy thruster and one forward blue electrical laser.
- Character asset: `public/zoe/zoe-launch-character.png`
- Prior character versions are retained beside the current asset.
- Welcome-page motion is implemented with lightweight CSS rather than a GIF.
- Respect `prefers-reduced-motion` and keep motion pauseable where practical.

## Current Zoe-only portal features

- Black-and-white `BWB Field Agent · Z-01` badge.
- Zoe Launch Lab game hub appears only when `rep_slug === 'zoe'`.
- The normal working rep portal and wrap-quote tools remain underneath.
- `Start UI Testing` scrolls to Mission 01.
- `Create Wrap Quote` opens the existing real quote module.
- `Invite a Friend` opens the device share sheet, but does not grant portal access. Ashley must approve every new account.
- Prototype coins, stars, mission progress, and invite bonus currently persist only in local browser storage on the device.

## Mission 01

Name: Back Button Boss Battle

Goal: Teach repeatable iPhone portal testing without granting production authority.

Current checklist:

1. Tap Start a Quote and confirm the customer quote module opens.
2. Close the quote module and confirm the rep portal returns.
3. Open a colored quote group and confirm jobs appear below it.
4. Test browser Back and Forward without losing the portal.
5. Send Ashley a screenshot or recording marked Pass or Needs Fix.

Rewards:

- 20 prototype coins per completed step.
- One star after all five steps.
- 50-coin prototype invite bonus after using the share action.

Mission credit behavior:

- Mission cards are guides, not manual checkboxes; tapping a card alone does not award credit.
- Step 1 displays a visible coach arrow at the real `Start a Quote Here` control and completes only when the quote chooser actually opens.
- Step 2 completes only after that quote chooser closes and the rep returns to the portal.
- Mission progress now uses the versioned local key `bwb_zoe_mission_one_steps_v2`, so earlier manually toggled test credit does not carry into the verified flow.
- Later steps remain locked until their real portal actions are wired to verified completion events.
- Prototype coins and XP are training feedback only and must not be presented as wages, payroll, or guaranteed payment.

Mission 01 completion wiring (July 19, 2026):

- Step 3 guides Zoe to the first colored priority group containing jobs, starts it collapsed, and awards credit only when she expands it and jobs render.
- Step 4 creates a safe same-page browser-history checkpoint, detects one native Back followed by one native Forward action, and never intentionally navigates Zoe away from `/rep`.
- Step 5 guides Zoe to the real portal report card, requires Pass or Needs Fix, written detail, and at least one screenshot or short recording, then awards credit only after the Supabase report succeeds.
- All five steps are now event-verified and sequential; mission-row taps alone cannot award progress.

## Navigation Repair Agent

- Reusable Codex skill: `C:/Users/Designer/.codex/skills/navigation-repair-agent/SKILL.md`
- Invoke as `$navigation-repair-agent` for Back, Forward, redirect, refresh, deep-link, modal, selection, or mobile navigation failures.
- Zoe's first learning task is mobile navigation testing on iPhone.

## Teaching principles

- Make it fun and game-like, one mission at a time.
- Explain the expected result in plain language.
- Use visible, optional focus cues; never use concealed manipulation.
- Give Zoe safe testing tools and feedback loops without secrets, payments, unrestricted customer data, or unrestricted deployment authority.
- Ashley remains the final production approver.

## Next phase candidates

1. Move prototype rewards from local device storage into secure per-user Supabase records with RLS.
2. Add an Ashley review queue for Zoe's test reports and screenshots.
3. Add safe character customization so Zoe can design future versions of her own avatar.
4. Add additional missions for Android comparison, quote-module testing, screenshot reporting, and eventually voice-agent QA.
5. Keep Zoe work isolated from Trapstar-specific changes unless Ashley explicitly connects the two.

## Deferred game-style mission presentation note

- Reference captured July 19, 2026: a dark, cinematic game-download page with a strong heading, compact numbered step cards, bold condensed typography, bright primary actions, and image-led cards below.
- Future Zoe mission steps may use that general layout rhythm and game-like feel, while remaining an original BWB design and not copying Fortnite, Epic Games, protected characters, logos, wording, or trade dress.
- Keep Zoe's established hero palette: deep navy, electric cyan, violet/fuchsia, and bright yellow actions.
- Create original Zoe/BWB artwork for each mission step when this phase is explicitly resumed.
- This is a thought note only. Do not implement it yet; current work returns to Zoe's intro page.

## New-task startup instruction

Use this exact instruction in a new Codex task:

> Read `ZOE_MEMORY.md` and `ZOE_TEACHING_GUIDE.md` from the current SlapWrapz workspace. Continue only the Zoe Portal project from the current live deployment. Do not change Trapstar unless I explicitly ask.
