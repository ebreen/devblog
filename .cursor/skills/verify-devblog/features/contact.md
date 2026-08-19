# Contact

Contact publishes a visible email address and outbound profile links. Sending mail is out of scope.

## Sub-features

- `contact-page` shows heading `Good conversations welcome.` on `/contact`.
- `contact-mailto` exposes `me@eirikbreen.com` with href `mailto:me@eirikbreen.com`.
- `contact-elsewhere` lists LinkedIn and GitHub as external links.
- `contact-from-nav` reaches the page from primary `email`.

## How to get to it (user POV)

- Choose `email` in the primary nav.
- Open `/contact` directly.
- Do not use the home `Explore the site` `email` control if the goal is this page. That one opens a mail client.

## Driving it with control-devblog

Preconditions:

- Doctor is green.
- No mail handler interaction is required or allowed.

- **Nav entry.** From `/`, choose `email` in Primary. Run `control-devblog browser click --scope-role navigation --scope-name Primary --role link --name email`. URL path is `/contact`. Heading `Good conversations welcome.` is visible. Title is `Contact — Eirik Breen`.
- **Direct entry.** Open `/contact`. Run `control-devblog browser goto --path /contact`. Same heading.
- **Mailto href.** The link named `me@eirikbreen.com` is visible. Its href is `mailto:me@eirikbreen.com`. Do not click it.
- **Elsewhere.** Links named `LinkedIn` and `GitHub` are visible and use `target="_blank"`. Do not click them.
- **Home mailto is not this page.** On `/`, the explore nav `email` link href is `mailto:me@eirikbreen.com`. Proving that href is optional extra. Clicking it is a fail for this feature.
- **Proof.** Snapshot and screenshot `/contact`. Run `control-devblog browser snapshot --aria --path .cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/contact/page.aria.txt` and `control-devblog browser screenshot --path .cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/contact/page.png --full`. Both show the heading and `me@eirikbreen.com`.

## Gotchas

- Two different `email` links. Primary goes to `/contact`. Home explore is mailto. Scope the click.
- Clicking mailto or the social links leaves (or tries to leave) the app. Href checks are the proof.
- Resume also contains `mailto:me@eirikbreen.com`. That is not a substitute for loading `/contact`.
