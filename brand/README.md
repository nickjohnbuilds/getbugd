# Brand source files

Original logo and favicon art. Keep the originals here — export sized copies
for the store, don't overwrite these.

| File | What it is | Notes |
|---|---|---|
| `Get.png` | Logo — round "GetBug'd" badge, bug over mint with a heavy black ring | 2000×2000 PNG, **no transparency** (solid mint square behind the circle) |
| `getbugd_favicon_thicker_compact_version.svg` | Favicon artwork — the bug mark alone, thicker lines, no wordmark | Vector. Contains a `<g id="bugmark">` group (200×200) — that group is the real asset; export it on its own to make the favicon |
| `getbugd_favicon_thicker_compact_version.png` | Preview of the same mark at 200px / 80px / 32px | 2240×1188. A proof sheet, not the icon — it has the size labels baked in |

All three made 2026-09-07.

**Both favicon files are the three-up proof sheet, not a ready icon.** Uploading
either one to Shopify gives a wide strip with "200px 80px 32px — favicon"
written on it. The favicon still has to be exported square from the `#bugmark`
group in the SVG.

Mark colors: mint `#A6F0C6` disc, green `#17A94E` body, olive `#6B7A46` head,
black outline.

## Open items

- **Export the actual favicon** — square, from `#bugmark`. 512×512 PNG covers
  Shopify; the SVG stays the master.
- **No mascot file yet.** Mascot #1 (the named roly-poly) is decided but not
  drawn. The bug in the logo is a generic bug, not the mascot. See the
  Decisions Log in `getbugd-internal`.
- **No vector for the full logo.** `Get.png` is pixels only, so the wordmark
  badge can't scale up clean for stickers or packaging. Only the bug mark is vector.
- **No transparent version of the logo.** Needed before it can sit on a wheat
  section or a dark tank photo without a mint box around it.
- **Colors vs. the store palette.** The mark is mint + green; the decided store
  palette is wheat `#F2E1B5`, hot pink `#E5197C`, rust `#8C3A0D`, cocoa
  `#1E1008`, with mint held back for sales, events and packaging. Either the
  logo gets recolored or that rule changes — Nicholas's call.
