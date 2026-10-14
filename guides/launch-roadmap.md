[← Tether](../README.md) · [Development](development.md) · [Publishing](publishing.md)

# Launch roadmap

Reviewed 6 October 2026.

Tether has a coherent working core: two people, one shared turn, one current recording. The next milestone should be a small invited beta. Before a broad public launch, make interrupted pairing, lost access, broken audio, and ending a space recoverable. More messaging features would not solve those problems.

## Audit scope

Reviewed the current GitHub source at [a21f464](https://github.com/leolunelove/tether/commit/a21f464591997986ea4e751b78ec45193f0c84a0), the live GitHub Pages preview, API routes, session/storage helpers, schema, styling, build configuration, and project documentation. Local TypeScript checking passed.

This is a source and read-only interface review, not a completed penetration test, real-device audio matrix, load test, or production infrastructure audit. Production backend parity, edge protections, billing, backups, and monitoring still need verification. Findings below distinguish code gaps from infrastructure checks. Existing local modifications were preserved; no application or deployment changes were made for this roadmap.

## Already in place

- A two-person space with a single-use invitation.
- Server-side holder and revision checks, including conditional updates to prevent simultaneous passes.
- Hashed participant credentials in the database and protected voice retrieval.
- Bounded audio uploads, a two-minute recording limit, and replacement of the previous clip.
- Listen-before-reply behavior, recording, playback, and visible waiting states.
- Responsive layout, labeled controls, keyboard focus styling, and reduced-motion styling.
- GitHub Pages deployment and separate hosted voice service.
- Harry's preview and the requested Daisy lyric.
- A consistent README plus development and publishing guides.

These are foundations to preserve. No feed, multiple consecutive messages, streaks, or engagement reminders are needed for launch.

## Priorities

P0 means resolve before broad public launch. A controlled beta can test unfinished items only with explicit limitations and disposable conversations. P1 means complete during beta or before promoting the app. P2 means optional or evidence-led follow-up.

| Priority | Work | Why it matters | Done when |
| --- | --- | --- | --- |
| P0 | Make pairing retry-agesafe | A create/join can commit on the server while its response is lost. The invite can be consumed before the browser receives its credential. | Fault-injected response loss and repeated requests restore the same intended participant without creating duplicate spaces or admitting a third person. |
| P0 | Define access recovery and device transfer | Pages stores the participant credential in localStorage. Clearing it or changing browsers can permanently strand the pair. Memory-only fallback also loses access on tab close. | A documented recovery or transfer flow works, revoked credentials stop working, and storage failures are explained. Recovery secrets are never logged or put in analytics. |
| P0 | Add end/delete space | There is no leave, delete, or re-pair route. An existing pairing blocks joining another one. | Either person can end the space with confirmation; both credentials are invalidated, active audio is removed, the partner sees an ended state, and both can start again. Retention of backups is documented. |
| P0 | Isolate the app's origin | Repository paths under leolunelove.github.io share a browser origin and localStorage. Other code on that same origin can read the Pages credential. | Tether has a dedicated origin, a reviewed session model, and a safe migration path for existing pairs. Changing a storage key alone does not count. |
| P0 | Make audio failure recoverable | MIME type and duration are client supplied; malformed or unsupported audio can leave someone unable to complete listening and respond. | Target browsers exchange playable audio in both directions. Corrupt, missing, or incompatible audio produces a recovery path without silently losing a turn. |
| P0 | Align privacy promises with reality | The service can access audio; this is not end-to-end encrypted. Current reassurance can imply stronger privacy than implemented. | In-app copy, README, and a privacy notice accurately explain access, storage, replacement, deletion, and retention. |
| P0 | Set abuse and cost boundaries | App code has no rate limiting or creation quotas; deployed edge rules were not audited. | Verify or add create/join/upload limits, bounded JSON bodies, storage cleanup, usage alerts, and operational limits that do not block normal pairs. |
| P1 | Remove demo/session restoration race | Demo controls are active while the saved real session is still loading. The interface can change contexts during an interaction. | A neutral restoring state precedes session selection; demo use is explicit and cannot start recording in a restored real space. |
| P1 | Improve invitation lifecycle | The invite is removed from the URL before joining completes. Refreshing can lose it; there is no expiry/reissue flow. | Interrupted onboarding resumes safely; used/expired links explain next steps; invites can be revoked/reissued and have an agreed expiry. |
| P1 | Preserve work across network failure | Drafts live only in memory; requests lack explicit timeout/cancellation. Uncertain server outcomes and revision changes need reconciliation. | Offline/retry and lost-response tests do not duplicate a pass or silently discard a draft. UI explains whether a pass succeeded. Local draft persistence, if added, has cleanup and privacy rules. |
| P1 | Allow replay of the current received clip | Finishing the first listen changes the main action to recording, without a dedicated replay affordance. | The current clip can be replayed until the reply is passed, without introducing history. |
| P1 | Complete accessibility and mobile checks | Tiny muted text and the audio-centric flow need testing beyond labeled buttons. | Keyboard and screen-reader journeys work; text contrast, zoom, touch controls, recording state, and turn announcements are verified on target devices. |
| P1 | Establish repeatable releases and operations | Frontend and backend deploy separately; current ad hoc test scripts are outside the committed suite and still reference the old Alex fixture. | Tests use maintained fixtures; CI checks critical flows/builds; staging uses separate data; deployed versions are identifiable; rollback and recovery are rehearsed. |
| P1 | Add support and essential information | People need help if their shared space breaks. | A discreet help/contact entry and privacy/deletion explanation are accessible from the app. |
| P2 | Add creator credit and optional tips | Requested personal touch, without changing the free experience. | “made by leo” links to leolune.com; optional support checkout is verified and separate from conversation credentials and audio. |
| P2 | Apply a small personality pass | The README suggestions have not been selected or applied. | A few approved lines add warmth while errors, privacy, and recording instructions remain literal and clear. |

## Recommended rollout

The effort bands below are planning estimates for one experienced developer, not delivery commitments. Recovery/session architecture and real-device findings can materially change them.

### 1. Decide the operating rules — roughly 1–2 focused days

Choose these before schema and session changes:

- **Origin:** recommended destination is a dedicated host such as tether.leolune.com. It is a proposal, not a configured domain. Prefer a same-origin service with an HttpOnly session where practical; review cross-site protections as part of that change.
- **Recovery:** choose a secure recovery code or one-time device transfer first. Full email accounts are not inherently necessary. Define how a lost or compromised credential is revoked.
- **Ending a space:** recommended behavior is that either person can end it for both, with a clear confirmation and no further audio access.
- **Retention:** decide how long unused invitations, inactive spaces, orphaned audio, logs, and backups persist. Do not publish an automatic deletion claim until it is implemented and verified.
- **Privacy:** launch with an honest hosted-service privacy model, or explicitly make end-to-end encryption a separate prerequisite. Encryption requires its own key recovery and multi-device design.
- **Budget:** choose a monthly operating ceiling and alert thresholds before promotion.

Deliverable: a short, agreed product/security specification and a migration plan for existing pairs.

### 2. Build reliability and privacy foundations — roughly 1–2+ weeks

Implement retry-safe pairing, recovery, ending/deleting a space, session/origin changes, invite lifecycle, audio validation/recovery, and abuse controls. Add durable cleanup or reconciliation for failed audio deletions and orphaned uploads.

Use isolated test spaces. Test response loss after database writes, concurrent tabs, stale revisions, invalid credentials, and partial upload failures. Update polling to handle revoked or ended sessions rather than ignoring a null session.

Deliverable: the full lifecycle works, including failure and exit paths.

### 3. Prepare the beta experience — roughly 3–5 focused days

Fix session restoration, replay, offline/timeout copy, mobile layout and accessibility. Add the privacy/help entry and creator credit. Establish automated critical-flow checks, separate staging data, a release checklist, error monitoring without audio/tokens, and billing alerts.

Measure polling before expanding traffic. The current visible-tab interval is four seconds: approximately 900 requests per continuously visible tab-hour. At 100 tabs continuously visible for 24 hours, that would be about 2.16 million requests per day; this is a scenario, not measured usage. Add sensible backoff and focus refresh before committing to a larger realtime redesign.

Deliverable: a candidate build with known limits and an operational owner.

### 4. Run a small invited beta — 7–14 calendar days

Invite 5–10 pairs with a mix of iPhone Safari, Android Chrome, and desktop browsers. Use voluntary feedback; avoid collecting voice contents or relationship information.

Verify:

- Invite creation, joining, accidental refresh, expired/used invites, and already-paired users.
- Audio from each mobile platform to the other, not just recording and playback on the same device.
- Permission denial, Bluetooth/headphones, screen locking, phone interruptions, backgrounding, and slow networks.
- Network loss during create, join, upload, and the response after a successful pass.
- Refresh/reopen, clearing storage, recovery, device transfer, and concurrent tabs.
- End/delete flow, stale sessions, object cleanup, and starting a new pairing.
- Keyboard access, screen-reader labels/state changes, reduced motion, zoom, and contrast.

Proposed beta exit gates: no unresolved lost-access or silent lost-turn bugs in these scenarios; both directions work on the supported device matrix; deletion is verified; no critical authorization findings; cost and errors are observable. Record test evidence and known limitations instead of claiming “fully tested.”

Ask pairs whether waiting feels intentional, whether they know whose turn it is, and whether they remember to return. Use those answers to decide whether a gentle opt-in turn notification is needed.

### 5. Public launch — roughly 1–2 focused days after the gates pass

- Verify production frontend/backend versions and domain/session migration.
- Run a disposable two-person smoke test and confirm help/privacy links.
- Confirm alerts, rollback instructions, and the support contact.
- Publish the concise README and supported-browser/known-limit notes.
- Add a verified optional support link if ready; it must not delay a sound free launch.
- Share gradually and review errors, storage growth, and support reports daily at first.

## The credit and support treatment

Keep the central object and partner as the visual focus. A quiet footer or About area can contain:

> made by leo · support tether

“made by leo” links to [leolune.com](https://leolune.com). Use readable muted text with visible keyboard focus and adequate touch targets; subtle should not mean inaccessible.

The support link can open a small explanation:

> Tether is free to use. If you'd like, you can help keep it running.

Use a hosted one-time tip checkout with optional amount selection. Verify live payment setup, cancellation, return links, receipts, and payout configuration before enabling it. Do not pass space IDs, participant tokens, names, or audio to the payment provider. No recurring prompt, locked feature, or payment request during listening/recording is needed. No payment setup was performed in this audit.

## After launch

Prioritize these using beta evidence:

1. One opt-in notification when the shared object returns, if pairs need it. Avoid repeated nudges and streaks.
2. Install-to-home-screen support and better interruption handling.
3. A larger privacy project if end-to-end encryption becomes a product requirement.
4. Further accessibility options for people who cannot listen or speak, with explicit privacy choices.
5. Realtime delivery only if measured polling costs or latency justify it.

Keep multi-chat lists, public profiles, feeds, and conversation history out of scope unless the central product idea changes.

## Evidence and follow-up checks

Code references at the reviewed revision:

- [Interface, recording and invitation state](https://github.com/leolunelove/tether/blob/a21f464591997986ea4e751b78ec45193f0c84a0/app/page.tsx)
- [Create/join/listened API](https://github.com/leolunelove/tether/blob/a21f464591997986ea4e751b78ec45193f0c84a0/app/api/space/route.ts)
- [Voice authorization and upload](https://github.com/leolunelove/tether/blob/a21f464591997986ea4e751b78ec45193f0c84a0/app/api/voice/route.ts)
- [Browser credential and request handling](https://github.com/leolunelove/tether/blob/a21f464591997986ea4e751b78ec45193f0c84a0/lib/client-api.ts)
- [Server session and storage helpers](https://github.com/leolunelove/tether/blob/a21f464591997986ea4e751b78ec45193f0c84a0/lib/space-server.ts)
- [Database schema](https://github.com/leolunelove/tether/blob/a21f464591997986ea4e751b78ec45193f0c84a0/db/schema.ts)

[MDN documents localStorage as origin-scoped](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), including private-browsing persistence limits. The shared-origin concern applies to other applications on the same leolunelove.github.io origin, not unrelated GitHub Pages owners.

Still to inspect: deployed edge/WAF rules, actual storage/billing, backup and restore policy, dependency advisories, backend deployment parity, and real-device results. No vulnerability is asserted merely from a package version or an uninspected infrastructure setting.

