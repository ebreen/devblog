# Unknown route

Unknown paths render the not-found page instead of a blank shell or a valid article. The schema-invalid blog slug is in this bucket on purpose.

## Sub-features

- `404-page` shows heading `Nothing is running here.` for `/does-not-exist`.
- `404-nested` does the same for `/blog/does-not-exist`.
- `404-fixture-slug` does the same for `/blog/__fixture-schema-invalid-entry__`.
- `404-actions` exposes `Back home` and `Browse the blog`.

## How to get to it (user POV)

- Type a path the site does not define.
- From `/blog?fixture=schema-invalid-entry`, choose `Open fixture route`.
- Follow a stale post URL.

## Driving it with control-devblog

Preconditions:

- Doctor is green.
- You are not on a valid post slug.

- **Junk root.** Open `/does-not-exist`. Run `control-devblog browser goto --path /does-not-exist` and `control-devblog http get --path /does-not-exist --out .cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/unknown-route/root.txt`. Heading `Nothing is running here.` is visible. Title is `Not Found — Eirik Breen`. Article post UI is absent. Record the HTTP status the server returned.
- **Junk blog slug.** Repeat for `/blog/does-not-exist`. Same heading. No `All field notes` back link from a real article (the 404 page uses `Browse the blog` instead).
- **Fixture slug.** From the schema-invalid fixture list, choose `Open fixture route`. Run `control-devblog browser goto --path /blog?fixture=schema-invalid-entry` then `control-devblog browser click --role link --name "Open fixture route"`. URL path is `/blog/__fixture-schema-invalid-entry__`. Heading is `Nothing is running here.` Direct `goto` of that slug must match.
- **Escape home.** Choose `Back home`. Run `control-devblog browser click --role link --name "Back home"`. URL path is `/`. Heading `i like sidequests` is visible.
- **Escape blog.** Repeat from 404 choosing `Browse the blog`. URL path is `/blog`.
- **Proof.** Screenshot the fixture slug 404. Run `control-devblog browser snapshot --aria --path .cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/unknown-route/fixture-slug.aria.txt` and the matching `--full` PNG. Both show `Nothing is running here.` and `Back home`.

## Gotchas

- User-facing proof is the 404 heading and actions. HTTP status should be 404 on `astro preview` and Vercel. `astro dev` usually also 404s, but if it returns 200 with the same page, record that instead of forcing a status the process did not emit.
- `/blog/__fixture-schema-invalid-entry__` is not a real collection entry. If it ever starts rendering an article, that is a regression.
- Do not confuse this with the empty-list fixture. Empty is 200 on `/blog` with `The notebook is empty.`
- Valid nested slugs look similar to junk nested slugs. Confirm the heading before calling it a 404.
