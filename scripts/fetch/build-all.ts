import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { US_CITIES } from '../../src/cities.ts'
import { climateFromDaily, fetchDailyMulti } from '../../src/climate.ts'
import type { CityRef } from '../../src/cities.ts'

// ---------------------------------------------------------------------------
// Bulk ERA5 climatology builder
//
// Fetches 1991–2020 daily ERA5 normals (via the Open-Meteo Archive API) for
// every city in the canonical US_CITIES index and writes data/<slug>.json.
//
// The archive API enforces a strict hourly request budget, so cities are
// grouped into multi-location batches (one HTTP request per batch) and the
// batches are processed with a small worker pool. Resumable: skips cities
// whose data file already exists unless --force is passed.
//
// Usage:  node scripts/fetch/build-all.ts                         # missing
//         node scripts/fetch/build-all.ts --force                 # refetch
//         node scripts/fetch/build-all.ts --batch 5 --concurrency 2
// ---------------------------------------------------------------------------

const force = process.argv.includes('--force')

function flag(name: string, fallback: number): number {
  const i = process.argv.indexOf(name)
  const n = i >= 0 ? Number(process.argv[i + 1]) : fallback
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

const BATCH_SIZE = flag('--batch', 10)
const CONCURRENCY = flag('--concurrency', 1)
const MAX_ATTEMPTS = 3
const WORKER_STAGGER_MS = 15000
const BETWEEN_BATCH_MS = 8000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

mkdirSync('data', { recursive: true })

const pending = US_CITIES.filter((c) => force || !existsSync(`data/${c.slug}.json`))
const total = US_CITIES.length
const already = total - pending.length

const batches: CityRef[][] = []
for (let i = 0; i < pending.length; i += BATCH_SIZE) batches.push(pending.slice(i, i + BATCH_SIZE))

const failed: string[] = []
let written = 0
let doneCities = already

async function processBatch(batch: CityRef[]): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const dailies = await fetchDailyMulti(batch)
      for (let i = 0; i < batch.length; i++) {
        const city = batch[i]
        const data = climateFromDaily(dailies[i], city)
        const out = `data/${city.slug}.json`
        writeFileSync(out, JSON.stringify(data, null, 2) + '\n')
        written++
        doneCities++
        console.log(`[${doneCities}/${total}] wrote ${out}`)
      }
      return
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const names = batch.map((c) => c.slug).join(',')
      console.error(`batch (${names}) attempt ${attempt}/${MAX_ATTEMPTS} failed: ${msg}`)
      if (attempt < MAX_ATTEMPTS) await sleep(5 * 60 * 1000)
    }
  }
  for (const c of batch) failed.push(c.slug)
  console.error(`FAILED batch: ${batch.map((c) => c.slug).join(',')}`)
}

async function worker(id: number): Promise<void> {
  await sleep(id * WORKER_STAGGER_MS)
  for (;;) {
    const batch = batches.shift()
    if (!batch) return
    await processBatch(batch)
    await sleep(BETWEEN_BATCH_MS)
  }
}

console.log(
  `Fetching ${pending.length} cities in ${batches.length} batches ` +
    `(batch=${BATCH_SIZE}, concurrency=${CONCURRENCY}, force=${force}); ${already} already present.`,
)

if (batches.length > 0) {
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, (_, i) => worker(i)))
}

console.log(`\nDone. wrote=${written} already=${already} failed=${failed.length}`)
if (failed.length > 0) {
  console.error(`Failed slugs: ${failed.join(', ')}`)
  process.exit(1)
}
