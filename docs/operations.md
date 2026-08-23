# Content, data, and release operations

This guide documents the parts of the YES website that sit outside ordinary component
development: the version-controlled catalog, optional Airtable feeds, processed
portraits, Reservoir entries, and release review.

## Operating modes

| Configuration | Behavior |
| --- | --- |
| No credentials | Public pages build; `/catalog` uses the checked-in directory; local search works; forms report that they are disconnected; `/builders` stays dark |
| Airtable configured | Intake forms can write records and audit rows; consented records can join the catalog and builder feed at build time |
| xAI configured | Pressing Enter in catalog search can rank results by semantic intent |
| Airtable and xAI configured | All optional paths are available; content pages remain statically generated |

The integration variables are server-side. Do not prefix tokens with `NEXT_PUBLIC_`.

## Version-controlled catalog

The primary catalog source is:

```text
content/catalog/source/yale_builders_catalog_116.csv
```

Corrections and entries that are not in the CSV live in
`content/catalog/supplement.json`. After either source changes, regenerate the runtime
file:

```bash
node scripts/import-catalog.mjs
```

The importer writes `content/catalog/builders.json`, reports missing featured entries,
and prints rows that carry a publication-review note.

The importer does **not** block flagged rows and the catalog client receives the data it
needs for browser-side search. Treat the source and generated JSON as public data:

1. Resolve every publication-review note before deployment.
2. Keep private notes, private contact details, and unpublished claims out of these
   files.
3. Review the generated diff rather than committing it blindly.
4. Confirm that links and factual claims still resolve to the intended public sources.

This Git-backed directory is separate from the opt-in Airtable feeds. Do not set an
Airtable consent field merely because a record exists in the CSV.

## Airtable contract

Set `AIRTABLE_TOKEN` and `AIRTABLE_BASE_ID` together. The app defaults to `People` and
`Log` tables; every table and view name can be overridden through `.env.local`.

Grant the token only the record access it needs in the intended base. The application
uses the token from server modules and build scripts; it is never required by a client
component.

### Consent-filtered views

With the default environment values, create these views in the `People` table:

| View | Required filter | Consumer |
| --- | --- | --- |
| `Alumni-Page-Feed` | `alumni_page_ok` is checked | `/catalog`, dossier pages, and the portrait script |
| `Public-Catalog-Feed` | `public_catalog_ok` is checked | `/builders` |

The code re-checks each checkbox after reading its view. A record without consent is
dropped, not serialized with empty public fields.

### Dossier fields

The Airtable-backed catalog path reads only this allowlist:

| Field | Expected shape | Notes |
| --- | --- | --- |
| `full_name` | Text | Required |
| `yale_affiliation` | Text | Class year or affiliation |
| `now_line` | Text | Required current-work line |
| `proof_kind` | Single select | `number`, `headline`, `image`, or `link` |
| `proof_value` | Text | Required dossier artifact |
| `proof_source` | Text | Optional attribution |
| `own_words` | Long text | Optional; supplied by the person, not ghost-written |
| `headshot` | Attachment | Optional source for generated portraits |
| `company_url` | URL | Optional |
| `linkedin_url` | URL | Optional |
| `alumni_weight` | Number | `1` or `2`; retained for an optional visual hierarchy |
| `alumni_page_ok` | Checkbox | Required publication consent |

`/builders` reads only `full_name`, `yale_affiliation`, `builder_profile`, and
`public_catalog_ok`.

### Intake and audit fields

`/api/enter` and `/api/audere` write to `People`. The general form may set
`public_catalog_ok` only from the submitter's checkbox; the Audere form does not ask
for catalog consent and always writes it as false.

Successful and failed intake attempts also try to append a row to `Log` with:

- `timestamp`
- `workflow`
- `run_by`
- `input_ref`
- `output_ref`
- `outcome`

Set `INTAKE_LOG_OWNER` to the accountable human name expected in `run_by`. Confirm that
the table's single-select values accept the fixed `status` and `source` strings used by
the routes before enabling the forms.

## Portrait pipeline

Portraits come from two places. The consented Airtable feed is authoritative; the
curated directory in Git fills the gap until people submit their own.

### Source 1 — the curated directory (33 of 116)

`content/catalog/portraits/*.jpg`, committed. These were collected from public web
pages, **not** submitted by their subjects, so they are deliberately kept out of
Airtable: those checkboxes mean "this person opted in", and nobody here has.

