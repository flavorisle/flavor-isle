# Builder report: classic_drinks_ice_size_buttons_2026-09-29

**Scope:** Classic Drinks customizer only, detected by child modifier list `How much ice?` (`2L2MO2C5CVK5VILJZNGS26EM`). No menu/catalog, price, order, tax, or ticket changes.

**App entity:** BuilderReport submission pending; this repository mirror does not confirm a Builder entity ID.

## Implementation

- Size options render as three-zone pills: Light Ice (−), size/Regular Ice (center), and Extra Ice (+). Existing size prices remain attached to the center label.
- The shared child-list ID and name gate the behavior; items without that child list keep their existing customizer.
- Ice choices use the selected soda's catalog child option and are stored at `nestedSelections[soda.id]['How much ice?']`. A Light/Extra tap chooses the first available soda when none is selected, and changing sodas transfers the current level.
- Cart edits restore the soda and ice child option from the saved flattened modifier IDs.
- The standalone ice child list is hidden for qualifying soda choices. Other child lists, including “Add a flavor to your drink,” remain rendered.
- Existing nested modifier flattening, cart storage, Square order creation, pricing verification, and kitchen ticket formatting are unchanged.

## Verification

- No test orders were placed.
- Repository-level code verification is performed locally; it does not establish that the live Builder rendered the controls.
- Builder-side rendering, state checks, and screenshots remain pending and should be recorded with the BuilderReport submission.
