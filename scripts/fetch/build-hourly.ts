import { readFileSync, writeFileSync, existsSync } from 'node:fs'

// ---------------------------------------------------------------------------
// Hourly temperature fetcher
//
// Fetches hourly ERA5 temperature_2m from the Open-Meteo Archive API (free,
// no key) for 2011–2020 (10 years), aggregates into 12 months × 24 hours
// mean temperatures (°F), and merges an `hourlyTemp` field into each
// existing data/<slug>.json file.
//
// Only one hourly variable is requested, so each year-long request is ~3
// billable API calls (vs. ~26 for the full builder).  10 years × 100 cities
// = 1 000 requests total — well under the 10 k/day free tier.
//
// Usage:
//   npx tsx scripts/fetch/build-hourly.ts                # all 100 cities
//   npx tsx scripts/fetch/build-hourly.ts --limit 5       # first 5 only
//   npx tsx scripts/fetch/build-hourly.ts --city seattle  # single city
//   npx tsx scripts/fetch/build-hourly.ts --force          # overwrite existing
// ---------------------------------------------------------------------------

// ── City list (mirrors src/cities.ts) ──────────────────────────────────────
const CITIES = [
  { slug: 'new-york', lat: 40.71, lon: -74.01 },
  { slug: 'los-angeles', lat: 34.05, lon: -118.24 },
  { slug: 'chicago', lat: 41.88, lon: -87.63 },
  { slug: 'houston', lat: 29.76, lon: -95.37 },
  { slug: 'phoenix', lat: 33.45, lon: -112.07 },
  { slug: 'philadelphia', lat: 39.95, lon: -75.17 },
  { slug: 'san-antonio', lat: 29.42, lon: -98.49 },
  { slug: 'san-diego', lat: 32.72, lon: -117.16 },
  { slug: 'dallas', lat: 32.78, lon: -96.8 },
  { slug: 'san-jose', lat: 37.34, lon: -121.89 },
  { slug: 'austin', lat: 30.27, lon: -97.74 },
  { slug: 'jacksonville', lat: 30.33, lon: -81.66 },
  { slug: 'fort-worth', lat: 32.76, lon: -97.33 },
  { slug: 'columbus', lat: 39.96, lon: -83.0 },
  { slug: 'charlotte', lat: 35.23, lon: -80.84 },
  { slug: 'indianapolis', lat: 39.77, lon: -86.16 },
  { slug: 'san-francisco', lat: 37.77, lon: -122.42 },
  { slug: 'seattle', lat: 47.61, lon: -122.33 },
  { slug: 'denver', lat: 39.74, lon: -104.99 },
  { slug: 'oklahoma-city', lat: 35.47, lon: -97.52 },
  { slug: 'nashville', lat: 36.16, lon: -86.78 },
  { slug: 'washington', lat: 38.91, lon: -77.04 },
  { slug: 'el-paso', lat: 31.76, lon: -106.49 },
  { slug: 'boston', lat: 42.36, lon: -71.06 },
  { slug: 'las-vegas', lat: 36.17, lon: -115.14 },
  { slug: 'portland', lat: 45.52, lon: -122.68 },
  { slug: 'louisville', lat: 38.25, lon: -85.76 },
  { slug: 'detroit', lat: 42.33, lon: -83.05 },
  { slug: 'memphis', lat: 35.15, lon: -90.05 },
  { slug: 'baltimore', lat: 39.29, lon: -76.61 },
  { slug: 'albuquerque', lat: 35.08, lon: -106.65 },
  { slug: 'milwaukee', lat: 43.04, lon: -87.91 },
  { slug: 'tucson', lat: 32.22, lon: -110.97 },
  { slug: 'fresno', lat: 36.74, lon: -119.77 },
  { slug: 'sacramento', lat: 38.58, lon: -121.49 },
  { slug: 'kansas-city', lat: 39.1, lon: -94.58 },
  { slug: 'mesa', lat: 33.42, lon: -111.83 },
  { slug: 'atlanta', lat: 33.75, lon: -84.39 },
  { slug: 'omaha', lat: 41.26, lon: -95.93 },
  { slug: 'colorado-springs', lat: 38.83, lon: -104.82 },
  { slug: 'raleigh', lat: 35.78, lon: -78.64 },
  { slug: 'virginia-beach', lat: 36.85, lon: -75.98 },
  { slug: 'long-beach', lat: 33.77, lon: -118.19 },
  { slug: 'miami', lat: 25.76, lon: -80.19 },
  { slug: 'oakland', lat: 37.8, lon: -122.27 },
  { slug: 'minneapolis', lat: 44.98, lon: -93.27 },
  { slug: 'tulsa', lat: 36.15, lon: -95.99 },
  { slug: 'bakersfield', lat: 35.37, lon: -119.02 },
  { slug: 'wichita', lat: 37.69, lon: -97.34 },
  { slug: 'arlington', lat: 32.74, lon: -97.11 },
  { slug: 'tampa', lat: 27.95, lon: -82.46 },
  { slug: 'new-orleans', lat: 29.95, lon: -90.07 },
  { slug: 'cleveland', lat: 41.5, lon: -81.69 },
  { slug: 'honolulu', lat: 21.31, lon: -157.86 },
  { slug: 'anaheim', lat: 33.84, lon: -117.91 },
  { slug: 'lexington', lat: 38.05, lon: -84.5 },
  { slug: 'stockton', lat: 37.96, lon: -121.29 },
  { slug: 'henderson', lat: 36.04, lon: -114.98 },
  { slug: 'corpus-christi', lat: 27.8, lon: -97.4 },
  { slug: 'saint-paul', lat: 44.94, lon: -93.09 },
  { slug: 'irvine', lat: 33.68, lon: -117.83 },
  { slug: 'newark', lat: 40.74, lon: -74.17 },
  { slug: 'orlando', lat: 28.54, lon: -81.38 },
  { slug: 'cincinnati', lat: 39.1, lon: -84.51 },
  { slug: 'pittsburgh', lat: 40.44, lon: -79.99 },
  { slug: 'greensboro', lat: 36.07, lon: -79.79 },
  { slug: 'st-louis', lat: 38.63, lon: -90.19 },
  { slug: 'lincoln', lat: 40.81, lon: -96.7 },
  { slug: 'plano', lat: 33.02, lon: -96.7 },
  { slug: 'durham', lat: 35.99, lon: -78.9 },
  { slug: 'anchorage', lat: 61.22, lon: -149.9 },
  { slug: 'chandler', lat: 33.31, lon: -111.84 },
  { slug: 'buffalo', lat: 42.89, lon: -78.88 },
  { slug: 'chula-vista', lat: 32.64, lon: -117.08 },
  { slug: 'madison', lat: 43.07, lon: -89.4 },
  { slug: 'gilbert', lat: 33.35, lon: -111.79 },
  { slug: 'toledo', lat: 41.65, lon: -83.56 },
  { slug: 'reno', lat: 39.53, lon: -119.81 },
  { slug: 'fort-wayne', lat: 41.08, lon: -85.14 },
  { slug: 'north-las-vegas', lat: 36.2, lon: -115.12 },
  { slug: 'laredo', lat: 27.51, lon: -99.51 },
  { slug: 'st-petersburg', lat: 27.77, lon: -82.64 },
  { slug: 'jersey-city', lat: 40.72, lon: -74.06 },
  { slug: 'lubbock', lat: 33.58, lon: -101.85 },
  { slug: 'irving', lat: 32.81, lon: -96.95 },
  { slug: 'winston-salem', lat: 36.1, lon: -80.24 },
  { slug: 'chesapeake', lat: 36.77, lon: -76.29 },
  { slug: 'glendale', lat: 33.54, lon: -112.19 },
  { slug: 'garland', lat: 32.91, lon: -96.64 },
  { slug: 'scottsdale', lat: 33.49, lon: -111.93 },
  { slug: 'norfolk', lat: 36.85, lon: -76.29 },
  { slug: 'boise', lat: 43.62, lon: -116.21 },
  { slug: 'fremont', lat: 37.55, lon: -121.99 },
  { slug: 'spokane', lat: 47.66, lon: -117.43 },
  { slug: 'santa-clarita', lat: 34.39, lon: -118.54 },
  { slug: 'richmond', lat: 37.54, lon: -77.44 },
  { slug: 'baton-rouge', lat: 30.45, lon: -91.15 },
  { slug: 'hialeah', lat: 25.86, lon: -80.28 },
  { slug: 'san-bernardino', lat: 34.11, lon: -117.29 },
  { slug: 'tacoma', lat: 47.25, lon: -122.44 },
]

