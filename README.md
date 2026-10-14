<div align="center">
  <img src="public/favicon.svg" width="64" height="64" alt="" />
  <h1>Tether</h1>
  <p>One shared voice space. Just between you two.</p>
  <p>
    <a href="https://leolunelove.github.io/tether/"><strong>Open Tether</strong></a>
    &nbsp;·&nbsp;
    <a href="#how-it-works">How it works</a>
    &nbsp;·&nbsp;
    <a href="guides/development.md">Development</a>
  </p>
</div>

---

Tether gives two people opposite ends of the same conversation. One person holds the space, listens, records a reply, and passes it across. Then they wait for the other person to return it.

There is one current recording, no feed, and no message history.

## How it works

1. **Listen.** When the space is yours, hear what your person left for you.
2. **Reply.** Record up to two minutes, then listen back before passing it on.
3. **Pass it across.** Your recording replaces the previous one. The space becomes theirs, and you can continue when they pass it back.

## Start a space

[Open Tether](https://leolunelove.github.io/tether/) to try the sample conversation. You can listen, use a sample reply, and switch sides to experience the exchange.

Choose **Make it yours** to create a real space. Add your name and send the invitation to one person. Each invitation works once; each space belongs to exactly two people.

## Your connection

- **Save your recovery code.** Space settings lets you save a private code and move your end to another browser. Restoring revokes the previous device and code. Without a saved code or accessible device, lost access cannot be restored.
- **Only the current recording is available.** A successful pass replaces the previous voice message. Space settings also lets either person end the space for both people and request deletion of its audio.
- **Recordings require participant access.** They are stored on the voice service and are not end-to-end encrypted.
- **Recording needs microphone permission.** Use a recent browser over HTTPS or localhost. Unsaved replies are lost if the page is closed or reloaded.

## Project guide

| Guide | What you’ll find |
| --- | --- |
| [Development](guides/development.md) | Local setup, project structure, commands, and checks |
| [Publishing](guides/publishing.md) | GitHub Pages, the voice service, and deployment settings |

Built with React, TypeScript, and Tailwind CSS. GitHub Pages serves the interface; a Cloudflare Worker with D1 and R2 manages the shared space and recordings.
