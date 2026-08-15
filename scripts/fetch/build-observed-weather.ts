import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { US_CITIES } from '../../src/cities.ts'
import {
  ACIS_ENDPOINT,
  AUDIT_SLUGS,
  GHCN_STATIONS,
  NCLIMGRID_GRID,
  OBSERVED_DATASET_ID,
  OBSERVED_DATASET_VERSION,
  OBSERVED_END,
  OBSERVED_PROVENANCE,
  OBSERVED_RECORD_COUNT,
  OBSERVED_START,
  OBSERVED_UNITS,
  OBSERVED_YEARS,
  aggregateCivilYears,
  productForSlug,
  sortObservedRecords,
  validateObservedDataset,
  verifyAcisDailyResponse,
  type ObservedSpotCheck,
  type ObservedWeatherDataset,
  type ObservedYearRecord,
} from '../../src/observedWeather.ts'
import { dailySeriesHash, recordsContentHash } from '../observed-hash.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT_PATH = join(ROOT, 'data/observed-weather-2021-2025.json')
const CACHE_DIR = join(ROOT, 'data/.cache/observed-acis')
const CONCURRENCY = 4
const ATTEMPTS = 5
const REQUEST_GAP_MS = 150
const DEADLINE_MS = 180_000

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function postAcis(path: 'GridData' | 'StnData', body: Record<string, unknown>): Promise<unknown> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${ACIS_ENDPOINT}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.status === 400 || res.status === 404) {
        const text = await res.text()
        throw new Error(`Fatal HTTP ${res.status}: ${text.slice(0, 200)}`)
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      lastErr = err
      if (err instanceof Error && err.message.startsWith('Fatal')) throw err
      if (attempt === ATTEMPTS) break
      await sleep(400 * 2 ** (attempt - 1))
    }
  }
  throw new Error(`Failed after ${ATTEMPTS} attempts: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`)
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  let stopped = false
  async function worker() {
    while (!stopped) {
      const index = next++
      if (index >= items.length) return
      results[index] = await fn(items[index], index)
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  } catch (err) {
    stopped = true
    throw err
  }
  return results
}

function writeAtomic(path: string, body: string) {
  mkdirSync(dirname(path), { recursive: true })
  const tmp = `${path}.tmp`
  writeFileSync(tmp, body)
  renameSync(tmp, path)
}

function cachePath(slug: string): string {
  return join(CACHE_DIR, `${slug}.json`)
}

async function fetchCity(city: (typeof US_CITIES)[number]): Promise<{
  records: ObservedYearRecord[]
  seriesHash: string
}> {
  mkdirSync(CACHE_DIR, { recursive: true })
  const cached = cachePath(city.slug)
  let payload: unknown
  const product = productForSlug(city.slug)
  const station = city.slug === 'anchorage' || city.slug === 'honolulu' ? GHCN_STATIONS[city.slug] : undefined
  if (existsSync(cached)) {
    payload = JSON.parse(readFileSync(cached, 'utf8'))
  } else if (station) {
    payload = await postAcis('StnData', {
      sid: station.id,
      sdate: OBSERVED_START,
      edate: OBSERVED_END,
      elems: ['avgt', 'pcpn'],
      meta: 'name,ll',
    })
  } else {
    payload = await postAcis('GridData', {
      grid: NCLIMGRID_GRID,
      loc: `${city.longitude},${city.latitude}`,
      sdate: OBSERVED_START,
      edate: OBSERVED_END,
      elems: ['avgt', 'pcpn'],
    })
  }
  const daily = verifyAcisDailyResponse(payload, {
    latitude: city.latitude,
    longitude: city.longitude,
    product,
    stationId: station?.id,
  })
  if (station && daily.stationName == null) daily.stationName = station.name
  const records = aggregateCivilYears(daily, city)
  if (!existsSync(cached)) writeFileSync(cached, `${JSON.stringify(payload)}\n`)
  return {
    records,
    seriesHash: dailySeriesHash(daily.time, daily.meanTemperatureF, daily.precipitationIn),
  }
}