// ── Config ─────────────────────────────────────────────────────────────────
const YEAR_START = 2011
const YEAR_END = 2020
const INTER_REQUEST_MS = 2000
const INTER_CITY_MS = 1000
const MAX_RETRIES = 5

const cToF = (c: number) => (c * 9) / 5 + 32

// ── Parse CLI flags ─────────────────────────────────────────────────────────
const args = process.argv.slice(2)
let limit = 0
let force = false
let cityFilter: string | null = null
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) { limit = parseInt(args[i + 1], 10); i++ }
  else if (args[i] === '--force') { force = true }
  else if (args[i] === '--city' && args[i + 1]) { cityFilter = args[i + 1]; i++ }
}

interface HourlyResponse {
  hourly: {
    time: string[]
    temperature_2m: (number | null)[]
  }
}

async function fetchYear(lat: number, lon: number, year: number): Promise<HourlyResponse> {
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${year}-01-01&end_date=${year}-12-31` +
    `&hourly=temperature_2m&timezone=auto`

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status} (rate limit / server error)`)
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as HourlyResponse
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err
      const backoff = Math.min(30000, 2000 * Math.pow(2, attempt - 1))
      console.error(`    retry ${attempt}/${MAX_RETRIES} for ${year}: ${err} — waiting ${backoff}ms`)
      await new Promise((r) => setTimeout(r, backoff))
    }
  }
  throw new Error('unreachable')
}

