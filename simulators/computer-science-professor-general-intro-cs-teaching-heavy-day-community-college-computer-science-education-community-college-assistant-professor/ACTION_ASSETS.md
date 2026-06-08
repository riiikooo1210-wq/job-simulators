# Action Assets

This simulator currently has no physical playground scenes and no separate draggable/action assets to generate.

The classroom loop reset has been redesigned as in-class teaching work rather than prep documents:

- `classroom_reset`: write the opening prediction prompt the professor will read aloud from a projected code prompt.
- `loop_reset_trace`: run an in-person classroom conversation where students respond to the player's prompt and the player guides the trace table.
- `loop_reset_evidence`: transition out of class after the trace-table discussion, as Jayden lingers for office hours.

Those scenes use ordinary scene illustrations in `public/scenes/` rather than `public/action-assets/`.
