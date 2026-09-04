/**
 * Build-time embedding bake for the catalog.
 *
 *   npm run embed
 *
 * Embeds the public directory roster with all-MiniLM-L6-v2 (q8, mean
 * pooling, L2 normalized) and writes content/catalog/embeddings.json.
 *
 * Vectors live in their own file rather than inside builders.json so the
 * human-readable directory stays diffable — one 384-float vector per person
 * would bury every real content change under a wall of numbers in code review.
 *
 * The browser embeds the QUERY with the identical model (lib/catalog/embedder.ts).
 * Change the model in one place and you must change it in both.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { pipeline } from '@huggingface/transformers'

import { buildEmbedText } from '../lib/catalog/embed-text'
import { directoryPeople } from '../lib/catalog-directory'

export const MODEL = 'Xenova/all-MiniLM-L6-v2'

const OUT = join(process.cwd(), 'content', 'catalog', 'embeddings.json')

const main = async () => {
  const people = directoryPeople()

  console.log(`embed — ${people.length} builders with ${MODEL} …`)
  const embed = await pipeline('feature-extraction', MODEL, { dtype: 'q8' })

  const vectors: Record<string, number[]> = {}
  for (const person of people) {
    const text = buildEmbedText(person)
    const out = await embed(text, { pooling: 'mean', normalize: true })
    // Six decimals keeps cosine identical to float32 while roughly halving
    // the JSON that every visitor downloads.
    vectors[person.slug] = Array.from(out.data as Float32Array).map((x) =>
      Number(x.toFixed(6)),
    )
    process.stdout.write('.')
  }

  writeFileSync(
    OUT,
    `${JSON.stringify({ model: MODEL, dims: Object.values(vectors)[0]?.length ?? 0, vectors }, null, 0)}\n`,
  )
  console.log(`\nembed — baked ${Object.keys(vectors).length} vectors → content/catalog/embeddings.json`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
