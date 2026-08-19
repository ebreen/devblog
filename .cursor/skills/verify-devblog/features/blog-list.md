# Blog list

The blog index lists published field notes newest first, shows how many notes exist, and can be forced into empty or schema-invalid fixture UI with query params.

## Sub-features

- `list-heading` shows `Things worth writing down.` on `/blog`.
- `list-tally` reports `N notes, newest first` in `[data-blog-tally]` and matches the visible list length.
- `list-order` shows the newest post first (date descending, slug tie-break).
- `list-open` follows a post title into `/blog/...`.
- `list-empty-fixture` shows `The notebook is empty.` for `?fixture=zero-valid-posts`.
- `list-schema-fixture` reveals `Open fixture route` for `?fixture=schema-invalid-entry`.

## How to get to it (user POV)

- Choose `wrote` in the primary nav.
- Choose `wrote` in the home `Explore the site` nav.
- Open `/blog` directly.
- Open `/blog?fixture=zero-valid-posts` or legacy `/blog?empty=1`.
- Open `/blog?fixture=schema-invalid-entry` or legacy `/blog?schemaInvalid=1`.

## Driving it with control-devblog

Preconditions:

- Doctor is green at `http://127.0.0.1:43721`.
- Catalog has at least one Markdown/MDX entry under `src/content/blog` (the committed posts). Do not delete posts to simulate empty. Use the fixture URL.

- **Nav entry.** From `/`, choose `wrote` in Primary. Run `control-devblog browser click --scope-role navigation --scope-name Primary --role link --name wrote`. Heading `Things worth writing down.` is visible. `[data-blog-list]` is visible. `[data-blog-empty-state]` is not visible.
- **Direct entry.** Open `/blog`. Run `control-devblog browser goto --path /blog`. Same heading and visible list as nav entry. Title is `Blog — Eirik Breen`.
- **Tally.** Read `[data-blog-tally]`. Run `control-devblog browser visible --selector "[data-blog-tally]"`. Visible text matches `N notes, newest first` (or `1 note`) and N equals the number of visible `li.post-item` nodes. Ignore nodes inside `[hidden]`.
- **Newest first.** The first visible post title link is the latest `date` in the collection. As of this map that title is `Why CloudMount Uses FSKit Instead of FUSE`. If a newer post lands, assert the first link against the current catalog rather than this sentence.
- **Empty fixture.** Open the zero-valid fixture. Run `control-devblog browser goto --path /blog?fixture=zero-valid-posts`. Heading `The notebook is empty.` is visible. `[data-blog-list]` is not visible. `[data-blog-tally]` is not visible. Repeat once with `/blog?empty=1` if you need the legacy param.
- **Control run after empty.** Open `/blog` with no query. Run `control-devblog browser goto --path /blog`. The list is visible again. Empty copy is not.
- **Schema-invalid fixture.** Open `/blog?fixture=schema-invalid-entry`. Run `control-devblog browser goto --path /blog?fixture=schema-invalid-entry`. The note containing `Schema-invalid route fixture active` is visible. Link `Open fixture route` points at `/blog/__fixture-schema-invalid-entry__`. Do not treat that click as list proof; continue in unknown-route.
- **Proof.** Capture populated list and empty fixture as two pairs. Run `control-devblog browser snapshot --aria --path .cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/blog-list/populated.aria.txt` and the matching `--full` screenshot, then the same for `empty.aria.txt` / `empty.png` after the zero-valid URL. Populated artifacts include a real post title. Empty artifacts include `The notebook is empty.`

## Gotchas

- Empty and schema-invalid states are query-param UI, not missing files. The committed posts stay on disk.
- Fixture markup stays in the DOM when hidden. Count and click only visible nodes (`hidden` attribute, or `browser visible`).
- Wait for the fixture script. `goto` can finish before `hidden` flips. `browser visible --role heading --name "The notebook is empty."` is the barrier, not a sleep.
- `/blog?fixture=schema-invalid-entry` still shows the real list. The extra note is in addition to the list, not a replacement.
- Client fixtures do not change HTTP status. Empty is still 200.