Every portrait's source page and image URL is recorded in
`content/catalog/portraits/SOURCES.csv`. Honouring a removal request is deleting one
JPEG, dropping its row from `portraits.json`, and re-running the bake.

The remaining 83 builders render a monogram — initials in the display serif over a
gradient keyed to the name. That is the normal state, not a missing asset.

To collect more:

```bash
python3 scripts/portraits/harvest.py            # provenance-gated collection
python3 scripts/portraits/contact_sheet.py      # REVIEW THE FACES BEFORE STAGING
node scripts/stage-portraits.mjs <harvest-dir>  # copy in + record provenance
npm run build:portraits
```

The harvester accepts an image only when the hosting page demonstrably names the
person **and** the image shows one dominant face. Both gates exist because both
failed in testing: image search returned Amazon listings and fan art for real
queries; matching an image to the nearest name on a news article attached a
journalist's byline photo to a builder; and a correctly-named Yale News image turned
out to be a four-way composite of award winners. Do not relax them, and do not skip
the contact sheet — a wrong face under a real name is worse than no face.

Most of the roster are current undergraduates whose photographs are on LinkedIn
(which answers scripts with HTTP 999) rather than the open web. The ceiling is the
web's. The real fix is asking people for a headshot.

### Source 2 — the consented Airtable feed

Airtable attachment URLs expire, so the browser never hot-links them. A consented
headshot overwrites whatever the curated directory collected for that person.
Generate the static image pairs while the Airtable environment variables are
available:

```bash
npm run build:portraits
```

For each portrait from either source, the script writes a cropped color WebP and a
duotone WebP to `public/portraits/generated/`. That directory is ignored by Git, so
generation must run on every deploy — including when only curated portraits exist and
no Airtable credentials are set.

On a hosted build that should include portraits, run generation in the same build
environment immediately before Next.js:

```bash
npm run build:portraits && npm run build
```

## Reservoir publishing

Every non-underscore Markdown file in `content/reservoir/` becomes an entry. A local
entry gets a page at `/reservoir/<filename>`; an entry with a `url` links to its external
home instead.

The supported kinds are `essay`, `talk`, `workshop`, `lesson`, and `press`. See
[`content/reservoir/_FORMAT.md`](../content/reservoir/_FORMAT.md) for the frontmatter
contract and examples.

Files prefixed with `_` are working notes and do not appear in the index. `approved`
defaults to false, which leaves a visible draft notice on locally hosted content.

## Release checklist

Before treating a deployment as production-ready:

1. Resolve every catalog publication-review note and inspect the generated JSON diff.
2. Reconcile the team-count claim: the manifesto currently says four teams completed
   rounds totaling $17 million, while the landing and work content say five teams and
   more than $17 million. Verify the source rather than choosing a number by inference.
3. Confirm every public claim, link, name, and affiliation with an approved source.
4. Confirm `approved` flags reflect human editorial sign-off; do not use the flag to
   bypass review.
5. Generate portraits if the Airtable feed changed.
6. Run `npm run check` and `npm run build` in the deployment environment.
7. Exercise the landing, catalog search, direct dossier URLs, Reservoir, and both forms
   with keyboard navigation and reduced motion enabled.
8. Set `NEXT_PUBLIC_SHOW_PALETTE_TOGGLE=false` unless the deployment is explicitly a
   palette review. Visually approve the selected palette at mobile and desktop sizes.
9. Verify that `/builders` should be discoverable before adding it to navigation.

## Current limitations

- The rate limiter is an in-memory, per-server-instance fixed window. It reduces naive
  floods but is not a distributed abuse-control system.
- A search shows only its strong matches (at most 24, floor relative to the top score,
  minimum of three). Browsing still shows all 116. The constants live in
  `lib/catalog/search.ts`.
- Catalog search runs entirely in the visitor's browser. Vectors are baked into
  `content/catalog/embeddings.json` by `npm run embed`; the query is embedded
  client-side with `all-MiniLM-L6-v2`, so nothing about a search leaves the machine.
  Re-run `npm run embed` after editing `builders.json` or
  `lib/catalog/embed-text.ts`, or rankings will reflect the previous corpus.
- The first search fetches a ~22MB model from the HuggingFace CDN. It is lazy and the
  field stays usable while it loads, but a visitor who blocks that CDN silently gets
  keyword ranking instead of semantic ranking.
- Vitest is configured, but no automated test files are currently committed. The
  enforced baseline is TypeScript plus the type-scale and language policy checks.
- The application expects an existing Airtable schema; this repository does not
  provision a base or views.
