# Design: Adventure Workbench UI And NPC Inspection

## Replan Summary

The initial cosmetic change expanded through accepted interactive feedback. Review identified three architectural consequences that the original design omitted:

1. Room NPC inspection cannot depend on debug-only snapshot facts.
2. NPC edits must patch only intended fields rather than rewriting a bounded, potentially incomplete fact set.
3. Debounced writes and reset must be ordered per NPC.

This replan preserves the implemented visual direction while replacing unsafe data and async boundaries before integration.

## Confirmed Decisions

- Desktop uses a three-pane MUD-inspired workbench, but natural narrative interaction remains primary.
- Narrow screens use Player, Story, and Room tabs with Story selected by default.
- Story and command input are separate bordered surfaces.
- One persistent textarea serves Act, Story, and Guide; Enter submits Act; Pass requires no input.
- Debug and Help use accessible modal dialogs.
- Selecting a present NPC replaces Room content with a read-only profile and Back restores Room.
- The current internal MVP profile shows every canonical NPC field, including `knowledge`.
- Existing Story labels remain stable; this change revises Requirements and Scenarios rather than creating UI-fragment Stories.
- No ADR is needed: these are reversible MVP presentation and local debug-contract refinements within existing Convex authority boundaries.

## Technical Options

### Option A: Continue Reusing Debug Snapshot Facts

Pass `snapshot.facts` directly to Room Info and submit complete NPC records on every edit.

- Lowest immediate code change.
- Fails outside debug mode.
- Couples player UI to unrestricted diagnostics.
- Can erase facts outside the bounded snapshot slice.
- Rejected.

### Option B: Increase The Global Fact Limit

Raise the snapshot limit enough to cover expected NPC facts and retain full-record writes.

- Simple but remains limit-dependent.
- Sends unrelated debug state to player UI.
- Does not fix stale/concurrent full-record writes.
- Rejected.

### Option C: Typed Player Projection Plus Patch Writes

Load complete current-scene NPC profiles into a dedicated typed player projection, keep unrestricted debug rows separate, and make debug mutations patch only supplied fields.

- Works with or without debug flags.
- Makes the intentional player-visible contract explicit.
- Avoids destructive writes from missing snapshot rows.
- Supports focused validation and deterministic tests.
- Selected.

## Selected Architecture

### Player-Facing NPC Projection

- Extend the current Adventure snapshot read model with a typed current-scene NPC profile.
- The projection includes stable actor identity, current location, description, and canonical `background`, `persona`, `voice`, `mood`, `status`, `memory`, and `knowledge` values.
- Load profile facts by actor subject, not from the global bounded debug fact list.
- Return this projection in normal and debug modes.
- Room Info consumes only this typed projection; it must not consume unrestricted debug rows.
- Debug `facts`, state diffs, raw calls, and other diagnostic collections remain gated as before.

### Patch-Based Debug NPC Writes

- Replace full-record update semantics with an explicit patch contract.
- Actor patch fields are optional: `name`, `description`, and `locationKey`.
- Fact patches include only changed fact keys. An explicitly supplied empty string removes that one fact; omitted fact keys remain unchanged.
- Validate actor ownership/role, location membership, required non-empty actor fields when supplied, fact allowlists, and at least one actual patch.
- NPC creation remains a complete contract requiring key, name, description, and an existing Adventure location; seeded default facts may be initialized server-side.

### Ordered Client Saves

- Maintain one promise chain per NPC.
- Debounced changes merge into the next queued patch for that NPC.
- Newer writes execute after older writes rather than concurrently.
- Turn submission flushes each NPC chain before Game Master context is read.
- Per-NPC reset cancels queued patches, waits for the active chain, invalidates stale work, then resets.
- Session/world reset retains the existing global cancel-and-wait boundary.

### Creation Validation And Feedback

- Disable Add NPC until key, name, description, and location are present.
- Disable it while creation is in flight.
- Show validation, pending, and failure feedback inside the NPC creation card/modal content.
- Prevent duplicate creation requests.
- Correct copy to state that the NPC is created in the selected location.

### Persistent Command Surface

- Keep the textarea mounted between actions.
- Cap auto-growth and use internal scrolling above the cap.
- Reset inline height after successful Act, Story, Guide, and utility submissions.
- Preserve submitted text when submission fails.
- Preserve draft text when Pass is chosen.
- Keep slash autocomplete available in the textarea; Enter accepts an active suggestion before submitting Act.

### Responsive Semantics

- Preserve tab roles, roving focus, and `aria-controls` only for the narrow tabbed presentation.
- Desktop simultaneous panes use ordinary section/aside semantics rather than orphaned `tabpanel` roles.
- Keep Player and Room collapse targets mounted and labelled.
- Preserve fixed center-column geometry when either side pane collapses.

### Modal Behavior

- Help and Debug use native modal dialogs with labelled headings.
- Support explicit Close, Escape, backdrop dismissal, initial focus, and trigger focus restoration.
- Keep modal content independently scrollable and contained on narrow viewports.

## Story And Requirement Reconciliation

### `LC-001-S1`: Core Player Decision Surface

#### Requirement R4: Decision Controls

The system SHALL provide a persistent command surface with Act, Story, Guide, and Pass semantics plus accessible Help.

