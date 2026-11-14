# Fonts used for the README screenshots

These are pinned so that the screenshot generator renders the same glyphs on a
developer machine and in CI. `scripts/screenshots.mjs` points fontconfig at this
directory, so the app's `sans-serif` stack resolves to these files.

- `DejaVuSans.ttf`, `DejaVuSans-Bold.ttf` — DejaVu Fonts, Bitstream Vera license.
- `NotoEmoji.ttf` — Noto Emoji (monochrome), SIL Open Font License 1.1.

The app itself does not use these; the browser renders the UI with whatever the
visitor's system provides. They exist only to keep the committed screenshots and
the CI comparison stable.
