# YES — yesyale.org

The Yale Entrepreneurial Society site. Built to `YES-WEBSITE-BUILD-SPEC.md` v1.0,
with the Boola/AINS canon as the authority for facts and voice:

- **Facts** — `Yale/YES/Boola/canon/01-vision-brief.md`. Nothing on this site is
  invented. Anything not in the brief is `[TBD — owner input]`.
- **Voice** — `Yale/YES/Boola/canon/03-brand-voice.md`, including the
  seven-question voice test in §6.
- **Policy** — `Yale/YES/Boola/canon/05-human-ai-policy.md`. Its hard rails are
  enforced in code, not by convention (see *Rails*, below).

## Pages

| Route | What it is |
|---|---|
| `/` | The front door: a hidden network, scanned with the cursor |
| `/spectre` | The inner cohort — the working wall, held as one view |
| `/spectre/apply` | Three questions, and one line back |
| `/manifesto` | The essay |
| `/work` | The four initiatives, then proof |
| `/catalog` | The wall of faces, and a dossier per person |
| `/reservoir` | Essays, talks, workshops, lessons, press |
| `/enter` | The single intake form |
| `/builders` | Public builder catalog — dark and unlinked until 15 consent |
| `/concepts` | Archive of the three landing prototypes. Review only — delete before launch |

## Run it

```bash
npm install
npm run dev
```

```bash
npm run check    # typecheck + type-scale guard + adjective guard
npm run build    # production build
```

### A note on Google Drive

This working copy lives in Google Drive, which syncs `node_modules` (~400MB)
and, more importantly, `.git`. Moving `node_modules` outside Drive and
symlinking it back **does not work** — Turbopack rejects a symlink that points
outside the project root (`Symlink [project]/node_modules is invalid`). The
options are to live with the sync, or to move the whole repo out of Drive and
let GitHub be the sync mechanism. Push often either way.

## Environment

Copy `.env.example` to `.env.local` and fill it in. `.env.local` is gitignored.

The site builds and renders with **no** credentials: `/enter` accepts no
submissions and says so, `/builders` stays dark, and `/catalog` shows
placeholder silhouettes. Nothing is mocked and nothing pretends to be real data.

### Getting the Airtable token

1. Go to <https://airtable.com/create/tokens>.
2. Scopes: `data.records:read`, `data.records:write`, `schema.bases:read`.
3. Grant access to the **YES-OS** base.
4. Paste it into `.env.local` as `AIRTABLE_TOKEN`, and the base id (starts
   `app…`) as `AIRTABLE_BASE_ID`.

Never paste a token into a `NEXT_PUBLIC_` variable. Only the server route and
the build-time feed readers touch it, and `lib/airtable/client.ts` imports
`server-only` so a client component that tries to reach it fails the build.

### Airtable schema additions

`/catalog` needs fields the AINS `People` table does not have yet. Add these,
then create a view called `Alumni-Page-Feed` filtered to
`alumni_page_ok = checked`:

| Field | Type |
|---|---|
| `now_line` | Single line text |
| `proof_kind` | Single select — `number`, `headline`, `image`, `link` |
| `proof_value` | Single line text |
| `proof_source` | Single line text |
| `own_words` | Long text |
| `headshot` | Attachment |
| `company_url` | URL |
| `linkedin_url` | URL |
| `alumni_weight` | Number — `1` standard, `2` anchor story (unused while every head is the same size) |
| `alumni_page_ok` | Checkbox — **the consent gate** |

`/builders` reads the existing `Public-Catalog-Feed` view and needs no changes.

## Publishing content

- **The Reservoir** — drop a markdown file in `content/reservoir/`. Essays,
  talks, workshops, lessons and press share one index; anything hosted elsewhere
  carries a `url` and the Reservoir links out instead of re-hosting it. See
  `content/reservoir/_FORMAT.md`.
- **Press awaiting confirmation** — files prefixed `_PENDING-` are staged and do
  NOT appear on the site. Each says what could not be verified and what to do.
  Confirm, then drop the prefix.
- **Logos on the landing field** — add an entry to
  `content/marks/approved.json`. A logo without both `approvedBy` and
  `approvedOn` is dropped from the field and reported in the build log. No logo
  ships without sign-off.
- **The real YES mark** — the sigma is placeholder geometry traced from a
  screenshot. Replace `SIGMA_POLYGONS` in `lib/yes-geometry.ts`; the extrusion
  and the network both re-fit whatever shape they are given.
- **Portraits** — `npm run build:portraits` pulls headshots from the consented
  feed and bakes the duotone at build time. Run it before `npm run build`
  whenever the feed changes.
- **Copy approval** — every copy module carries an `approved` flag. While it is
  `false` the page renders `[ DRAFT — AWAITING OWNER APPROVAL ]`. Flip it in the
  content file once Ariyan and Sofia sign off; it is a reviewable diff, not a
  deploy setting.

## Rails, enforced in code

