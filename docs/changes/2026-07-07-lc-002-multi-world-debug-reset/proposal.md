# Proposal: LC-002 Multi-World Debug Reset Fixes

## Summary

Fix the LC-002 follow-up found by Epic verification: debug NPC reset and debug-created entity accounting should use the selected Adventure's source WorldVersion baseline instead of hard-coded Stormbound seed constants.

## Problem

LC-002 established that Worlds are authored source material and Adventures are mutable playable copies. The current debug reset/accounting path still assumes Stormbound Chapel when deciding whether an NPC or Location is seeded. That can misclassify Tutorial baseline entities, delete seeded Tutorial NPCs during per-entity reset, and count seeded Tutorial rows against debug-created limits.

## Scope

- Make debug-created NPC and Location counting source-version aware.
- Make per-NPC debug reset restore seeded NPCs from the Adventure's source WorldVersion baseline.
- Keep debug-created NPC reset behavior: debug-created NPCs are deleted when reset.
- Add deterministic tests for baseline lookup/count/reset behavior.
- Reconcile LC-002 Epic evidence and supporting docs/changelog.

## Out Of Scope

- Full production World Builder.
- User accounts, auth, ownership, or hosted debug permissions.
- Dynamic WorldVersion migration or patching into existing Adventures.
- Broad reset UI redesign.
- E2E coverage that requires stopping the current dev server.

## Affected Epic

- `docs/epics/lc-002-world-adventure-model/epic.md`
