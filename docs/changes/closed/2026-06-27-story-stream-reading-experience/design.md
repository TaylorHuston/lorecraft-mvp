# Design: Story Stream Reading Experience

## Context

Lorecraft's current MVP has a working persistent Director loop. `src/app/world-client.tsx` renders a split layout with the story/feed area on the left and debug state on the right. The feed is persisted through Convex and reconstructed from commands, narrations, and events, which satisfies the persistence proof, but its visual presentation still resembles chat cards.

This change should not alter canonical state or the Director contract. It is a presentation change over the existing feed: same persisted rows, same route, same Convex snapshot, different player-facing reading experience.

## Goals / Non-Goals

**Goals:**

- Make the play surface read like a story stream rather than a chat transcript.
- Keep Director narration visually primary.
- Keep player actions readable as authored turns without making them look like support-chat bubbles.
- Keep the latest story content and input easy to reach as the transcript grows.
- Preserve the debug panel as a separate developer surface.
- Verify the layout with a long feed and the existing right sidebar.

**Non-Goals:**

- No change to Director prompt semantics, structured output, or persistence tables.
- No streaming token UI.
- No slash commands, command parser, movement rules, combat, inventory, or room mutation.
- No polished world builder or story-instance model.
- No new design system dependency.

## Epic Changes

### Update Epic: Provider-Agnostic Chat Experience

- Target Epic: `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`
- Change Type: added scope

#### Story Changes

- Added: `LC-001-S5: Story Stream Reading Experience`
- Modified: none
- Removed: none

#### Story LC-001-S5: Story Stream Reading Experience

As a playtester, I want the play surface to read like an unfolding story and stay anchored near the newest turn, so that long sessions feel like interactive fiction instead of a chat log I have to manage.

##### R1: Story-First Feed Presentation

The system SHALL present the main feed as a prose-oriented story stream instead of a chat-bubble transcript.

###### Scenario R1-S1: Director narration is primary prose

- WHEN the feed contains Director narration
- THEN the narration appears as the dominant story text in the main stream
- AND it is not styled as a chat bubble competing with player input

###### Scenario R1-S2: Player input reads as an authored action

- WHEN the feed contains player input
- THEN the player input is visually distinct from Director narration
- AND it reads as an action or authored turn within the story flow rather than as a support-chat message

###### Scenario R1-S3: World events do not interrupt the story

- WHEN world events appear in the feed
- THEN they are visually quieter than narration and player input
- AND the debug panel remains the place for full event/state inspection

##### R2: Bottom-Anchored Continuation

The system SHALL keep the latest story turn and continuation input easy to reach as the session grows.

###### Scenario R2-S1: New turn appears near the continuation point

- WHEN a player submits a turn and the Director response is persisted
- THEN the story stream settles near the newest feed content
- AND the player does not need to manually scroll down to find the continuation point

###### Scenario R2-S2: Reload resumes near latest content

- WHEN a playtester reloads a world with an existing long feed
- THEN the story surface opens near the latest story content
- AND the input remains available for continuing the session

###### Scenario R2-S3: Debug sidebar is taller than the story column

- WHEN the debug sidebar contains more content than the visible story stream
- THEN the story input is not stranded at the viewport bottom away from the feed
- AND the main story stream remains independently usable from the debug panel

##### R3: Empty, Pending, And Error States Fit The Story Surface

The system SHALL keep empty, pending, and error states understandable without reverting the main experience to a chat-debug layout.

###### Scenario R3-S1: Empty story

- WHEN the seeded world has no feed entries
- THEN the main surface presents an empty story state that invites narrative input
- AND it does not show placeholder chat bubbles

###### Scenario R3-S2: Director response pending

- WHEN the player submits a turn and waits for the Director
- THEN the UI shows pending state near the continuation input
- AND duplicate submission remains disabled for that turn

###### Scenario R3-S3: Director response fails

- WHEN the Director turn fails
- THEN the error is shown near the continuation input
- AND the existing story stream remains readable and unchanged

##### Implemented By

Closed implementation summary is maintained in this change's tasks.md and the LC-001 Epic.

##### Verified By

Closed verification evidence is maintained in this change's tasks.md and the LC-001 Epic.

##### Verification Gaps

- Historical placeholder reconciled at closeout; no current implementation-pending claim remains.
- Needs browser verification with a long feed and debug panel content because the risk is visual layout behavior, not backend correctness.

## Epic File Rules

- Stories live inside the Epic `epic.md` file.
- Do not create `docs/stories/` or individual Story files.
- Preserve the Epic directory as the future home for supporting artifacts such as mockups, screenshots, research, or design notes.
- Keep Story IDs stable even if the Story title or Epic ownership changes later.
- Restart Requirement IDs inside each Story: `R1`, `R2`, `R3`.
- Scope Scenario IDs to their Requirement: `R1-S1`, `R1-S2`, `R2-S1`.

## Technical Approach

Keep Convex feed reconstruction unchanged. Implement the change in the presentation layer by replacing the current feed card/bubble treatment in `src/app/world-client.tsx` with story-stream markup and styling. If the component becomes hard to read, extract small UI-only helpers such as a feed entry presentation mapper, but do not move durable gameplay rules into React.

Use a scroll container or bottom sentinel ref for the story stream so the view can settle near the newest feed entry after reload and after feed length changes. The input should live as the continuation affordance for the story stream, not as a viewport-pinned chat composer. The debug panel should remain visually and structurally separate.

## Alternatives Considered

- Option: Add a new `timeline` or `turns` table before changing the UI.
  - Why not: The current feed already reconstructs enough persisted data for this UX proof; a new table would solve a data-shape problem we have not hit yet.
- Option: Keep chat bubbles and only auto-scroll.
  - Why not: Auto-scroll alone does not address the core feedback that the experience looks like chat instead of story.
- Option: Move events entirely out of the main feed now.
  - Why not: Events are still useful during MVP playtesting; this change can reduce their weight without removing feedback prematurely.

## Why This Approach

This is the smallest change that tests the product feel without disturbing the persistence proof. It keeps the backend stable, keeps the debug surface intact, and lets implementation focus on the main problem Taylor saw in playtesting: the feed should feel like an unfolding story and stay easy to continue.

## Implementation Constraints

- Preserve the existing split layout and debug panel.
- Preserve Enter-to-send and Shift+Enter multiline behavior.
- Preserve persisted feed ordering from Convex.
- Avoid adding dependencies for this small UI change.
- Keep player-facing text compact and avoid in-app instructional copy about how the UI works.

## Verification Strategy

- Run `npm run lint` and `npm run build`.
- If UI-only helpers are extracted, add focused unit tests only where they protect non-trivial mapping behavior.
- Verify manually or with browser automation at desktop width that a long feed opens near the latest content, new turns settle near the bottom, the input remains adjacent to the story continuation point, and the right debug sidebar can be longer without breaking the main stream.
- Verify a no-feed world still presents a usable starting state.
- Verify existing Director error and pending states still appear near the input.

## Decisions

- The change is presentation-only over the existing persisted feed.
- The Story ID for this scope is `LC-001-S5`.
- Changelog impact is required because this changes the visible MVP play experience.

## Risks / Trade-Offs

- Auto-anchoring can be annoying if it always steals scroll position while the user is reading older transcript entries. The first implementation can favor simple bottom anchoring, but it should be easy to refine later into "stick to bottom unless the user scrolled up."
- Making events quieter may hide useful state-change evidence in the main story. The debug panel remains the full inspection surface.