async function buildHourly(lat: number, lon: number): Promise<number[][]> {
  // accumulators: [12 months][24 hours]
  const sums: number[][] = Array.from({ length: 12 }, () => new Array(24).fill(0))
  const counts: number[][] = Array.from({ length: 12 }, () => new Array(24).fill(0))

  for (let year = YEAR_START; year <= YEAR_END; year++) {
    const data = await fetchYear(lat, lon, year)
    const { time, temperature_2m: temps } = data.hourly

    for (let i = 0; i < time.length; i++) {
      const t = temps[i]
      if (t === null) continue
      const month = parseInt(time[i].slice(5, 7), 10) - 1
      const hour = parseInt(time[i].slice(11, 13), 10)
      sums[month][hour] += t
      counts[month][hour]++
    }

    if (year < YEAR_END) await new Promise((r) => setTimeout(r, INTER_REQUEST_MS))
  }

  const result: number[][] = Array.from({ length: 12 }, () => new Array(24))
  for (let m = 0; m < 12; m++) {
    for (let h = 0; h < 24; h++) {
      const c = counts[m][h]
      const avgC = c > 0 ? sums[m][h] / c : 0
      result[m][h] = Math.round(cToF(avgC) * 10) / 10
    }
  }
  return result
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  let cities = CITIES
  if (cityFilter) {
    cities = CITIES.filter((c) => c.slug === cityFilter)
    if (cities.length === 0) {
      console.error(`City "${cityFilter}" not found. Available: ${CITIES.map((c) => c.slug).join(', ')}`)
      process.exit(1)
    }
  }
  if (!force) {
    cities = cities.filter((c) => {
      const path = `data/${c.slug}.json`
      if (!existsSync(path)) return true
      const raw = JSON.parse(readFileSync(path, 'utf-8'))
      return !raw.hourlyTemp
    })
  }
  if (limit > 0) cities = cities.slice(0, limit)

  if (cities.length === 0) {
    console.log('All cities already have hourlyTemp data. Use --force to re-fetch.')
    return
  }

  console.log(`\nFetching hourly temperature for ${cities.length} city(ies), ${YEAR_START}–${YEAR_END}…\n`)

  let done = 0
  let failed = 0
  const startTime = Date.now()

  for (const city of cities) {
    const pctDone = Math.round((done / cities.length) * 100)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const eta = done > 0 ? Math.round(((Date.now() - startTime) / done) * (cities.length - done)) : 0
    console.log(`[${pctDone}%] (${done + 1}/${cities.length}) ${city.slug} — elapsed ${elapsed}s, ETA ~${Math.round(eta)}s`)

    try {
      const hourlyTemp = await buildHourly(city.lat, city.lon)

      const path = `data/${city.slug}.json`
      const existing = existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : {}
      const updated = { ...existing, hourlyTemp }
      writeFileSync(path, JSON.stringify(updated, null, 2) + '\n')
      console.log(`  \u2713 wrote ${path}`)
      done++
    } catch (err) {
      console.error(`  \u2717 FAILED: ${err}`)
      failed++
      done++
    }

    await new Promise((r) => setTimeout(r, INTER_CITY_MS))
  }

  console.log(`\nDone. ${done - failed} succeeded, ${failed} failed.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
