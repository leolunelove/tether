[← Tether](../README.md) · [Development](development.md)

# Publishing

Tether has two deployments: the public interface on GitHub Pages and the voice service that handles pairing, turn ownership, and audio storage.

## Live site

**[Open Tether](https://leolunelove.github.io/tether/)**

| Setting | Value |
| --- | --- |
| Repository | `leolunelove/tether` |
| Branch | `main` |
| Pages source | Deploy from a branch |
| Publishing folder | `/docs` |
| Base path | `/tether/` |
| HTTPS | Enforced |

## Publish interface changes

Edit the source files, then regenerate the Pages output:

```sh
npm ci
npx tsc --noEmit
npm run build:pages
```

Review the source changes and generated files together. Commit both to `main` and push. GitHub Pages publishes the committed `docs/` folder; it does not run the app’s npm build for you.

Check the **pages-build-deployment** run in [Actions](https://github.com/leolunelove/tether/actions) before opening the live site. Check playback and invitations whenever those flows change.

Keep documentation in `guides/`. The `docs/` folder is reserved for the generated website and is replaced by the Pages build.

## Publish service changes

GitHub Pages serves static files. The separate Worker runs `app/api/`, stores pairing and turn state in D1, and stores the current recording in R2.

The API origin is configured in [`vite.pages.config.ts`](../vite.pages.config.ts). The allowed Pages origin is defined in [`lib/space-server.ts`](../lib/space-server.ts). Participant credentials authorize access to the space and audio; no service secret is embedded in the Pages build.

Publish service changes to the existing hosting project separately. Its identity and logical `DB` and `BUCKET` bindings are recorded in the [hosting configuration](../.openai/hosting.json). The hosting workflow supplies the production resources and applies migrations.

Changing only the interface does not require a service deployment. Changes to `app/api/`, server helpers, or the database schema do.

## Deploy a fork

A fork needs its own voice service, database, audio storage, and hosting identity. Do not reuse this repository’s production project identity.

Set `PAGES_BASE` to the fork’s repository path and `TETHER_API_ORIGIN` to its service origin before running `npm run build:pages`. Add the new Pages origin to that service’s allowlist.

Keep private credentials out of source control and the static build. Participant session credentials are created at runtime for each browser.
