[← Tether](../README.md) · [Launch roadmap](launch-roadmap.md)

# Our beta checklist

Implementation reviewed 9 October 2026. This is a local candidate, not a published release.

## Implemented

- [x] Save a pairing credential before sending a create/join request; resume after a lost response or refresh.
- [x] Keep the invitation in the URL until joining succeeds.
- [x] Show a private recovery code in Space settings.
- [x] Restore on another device with credential rotation; old devices/codes lose access.
- [x] End a space for both people, revoke access, and queue recording deletion transactionally.
- [x] Retry queued cleanup during subsequent passes and authenticated end-space operations.
- [x] Bound JSON bodies and validate basic audio-container signatures.
- [x] Allow a recipient to continue when a recording cannot play, and replay the current clip after listening.
- [x] Keep drafts on failed requests; reconcile uncertain pass outcomes and reject drafts from older turns.
- [x] Add request timeouts and disable preview controls while restoring a session.
- [x] Explain current privacy/retention limitations in the app and add a public issue-report link.
- [x] Add the subtle “made by leo” portfolio link.
- [x] Add pairing-attempt and authenticated upload limits.
- [x] Add an automated API regression suite and a CI check workflow.

## Before publishing this candidate

- [ ] Apply `drizzle/0001_voice_cleanup.sql` to the hosted database through the normal deployment workflow, before deploying the new API. Existing participant records are unchanged by this migration.
- [ ] Deploy the API and verify it before publishing the new GitHub Pages bundle. Old API versions do not support restore/end/resume actions.
- [ ] Verify that deployment uses this source revision for both service and static app.
- [ ] Test the deployed candidate with disposable pairs. Do not use personal recordings for debugging.
- [ ] Configure production budget/usage alerts in the hosting account; these were not configured locally.
- [ ] Verify error-log access and avoid recording request bodies, credentials, invitations, or audio in logs.
- [ ] Arrange an operational cleanup sweep if no normal traffic is occurring. The durable queue currently drains opportunistically, not on a schedule. It does not sweep uploads orphaned by a process crash before queue insertion.

## Together, on real devices

- [ ] iPhone Safari → Android Chrome audio, then the reverse.
- [ ] Microphone denial, Bluetooth, screen locking, incoming phone calls, backgrounding.
- [ ] Turn off connectivity while joining and while passing; retry after reconnecting.
- [ ] Save a recovery code, restore in a different browser, verify the previous browser loses access, and save the new code.
- [ ] End a test space and verify both participants lose access and its stored audio is removed.
- [ ] Check keyboard access, screen-reader announcements, zoom, and small-screen layout.
- [ ] Invite 5–10 pairs for 7–14 days once these checks pass.

## Still pending for wider launch

- [ ] Dedicated origin such as tether.leolune.com, with credential migration. Current GitHub Pages localStorage still shares an origin with other repositories owned by the same account.
- [ ] Verify backup retention and complete the public privacy/support policy.
- [ ] Invite expiration/reissue and a documented inactive-space retention period.
- [ ] Validate actual audio decodability/duration where needed. Signature checks reject obvious mismatches but are not a full media decoder.
- [ ] Evaluate a durable device-local draft store. Drafts still disappear when the tab closes/reloads.
- [ ] Verify edge/WAF configuration and tune limits against beta traffic.
- [ ] Optional donations and the small README personality pass.

## Validation evidence

`npm test`: 11 API integration cases pass using real SQLite and a simulated object store, including concurrency, lost-response retries, recovery revocation, cleanup failure, bearer and cookie access, rate limits, and invalid input. This does not replace Cloudflare staging or phone testing.

TypeScript and production builds are checked separately. The workflow under `.github/workflows/checks.yml` runs tests, TypeScript, the service build, and the Pages build once pushed; no hosted CI run is claimed yet.

Recovery codes are bearer secrets, not identity verification. Anyone with a current code can move that participant's access. Old installations without a saved code cannot be recovered after their sole credential is lost. The recovery screen explains this limit.

The onboarding cap is 30 attempts per edge-provided client address per hour, after successful retry lookup. Uploads are capped at 12 attempts per participant per minute. These are initial safeguards, not comprehensive abuse or cost protection.

Local Worker checks also passed for two-way sample WAV exchange, recovery rotation, and deletion using isolated local D1/R2 data. Run `npm run test:worker` against a local Worker at `http://127.0.0.1:8787` after applying both migrations. The broader negative-case Worker smoke encountered intermittent 503 transport errors after rejected uploads; keep this as an explicit staging regression check. The isolated API tests cover those authorization/revision cases successfully.
