import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { CITIES } from '../../src/cities.ts'

const YEAR_START = 2011
const YEAR_END = 2020
const INTER_REQUEST_MS = 400
const CONCURRENCY = 2
const MAX_RETRIES = 5

const CHUNKS: [string, string][] = [
  ['2011-01-01', '2012-12-31'],
  ['2013-01-01', '2014-12-31'],
  ['2015-01-01', '2016-12-31'],
  ['2017-01-01', '2018-12-31'],
  ['2019-01-01', '2020-12-31'],
]

const cToF = (c: number) => (c * 9) / 5 + 32

const args = process.argv.slice(2)
let limit = 0
let force = false
let cityFilter: string | null = null
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) {
    limit = parseInt(args[i + 1], 10)
    i++
  } else if (args[i] === '--force') force = true
  else if (args[i] === '--city' && args[i + 1]) {
    cityFilter = args[i + 1]
    i++
  }
}

interface HourlyResponse {
  hourly: {
    time: string[]
    temperature_2m: (number | null)[]
  }
}

async function fetchChunk(lat: number, lon: number, start: string, end: string): Promise<HourlyResponse> {
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${start}&end_date=${end}` +
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
      console.error(`    retry ${attempt}/${MAX_RETRIES} for ${start}: ${err} — waiting ${backoff}ms`)
      await new Promise((r) => setTimeout(r, backoff))
    }
  }
  throw new Error('unreachable')
}

async function buildHourly(lat: number, lon: number): Promise<number[][]> {
  const sums: number[][] = Array.from({ length: 12 }, () => new Array(24).fill(0))
  const counts: number[][] = Array.from({ length: 12 }, () => new Array(24).fill(0))

  for (let i = 0; i < CHUNKS.length; i++) {
    const [start, end] = CHUNKS[i]
    const data = await fetchChunk(lat, lon, start, end)
    const { time, temperature_2m: temps } = data.hourly

    for (let j = 0; j < time.length; j++) {
      const t = temps[j]
      if (t === null) continue
      const month = parseInt(time[j].slice(5, 7), 10) - 1
      const hour = parseInt(time[j].slice(11, 13), 10)
      sums[month][hour] += t
      counts[month][hour]++
    }

    if (i < CHUNKS.length - 1) await new Promise((r) => setTimeout(r, INTER_REQUEST_MS))
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

async function mapPool<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0
  async function worker() {
    while (i < items.length) {
      const item = items[i++]
      await fn(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker))
}

async function main() {
  const all = CITIES.filter((c) => c.slug).map((c) => ({
    slug: c.slug as string,
    lat: c.latitude,
    lon: c.longitude,
  }))

  let cities = all
  if (cityFilter) {
    cities = all.filter((c) => c.slug === cityFilter)
    if (cities.length === 0) {
      console.error(`City "${cityFilter}" not found.`)
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

  await mapPool(cities, CONCURRENCY, async (city) => {
    const n = ++done
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    console.log(`[${n}/${cities.length}] ${city.slug} — elapsed ${elapsed}s`)

    try {
      const hourlyTemp = await buildHourly(city.lat, city.lon)
      const path = `data/${city.slug}.json`
      const existing = existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : {}
      writeFileSync(path, JSON.stringify({ ...existing, hourlyTemp }, null, 2) + '\n')
      console.log(`  ✓ wrote ${path}`)
    } catch (err) {
      console.error(`  ✗ FAILED ${city.slug}: ${err}`)
      failed++
    }
  })

  console.log(`\nDone. ${cities.length - failed} succeeded, ${failed} failed.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
