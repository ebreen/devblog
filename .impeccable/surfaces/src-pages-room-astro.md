---
version: 1
slug: "src-pages-room-astro"
primary_target: "src/pages/room.astro"
related_targets: []
---

## Scope

`/room`, Experience mode. The visitor is inside the work: a first-person three.js flat on the tenth floor above Bjørvika at night.

Audience: engineers and tinkerers who came to play, plus hiring visitors who clicked "room" out of curiosity and need a fast way back to the cv/about.
Job: look around, poke at objects, and leave through real links (posts, projects, cv, about, email).
Constraints: keep the Oslo night view, first-person walking with pointer lock (click to lock, mouse look, WASD/arrows, E interact, Esc close), the object jokes. The half-res chunky render is replaceable. No WebGL / no JS must still reach every link. Sound opt-in, off by default.

## Direction contract

THESIS: The room is listed like an Oslo flat on viewing night. A visning, not a game menu: a prospectus card over the live scene, a drawn floor plan that is also the navigation, and every object written up like a listing line. Refuses the default "3D canvas in a bordered box under a page title".

OWN-WORLD: The site's world, unchanged: near-black ground, Georgia display, monospace labels in lowercase, gold #d6b45f as the single accent, hairline rules, underlined links. Prospectus surfaces are near-black glass panels with hairline borders; the floor plan is drawn in hairlines with gold object dots and a gold "you" marker.

STORY: Visitor sees a living room at night with snow over the fjord, understands it is Eirik's room and that it is explorable, starts the viewing, walks or jumps object to object, and leaves through a placard link to posts, projects, Baton, the cv, or email.

FIRST VIEWPORT: Full-bleed canvas under the slim site header (header floats over the scene). Left third: prospectus card (kicker "visning · tonight", h1 "the room", listing facts line "1 rom · 10. etasje · bjørvika · fjordutsikt", count "11 things to poke at", primary action "start visning →"). Bottom-right: floor plan, ~15rem wide. Bottom-left: control legend in mono keycaps. The camera drifts slowly toward the window behind the card until the visitor starts.

FORM: Visning (open-house viewing), position 3 on the ordered list, dealt lead. seed:17856870917b8eb5. Raise from the declined midnight-transit challenger: the plan obeys strict wayfinding discipline (numbered stations, one bright line for "you", fixed label sizes). Raise from the declined ANSI BBS challenger: numbered exits, keys 1–9 travel to objects.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Live homelab status endpoint still null (demo data).