function buildDataset(
  records: ObservedYearRecord[],
  spotChecks: ObservedSpotCheck[],
): ObservedWeatherDataset {
  const ordered = sortObservedRecords(records, US_CITIES).map((r) => ({ ...r }))
  return {
    id: OBSERVED_DATASET_ID,
    version: OBSERVED_DATASET_VERSION,
    periodStart: OBSERVED_START,
    periodEnd: OBSERVED_END,
    years: [...OBSERVED_YEARS],
    calendar: 'civil',
    units: { ...OBSERVED_UNITS },
    provenance: {
      source: OBSERVED_PROVENANCE.source,
      provider: OBSERVED_PROVENANCE.provider,
      endpoint: OBSERVED_PROVENANCE.endpoint,
      documentation: OBSERVED_PROVENANCE.documentation,
      nclimgridDocumentation: OBSERVED_PROVENANCE.nclimgridDocumentation,
      ghcnDocumentation: OBSERVED_PROVENANCE.ghcnDocumentation,
      conusProduct: OBSERVED_PROVENANCE.conusProduct,
      conusGridParameter: OBSERVED_PROVENANCE.conusGridParameter,
      nonConusProduct: OBSERVED_PROVENANCE.nonConusProduct,
      timezone: OBSERVED_PROVENANCE.timezone,
      calendar: OBSERVED_PROVENANCE.calendar,
      dailyVariables: [...OBSERVED_PROVENANCE.dailyVariables],
      sourceUnits: { ...OBSERVED_PROVENANCE.sourceUnits },
      queryTemplateGrid: OBSERVED_PROVENANCE.queryTemplateGrid,
      queryTemplateStation: OBSERVED_PROVENANCE.queryTemplateStation,
      license: OBSERVED_PROVENANCE.license,
      limitations: OBSERVED_PROVENANCE.limitations,
      findings: [...OBSERVED_PROVENANCE.findings],
    },
    contentHash: recordsContentHash(ordered),
    spotChecks,
    records: ordered,
  }
}

function printSpotChecks(records: ObservedYearRecord[]) {
  console.log('\nSpot-check (Seattle, Phoenix, Miami):')
  for (const slug of AUDIT_SLUGS) {
    for (const year of OBSERVED_YEARS) {
      const rec = records.find((r) => r.slug === slug && r.year === year)
      if (!rec) throw new Error(`spot-check missing ${slug} ${year}`)
      console.log(
        `  ${slug.padEnd(10)} ${year}  T=${rec.meanTemperatureC.toFixed(3)}°C  P=${rec.totalPrecipitationMm.toFixed(2)} mm  days=${rec.observedTemperatureDays}/${rec.expectedDays}`,
      )
    }
  }
}

async function main() {
  if (US_CITIES.length !== 100) {
    throw new Error(`canonical export has ${US_CITIES.length} cities, expected 100`)
  }

  const started = Date.now()
  console.log(
    `Fetching NOAA ACIS daily ${OBSERVED_START}..${OBSERVED_END} for ${US_CITIES.length} cities (concurrency ${CONCURRENCY})`,
  )

  let lastStart = 0
  const fetched = await mapPool(US_CITIES, CONCURRENCY, async (city, index) => {
    if (Date.now() - started > DEADLINE_MS) {
      throw new Error(`bounded deadline ${DEADLINE_MS}ms exceeded before ${city.slug}`)
    }
    const wait = REQUEST_GAP_MS - (Date.now() - lastStart)
    if (wait > 0) await sleep(wait)
    lastStart = Date.now()
    const result = await fetchCity(city)
    console.log(`  [${String(index + 1).padStart(3)}/100] ${city.slug} ${result.records[0].product} ok`)
    return { city, ...result }
  })

  const records = fetched.flatMap((row) => row.records)
  if (records.length !== OBSERVED_RECORD_COUNT) {
    throw new Error(`refusing to write: got ${records.length} records, expected ${OBSERVED_RECORD_COUNT}`)
  }

  const spotChecks: ObservedSpotCheck[] = AUDIT_SLUGS.map((slug) => {
    const row = fetched.find((f) => f.city.slug === slug)
    if (!row) throw new Error(`audit city missing from fetch: ${slug}`)
    const years: ObservedSpotCheck['years'] = {}
    for (const rec of row.records) {
      years[String(rec.year)] = {
        meanTemperatureC: rec.meanTemperatureC,
        totalPrecipitationMm: rec.totalPrecipitationMm,
        completeness: rec.completeness,
      }
    }
    return { slug, dailySeriesHash: row.seriesHash, years }
  })

  const dataset = buildDataset(records, spotChecks)
  const issues = validateObservedDataset(dataset, US_CITIES)
  if (issues.length) {
    throw new Error(`refusing to write invalid dataset:\n${issues.join('\n')}`)
  }

  printSpotChecks(dataset.records)
  writeAtomic(OUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`)
  console.log(`\nWrote ${OUT_PATH}`)
  console.log(`records=${dataset.records.length} contentHash=${dataset.contentHash}`)
}

main().catch((err) => {
  console.error('\nFATAL: upstream NOAA ACIS failed. Refusing to synthesize observations.')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
