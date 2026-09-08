/**
 * /common-room — the people.
 *
 * Portraits are the owners' own, supplied as a folder of faces; the names and
 * roles are read off content/catalog/builders.json so a person's line here and
 * in the catalog cannot drift apart. Roles are the catalog's `nowLine` with the
 * duplicated venture suffix trimmed and everything after the first clause
 * dropped — a face grid has room for a title, not a biography.
 *
 * Ishir Rao's role is owner-supplied: he is in curation.json as a member but
 * has no catalog record to read one from.
 *
 * ORDER. The first eight run in the order founders.pdf prints them ("Yale
 * Hacker House - 2026 Cohort"); the rest follow by surname. The PDF lists 15
 * people and only 8 of them have a portrait in the owners' folder, so its order
 * cannot carry the whole page — the seven it names without a face here are Riya
 * Bhargava, Osama Radi, Ariyan Patel, Allah-u-Abha Rodrigues, Hector Miranda
 * Plaza, Joshua Gao and Paul Douglass. Send portraits and they slot into their
 * numbered places.
 */

export interface CommonRoomPerson {
  readonly slug: string
  readonly name: string
  readonly role?: string
  readonly portrait: string
}

export const COMMON_ROOM_PEOPLE: readonly CommonRoomPerson[] = [
  {
    slug: 'nicolas-gertler',
    name: 'Nicolas Gertler',
    role: 'Co-founder; AI builder, Density / Mylon',
    portrait: '/common-room/nicolas-gertler.jpg',
  },
  {
    slug: 'lucas-santos',
    name: 'Lucas Santos',
    role: 'Co-founder / builder, Mylon / Density',
    portrait: '/common-room/lucas-santos.jpg',
  },
  {
    slug: 'oliver-hime',
    name: 'Oliver Hime',
    role: 'Z Fellow and Robotics Researcher',
    portrait: '/common-room/oliver-hime.jpg',
  },
  {
    slug: 'freeman-irabaruta',
    name: 'Freeman Iraburata',
    role: 'Z Fellow and Robotics Researcher',
    portrait: '/common-room/freeman-irabaruta.jpg',
  },
  {
    slug: 'leia-ryan',
    name: 'Leïa Ryan',
    role: 'Co-founder, Cortex',
    portrait: '/common-room/leia-ryan.jpg',
  },
  {
    slug: 'james-masson',
    name: 'James Masson',
    role: 'Founder, Nade',
    portrait: '/common-room/james-masson.jpg',
  },
  {
    slug: 'bruno-bruno',
    name: 'Bruno Bruno',
    role: 'Founder, Kesho',
    portrait: '/common-room/bruno-bruno.jpg',
  },
  {
    slug: 'murad-abdukholikov',
    name: 'Murad Abdukholikov',
    role: 'Robotics / embedded-systems builder',
    portrait: '/common-room/murad-abdukholikov.jpg',
  },
  {
    slug: 'zain-anwar',
    name: 'Zain Anwar',
    role: 'Founder / investor, Intersect STEM / Maverick Capital',
    portrait: '/common-room/zain-anwar.jpg',
  },
  {
    slug: 'jimmy-carter',
    name: 'Jimmy Carter',
    role: 'Co-founder, Daemo AI',
    portrait: '/common-room/jimmy-carter.jpg',
  },
  {
    slug: 'michael-chime',
    name: 'Michael Chime',
    role: 'Co-founder & CEO, Prepared / Axon',
    portrait: '/common-room/michael-chime.jpg',
  },
  {
    slug: 'sina-dehghani',
    name: 'Sina Dehghani',
    role: 'Startup / investing operator, Maverick Capital / o11',
    portrait: '/common-room/sina-dehghani.jpg',
  },
  {
    slug: 'teo-dimov',
    name: 'Teo Dimov',
    role: 'Co-founder / ecosystem builder, Launch / prior startup',
    portrait: '/common-room/teo-dimov.jpg',
  },
  {
    slug: 'dylan-gleicher',
    name: 'Dylan Gleicher',
    role: 'Co-founder, Prepared / Axon',
    portrait: '/common-room/dylan-gleicher.jpg',
  },
  {
    slug: 'seth-goldin',
    name: 'Seth Goldin',
    role: 'Student builder; former founding CTO at Context',
    portrait: '/common-room/seth-goldin.jpg',
  },
  {
    slug: 'amelie-liu',
    name: 'Amelie Liu',
    role: 'Director, INSPIRE Speaker Series at Yale Entrepreneurial Society',
    portrait: '/common-room/amelie-liu.jpg',
  },
  {
    slug: 'ishir-rao',
    name: 'Ishir Rao',
    role: 'Ex-Valthos, AI for Science',
    portrait: '/common-room/ishir-rao.jpg',
  },
  {
    slug: 'neal-soni',
    name: 'Neal Soni',
    role: 'Co-founder, Prepared / Axon',
    portrait: '/common-room/neal-soni.jpg',
  },
  {
    slug: 'ari-strober',
    name: 'Ari Strober',
    role: 'Co-Director of High School Fellows, Yale Entrepreneurial Society',
    portrait: '/common-room/ari-strober.jpg',
  },
  {
    slug: 'sofia-teifeld',
    name: 'Sofia Teifeld',
    role: 'Co-President, Yale Entrepreneurial Society',
    portrait: '/common-room/sofia-teifeld.jpg',
  },
  {
    slug: 'kashi-tuteja',
    name: 'Kashi Tuteja',
    role: 'Machine Learning Researcher',
    portrait: '/common-room/kashi-tuteja.jpg',
  },
] as const

/**
 * Owner-supplied, and the reason the page can make the claim above.
 *
 * Not derived from the catalog: no per-company valuation is held anywhere in
 * this repo, so nothing here can recompute or check it. It is a figure the
 * owners stand behind, which is why it is written once, here.
 */
export const COMMON_ROOM_VALUATION = {
  figure: '$700M+',
  context: 'combined valuation of the companies in this room.',
} as const

/**
 * Owner-written, and the whole argument of the page.
 */
export const COMMON_ROOM_LINE =
  'The infrastructure behind Yale\u2019s most successful outcomes.'

/** Portraits are real and the copy is owner-supplied, so this page is not a draft. */
export const COMMON_ROOM_APPROVED = true
