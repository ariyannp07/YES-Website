# How to add to the Reservoir

The Reservoir is the public collection: essays and dispatches, the speaker
series, workshops, and online lessons. One reverse-chronological index at
`/reservoir`.

Files starting with `_` or `.` are ignored, so this note never appears on the
site. Everything else in this folder becomes an entry.

Create a file, commit it, deploy. There is no CMS by design (build spec §6) —
the site's content lives in Git alongside the Canon.

## Two kinds of entry

**Hosted here** — the piece lives on this site at
`/reservoir/<filename-without-.md>`:

```markdown
---
title: What the Hacker House Actually Proved
date: 2026-09-02
kind: essay
summary: One line for the index. Optional.
approved: false
---

Body in markdown. The first paragraph carries the piece; there is no
standfirst, no hero image, no byline block.
```

**Hosted elsewhere** — a recorded talk, a workshop hand-out, a lesson on
another platform. Add a `url` and the Reservoir points at it instead of
re-hosting it. No page is generated, so the body can be empty:

```markdown
---
title: Building in Public — Speaker Series
date: 2026-10-14
kind: talk
summary: Recording and slides.
url: https://example.com/the-recording
approved: true
---
```

## Fields

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Shown on the index and as the page title. |
| `date` | yes | `YYYY-MM-DD`. Sorts the index; a bad format fails the build. |
| `kind` | no | `essay`, `talk`, `workshop`, or `lesson`. Defaults to `essay`. Shown beside the date. |
| `summary` | no | One line on the index. Leave it out and the index shows the title alone. |
| `url` | no | Set for anything hosted elsewhere. The index links out and no page is built. |
| `approved` | no | Defaults to `false`, which renders the `DRAFT — AWAITING OWNER APPROVAL` mark. Set `true` once the copy is signed off (build spec §8.4). |

## Voice

Run any draft against the seven-question voice test in
`Yale/YES/Boola/canon/03-brand-voice.md` §6 before setting `approved: true`.
Facts come from `canon/01-vision-brief.md` or they are marked
`[TBD — owner input]`.

Per the human/AI policy, the Hacker House retrospective is owner-written.
Creative direction stays human — the agent does not draft it.
