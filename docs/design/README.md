# Design

v2 is the brand in the app. v1 was replaced and must not be restored.

The notes and tokens below are the pack we were given. The rendered mockups, HTML, and logo files are the repo folder `design/` (and the shipped logos in `public/brand/logo/`). App colours come from `app/tokens.css`, which was generated from these tokens. Do not import `design/html/assets/app.css` into the Next app.

| File | What it is |
| --- | --- |
| [BRAND.md](BRAND.md) | Clinical-calm system, contrast table, verdict classes, functional rules. |
| [NAME.md](NAME.md) | Name clash with medverify.versatechq.com. MedCheck GH is recommended and not applied. |
| [READY.md](READY.md) | What the design handoff contained, and known weaknesses. |
| [LICENSES.md](LICENSES.md) | Fonts and Phosphor. The app self-hosts the fonts. It does not call Google Fonts. |
| [tokens.json](tokens.json) | Token source. |
| [tokens.css](tokens.css) | Generated CSS custom properties. The live file is `app/tokens.css`. |

Theme, in order: `?theme=light|dark` previews and is not saved. Else `localStorage['mv-theme']`. Else `prefers-color-scheme`. Backgrounds stay neutral zinc. Teal is the accent. Red, amber, and green are verdict colours only.
