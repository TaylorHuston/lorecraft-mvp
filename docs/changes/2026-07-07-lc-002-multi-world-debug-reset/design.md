# Design: LC-002 Multi-World Debug Reset Fixes

## Approach

Move debug reset/accounting decisions from imported Stormbound constants to the selected Adventure's source `WorldVersion.baseline`.

The implementation should introduce small pure helpers in or near the World/Adventure persistence layer:

- Load baseline room keys from an Adventure's source WorldVersion.
- Load baseline NPC definitions from an Adventure's source WorldVersion.
- Determine whether a current Adventure actor/location is seeded by comparing stable keys to that baseline.
- Restore seeded NPC debug state from the baseline NPC entry, including name, description, facts, and baseline location.

## Behavior

- Resetting a seeded Stormbound NPC still restores the Stormbound baseline.
- Resetting a seeded Tutorial NPC restores the Tutorial baseline instead of deleting it.
- Resetting a debug-created NPC still deletes that NPC and its facts.
- Debug-created NPC and Location caps count only rows absent from the selected Adventure's source baseline.
- Reset Session remains unchanged: it still recopies the entire Adventure from its source WorldVersion.

## Verification

- Add focused deterministic unit tests for the pure baseline helpers.
- Add or update Epic `Verified By` evidence for LC-002 S2/S4/S5 as appropriate.
- Run focused tests first, then `npm run ci:required` if practical.
- Do not run `npm run e2e` while the normal dev server is required to stay running.

## Risk

The main risk is accidentally changing Stormbound behavior while generalizing Tutorial behavior. Keep the helper inputs explicit and test both seeded and debug-created cases.