| Rail | Where it is enforced |
|---|---|
| No autonomous publishing (canon R1) | `/catalog`, `/catalog/[slug]` and `/builders` are `force-static`. Feeds are read at build time. No ISR, no cron, no `revalidate`. Publishing the catalog is a human redeploy. |
| Consent gates (canon R3) | Feeds read only the consent-filtered views, re-check the consent field per record, and select fields by explicit allowlist. Records without consent are dropped entirely, never emitted with nulls. |
| Audit trail (canon R2) | `/api/enter` writes a `Log` row on success *and* on failure. |
| Key never client-side | `lib/airtable/client.ts` imports `server-only`. |
| Two type scales | `npm run check:type-scale` fails the build on any font-size outside `app/globals.css`. |
| No adjectives on `/catalog` | `npm run check:adjectives` scans the live feed and fails on any hit. |

## Deviations from the build spec

Each is deliberate, and each is reversible.

1. **The front door is a scanned network, not a floating logo field.** §1
   specifies drifting company marks over a void. The owners chose a different
   direction after comparing three prototypes. The mark is still present —
   roughly half the network's nodes are sampled from inside its polygons and
   carry a higher brightness floor, so the shape emerges as a DENSITY rather
   than as a logo. The permission gate for real company logos is untouched and
   still governs `content/marks/approved.json`, but those marks now have no
   surface on the landing; worth revisiting when approvals land.
2. **No WebGL on the landing, so §6's 50KB JS budget holds again.** An earlier
   3D mark blew it. The Signal renderer is a few kilobytes of Canvas 2D. Three.js
   survives only in the archived Portal prototype under `/concepts`.
3. **Not a static export.** §6 says "Next.js (static export)" but also forbids
   exposing the Airtable key client-side. A static export has no server runtime
   to hold the key. Built as a standard Vercel deployment: every page static,
   two server routes.
4. **No ISR on `/builders`.** §6 asks for regeneration every 6h. Canon R1 says
   publishing the catalog is "a human-run deploy, not a cron job." The canon
   wins; the page is built statically.
5. **Night palette accent.** §4 pairs near-black with Yale blue `#00356B` and
   also requires WCAG AA. Those are incompatible — `#00356B` on `#0A0A0A`
   measures **1.62:1**. Night uses Yale blue at a display tint (`#5B8FD4`,
   5.96:1). Paper uses the canonical `#00356B` unchanged (11.41:1).
6. **`proof_object` is three columns**, not one. Airtable has no struct type;
   one column would mean parsing a blob that fails silently.
7. **Spectre is a new section the spec does not describe.** §2's site map has no
   inner-cohort surface. Added at owner direction, full-bleed and outside the
   interior shell so the wall is not framed by a nav bar.
8. **`/catalog`, not `/alumni`; `/reservoir`, not `/writing`.** Owner-renamed,
   and the Reservoir is widened past essays to the whole public collection.
9. **The catalog is condensed, not edge-to-edge.** §3 calls for a dense mosaic
   with no gutters and gravity-weighted tiles. Owner direction: every head the
   same size, three to a row, air on both sides.
10. **Nav includes the catalog.** §2 lists it; §4's restatement drops it.
    §2 governs.

## Open owner decisions

- **Palette** — both directions ship. Set `NEXT_PUBLIC_PALETTE` to `night` or
  `paper`. The preview switcher (bottom right) is on while
  `NEXT_PUBLIC_SHOW_PALETTE_TOGGLE=true`; turn it off for production.
  **Paper is unfinished**: the mark's network lines are hardcoded white and
  nearly vanish on cream, and the background wash was tuned against black.
- **Dossier expansion** — both patterns are live. Clicking a face expands in
  place over the wall; opening `/catalog/<slug>` cold is the full-page takeover.
  "Open as page" in the modal switches between them.
- **Four teams or five?** The manifesto (owner-written) says *"Four teams have
  already completed fundraising rounds totaling $17 million."* `content/work.ts`
  and `canon/01-vision-brief.md` both say **five** teams raised more than $17
  million combined. Both numbers are live, one page apart. Neither was changed
  on assumption — pick one and the other follows.
- **Manifesto is approved and live.** It is the owners' own text, so
  `content/manifesto.ts` carries `approved: true` and the page shows no draft
  mark. `/work` copy is still `approved: false` and still shows one.
- **Spectre vs The Fellowship** — canon/01 calls the tap-only inner cohort
  "The Fellowship", and `/work` lists it as initiative 02 with the brief's own
  description. `/spectre` is now a second surface for what sounds like the same
  thing. Either Spectre is the Fellowship renamed — in which case `content/work.ts`
  and the canon should follow — or it is distinct and the difference needs
  stating. Nothing was changed in the canon-derived copy on assumption.
- **Spectre applications have no Airtable home of their own** — the route writes
  to `People` with source `Website` and tags the record in `builder_profile`,
  because Boola's `SOURCES` enum has no Spectre value and the route will not
  invent one. Add a `Spectre` source option or a Programs link if you want them
  separable.
- **`/catalog` vs `/builders`** — the two names read as near-synonyms. Worth
  renaming one before launch.
- **Landing links** — `Manifesto` alone, per §3's default. Add `Enter` in
  `lib/site.ts` → `LANDING_LINKS`.
- **Dash style** — the manifesto preserves the speech's unspaced en dash, per
  canon 03 §2.4. Canon §7 carries this as an open decision; it is a
  find-and-replace in `content/manifesto.ts` if the owners want `—`.
- **Launch date** — `[TBD — owner input]`. The spec targets live ≥3 days before
  Bazaar so the QR has a tested destination.
