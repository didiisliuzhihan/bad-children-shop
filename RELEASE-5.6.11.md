# 5.6.11 — Mobile collection card deck

- Phone collection (up to 767px): swipe the stacked toy cards or postcards; tap the front card to open the existing detail view. Desktop retains the original full grid.
- Keep independent browsing positions for toys and postcards, with accessible previous/next buttons and keyboard navigation. Support empty and single-card collections.
- Render no more than three cards per deck. Use transform-only transitions and honor reduced-motion settings without adding a dependency.
- Preserve vertical page scrolling and pinch zoom. Distinguish touch capture transfer from cancellation and suppress clicks following swipes.
- Remove visible outer outlines. Keep square artwork in a square frame so it has neither side bands nor cropped characters.
- Localize deck guidance and controls for Chinese and English.

Validation: 231 unit/regression tests, TypeScript, production single-file build checks, and isolated Chrome touch-emulation acceptance at phone/desktop breakpoints. Physical iPhone/Safari testing is not claimed.

No account, collection persistence, draw probability, models, media files or database changes. Local review fixtures are excluded from the published website.
