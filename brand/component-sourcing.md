# Component sourcing

Where a BytesNation interface may get its sections from, and how a public repository is built without Shadcnblocks.

**The rule in four lines**

1. A **private** repository may start a section from a Shadcnblocks block, then restyle it to the brand.
2. A **public** repository holds no Shadcnblocks code, no registry entry, and nothing ported from a block. It builds from this kit and from open-source parts.
3. A repository that has ever held block code never becomes public.
4. An open-source project, and any fork of one, is a public-tier project. Block code and copyleft code never share a program.

The brand is the same in both tiers. Tokens, type, the `bn-*` primitives, the springs, the mark and the Signal Mesh are BytesNation's own work and travel anywhere. Only the starting point for page sections differs.

## Why

The Shadcnblocks licence allows unlimited end products, including public websites and paid apps. It restricts where the source can live. As read on 2026-11-25 at [shadcnblocks.com/license](https://www.shadcnblocks.com/license) and [shadcnblocks.com/terms](https://www.shadcnblocks.com/terms):

| The licence says | What it means here |
|---|---|
| Its restrictions include "Publishing the Components or Derivatives in a public repository." | Block code stays in private repositories. |
| It defines a derivative as "Any work that reproduces a substantial part of a Component, including its code, structure, layout, default content, or images, in any form." | A block that was ported to Astro and restyled can still be a derivative. Restyling does not make it publishable. |
| Its restrictions include "Rewriting, restyling, or passing Components through an AI tool and distributing the result as a new library, kit, or catalog." | An agent may not rebuild a block for a public repository. Asking for "the same section without the licence" is the thing the licence forbids. |
| No UI library, design kit, theme, template or starter kit built from the components may be distributed, "for sale or for free." | This kit contains no block code, so it can be shared. Keep it that way. |
| The licence it grants is "non-exclusive, non-transferable", and "All rights not expressly granted" are reserved. Neither page mentions open-source licences. | You cannot pass on the right to copy blocks, which is what an open-source licence does. A project that contains blocks cannot be released as open source. |
| The Terms forbid sharing or publishing API keys or account access. | The registry key lives in a gitignored `.env` and nowhere else. |
| The Standard licence is "held by one individual"; a Team licence covers up to 10 employees and contractors. | Who may work with block code depends on the plan held: see "The licence held" below. |
| The Terms forbid using the components to train, fine-tune or evaluate an AI model, or to build a dataset. Working on your own end product is the exception. | Agents may use blocks to build the product. Block code does not go into datasets, evals or public prompts. |

Free blocks are a grey area: the Terms let a free block sit in a public repository whose purpose is the end product, while the licence page lists public-repository publishing as a restriction without that exception. The policy here does not rely on the exception. **No Shadcnblocks material of any kind goes into a public repository.**

This is a working policy, not legal advice. Reread both pages when the licence is renewed or upgraded, and update the date above.

### What a breach costs

The licence says: "If you breach this license, Shadcnblocks.com may suspend or terminate your license and access to its services." Termination "ends your right to access and download Components and to start new End Products with them." Products finished before termination "may continue to use the Components already incorporated in them", as long as that use still follows the licence. The Terms add that the registry key can be revoked and the account closed.

So the exposure is the licence itself and every future project, not the sites already live. Three things put it at risk: block code in a public repository, the key in a commit or a log, and someone other than the licence holder working with block code.

### The licence held

Which plan is held, and who it covers, is written in the private ledger, not here, because this kit is copied into public repositories. What follows holds for a single-user plan, of which the licence says: "Only the Licensee may access and use the Components."

- **One person works with block code:** the licence holder.
- **Before anyone else gets access** to a private-tier repository, whether a collaborator, a contractor or a client, the licence moves to the Team plan, which covers up to 10 employees and contractors. Removing the block-started files first is not enough, because history keeps them.
- **Coding agents.** Neither page says whether an agent may act for the licence holder. The Terms name the shadcn CLI, its MCP server and the IDE extension as the permitted ways to reach the registry by tool, and their ban on feeding components to AI models makes an exception for work on your own end product. So agents here use the holder's key, through the shadcn CLI, on the holder's own repositories, and nowhere else.

## The two tiers

| | Private tier | Public tier |
|---|---|---|
| Repository visibility | Private, permanently | Public |
| `@shadcnblocks` registry in `components.json` | Allowed | Never |
| `SHADCNBLOCKS_API_KEY` | In a gitignored `.env` only | Not present, not named in config |
| Files that began as a block | Allowed, each listed in the ledger | Never, in any commit |
| shadcn/ui from its own registry (MIT) | Allowed | Allowed |
| This kit | Allowed | Allowed |
| Tier marker at the repository root | `.brand-tier` containing `private` | `.brand-tier` containing `public` |
| Guard | Private checks | Public checks, with history |

A repository declares its tier in a one-word file named `.brand-tier` at its root. A repository without the file has not adopted the policy yet: add the file before the first UI commit.

### Register

Keep one list of which repository is in which tier. It names private repositories, so it does not live in this kit, which is copied into public ones. The website repository keeps it in `docs/shadcnblocks-ledger.md`. Add a row there when a repository adopts the kit or starts using blocks.

## Private tier

1. **It stays private.** Visibility is never changed, by anyone, for any reason. See "Moving between tiers".
2. **The key stays out of git.** `SHADCNBLOCKS_API_KEY` is read from a gitignored `.env`. It is never printed, logged, pasted into a chat, hard-coded or committed. `.env.example` holds the name with no value.
3. **A block is a starting point.** Install it, then make it the brand's: move every color to a token, bring radii down to the three steps, remove shadows, gradients and pills, replace stock copy and images, port it to static markup when it has no state, and delete what the page does not need. A block that still looks like its demo is unfinished.
4. **Every block is recorded.** The file gets a comment at the top that names the block, and a row in `docs/shadcnblocks-ledger.md`, in the same commit.
5. **Nothing leaves.** A ledgered file is not copied, in whole or in part, to a public repository, a gist, an issue or pull request on a public repository, a public paste, a published package, or a public page of any kind. The deployed website is fine: that is the end product.
6. **Packages are unpublishable.** Every `package.json` carries `"private": true`.
7. **Access matches the licence.** Under a single-user plan, adding a collaborator to a private-tier repository needs the Team plan first.

Run the guard before a pull request merges:

```
node brand/tools/check-sourcing.mjs --verify-visibility
```

It fails when a `.env` file is tracked, when a value is assigned to the key anywhere in the tree, when the `.env` beside `components.json` is not ignored, when a file mentions Shadcnblocks without a ledger row, when a `package.json` lacks `"private": true`, or when GitHub reports the repository as public.

## Public tier: the method

A public repository reaches the same brand by a different road. It never looks at a block.

### Set up

1. Copy the `brand/` folder from the website repository into the new one.
2. Add `.brand-tier` at the root, containing the word `public`.
3. Load the brand: `brand/css/bytesnation.css` on its own, or with Tailwind v4 through `brand/tokens/tailwind.css`. The steps are in `brand/README.md`.
4. Add the guard to CI: copy `brand/tools/brand-guard.workflow.yml` to `.github/workflows/brand-guard.yml`.
5. Paste the "For agents" block below into the repository's `AGENTS.md` or `CLAUDE.md`.

### Build order

For each piece of interface, take the first rung that does the job.

| Rung | Use | Source |
|---|---|---|
| 1 | A `bn-*` primitive covers it | `brand/css/bytesnation.css` |
| 2 | A composition of primitives | The composition rules in `brand/guidelines.md`: a hairline, a grid column, a label, a title, one action |
| 3 | It needs behavior and the platform has it | Native HTML: `<details>`, `<dialog>`, the popover attribute, radio groups, `:has()` |
| 4 | It needs behavior the platform lacks | shadcn/ui from its own registry (`npx shadcn@latest add dialog`), or Radix primitives directly, styled through the token bridge |
| 5 | It needs motion | The Motion library with the kit's springs |
| 6 | Nothing above fits | Write it from the guidelines. If it will be reused, propose it as a new primitive in the kit |

shadcn/ui components arrive with rounded corners, rings and shadows of their own. The bridge in `brand/tokens/tailwind.css` clamps the radius scale and points the ring at the text color. Remove any shadow, and never use a pill-shaped badge.

### Clean room

The method only works if block layouts never enter the work.

- Do not open the Shadcnblocks catalog, registry or documentation for reference while working on a public repository.
- Do not open a ledgered file from a private repository for reference, and do not paste one into the session.
- Do not describe a block to an agent and ask for an equivalent.
- A session that has read ledgered files does not write section layouts for a public repository. Start a fresh session that has the kit and nothing else.

Building the same kind of section twice, once from a block in private and once from the guidelines in public, is expected. The two will share the brand and differ in structure. That difference is the point.

### What may be carried from a private repository

| May be carried | May not be carried |
|---|---|
| The `brand/` folder | Any file in the private repository's ledger |
| Content: articles, copy, data, diagrams, images made for the brand | Any file that imports a ledgered file |
| Code that is not interface layout: build scripts, content plugins, utilities | Any file written by adapting a ledgered file |
| Original interface code that is not in the ledger and passes the test below | `components.json` with the `@shadcnblocks` registry, `.env.example` with the key name |

The test for original interface code: it is not in the ledger, it does not import a ledgered file, and nobody opened a block while writing it. When there is any doubt, rebuild it from the kit.

### The guard

```
node brand/tools/check-sourcing.mjs --tier public --history
```

It fails when any tracked file other than prose names Shadcnblocks or its key, and, with `--history`, when any commit ever added or removed such a line. Markdown and text files may name Shadcnblocks, because a repository has to be able to state this policy. The `brand/` folder is skipped for the same reason.

The guard matches names, not layouts. It catches a registry entry, an install command in a script, a provenance comment and a copied config file. It cannot recognize a block that was pasted in with its comments removed. The clean-room rules are what prevent that; the guard is the backstop.

## Moving between tiers

**Private to public: never by changing visibility.** Git history keeps every file that was ever committed, so deleting block-started files first does not help. To open-source work that lives in a private repository:

1. Create a new repository with a fresh history.
2. Bring over only what the "may be carried" table allows.
3. Rebuild every section that began as a block, using the public method, in a clean session.
4. Add `.brand-tier` with `public` and run the guard with `--history` before the first push.

**Public to private** is always allowed. Change `.brand-tier` to `private`, start the ledger, and the private rules apply from then on. The repository cannot go back.

**Shared packages.** A package that contains block code is consumed through the workspace or a private registry only. It is never published to a public registry.

## Open-source software

Two directions, and they have different answers.

### Releasing BytesNation code as open source

A repository that contains block code cannot be open-sourced. An open-source release is a public repository, and the licence forbids publishing components or derivatives in one. An open-source licence also grants everyone the right to copy and redistribute the code, which is a right the Shadcnblocks licence does not let you pass on.

So an open-source BytesNation project is a public-tier project from its first commit. It is built from this kit and never sees a block.

### Bringing open-source software into a BytesNation project

What matters is the incoming licence, and whether it can oblige you to publish your own source.

| Incoming licence | Examples | In a private-tier project, which holds block code | In a public-tier project |
|---|---|---|---|
| Permissive | MIT, BSD, ISC, Apache-2.0 | Fine. Keep the licence notices. | Fine |
| Weak copyleft | MPL-2.0, LGPL | Fine as a separate library or file. Changes to those files must be shared. Your own files, and the blocks, need not be. Never paste block code into a file under one of these licences. | Fine |
| Strong copyleft | GPL | Fine as a tool you run: a build step, a command-line program, a server you do not change. Not fine linked or bundled into the same program as block code, when that program reaches anyone else. Scripts sent to a browser count. | Fine, and the project takes the GPL |
| Network copyleft | AGPL | Never in the same program as block code. Serving users over a network is enough to owe them the source of your version. An unmodified AGPL service running beside the project, as its own program, is fine. | Fine, and the project takes the AGPL |

**Block code and copyleft code never go into the same program.** Copyleft can oblige you to publish that program's whole source. The Shadcnblocks licence forbids publishing blocks. Only one of the two can be kept, so they stay apart.

### Forks

A fork of an open-source project is a public-tier project, whatever its visibility.

- If the fork is public, the public-tier rule already applies.
- If the fork is under a copyleft licence, making it private does not help. The licence still obliges you to give your users the source of your version.

A fork gets the BytesNation look from the kit alone: the tokens, `brand/css/bytesnation.css` and the mark. The kit's own files then go out under the fork's licence as part of it, which is fine, because they are BytesNation's own work. The name and the mark stay BytesNation's: see `brand/LICENSE.md`.

Licence compatibility is a legal question. This table is the working rule, chosen to keep block code well away from any duty to publish it.

## For agents

Paste this into the `AGENTS.md` or `CLAUDE.md` of a **public** repository:

```markdown
## Component sourcing: public tier

This repository is public. It must never contain Shadcnblocks code, a
`@shadcnblocks` registry entry, the `SHADCNBLOCKS_API_KEY` name in config, or
anything ported or adapted from a Shadcnblocks block. The licence forbids it,
and restyling or rewriting a block does not change that.

- Build interface from `brand/`: the tokens, the `bn-*` primitives in
  `brand/css/bytesnation.css`, the springs and the mark. Follow
  `brand/guidelines.md`.
- For behavior, use native HTML first, then shadcn/ui from its own registry
  (`npx shadcn@latest add <name>`) or Radix primitives, styled through
  `brand/tokens/tailwind.css`.
- Do not open the Shadcnblocks site or registry. Do not read, copy or adapt
  interface files from any private BytesNation repository. If this session has
  already read such files, stop and say so before writing any layout.
- Run `node brand/tools/check-sourcing.mjs --tier public --history` before
  every commit that touches interface code. It must pass.
- If this repository is open source or a fork of an open-source project, the
  rule holds even if the repository is made private: its licence may require
  the source to be given to users.

The full policy is in `brand/component-sourcing.md`.
```

A **private** repository's instructions say instead: this repository is in the private tier, blocks are allowed as starting points, every block-started file is recorded in `docs/shadcnblocks-ledger.md`, and the repository's visibility is never changed.

## Review checklist

Before merging interface work in a public repository:

- [ ] The guard passes with `--history`.
- [ ] `components.json`, if present, lists no registry other than shadcn/ui's own.
- [ ] No file was copied from a private repository's ledger.
- [ ] The work was written in a session that had not read block code.
- [ ] It follows the done checklist in `brand/guidelines.md`.

Before merging interface work in a private repository:

- [ ] The guard passes with `--verify-visibility`.
- [ ] Every new block has a comment in its file and a row in the ledger.
- [ ] The block was restyled to the brand: tokens only, three radius steps, none of the banned effects.
