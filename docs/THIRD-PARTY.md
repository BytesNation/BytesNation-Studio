# Third-party components

BytesNation Studio is licensed under the GNU AGPL-3.0, like the VDO.Ninja engine it is built on. Every component BytesNation added is under a license compatible with distribution under AGPL-3.0: MIT, ISC, Apache-2.0, 0BSD, or the SIL Open Font License 1.1 for fonts. None is copyleft-incompatible, and none is fetched from a CDN at runtime.

## Upstream engine

| Component | License | Notes |
|---|---|---|
| VDO.Ninja by Steve Seguin ([steveseguin/vdo.ninja](https://github.com/steveseguin/vdo.ninja)) | AGPL-3.0 | The engine and every upstream file. Upstream's `LICENSE`, `LICENCE.md`, `AGPLv3.md` and all copyright and license notices are kept unchanged. |
| Upstream's bundled libraries in `thirdparty/`, `lineawesome/` and `translations/` | As noted in each file | Unchanged; covered by upstream's own notices. |

## Bundled into `bn/` (shipped to browsers)

| Package | Version | License | Used for |
|---|---|---|---|
| react, react-dom | 19.3.1 | MIT | Shell UI |
| scheduler | 0.28.0 | MIT | React dependency |
| @radix-ui/react-dialog | 1.3.1 | MIT | About dialog |
| @radix-ui/react-tooltip | 1.4.1 | MIT | Tooltips |
| @radix-ui/react-slot | 1.5.0 | MIT | Button `asChild` composition |
| @radix-ui/* (primitive, compose-refs, context, dismissable-layer, focus-guards, focus-scope, id, popper, portal, presence, primitive, use-* hooks, visually-hidden, rect, arrow, collection, direction, roving-focus, menu) | 0.0.5 to 2.2.1 | MIT | Radix internals |
| @floating-ui/core, dom, react-dom, utils | 0.2.12 to 2.1.9 | MIT | Tooltip positioning (Radix dependency) |
| aria-hidden, react-remove-scroll, react-remove-scroll-bar, react-style-singleton, use-callback-ref, use-sidecar, get-nonce, detect-node-es | various | MIT | Dialog focus and scroll locking (Radix dependencies) |
| tslib | 2.9.1 | 0BSD | Runtime helpers |
| class-variance-authority | 0.7.1 | Apache-2.0 | Component variants |
| clsx | 2.1.1 | MIT | Class names |
| tailwind-merge | 2.6.2 | MIT | Class conflict resolution |
| motion ([motion.dev](https://motion.dev)), with framer-motion, motion-dom, motion-utils | 14.14.0 (motion-utils 14.7.0) | MIT | Shell animation: dialogs, command palette, status readouts, launcher reveal |
| sonner ([sonner.emilkowal.ski](https://sonner.emilkowal.ski)) | 2.0.8 | MIT | Notifications |
| cmdk ([cmdk.paco.me](https://cmdk.paco.me)) | 1.1.1 | MIT | Command palette |
| lucide-react | 1.79.0 | ISC | Shell icons; also the source of the launcher tile icons embedded in `bn/theme.css` |
| @fontsource/inter-tight (Inter Tight) | 5.3.0 | SIL OFL 1.1 | UI typeface, self-hosted in `bn/assets/` |
| @fontsource/geist-mono (Geist Mono) | 5.3.0 | SIL OFL 1.1 | Mono typeface, self-hosted in `bn/assets/` |

The UI components in `bn-shell/src/components/ui/` follow the [shadcn/ui](https://ui.shadcn.com) patterns (MIT) over Radix primitives. Everything else in the shell and theme was written for this project.

Not used anywhere in this repository: shadcnblocks.com blocks, the shadcnblocks registry, or any content derived from them.

## Build and test only (not shipped)

| Package | Version | License |
|---|---|---|
| vite | 7.3.8 | MIT |
| @vitejs/plugin-react | 5.2.0 | MIT |
| tailwindcss | 3.4.19 | MIT |
| postcss | 8.5.33 | MIT |
| autoprefixer | 10.7.0 | MIT |
| typescript | 5.9.3 | Apache-2.0 |
| @playwright/test, playwright | 1.65.1 | Apache-2.0 |
| @axe-core/playwright, axe-core | 4.14.1 | MPL-2.0 (test tooling only; never bundled or shipped) |
| @types/react, @types/react-dom, @types/node | 19.3.1, 19.3.0, 24.19.2 | MIT |

Their transitive dependencies are pinned in `bn-shell/package-lock.json`.

## Brand assets

The BytesNation mark, wordmark and favicons in `bn/brand/` (source: `bn-shell/public/brand/`), and the link preview image `bn/preview-card.png`, are BytesNation brand assets taken from [bytesnation.com](https://bytesnation.com). The AGPL covers this repository's code; it grants no trademark rights to the BytesNation name or mark.

## Checking this list

From `bn-shell/`, list every runtime package and its license:

```
npm ls --omit=dev --all --parseable | tail -n +2 | while read d; do node -e 'const p=require(process.argv[1]+"/package.json");console.log(p.name, p.version, p.license)' "$d"; done | sort -u
```

Update this file whenever a dependency is added, removed or upgraded across a major version.
