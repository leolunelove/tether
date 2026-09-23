[← Tether](../README.md) · [Publishing](publishing.md)

# Development

The interface and voice service share one source tree. Use the local server for the complete experience, or build the static interface for GitHub Pages.

## Requirements

- Node.js 22.13 or later
- npm
- A recent browser; microphone recording requires HTTPS or localhost

## Local setup

Clone the repository and install the locked dependencies:

```sh
git clone https://github.com/leolunelove/tether.git
cd tether
npm ci
```

Build the Worker configuration and initialize the local database:

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_faulty_paper_doll.sql
```

Start the local Worker to use the initialized database:

```sh
npm run start
```

Open the local URL printed in the terminal. For interface development with hot reload, use `npm run dev`; this starts the development server on port 5173. The preview includes sample audio and does not require a microphone to try the exchange.

Local data is kept in `.wrangler/` and is excluded from version control. Production storage is separate.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Shared space, playback, recording, and invitation flow |
| `app/globals.css` | Visual design and motion |
| `app/api/` | Pairing, turn changes, and protected audio endpoints |
| `lib/` | Participant sessions, API access, and shared helpers |
| `components/ui/` | Reusable interface components |
| `db/` · `drizzle/` | Database schema and migrations |
| `public/` | App icon and sample recordings |
| `github-pages/` | Static interface entry point |
| `docs/` | Generated GitHub Pages output; do not edit by hand |
| `guides/` | Project documentation |
| `scripts/` · `build/` | Build and runtime helpers |

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the interface development server |
| `npm run build` | Build the Worker application |
| `npm run start` | Run the built Worker locally |
| `npm run build:pages` | Generate the static site in `docs/` |
| `npm run db:generate` | Generate migrations after a schema change |
| `npx tsc --noEmit` | Check TypeScript |

After a database change, generate a new migration and apply that migration to the local database before testing. Production migrations are applied through the hosting workflow.

## Connection model

A space admits two participants through a single-use invitation. The current holder must finish listening before replying. Each successful pass changes the holder and replaces the previous recording; a conditional database update prevents two simultaneous passes from creating extra turns.

The Pages interface stores a participant credential in browser storage. The same-origin Worker interface uses an HttpOnly cookie. Pairing, turn state, and audio are stored on the service. Browser storage contains no conversation history.

The voice endpoint accepts clips up to two minutes and 8 MB. A failed pass keeps the draft in the open page for another attempt. Closing or reloading the page discards an unsaved draft.

## Checks before publishing

For interface changes, run:

```sh
npx tsc --noEmit
npm run build:pages
```

For service changes, also run `npm run build` and check the exchange using two separate browser profiles:

1. Create a space, join with its invitation, and confirm the invitation cannot be reused.
2. Record and pass a clip. Confirm the sender must wait while the recipient holds the space.
3. Listen to the end, reply, and pass it back. Confirm the previous recording is replaced.
4. Refresh each browser and confirm each participant keeps the correct end.

Use disposable test spaces and sample audio where possible. Check microphone capture on the intended devices when changing recording behavior. There is no automated test command committed to this repository.
