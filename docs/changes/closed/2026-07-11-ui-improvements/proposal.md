# Proposal: Adventure Workbench UI And NPC Inspection

## Why

Lorecraft's original UI-polish session grew through accepted manual feedback into a broader Adventure-workbench change. The implementation now introduces responsive Player/Story/Room navigation, MUD-inspired desktop panes, separate Story and command surfaces, Help and debug modals, Room-to-NPC inspection, and explicit NPC location authoring.

The first review showed that the original cosmetic proposal no longer described the work and that the expanded behavior needs stronger player/debug data boundaries, patch-safe NPC writes, deterministic async ordering, and current verification evidence.

## Goal

Deliver a coherent, accessible Adventure workbench where:

- Story remains the primary surface.
- Player and Room context remain visible without resizing Story when collapsed.
- narrow screens use Player/Story/Room tabs.
- the command surface always exposes one textarea with Act, Story, Guide, and Pass.
- Help explains actions and slash commands.
- the Room pane can inspect every canonical field for a present NPC in read-only form.
- debug NPC creation and editing can choose a canonical location without losing unrelated NPC facts or racing reset.

## Scope

### In Scope

- Responsive three-pane Adventure layout and mobile tabs.
- Player and Room collapse controls with fixed Story geometry.
- Separate bordered Story and command surfaces.
- Persistent command textarea with Act, Story, Guide, Pass, slash autocomplete, bounded growth, and correct reset behavior.
- Accessible Help and debug modals.
- Read-only present-NPC drill-down from Room Info.
- A typed player-facing NPC profile projection available independently of debug mode.
- For this internal MVP, the NPC profile deliberately exposes every canonical NPC field, including `knowledge`.
- Explicit NPC location selection during creation and editing.
- Patch-based NPC debug writes, per-NPC save ordering, reset ordering, validation, and visible modal feedback.
- Deterministic tests, manual UI confirmation, supporting docs, Epic reconciliation, and public changelog updates.

### Out Of Scope

- Authentication, authorization, public/private field permissions, or production player visibility policy.
- A polished World Builder.
- Dynamic NPC/location creation by the Game Master.
- Inventory, combat, stats, maps, room graphs, or broad MUD command semantics.
- Changing Game Master extraction beyond preserving existing canonical movement and NPC mutation rules.
- Generalizing the local debug editor into a public API.

## Explicit Product Boundary

Lorecraft remains an internal local-first playtest prototype. The current Room NPC profile exposes all canonical fields because Taylor requested complete inspectability during playtesting. This intentionally supersedes the earlier player-hidden `knowledge` presentation rule for this surface only. A future authenticated/player-facing product must revisit field visibility rather than inheriting this prototype boundary accidentally.

## Epic Actions

- Update `docs/epics/lc-001-provider-agnostic-chat-experience/epic.md`.
- Preserve existing Story identities while reconciling:
  - `LC-001-S1` decision controls and Help.
  - `LC-001-S4` and `LC-001-S5` debug workspace behavior.
  - `LC-001-S9` NPC profile/debug editing and canonical location assignment.
  - `LC-001-S15` Player Card layout behavior.
  - `LC-001-S16` Room Info, responsive panes, and complete NPC inspection.
- Reconcile older hidden-knowledge and debug-snapshot wording that this MVP exception supersedes.

## Release Communication Impact

Required. Update `CHANGELOG.md` under `[Unreleased]` with user-facing layout, Help, command-surface, NPC inspection, and NPC location-editing behavior. Do not include SDD, refactoring, test, or process details.

## Risks

- Exposing `knowledge` can spoil story secrets; this is accepted for the current internal MVP only.
- Reusing bounded debug facts for player UI or full-record writes can create missing data or destructive overwrites.
- Debounced autosaves can commit out of order unless serialized per NPC.
- Native modal and responsive tab semantics can become inaccessible when desktop and mobile semantics are mixed.
- A persistent textarea can consume the workbench if growth is not bounded and reset after submission.

## Deferred Scope

- Visibility metadata or player-safe/public NPC profile policy.
- Role-based access to debug or hidden state.
- Mobile-specific visual redesign beyond functional tabs and modal containment.
- Reusable generic inspector/editor frameworks.

## Open Questions

- None blocking. Complete field exposure is an explicit internal-MVP assumption from accepted manual feedback.
