# Blog post

A field note page shows the post title, date, reading time, tags when present, the Markdown/MDX body, and a way back to the list.

## Sub-features

- `post-from-list` opens the note whose title was clicked.
- `post-from-url` opens the same note from its `/blog/...` path.
- `post-meta` shows a `time` element and a reading time string.
- `post-back` returns to `/blog` via `All field notes`.
- `post-footer` repeats a list link after `End of note.`

## How to get to it (user POV)

- On `/blog`, choose a post title.
- On `/`, choose the latest-note title.
- Open a known post URL such as `/blog/2026/06-june/why-cloudmount-uses-fskit-instead-of-fuse`.
- On the post, choose `All field notes` or `Read the other field notes`.

## Driving it with control-devblog

Preconditions:

- Doctor is green.
- `/blog` shows at least one visible title link (no empty fixture on the session).

- **List entry.** Open `/blog` and choose the first visible post title. Run `control-devblog browser goto --path /blog` then `control-devblog browser click --role link --name "Why CloudMount Uses FSKit Instead of FUSE"` (or the current first title if the catalog moved). URL contains `/blog/`. Heading matches the link text. Title is `{heading} — Eirik Breen`.
- **Home entry.** Open `/` and choose the latest-note heading link. Run `control-devblog browser goto --path /` then click that same title. The post heading matches.
- **Direct URL.** Open the slug shown after list entry. Run `control-devblog browser goto --path /blog/2026/06-june/why-cloudmount-uses-fskit-instead-of-fuse` when that is still the CloudMount note. Same heading.
- **Meta.** On the post, a `time` element is present and a reading time like `5 min read` is visible.
- **Back.** Choose `All field notes`. Run `control-devblog browser click --role link --name "All field notes"`. URL path is `/blog`. Heading `Things worth writing down.` is visible.
- **Missing slug.** A made-up post path is not this feature. Drive it with unknown-route.
- **Proof.** Snapshot and screenshot the open post before the back click. Run `control-devblog browser snapshot --aria --path .cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/blog-post/article.aria.txt` and `control-devblog browser screenshot --path .cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/blog-post/article.png --full`. Artifacts show the post heading and `All field notes`.

## Gotchas

- Slugs include the date folders (`2026/06-june/...`) because the collection is nested. Do not assume `/blog/why-cloudmount-uses-fskit-instead-of-fuse`.
- The list page and the post page both use post titles as link names. After opening a post, `All field notes` is the return control, not the title again.
- MDX/code highlighting lives in `.post-content`. Absence of a `pre` is fine for posts without fences. Presence of a `pre` on a fenced post is extra proof, not required for every note.
- Do not edit Markdown to create a fixture post. Use committed content.
