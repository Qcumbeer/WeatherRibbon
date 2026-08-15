import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { US_CITIES } from '../../src/cities.ts'

// NOAA nClimGrid annuals via RCC ACIS GridData (CONUS) plus GHCN-Daily
// airport stations via ACIS StnData (Anchorage, Honolulu).
//
// Usage: node scripts/fetch/build-annual.ts

const YEARS = [2021, 2022, 2023, 2024, 2025] as const
const ACIS = 'https://data.rcc-acis.org'
const NCLIMGRID = '21'
const RETRIEVED = new Date().toISOString().slice(0, 10)

const STATION_OVERRIDE: Record<
  string,
  { sid: string; name: string; latitude: number; longitude: number }
> = {
  anchorage: {
    sid: 'USW00026451',
    name: 'ANCHORAGE TED STEVENS INTERNATIONAL AIRPORT',
    latitude: 61.16916,
    longitude: -150.02771,
  },
  honolulu: {
    sid: 'USW00022521',
    name: 'HONOLULU INTL AP',
    latitude: 21.32402,
    longitude: -157.93945,
  },
}

function expectedDays(year: number): number {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365
}

const MIN_COMPLETENESS = 0.95

function parseAcisNumber(value: unknown, traceAsZero = false): number | null {
  if (value === null || value === undefined || value === 'M' || value === '') return null
  if (value === 'T') return traceAsZero ? 0 : null
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

async function postJson(path: string, body: unknown, attempt = 1): Promise<unknown> {
  const res = await fetch(`${ACIS}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    if (attempt < 5) {
      await new Promise((r) => setTimeout(r, 400 * attempt))
      return postJson(path, body, attempt + 1)
    }
    throw new Error(`ACIS ${path} failed (${res.status})`)
  }
  const text = await res.text()
  if (!text.trim()) {
    if (attempt < 5) {
      await new Promise((r) => setTimeout(r, 400 * attempt))
      return postJson(path, body, attempt + 1)
    }
    throw new Error(`ACIS ${path} empty response`)
  }
  return JSON.parse(text)
}

interface AnnualRecord {
  slug: string
  year: number
  meanTempF: number | null
  precipIn: number | null
  tempDays: number
  precipDays: number
  expectedDays: number
  completeness: number
  sourceId: string
}

async function fetchGridCity(slug: string, lat: number, lon: number): Promise<AnnualRecord[]> {
  const payload = {
    loc: `${lon},${lat}`,
    grid: NCLIMGRID,
    sdate: String(YEARS[0]),
    edate: String(YEARS[YEARS.length - 1]),
    elems: [
      { name: 'avgt', interval: 'yly', duration: 'yly', reduce: 'mean' },
      { name: 'pcpn', interval: 'yly', duration: 'yly', reduce: 'sum' },
    ],
  }
  const json = (await postJson('/GridData', payload)) as { data?: unknown[][] }
  const rows = json.data
  if (!Array.isArray(rows) || rows.length !== YEARS.length) {
    throw new Error(`${slug}: expected ${YEARS.length} nClimGrid years, got ${rows?.length}`)
  }
  return YEARS.map((year, i) => {
    const row = rows[i]
    const rowYear = Number.parseInt(String(row[0]), 10)
    if (rowYear !== year) throw new Error(`${slug}: year mismatch ${row[0]} !== ${year}`)
    const meanTempF = parseAcisNumber(row[1])
    const precipIn = parseAcisNumber(row[2])
    const days = expectedDays(year)
    const complete = meanTempF !== null && precipIn !== null ? 1 : 0
    return {
      slug,
      year,
      meanTempF,
      precipIn,
      tempDays: complete ? days : 0,
      precipDays: complete ? days : 0,
      expectedDays: days,
      completeness: complete,
      sourceId: `nclimgrid:${NCLIMGRID}`,
    }
  })
}

async function fetchStationCity(slug: string): Promise<AnnualRecord[]> {
  const station = STATION_OVERRIDE[slug]
  const payload = {
    sid: station.sid,
    sdate: `${YEARS[0]}-01-01`,
    edate: `${YEARS[YEARS.length - 1]}-12-31`,
    elems: ['maxt', 'mint', 'avgt', 'pcpn'],
  }
  const json = (await postJson('/StnData', payload)) as { data?: unknown[][] }
  const rows = json.data
  if (!Array.isArray(rows) || rows.length < 365 * YEARS.length) {
    throw new Error(`${slug}: incomplete daily GHCN response (${rows?.length ?? 0} days)`)
  }
  const byYear = new Map<number, { temps: number[]; precips: number[] }>()
  for (const year of YEARS) byYear.set(year, { temps: [], precips: [] })
  for (const row of rows) {
    const date = String(row[0])
    const year = Number.parseInt(date.slice(0, 4), 10)
    const bucket = byYear.get(year)
    if (!bucket) continue
    const avgt = parseAcisNumber(row[3])
    const maxt = parseAcisNumber(row[1])
    const mint = parseAcisNumber(row[2])
    const temp = avgt !== null ? avgt : maxt !== null && mint !== null ? (maxt + mint) / 2 : null
    const precip = parseAcisNumber(row[4], true)
    if (temp !== null) bucket.temps.push(temp)
    if (precip !== null) bucket.precips.push(precip)
  }
  return YEARS.map((year) => {
    const bucket = byYear.get(year)!
    const days = expectedDays(year)
    const meanTempF =
      bucket.temps.length > 0
        ? Math.round((bucket.temps.reduce((a, b) => a + b, 0) / bucket.temps.length) * 100) / 100
        : null
    const precipIn =
      bucket.precips.length > 0
        ? Math.round(bucket.precips.reduce((a, b) => a + b, 0) * 100) / 100
        : null
    const completeness =
      days > 0 ? Math.min(bucket.temps.length, bucket.precips.length) / days : 0
    if (completeness < MIN_COMPLETENESS) {
      throw new Error(
        `${slug} ${year}: completeness ${completeness} below ${MIN_COMPLETENESS} (temp ${bucket.temps.length}/${days}, precip ${bucket.precips.length}/${days})`,
      )
    }
    return {
      slug,
      year,
      meanTempF,
      precipIn,
      tempDays: bucket.temps.length,
      precipDays: bucket.precips.length,
      expectedDays: days,
      completeness: Math.round(completeness * 10000) / 10000,
      sourceId: `ghcn:${station.sid}`,
    }
  })
}

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/annual/2021-2025.json')

function loadPartial(): AnnualRecord[] {
  try {
    const existing = JSON.parse(readFileSync(out, 'utf8')) as { records?: AnnualRecord[] }
    return Array.isArray(existing.records) ? existing.records : []
  } catch {
    return []
  }
}

const records: AnnualRecord[] = loadPartial()
const have = new Set(records.map((r) => r.slug))
for (const city of US_CITIES) {
  const slug = city.slug
  if (have.has(slug)) {
    console.log(`skip ${slug}`)
    continue
  }
  process.stdout.write(`fetch ${slug}… `)
  const cityRecords = STATION_OVERRIDE[slug]
    ? await fetchStationCity(slug)
    : await fetchGridCity(slug, city.latitude, city.longitude)
  const missing = cityRecords.filter((r) => r.meanTempF === null || r.precipIn === null)
  if (missing.length) {
    throw new Error(`${slug}: missing values for ${missing.map((r) => r.year).join(',')}`)
  }
  records.push(...cityRecords)
  have.add(slug)
  writeFileSync(out, `${JSON.stringify({ records }, null, 2)}\n`)
  const last = cityRecords[cityRecords.length - 1]
  console.log(`${last.meanTempF}°F / ${last.precipIn} in (${last.sourceId})`)
  await new Promise((r) => setTimeout(r, 80))
}

if (records.length !== 500) {
  throw new Error(`expected 500 records, got ${records.length}`)
}

const rank = new Map(US_CITIES.map((c) => [c.slug, c.rank]))
records.sort((a, b) => (rank.get(a.slug) ?? 999) - (rank.get(b.slug) ?? 999) || a.year - b.year)

const dataset = {
  meta: {
    title: 'Annual mean temperature and total precipitation, 2021–2025',
    window: { start: 2021, end: 2025, label: '2021-2025 complete calendar years' },
    years: [...YEARS],
    source: 'NOAA nClimGrid via RCC ACIS GridData (grid 21); GHCN-Daily via ACIS StnData for Anchorage and Honolulu',
    sourceName: 'NOAA National Centers for Environmental Information',
    sourceUrl: 'https://www.ncei.noaa.gov/products/land-based-station/us-climate-gridded-dataset',
    acisUrl: 'https://www.rcc-acis.org/docs_webservices.html',
    license: 'U.S. Government work, public domain',
    method:
      'For the 98 conterminous U.S. cities, annual mean temperature (avgt, yearly mean) and annual precipitation (pcpn, yearly sum) were retrieved from NOAA nClimGrid through the RCC ACIS GridData service at each city latitude/longitude. nClimGrid does not cover Alaska or Hawaii, so Anchorage and Honolulu use GHCN-Daily observations from first-order airport stations USW00026451 and USW00022521. Daily mean temperature is official avgt when present, otherwise (tmax+tmin)/2. Trace precipitation (T) is counted as 0.00 in, not missing. Completeness is observed days / days in the calendar year and must be at least 0.95. nClimGrid annuals are complete grid years. Temperature is degrees Fahrenheit; precipitation is inches.',
    units: {
      meanTempF: '°F',
      precipIn: 'in',
    },
    retrieved: RETRIEVED,
    timezone: 'Calendar years in source native time (nClimGrid local calendar; GHCN station local calendar)',
  },
  records,
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `${JSON.stringify(dataset, null, 2)}\n`)
console.log(`wrote ${records.length} records to ${out}`)
