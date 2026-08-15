# YES — yesyale.org

The Yale Entrepreneurial Society site. Built to `YES-WEBSITE-BUILD-SPEC.md` v1.0,
with the Boola/AINS canon as the authority for facts and voice:

- **Facts** — `Yale/YES/Boola/canon/01-vision-brief.md`. Nothing on this site is
  invented. Anything not in the brief is `[TBD — owner input]`.
- **Voice** — `Yale/YES/Boola/canon/03-brand-voice.md`, including the
  seven-question voice test in §6.
- **Policy** — `Yale/YES/Boola/canon/05-human-ai-policy.md`. Its hard rails are
  enforced in code, not by convention (see *Rails*, below).

## Run it

```bash
npm install
npm run dev
```

Then <http://localhost:3000>.

```bash
npm run check    # typecheck + type-scale guard + adjective guard
npm run build    # production build
```

### node_modules lives outside Google Drive

This working copy sits in Google Drive, which would otherwise sync ~25k
dependency files and race git's index. `node_modules` is a symlink to
`~/.local/yes-website-build/node_modules`.

**`npm install` destroys that symlink** — npm replaces it with a real directory.
After any install, run:

```bash
npm run relink
```

## Environment

Copy `.env.example` to `.env.local` and fill it in. `.env.local` is gitignored.

The site builds and renders with **no** credentials: `/enter` accepts no
submissions and says so, `/builders` stays dark, and `/alumni` shows placeholder
silhouettes. Nothing is mocked and nothing pretends to be real data.

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

The alumni page needs fields the AINS `People` table does not have yet. Add
these, then create a view called `Alumni-Page-Feed` filtered to
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
| `alumni_weight` | Number — `1` standard, `2` anchor story |
| `alumni_page_ok` | Checkbox — **the consent gate** |

`/builders` reads the existing `Public-Catalog-Feed` view and needs no changes.

## Publishing content

- **The Reservoir** — drop a markdown file in `content/reservoir/`. Essays,
  talks, workshops and lessons share one index; anything hosted elsewhere just
  carries a `url` and the Reservoir links out instead of re-hosting it. See
  `content/reservoir/_FORMAT.md`.
- **Logos on the landing field** — add an entry to
  `content/marks/approved.json`. A logo without both `approvedBy` and
  `approvedOn` is dropped from the field and reported in the build log. No logo
  ships without sign-off.
- **The real YES mark** — the spinning sigma is traced placeholder geometry.
  Drop the true vector at `public/marks/yes-logo.svg` and point
  `components/field/yes-mark.tsx` at it.
- **Alumni portraits** — `npm run build:portraits` pulls headshots from the
  consented feed and bakes the duotone at build time. Run it before `npm run
  build` whenever the feed changes.
- **Copy approval** — every copy module carries an `approved` flag. While it is
  `false` the page renders `[ DRAFT — AWAITING OWNER APPROVAL ]`. Flip it in the
  content file once Ariyan and Sofia sign off; it is a reviewable diff, not a
  deploy setting.

## Rails, enforced in code

| Rail | Where it is enforced |
|---|---|
| No autonomous publishing (canon R1) | `/alumni`, `/alumni/[slug]` and `/builders` are `force-static`. Feeds are read at build time. No ISR, no cron, no `revalidate`. Publishing the catalog is a human redeploy. |
| Consent gates (canon R3) | Feeds read only the consent-filtered views, re-check the consent field per record, and select fields by explicit allowlist. Records without consent are dropped entirely, never emitted with nulls. |
| Audit trail (canon R2) | `/api/enter` writes a `Log` row on success *and* on failure. |
| Key never client-side | `lib/airtable/client.ts` imports `server-only`. |
| Two type scales | `npm run check:type-scale` fails the build on any font-size outside `app/globals.css`. |
| No adjectives on `/alumni` | `npm run check:adjectives` scans the live feed and fails on any hit. |

## Deviations from the build spec

Each is deliberate, and each is reversible.

1. **Not a static export.** §6 says "Next.js (static export)" but also forbids
   exposing the Airtable key client-side. A static export has no server runtime
   to hold the key. Built as a standard Vercel deployment: every page static,
   one server route.
2. **No ISR on `/builders`.** §6 asks for regeneration every 6h. Canon R1 says
   publishing the catalog is "a human-run deploy, not a cron job." The canon
   wins; the page is built statically.
3. **Night palette accent.** §4 pairs near-black with Yale blue `#00356B` and
   also requires WCAG AA. Those are incompatible — `#00356B` on `#0A0A0A`
   measures **1.62:1**. Night uses Yale blue at a display tint (`#5B8FD4`,
   5.96:1). Paper uses the canonical `#00356B` unchanged (11.41:1).
4. **`proof_object` is three columns**, not one. Airtable has no struct type;
   one column would mean parsing a blob that fails silently.
5. **The landing floats glyphs, and now the YES mark.** §1 offers abstract
   glyphs *or* speech words as placeholders. Words were built first and cut —
   floating adjectives is telling, and the page's whole argument is showing.
6. **Nav includes Alumni.** §2 lists it; §4's restatement drops it. §2 governs.

## Open owner decisions

- **Palette** — both directions ship. Set `NEXT_PUBLIC_PALETTE` to `night` or
  `paper`. The preview switcher (bottom right) is on while
  `NEXT_PUBLIC_SHOW_PALETTE_TOGGLE=true`; turn it off for production.
- **Dossier expansion** — both patterns are live. Clicking a face expands in
  place over the wall; opening `/alumni/<slug>` cold is the full-page takeover.
  "Open as page" in the modal switches between them.
- **Landing links** — `Manifesto` alone, per §3's default. Add `Enter` in
  `lib/site.ts` → `LANDING_LINKS`.
- **Dash style** — the manifesto preserves the speech's unspaced en dash, per
  canon 03 §2.4. Canon §7 carries this as an open decision; it is a
  find-and-replace in `content/manifesto.ts` if the owners want `—`.
- **Launch date** — `[TBD — owner input]`. The spec targets live ≥3 days before
  Bazaar so the QR has a tested destination.
