# Tether

**Open and share:** https://leolunelove.github.io/tether/

**Repository:** https://github.com/leolunelove/tether

A private voice space shared by two people. One person holds the space, listens, records, and passes it to the other. Only the latest recording exists in the conversation; there is no feed or history.

## Use

The first visit opens a clearly labeled sample space. Listen to the sample, record a reply or choose a sample reply, and pass it across. “Try Alex’s side” lets you experience the receiving end.

Choose **Make it yours** to create a real space, then share the single-use invitation with your person. Anyone can open the Pages link. The invitation admits one person to your conversation; recordings remain restricted to the paired participants.

On GitHub Pages, each browser stores a participant credential locally; the original same-origin app uses an HttpOnly cookie. Pairing, turn state, and audio are stored on the backend, not in browser storage. Return using that browser. Clearing its site data loses access to that end; account recovery and moving a session between devices are not implemented. Real microphone recording needs HTTPS or localhost and browser permission.

## Behavior

- A space admits exactly two participants. Invitations become invalid after joining.
- The holder must finish playback before replying. Clips may be up to two minutes and 8 MB.
- Turn changes use an atomic conditional update, so duplicate or concurrent passes cannot create extra turns.
- A successful pass replaces the previous recording. Audio is only served to the current holder.
- D1 stores pairing and turn state. R2 stores audio. Audio is access-controlled; this app does not implement end-to-end encryption.
- Connection errors keep the current recording in the browser so the user can retry. Unsaved recordings do not survive closing or reloading the page.
- Sample voices are synthesized and contain no real conversations.

## Development

Requires Node 22.13+ and npm. Run `npm ci`, then `npm run dev`. Run `npm run db:generate` after changing `db/schema.ts`, and `npm run build` for the Worker build. Apply local migrations with:

```
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_faulty_paper_doll.sql
```

Sites owns production storage and migration application. Its project identity and logical bindings are in `.openai/hosting.json`.

The page exposes a feature-detected, read-only WebMCP tool, `get_shared_space_state`, which reads the same state shown in the interface.

## Verification

TypeScript checks and production build. Local HTTP integration checks cover pairing, single-use invitations, unauthorized voice access, listening before replying, reciprocal turn ownership, audio integrity, concurrent sends, and stale revisions. Browser checks cover the responsive surface, sample playback, and valid/invalid WebMCP inputs. Live microphone capture requires the user’s device permission and was not recorded during automated verification.

## GitHub Pages deployment

The complete source is in this repository. The committed `docs/` folder is the static Pages build. GitHub Pages publishes **main → /docs**. To update the interface:

```sh
npm ci
npm run build:pages
git add app components lib github-pages scripts vite.pages.config.ts docs
git commit -m "Update Tether"
git push
```

Pages cannot run the voice API. The interface connects to `https://tether-voice-space.leolunelove.chatgpt.site`, which provides D1/R2 storage and enforces the turn rules. That service allows the `https://leolunelove.github.io` origin and uses per-participant credentials; no service secret is included in the Pages build. Backend source changes must be published to the existing Sites project separately.

The build supports `PAGES_BASE` and `TETHER_API_ORIGIN` overrides. A fork needs its own backend deployment and allowed origin, and should not reuse this project’s hosting identity.

Cross-origin verification covers preflight, rejected unrelated origins, participant-session restoration, one-use pairing, unauthorized audio, the listening gate, and simultaneous passes. The original same-origin cookie flow is also checked.
