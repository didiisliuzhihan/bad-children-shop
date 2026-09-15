# 5.6.12 — Playful English type and glowing capsule seam

- Match the seven playful Chinese text roles with Fredoka in English: toy tasks, live collectible cards, postcard messages, keepsake nicknames, text-only postcard placeholders, collected story excerpts and ticket messages. Keep normal controls and navigation in their existing readable font.
- Use the same font in downloaded toy cards and photographed keepsakes, with Chinese-glyph fallback for mixed-language nicknames. Reuse the already-shipped font; bounded font loading cannot strand a valid photo export.
- Open capsules by dragging either way along the curved, camera-aligned glowing seam. A small light travels left to right at uniform arc-length speed, with a stronger soft breathing halo. Touch and mouse use the same interaction.
- Separate the upper and lower shells vertically, then reveal the toy through the existing character copy, task and keep/kick-out decisions. Story capsules finish opening before displaying their postcard.
- Preserve vertical scrolling outside the seam, short/vertical/cancelled gesture handling, keyboard access and a direct-open fallback. Respect reduced-motion preferences. Keep the existing model-failure recovery path.

Validation: 244 unit/regression tests; TypeScript; production single-file build checks; isolated Chrome touch/mouse/keyboard flow checks; English/Chinese type at 320px, 390px and 1280px; all seven English toy exports and both keepsake orientations. Physical iPhone/Safari testing is not claimed.

No account, collection persistence, draw probability, model assets, media files or database changes. Local review fixtures and screenshots are excluded from the published website.
