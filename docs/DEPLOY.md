# Hosting on Cloudflare

BytesNation Studio runs on Cloudflare Workers as static assets plus one small script. There is no server to run and nothing self-hosted. Everything for it lives in `deploy/cloudflare/`.

## What exists in Cloudflare

| Worker | Address | Purpose |
|---|---|---|
| `bytesnation-studio` | `https://studio.bytesnation.com` (custom domain), plus its workers.dev address | Production |
| `bytesnation-studio-preview` | its workers.dev address only | Staging: check a build on Cloudflare's edge before it reaches the real hostname |

Both live in the Cloudflare account that holds the `bytesnation.com` zone. The DNS record and certificate for `studio.bytesnation.com` are created and managed by Cloudflare as part of the custom domain. Do not add a DNS record for that hostname by hand: Cloudflare refuses a custom domain on a hostname that already has one.

First deployed 2026-11-24 from `redesign/ui-v1` at `c0a6a8d`. The commit a deployment was built from is always at `/bn/deploy.json` on the live site.

## Cost

Nothing, on the Workers free plan:

- Requests for static assets are free and unlimited, and storing them is free. That is every page, script, style sheet, font, image and model except the two cases below.
- The script runs only for media files and one oversized model. Those requests count against the free plan's 100,000 script requests a day. If that were ever used up, only those files would return an error until the next day; the rest of the site keeps serving.
- The custom domain and its certificate are free.

No R2, KV, Durable Objects or paid add-ons are used.

## Why there is a script at all

Plain static assets cannot do two things the engine needs. `src/worker.ts` does only these:

1. **Byte ranges for media.** Cloudflare's static assets answer a `Range` request with the whole file. Safari will not play video without ranges, and `media/micro.mp4` is the engine's keep-alive player on Safari and iOS. The script answers ranges for `.mp4`, `.webm`, `.mov`, `.m4a`, `.mp3`, `.wav` and `.ogg`.
2. **One file over the 25 MiB asset limit.** `thirdparty/longpipe/models/v/0.0.4/model_xl.bin` (46.6 MB) is the top-quality model for background effects. The build splits it into parts, and the script streams them back as the one file the engine requests.

Which requests reach the script is the `run_worker_first` list in `wrangler.jsonc`. The build fails if a media file or an oversized file is not covered by it, so an upstream update cannot quietly break either case.

## Hosting behavior, and where it comes from

The engine expects the behavior of upstream's reference hosting (the NGINX example in `install.md`):

| Behavior | How |
|---|---|
| `/mixer` serves `mixer.html` | `html_handling` default |
| `/mixer.html` redirects to `/mixer`, keeping the query | `html_handling` default |
| An unknown path serves the app, which reads it as a room name | `not_found_handling: single-page-application` |
| Every response allows cross-origin use | `_headers`, and the script for its own responses |
| Plain `http` redirects to `https` | The `bytesnation.com` zone's Always Use HTTPS setting |

Signaling, STUN and TURN are untouched: the site uses upstream's defaults through the unmodified `webrtc.js`, as upstream's terms require.

## Deploying

A deployment is built from a git ref with `git archive`, so only committed, tracked files are published. `bn-shell/`, `docs/`, `deploy/` and `.github/` are left out.

```
# Stage on the preview Worker (workers.dev only; never touches DNS)
CLOUDFLARE_ACCOUNT_ID=<account id> node deploy/cloudflare/deploy.mjs --target preview --ref <ref>

# Then production
CLOUDFLARE_ACCOUNT_ID=<account id> node deploy/cloudflare/deploy.mjs --target production --ref <ref>
```

- Deploy a pushed commit. The site's footer and About view link to this repository as its source, which the AGPL requires for a network service.
- `deploy.mjs` builds the site, runs `wrangler deploy`, then runs `verify-site.mjs` against the live address and fails if any check fails.
- `CLOUDFLARE_ACCOUNT_ID` is required and is deliberately not stored in this public repository. Find it with `wrangler whoami`. Pinning it stops a deploy from landing in whichever account the stored credentials resolve to.
- A bare `wrangler deploy` in `deploy/cloudflare/` targets the preview Worker. Production needs `--env production`.
- Uses the `wrangler` already installed on the machine (4.83 or later). The compatibility date in `wrangler.jsonc` is one that version's local runtime supports, so `wrangler dev` works for local checks.

## Checking a deployment

```
node deploy/cloudflare/verify-site.mjs --base https://studio.bytesnation.com
```

It checks the hosting behaviors above, that development paths are not published, that the engine files served are byte-identical to the commit in `/bn/deploy.json`, that the model streams back whole, and that media answers byte ranges. It works against `wrangler dev`, the preview and production alike.

The parity suite can also run against a deployment: `BN_BASE=<address>/ npm run test:parity` from `bn-shell/`.

## Rolling back

- **To the previous build:** deploy the earlier ref again, or use `wrangler rollback --env production` in `deploy/cloudflare/`.
- **To take the site down:** remove the `routes` entry under `env.production` and deploy, or delete the `bytesnation-studio` Worker. Cloudflare removes the DNS record it created.

## Known behavior

- **A new hostname takes a few minutes.** On the first production deploy the edge served the site at once, and the public DNS record appeared about eight minutes later. A machine that looked the name up before then can cache "no such host" for up to 30 minutes. `verify-site.mjs` falls back to a direct DNS query for that reason.
- **Search indexing.** The workers.dev addresses send `X-Robots-Tag: noindex`. The custom domain serves upstream's `robots.txt` unchanged, and `index.html` still declares `vdo.ninja` as its canonical address, so search engines treat it as a copy of upstream. Changing either is a product decision.
- **Pages that point at upstream.** `comms.html` and a few examples load `https://vdo.ninja/` directly; see [FEATURE-INVENTORY.md](FEATURE-INVENTORY.md).
