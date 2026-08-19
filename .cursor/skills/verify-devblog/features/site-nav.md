# Site nav

Primary navigation lets a user move between the static pages, skip to main content, follow `/cv` to the resume, and open the 3d room shell without leaving the site header.

## Sub-features

- `nav-skip` moves focus target to `#main-content` via `skip to content`.
- `nav-brand` returns to `/` from an inner page.
- `nav-primary` reaches about, made, cv, wrote, room, and email from the header.
- `nav-cv-redirect` turns `/cv` into `/resume`.
- `nav-resume-print` shows `Print / save PDF` on resume and does not invoke print.
- `nav-room` shows heading `the room` and canvas `#room-canvas`.

## How to get to it (user POV)

- Load `/`.
- Choose `skip to content`.
- Choose `eirik breen — oslo` in the header.
- Choose `about`, `made`, `cv`, `wrote`, `room`, or `email` in the primary nav.
- Open `/cv` directly (typed URL or old bookmark).
- Open `/room` from the header or a typed URL.

## Driving it with control-devblog

Preconditions:

- Doctor is green at `http://127.0.0.1:43721`.
- Chrome session is the one `launch` will attach, not a random tab on 4321.

- **Home identity.** Open `/`. Run `control-devblog browser goto --path /`. Title is `Home — Eirik Breen`. Heading `i like sidequests` is visible.
- **Skip link.** Choose `skip to content`. Run `control-devblog browser click --role link --name "skip to content"`. The document still shows the home heading. The link href is `#main-content`.
- **Wrote.** From home, choose `wrote` in the primary nav. Run `control-devblog browser click --scope-role navigation --scope-name Primary --role link --name wrote`. URL path is `/blog`. Heading `Things worth writing down.` is visible. The `wrote` link has `aria-current="page"`.
- **About, made, email, room.** Repeat the primary-nav click for `about` `/about` heading `Linux at work. Rabbit holes after.`, `made` `/projects` heading `Things I built.`, `email` `/contact` heading `Good conversations welcome.`, `room` `/room` heading `the room`.
- **CV redirect.** Fetch `/cv` without following. Run `control-devblog http get --path /cv --no-follow --out .cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/site-nav/cv-redirect.txt`. Status is 3xx and `location` contains `/resume`. Then `control-devblog browser goto --path /cv`. Heading is `Eirik Breen`. Button `Print / save PDF` is visible. Do not click it.
- **Brand home.** From `/resume`, choose the brand. Run `control-devblog browser click --role link --name "eirik breen — oslo"`. URL path is `/`.
- **Room canvas.** On `/room`, run `control-devblog browser visible --selector "#room-canvas"`. The canvas exists. Do not require a painted WebGL frame.
- **Proof.** Snapshot and screenshot `/blog` after the wrote click. Run `control-devblog browser snapshot --aria --path .cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/site-nav/wrote.aria.txt` and `control-devblog browser screenshot --path .cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/site-nav/wrote.png --full`. Both show the brand and `Things worth writing down.`

## Gotchas

- Home also lists `about` / `made` / `cv` / `wrote` / `room` / `email` under `Explore the site`. Unscoped `click --name about` is ambiguous. The explore `email` is mailto, not `/contact`.
- The brand accessible name uses an em dash: `eirik breen — oslo`.
- `cv` in the header goes to `/resume` already. The redirect proof is the `/cv` URL, not the header click.
- Clicking `Print / save PDF` calls `window.print()`. Presence is the proof. A print dialog is not.
- Headless Chrome often cannot prove the Oslo room actually rendered. Missing WebGL falls back to `.room-fallback` copy with the same site links. That fallback is acceptable room proof when the canvas path is hidden.
