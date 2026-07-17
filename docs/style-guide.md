# Style Guide

Lorecraft's implementation style follows the private visual identity note in `../../../ideas/lorecraft/visual-identity.md` and the shared visual guide in `../../../shared/visual-style-guide.md`.

This file exists as the repo-local pointer for agents working only inside the implementation repo. Keep detailed product taste and private design direction in the private visual identity note unless Taylor explicitly approves moving it here.

## Product Feel

- Dark-mode native.
- Story-first.
- Structured and inspectable.
- Calm enough for long play sessions.
- Atmospheric only where it reinforces the fiction.
- Clear distinction between player-facing story, debug-only evidence, and canonical state.

## Layout

- Center the player-facing narrative reading pane.
- Keep input rhythm closer to AI Dungeon and modern LLM chat interfaces than a command-console MUD.
- Use debug panes or tabs for prompt context, NPC state, location state, logs, and generation evidence.
- Avoid turning the primary surface into a dashboard of metrics.

## No-Go Choices

- No generic AI-dashboard decoration.
- No slash-command-first interface.
- No MUD-style room command UI unless a future tracked change explicitly introduces it.
- No combat, HP, inventory, quest, marketplace, or polished builder UI before playtesting proves the need.

## Related References

- `../../../ideas/lorecraft/visual-identity.md`
- `../../../shared/visual-style-guide.md`
- `docs/persistence-system.md`
