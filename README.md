# YES Website

The public web experience for the Yale Entrepreneurial Society (YES). It combines an
interactive front door, a searchable directory of Yale builders, long-form publishing,
and two paths into the community in one deliberately editorial interface.

[View the live preview](https://yes-website-ashy.vercel.app)

Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, Canvas 2D, and optional
server-side integrations with Airtable and xAI.

## Why this exists

An entrepreneurship community needs more than an events page. People need to see who
is building, understand the organization's point of view, find relevant peers, and
know how to participate. This site gives each of those jobs a focused surface while
keeping the experience visually coherent.

## Product highlights

- **Interactive signal field** — a deterministic Canvas 2D network reveals itself
  around the pointer and gradually resolves into the density of the YES mark. The
  animation responds to reduced-motion preferences.
- **Searchable builder catalog** — a WebGL particle field resolves into a ranked grid.
  Semantic search runs entirely in the browser against vectors baked at build time, so
  intent-based queries like "helping blind people navigate" rank the right builders
  with no API key, no server round-trip, and no record of the query. Keyword ranking
  covers the case where the model cannot be fetched.
- **Shareable dossiers** — catalog entries open as intercepted modal routes during
  browsing and retain stable, server-rendered URLs for direct links.
- **Git-backed publishing** — essays, talks, workshops, lessons, and press entries are
  validated from Markdown at build time. External resources can appear in the same
  reverse-chronological index without being re-hosted.
- **Consent-aware data paths** — Airtable-backed public records are selected from
  consent-filtered views, re-checked in code, and reduced to explicit field allowlists.
- **Portraits with provenance** — the directory's portraits were collected from public
  pages rather than submitted, so each records the page it came from and can be removed
  by deleting one file. Builders without one render a monogram rather than a stand-in.
- **Graceful local mode** — the public experience builds without third-party
  credentials. Optional forms, live feeds, and processed portraits activate only when
  their configuration is present; search needs none of it.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Interactive landing experience |
| `/manifesto` | YES's point of view and invitation to build |
| `/audere` | Full-viewport introduction to the Audere cohort |
| `/audere/apply` | Audere application form |
| `/catalog` | Searchable builder directory and dossier browser |
| `/catalog/[slug]` | Direct, shareable builder dossier |
| `/reservoir` | Editorial and media archive |
| `/reservoir/[slug]` | Locally hosted Reservoir entry |
| `/work` | Proof-point page reached from the manifesto |
| `/enter` | General community intake form |
| `/builders` | Consent-gated ledger that stays dark below its minimum entry count |

`/work`, `/enter`, and `/builders` are live routes but are intentionally omitted from
the primary navigation. They are reached through the site's invitation flow or by a
direct link; `/builders` is also gated by a minimum consented-entry count.

## Architecture

```mermaid
flowchart LR
  CSV[Curated catalog CSV] --> Import[Catalog import script]
  Import --> JSON[Versioned builders.json]
  MD[Reservoir Markdown] --> Build[Next.js build]
  JSON --> Build
  Views[Consent-filtered Airtable views] -. optional build-time feed .-> Build
  Views -. approved headshots .-> Portraits[Portrait pipeline]
  Portraits --> Build
  Build --> Static[Static pages and catalog dossiers]

  Browser --> Static
  Browser --> Intake[Enter and Audere APIs]
  Intake -. configured .-> State[Airtable People and Log tables]
  Browser --> Search[Search API]
  Search -. configured .-> XAI[xAI]
```

The application is static-first, not a static export. Content pages and dossiers are
generated at build time; the intake and search endpoints use the Node.js runtime so
credentials never need to reach the browser.

### Notable technical decisions

- **Human-triggered publishing.** Airtable feeds are read during a build, with no ISR
  or scheduled regeneration. A public-data change therefore requires a deployment.
- **Two catalog sources with different trust models.** The main catalog combines a
  version-controlled directory assembled from public sources with explicitly
  consented Airtable records. The consented record wins on a slug collision. The
  separate `/builders` ledger uses only the consent-gated Airtable view.
- **Validation at system boundaries.** Zod schemas validate form payloads on both the
  client and server. Reservoir frontmatter is validated during the build, and invalid
  entries fail rather than partially render.
- **Search without a server.** Builder vectors are baked at build time and the query is
  embedded client-side, both with `all-MiniLM-L6-v2`. This removes an API dependency, a
  per-search cost and a privacy surface at once, in exchange for a lazily-fetched model.
  `lib/catalog/embed-text.ts` is shared by the bake and the browser, because a drift
  between the two turns cosine scores into noise without failing anything.
- **The hero is the entry; the wall is already behind it.** The scaffold gated the grid
  behind a search, so the faces cost a click and a wait. Deleting the hero to fix that
  threw away the moment the page is built around. Both hold now: the hero gets the first
  screen, and every builder is in the SAME server-rendered HTML directly beneath it —
  one scroll away, nothing to load. The embedding model is fetched only when someone
  focuses the search field, so a visitor who came to browse never pays for it.
- **Search cuts, browsing does not.** A search returns its strong matches only, capped at
  24, using a floor relative to the best score. Ranking the whole directory made every search
  look identical below the fold and implied a relevance the tail did not have. A floor of
  three results keeps a narrow query from returning nothing.
- **Build-time image treatment.** Portraits from either source are cropped and converted
  to color and duotone WebP files before the site build, avoiding expiring attachment
  URLs and browser-side filters.
- **Mechanical design constraints.** Repository scripts enforce the approved type
  scale and scan consented dossier copy for disallowed promotional language.

## Run locally

### Prerequisites

- Node.js 20.9 or newer (the minimum declared by the locked Next.js version)

```bash
git clone https://github.com/ariyannp07/YES-Website.git
cd YES-Website
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables are
required for the public pages or checked-in catalog.

To enable integrations, copy the example file and add only the services you need:

```bash
cp .env.example .env.local
```

Never put an Airtable or xAI credential in a `NEXT_PUBLIC_` variable.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_PALETTE` | No | Initial palette: `night` (default) or `paper` |
| `NEXT_PUBLIC_SHOW_PALETTE_TOGGLE` | No | Enables the review-only palette switcher |
| `AIRTABLE_TOKEN` | No | Server-side Airtable record access |
| `AIRTABLE_BASE_ID` | No | Airtable base used by feeds, forms, and audit logs |
| `AIRTABLE_PEOPLE_TABLE` | No | Overrides the default `People` table name |
| `AIRTABLE_LOG_TABLE` | No | Overrides the default `Log` table name |
| `AIRTABLE_CATALOG_VIEW` | No | Overrides the consented builder view name |
| `AIRTABLE_ALUMNI_VIEW` | No | Overrides the consented dossier view name |
| `INTAKE_LOG_OWNER` | No | Human owner recorded on intake audit rows |
| `XAI_API_KEY` | No | Enables server-side semantic catalog search |

When Airtable is absent, the catalog uses its version-controlled directory, the two
forms report that they are not connected, and `/builders` remains in its dark state.
When xAI is absent, the catalog continues to provide local text filtering.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the local Next.js development server |
| `npm run build` | Creates the production build |
| `npm run start` | Serves a completed production build |
| `npm run typecheck` | Runs TypeScript without emitting files |
| `npm run check:type-scale` | Rejects type sizes outside the shared scale |
| `npm run check:adjectives` | Scans the live Airtable dossier feed when configured |
| `npm run check` | Runs typecheck and both repository policy checks |
| `npm run build:portraits` | Generates static WebP portrait pairs from both portrait sources |
| `npm run embed` | Re-bakes catalog search vectors after the directory changes |
| `npm test` | Runs Vitest (the repository does not yet include test files) |

Regenerate the checked-in catalog after editing its source CSV with:

```bash
node scripts/import-catalog.mjs
```

## Repository map

```text
app/                    Pages, layouts, and request-time API routes
components/             Interactive and presentational components
content/catalog/        Version-controlled directory source and generated JSON
content/reservoir/      Git-backed editorial entries
content/manifesto.ts    Approved manifesto copy and rendering blocks
lib/airtable/           Server-only Airtable reads, writes, and audit logging
lib/                    Content loaders, schemas, search corpus, and visual models
scripts/                Catalog import, portrait processing, and policy checks
```

## Content and deployment

See [Content, data, and release operations](docs/operations.md) for the Airtable
contract, catalog import workflow, portrait generation, Reservoir publishing, and the
pre-deploy review checklist.

This repository is an active implementation. The preview is deployed, but copy
approval, public-record review, integration configuration, and release checks remain
editorial responsibilities rather than assumptions made by the code.
