# BytesNation Studio

Peer-to-peer video for live production: bring cameras, screens and remote guests into OBS or any studio software, from a browser, with a director's control room for group calls.

BytesNation Studio is built on [VDO.Ninja](https://github.com/steveseguin/vdo.ninja) by Steve Seguin, licensed under AGPL-3.0. It is a fork with BytesNation's interface. The engine is upstream's, unchanged; this project is not affiliated with or endorsed by VDO.Ninja or Steve Seguin.

## Source and licence

This fork is licensed under the GNU Affero General Public License version 3 only, like the code it builds on. See [LICENCE.md](LICENCE.md) and [LICENSE](LICENSE). Original example code under [`examples/`](examples/) is MIT, as [examples/LICENSE](examples/LICENSE) says.

Anyone who serves a modified version to users over a network must offer those users its source. The app links to this repository from its start screen for that reason.

The BytesNation name and mark are not licensed with the code. See [brand/LICENSE.md](brand/LICENSE.md). The VDO.Ninja name and logos belong to their owner and are not used for this product.

## What is in this repository

| Path | What it is |
|---|---|
| `index.html`, `main.js`, `lib.js`, `webrtc.js` | The app and its engine, from upstream |
| `bytesnation/` | The BytesNation interface: theme, fonts, icons, and the list of upstream files the fork edits |
| `brand/` | The BytesNation brand kit, version 2.0.0 |
| `studio/`, `podcast/` | Live Studio and Podcast Studio |
| `translations/` | Interface text in each language |

## Run it locally

There is no build step. Serve the repository root and open `http://localhost:8080/`:

```sh
python -m http.server 8080 --bind 127.0.0.1
```

The server does not map paths without `.html`, so open other pages with the extension, such as `/mixer.html`. Phones and other devices need HTTPS.

## Hosted services

Rooms are set up through a signalling server, and connections may use STUN and TURN servers. This fork uses VDO.Ninja's hosted services through upstream's unmodified `webrtc.js`, under their [Terms of Service](https://docs.vdo.ninja/help/privacy-and-security-details/vdo.ninja-terms-of-service) and [Privacy Policy](https://docs.vdo.ninja/help/privacy-and-security-details/vdo.ninja-privacy-policy). Do not edit `webrtc.js` while it connects to those services; read [AGENTS.md](AGENTS.md) first. [install.md](install.md) and [turnserver.md](turnserver.md) cover hosting your own.

## Contributing

Read [AGENTS.md](AGENTS.md) before changing anything. Run the translation checks and the brand guard before a pull request:

```sh
node .github/ci-validateTranslations.js
node .github/ci-checkTranslationKeys.js
node brand/tools/check-sourcing.mjs --tier public --history
```

Changes that belong in the engine go upstream to [steveseguin/vdo.ninja](https://github.com/steveseguin/vdo.ninja), under its [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation

The engine's URL parameters, IFRAME API and integrations are documented upstream at [docs.vdo.ninja](https://docs.vdo.ninja). The [IFRAME API guide](IFRAME.md) is in this repository.
