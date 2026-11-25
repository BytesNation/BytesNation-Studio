# Upstream files this fork changes

BytesNation Studio keeps taking VDO.Ninja releases. Its theme lives in new files (`bytesnation/`, `brand/`, `.brand-tier`). This list holds every upstream file the fork edits, so a merge can be checked against it. Every edit inside an upstream file sits next to a comment that starts with `BytesNation Studio`.

After a merge, check each row: the edit is still there, it still applies to the code around it, and nothing new in upstream needs the same treatment. Then confirm the rules in the last section.

| File | What changed | Why | On conflict |
|---|---|---|---|
| `index.html` | Head block: title, social tags, source and licence links, favicons, theme stylesheet. Steve Seguin's `author`, `copyright`, `stance-on-war` and `twitter:creator` tags removed. `canonical`, `og:url` and the share image point at studio.bytesnation.com. | Product name, AGPL source link, no implied affiliation | Keep upstream's new tags; reapply ours |
| `index.html` | `<script src="./bytesnation/gate.js">` between `lib.js` and `main.js` | Marks interface pages so the theme applies, and leaves program output alone | Keep the line between the two scripts |
| `index.html` | schema.org image links point at `bytesnation/icons/share-1200x630.png` | Share image | Reapply |
| `index.html` | Static wordmark text in `#logoname` | Product name. `main.js` replaces it at startup on any non-upstream host | Reapply |
| `index.html` | `#credits`: `aria-hidden` removed, and a "Source code" link to this fork added after Privacy Policy | AGPL-3.0 section 13 on every screen with the footer; the links are focusable, so they must be readable | Reapply |
| `index.html` | A "Source code" link after the settings drawer's buttons (`.bn-source-link`) | AGPL-3.0 section 13 during a call, where the footer is hidden | Reapply |
| `main.js` | The `#credits` line: version and the origin credit, through a translation key | Credit to VDO.Ninja | Reapply on the new line |
| `studio/index.html` | Title, the fonts and theme stylesheets and the theme script after `styles.css`, the two "VDO" marks emptied and hidden from screen readers (the theme draws the BytesNation mark), the product name in the preview frame's title | Live Studio carries the brand and drops upstream's mark | Reapply |
| `index.html` | `bytesnation/fonts.css` linked before the theme | Fonts shared with Live Studio | Keep both lines together |
| `podcast/studio.js` | The footer line: "Powered by VDO.Ninja • Low-latency P2P backbone intact •" becomes the origin credit and a "Source code" link, read from the two `bn-` translation keys | Podcast Studio hides the app footer; AGPL-3.0 section 13 and the one credit | Reapply on the footer line |
| `index.html` | `bytesnation/podcast.css` linked after the theme | Podcast Studio theme | Keep with the theme lines |
| `meet.html` | Google Fonts (Sora) links replaced by `bytesnation/fonts.css`; `bytesnation/meet.css` and the theme script before `</head>`; "Powered by VDO.Ninja" replaced by the origin credit and a "Source code" link | Brand, no third-party font requests, AGPL-3.0 section 13 | Reapply |
| `manifest.json` | Name, colors and icons | Product name and brand icons | Take ours |
| `translations/*.json` | Two keys at the top of `innerHTML`: `bn-source-code`, `bn-built-on-vdo-ninja`. English in every file until translated | The credit line goes through the translation system | Keep both keys in every file |
| `AGENTS.md` | "Component sourcing: public tier" block and the Studio notes after it | Brand kit policy | Keep ours below upstream's text |
| `README.md` | Rewritten for BytesNation Studio | The fork's own README, with the credit | Take ours; read upstream's changes for anything the fork should say too |

## Rules to re-check after a merge

- `git diff upstream/develop -- webrtc.js` is empty.
- `node .github/ci-validateTranslations.js` and `node .github/ci-checkTranslationKeys.js` pass.
- `node brand/tools/check-sourcing.mjs --tier public --history` passes.
- A view link and a scene link render the same as upstream's.
- New URL parameters that make a page program output (like `&view`, `&scene` or `&cleanoutput`) are added to `bytesnation/gate.js`.
