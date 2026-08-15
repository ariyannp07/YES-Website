# How to add an essay

Files starting with `_` or `.` are ignored, so this note never appears on the
site. Everything else in this folder becomes a dispatch on `/writing`, newest
first, at `/writing/<filename-without-.md>`.

Create a file, commit it, deploy. There is no CMS by design (build spec §6) —
the site's writing lives in Git alongside the Canon.

```markdown
---
title: What the Hacker House Actually Proved
date: 2026-09-02
summary: One line for the index. Optional.
approved: false
---

Body in markdown. The first paragraph carries the piece; there is no
standfirst, no hero image, no byline block.
```

## Fields

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Shown on the index and as the page title. |
| `date` | yes | `YYYY-MM-DD`. Sorts the index; a bad format fails the build. |
| `summary` | no | One line on the index. Leave it out and the index shows the title alone. |
| `approved` | no | Defaults to `false`, which renders the `DRAFT — AWAITING OWNER APPROVAL` mark. Set `true` once the copy is signed off (build spec §8.4). |

## Voice

Run any draft against the seven-question voice test in
`Yale/YES/Boola/canon/03-brand-voice.md` §6 before setting `approved: true`.
Facts come from `canon/01-vision-brief.md` or they are marked
`[TBD — owner input]`.

Per the human/AI policy, the Hacker House retrospective is owner-written.
Creative direction stays human — the agent does not draft it.