- `R4-S0`: WHEN an Adventure opens, THEN a separate command rectangle shows the prompt, persistent textarea, and four actions.
- `R4-S1`: WHEN text is submitted with Enter or Act, THEN it resolves as Act.
- `R4-S2`: WHEN Story or Guide is selected, THEN the same draft is handled under that action's established persistence/context rules.
- `R4-S3`: WHEN Pass is selected, THEN no textarea content is submitted and the draft remains available.
- `R4-S4`: WHEN Help opens, THEN it explains all four actions plus `/help` and `/look`, and supports accessible dismissal/focus return.
- `R4-S5`: WHEN a long draft is submitted successfully, THEN the cleared textarea returns to its bounded default height.

Planned evidence: focused command-surface component tests where practical, deterministic E2E for action semantics and Help, manual desktop/mobile confirmation.

### `LC-001-S4` And `LC-001-S5`: Debug Workspace

Existing Requirements SHALL be reconciled from drawer/sidebar language to a modal workspace.

- Debug modal opens from Settings and does not resize Story.
- Close, Escape, and backdrop restore focus.
- Tabs and dense debug content remain keyboard reachable and internally scrollable.

Planned evidence: deterministic E2E and manual narrow/desktop confirmation.

### `LC-001-S9`: NPC Profiles And Debug Editing

#### Requirement R3: Debug NPC Inspection And Editing

The system SHALL create and patch canonical NPCs without overwriting omitted fields or allowing stale saves to win.

- `R3-S4`: WHEN valid creation fields and a known location are supplied, THEN one canonical NPC is created in that location.
- `R3-S5`: WHEN one actor field, fact, or location changes, THEN only supplied fields are patched.
- `R3-S6`: WHEN a fact is omitted from a patch, THEN its canonical value remains unchanged even when absent from bounded debug rows.
- `R3-S7`: WHEN overlapping edits occur, THEN saves commit in user order and the newest value wins.
- `R3-S8`: WHEN reset occurs with queued/active saves, THEN stale writes cannot reapply after reset.
- `R3-S9`: WHEN creation is invalid or pending, THEN the modal shows local state and duplicate submission is prevented.

Planned evidence: focused Convex/helper tests for patch preservation and validation; hook tests for ordering/reset; deterministic E2E for create/move/error state.

### `LC-001-S15`: Player Context Pane

Existing collapse Requirements SHALL record the outer-edge toggle, fixed side track, 44px target, and unchanged Story geometry.

Planned evidence: deterministic geometry assertions and manual desktop confirmation.

### `LC-001-S16`: Room Info And Responsive Adventure Layout

#### Requirement R1: Persistent Room Info Surface

- Preserve current room display, canonical movement updates, responsive tabs, independent scrolling, and fixed Story geometry.
- Desktop panes SHALL not expose mobile-only tabpanel semantics.

#### Requirement R2: Present NPC Inspection

The system SHALL let the playtester inspect a complete canonical profile for an NPC present in the current room.

- `R2-S4`: WHEN a present NPC is selected, THEN Room Info shows key, location, description, and every canonical profile field, including `knowledge`, in read-only form.
- `R2-S5`: WHEN the app runs without debug snapshot flags, THEN the same complete profile remains available.
- `R2-S6`: WHEN Back is selected or the current room changes, THEN the pane returns to current Room information and cannot retain an invalid prior-room selection.

Planned evidence: focused snapshot tests for normal/debug parity and subject-complete fields; E2E drill-down/back; manual player-facing confirmation.

## Superseded Truth To Reconcile

- Earlier statements that Room Info shows only room description and NPC names.
- Earlier statements that NPC `knowledge` is never player-visible; replace with the explicit internal-MVP exception while preserving its Game Master-only semantic for future/public policy.
- Debug drawer/sidebar wording superseded by native modal behavior.
- Expanding Act-input wording superseded by the persistent command surface.
- Current-location default creation wording superseded by explicit location selection.
- Evidence claiming unexecuted keyboard/modal assertions passed live.

## Supporting Documentation

- Update `README.md` current features and E2E description.
- Update `docs/data-model.md` for the player NPC projection, patch semantics, and MVP `knowledge` exception.
- Update `docs/persistence-system.md` for player/debug projection boundaries and patch writes.
- Update `docs/style-guide.md` or the private visual identity only enough to record the intentional MUD-inspired structural treatment without changing the natural-language product direction.
- Update `CHANGELOG.md` with user-facing changes only.

## Verification Strategy

- Focused automated tests:
  - current-scene player NPC projection in normal and debug modes.
  - all profile fields present by subject.
  - omitted facts preserved by patch.
  - explicit empty fact deletes only that fact.
  - invalid location rejected.
  - save/save and save/reset ordering.
  - textarea growth cap and reset where practical.
- Deterministic E2E:
  - responsive panes and fixed geometry.
  - Help/Debug modal behavior.
  - persistent Act/Story/Guide/Pass command semantics.
  - NPC drill-down/back and complete fields.
  - NPC create in one location, move to another, and validation/pending state.
- Broad supporting gate: `npm run ci:required`.
- Manual UI confirmation: desktop and approximately `375x812` walkthrough.

## Security And Data Safety

- Debug writes remain local/debug-gated.
- Room Info no longer consumes unrestricted debug rows.
- Complete field exposure, including `knowledge`, is an explicit internal-MVP product decision, not an accidental leak.
- Public deployment, permissions, and field visibility remain out of scope and must not infer this prototype policy.

## Open Questions

- None blocking implementation.
