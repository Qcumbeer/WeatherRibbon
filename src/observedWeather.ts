import { US_CITIES, type UsCity } from './cities.ts'

export const OBSERVED_DATASET_ID = 'us-cities-observed-annual-2021-2025'
export const OBSERVED_DATASET_VERSION = 1
export const OBSERVED_YEARS = [2021, 2022, 2023, 2024, 2025] as const
export const OBSERVED_START = '2021-01-01'
export const OBSERVED_END = '2025-12-31'
export const OBSERVED_CALENDAR = 'civil'
export const OBSERVED_RECORD_COUNT = 500
export const OBSERVED_CITY_COUNT = 100
export const OBSERVED_DAILY_COUNT = 1826
export const MIN_COMPLETENESS = 0.99
export const TEMP_MIN_C = -40
export const TEMP_MAX_C = 45
export const PRECIP_MIN_MM = 0
export const PRECIP_MAX_MM = 6000
export const AUDIT_SLUGS = ['seattle', 'phoenix', 'miami'] as const
export const NCLIMGRID_GRID = '21'
export const ACIS_ENDPOINT = 'https://data.rcc-acis.org'

export const GHCN_STATIONS = {
  anchorage: {
    id: 'USW00026451',
    name: 'ANCHORAGE TED STEVENS INTERNATIONAL AIRPORT',
  },
  honolulu: {
    id: 'USW00022521',
    name: 'HONOLULU INTL AP',
  },
} as const

export const OBSERVED_UNITS = {
  temperature: 'degC',
  precipitation: 'mm',
} as const

export const OPEN_METEO_CONTENTION =
  'Open-Meteo Archive ERA5 bulk fetch was abandoned after shared free-tier HTTP 429s during a parallel duel. Dataset built from NOAA nClimGrid-Daily via RCC ACIS (CONUS) and GHCN-Daily stations (Anchorage, Honolulu). No synthetic climate-normal fallback was used.'

export const OBSERVED_PROVENANCE = {
  source: 'NOAA',
  provider: 'NOAA / NCEI via RCC ACIS',
  endpoint: ACIS_ENDPOINT,
  documentation: 'https://www.rcc-acis.org/docs_webservices.html',
  nclimgridDocumentation: 'https://www.ncei.noaa.gov/products/land-based-station/us-climate-gridded-dataset',
  ghcnDocumentation: 'https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily',
  conusProduct: 'nClimGrid-Daily',
  conusGridParameter: NCLIMGRID_GRID,
  nonConusProduct: 'GHCN-Daily',
  timezone: 'civil-date',
  calendar: 'civil',
  dailyVariables: ['avgt', 'pcpn'] as const,
  sourceUnits: { avgt: 'degF', pcpn: 'inch' },
  queryTemplateGrid: `${ACIS_ENDPOINT}/GridData {"grid":"21","loc":"{lon},{lat}","sdate":"2021-01-01","edate":"2025-12-31","elems":["avgt","pcpn"]}`,
  queryTemplateStation: `${ACIS_ENDPOINT}/StnData {"sid":"{stationId}","sdate":"2021-01-01","edate":"2025-12-31","elems":["avgt","pcpn"],"meta":"name,ll"}`,
  license: 'NOAA / NCEI public information; ACIS used as the access service',
  limitations:
    'CONUS values are NOAA nClimGrid-Daily (5 km gridded station interpolation via ACIS grid 21), not a single downtown weather station. Anchorage and Honolulu use identified GHCN-Daily first-order airport stations because nClimGrid does not cover Alaska or Hawaii. nClimGrid smooths local urban, coastal, and convective extremes. GHCN values are station observations and can miss a city microclimate a few kilometers away. Trace precipitation (T) is stored as 0 mm, matching NOAA practice, and is not a fabricated observation. Missing station days are left missing and lower completeness; they are never filled from climate normals. Dates are NOAA published civil calendar days for 2021-01-01..2025-12-31, not ERA5 UTC hourly aggregates. Do not treat these as 1991-2020 climate normals or as NWS official climate summaries.',
  findings: [OPEN_METEO_CONTENTION],
} as const

export type ObservedYear = (typeof OBSERVED_YEARS)[number]
export type ObservedProduct = 'nClimGrid-daily' | 'GHCN-Daily'

export interface ObservedYearRecord {
  slug: string
  year: ObservedYear
  latitude: number
  longitude: number
  gridLatitude: number
  gridLongitude: number
  meanTemperatureC: number
  totalPrecipitationMm: number
  expectedDays: number
  observedTemperatureDays: number
  observedPrecipitationDays: number
  completeness: number
  product: ObservedProduct
  stationId: string | null
  stationName: string | null
}

export interface ObservedSpotCheck {
  slug: string
  dailySeriesHash: string
  years: Record<string, { meanTemperatureC: number; totalPrecipitationMm: number; completeness: number }>
}

export interface ObservedWeatherDataset {
  id: string
  version: number
  periodStart: string
  periodEnd: string
  years: number[]
  calendar: 'civil'
  units: { temperature: 'degC'; precipitation: 'mm' }
  provenance: {
    source: string
    provider: string
    endpoint: string
    documentation: string
    nclimgridDocumentation: string
    ghcnDocumentation: string
    conusProduct: string
    conusGridParameter: string
    nonConusProduct: string
    timezone: string
    calendar: string
    dailyVariables: string[]
    sourceUnits: { avgt: string; pcpn: string }
    queryTemplateGrid: string
    queryTemplateStation: string
    license: string
    limitations: string
    findings: string[]
  }
  contentHash: string
  spotChecks: ObservedSpotCheck[]
  records: ObservedYearRecord[]
}

export interface DailySeries {
  time: string[]
  meanTemperatureF: (number | null)[]
  precipitationIn: (number | null)[]
  gridLatitude: number
  gridLongitude: number
  product: ObservedProduct
  stationId: string | null
  stationName: string | null
}

export function utcDaysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
}

export function roundTo(n: number, places: number): number {
  const f = 10 ** places
  return Math.round(n * f) / f
}

export function addUtcDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function fToC(f: number): number {
  return ((f - 32) * 5) / 9
}

export function inToMm(inches: number): number {
  return inches * 25.4
}

export function productForSlug(slug: string): ObservedProduct {
  return slug in GHCN_STATIONS ? 'GHCN-Daily' : 'nClimGrid-daily'
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function parseAcisValue(value: unknown, kind: 'temp' | 'precip'): number | null {
  if (value === null || value === undefined || value === 'M' || value === 'S') return null
  if (value === 'T') {
    if (kind === 'precip') return 0
    throw new Error('upstream: trace is not valid for temperature')
  }
  if (isFiniteNumber(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value)
  }
  throw new Error(`upstream: unparseable ${kind} value ${JSON.stringify(value)}`)
}

export function verifyAcisDailyResponse(
  payload: unknown,
  loc: { latitude: number; longitude: number; product: ObservedProduct; stationId?: string },
): DailySeries {
  if (payload === null || typeof payload !== 'object') {
    throw new Error('upstream: response is not an object')
  }
  const p = payload as Record<string, unknown>
  if (typeof p.error === 'string' && p.error.length > 0) {
    throw new Error(`upstream: API error ${p.error}`)
  }
  if (!Array.isArray(p.data)) {
    throw new Error('upstream: missing data array')
  }
  if (p.data.length !== OBSERVED_DAILY_COUNT) {
    throw new Error(`upstream: expected ${OBSERVED_DAILY_COUNT} civil days, got ${p.data.length}`)
  }

  const time: string[] = []
  const meanTemperatureF: (number | null)[] = []
  const precipitationIn: (number | null)[] = []

  for (let i = 0; i < p.data.length; i++) {
    const row = p.data[i]
    if (!Array.isArray(row) || row.length < 3 || typeof row[0] !== 'string') {
      throw new Error(`upstream: malformed row at index ${i}`)
    }
    const expected = addUtcDays(OBSERVED_START, i)
    if (row[0] !== expected) {
      throw new Error(`upstream: date gap at index ${i}: got ${row[0]}, expected ${expected}`)
    }
    time.push(row[0])
    meanTemperatureF.push(parseAcisValue(row[1], 'temp'))
    precipitationIn.push(parseAcisValue(row[2], 'precip'))
  }

  if (time[0] !== OBSERVED_START || time[time.length - 1] !== OBSERVED_END) {
    throw new Error(`upstream: date range ${time[0]}..${time[time.length - 1]} is not ${OBSERVED_START}..${OBSERVED_END}`)
  }

  let gridLatitude = loc.latitude
  let gridLongitude = loc.longitude
  let stationName: string | null = null
  const meta = p.meta
  if (meta && typeof meta === 'object') {
    const m = meta as Record<string, unknown>
    if (Array.isArray(m.ll) && isFiniteNumber(m.ll[0]) && isFiniteNumber(m.ll[1])) {
      gridLongitude = m.ll[0]
      gridLatitude = m.ll[1]
    }
    if (typeof m.name === 'string' && m.name.length > 0) stationName = m.name
  }

  return {
    time,
    meanTemperatureF,
    precipitationIn,
    gridLatitude: roundTo(gridLatitude, 5),
    gridLongitude: roundTo(gridLongitude, 5),
    product: loc.product,
    stationId: loc.stationId ?? null,
    stationName,
  }
}

export function normalizeRecord(input: ObservedYearRecord): ObservedYearRecord {
  return {
    slug: input.slug,
    year: input.year,
    latitude: input.latitude,
    longitude: input.longitude,
    gridLatitude: input.gridLatitude,
    gridLongitude: input.gridLongitude,
    meanTemperatureC: input.meanTemperatureC,
    totalPrecipitationMm: input.totalPrecipitationMm,
    expectedDays: input.expectedDays,
    observedTemperatureDays: input.observedTemperatureDays,
    observedPrecipitationDays: input.observedPrecipitationDays,
    completeness: input.completeness,
    product: input.product,
    stationId: input.stationId,
    stationName: input.stationName,
  }
}

export function aggregateCivilYears(
  daily: DailySeries,
  city: Pick<UsCity, 'slug' | 'latitude' | 'longitude'>,
): ObservedYearRecord[] {
  const records: ObservedYearRecord[] = []
  let offset = 0
  for (const year of OBSERVED_YEARS) {
    const expectedDays = utcDaysInYear(year)
    const sliceEnd = offset + expectedDays
    if (sliceEnd > daily.time.length) {
      throw new Error(`upstream: truncated before ${year} for ${city.slug}`)
    }
    if (daily.time[offset] !== `${year}-01-01` || daily.time[sliceEnd - 1] !== `${year}-12-31`) {
      throw new Error(`upstream: ${city.slug} ${year} slice is ${daily.time[offset]}..${daily.time[sliceEnd - 1]}`)
    }
    let tempSumF = 0
    let precipSumIn = 0
    let tempDays = 0
    let precipDays = 0
    for (let i = offset; i < sliceEnd; i++) {
      const t = daily.meanTemperatureF[i]
      const pr = daily.precipitationIn[i]
      if (t !== null) {
        tempSumF += t
        tempDays++
      }
      if (pr !== null) {
        precipSumIn += pr
        precipDays++
      }
    }
    const completeness = roundTo(Math.min(tempDays, precipDays) / expectedDays, 6)
    if (tempDays === 0 || precipDays === 0 || completeness < MIN_COMPLETENESS) {
      throw new Error(
        `upstream: incomplete ${city.slug} ${year}: temp ${tempDays}/${expectedDays} precip ${precipDays}/${expectedDays}`,
      )
    }
    records.push(
      normalizeRecord({
        slug: city.slug,
        year,
        latitude: city.latitude,
        longitude: city.longitude,
        gridLatitude: daily.gridLatitude,
        gridLongitude: daily.gridLongitude,
        meanTemperatureC: roundTo(fToC(tempSumF / tempDays), 3),
        totalPrecipitationMm: roundTo(inToMm(precipSumIn), 2),
        expectedDays,
        observedTemperatureDays: tempDays,
        observedPrecipitationDays: precipDays,
        completeness,
        product: daily.product,
        stationId: daily.stationId,
        stationName: daily.stationName,
      }),
    )
    offset = sliceEnd
  }
  if (offset !== daily.time.length) {
    throw new Error(`upstream: leftover daily rows for ${city.slug}`)
  }
  return records
}

export function sortObservedRecords(
  records: ObservedYearRecord[],
  cities: readonly Pick<UsCity, 'slug'>[],
): ObservedYearRecord[] {
  const rank = new Map(cities.map((c, i) => [c.slug, i]))
  return [...records].sort((a, b) => {
    const ra = rank.get(a.slug) ?? Number.POSITIVE_INFINITY
    const rb = rank.get(b.slug) ?? Number.POSITIVE_INFINITY
    if (ra !== rb) return ra - rb
    return a.year - b.year
  })
}

const REQUIRED_PROVENANCE = [
  'source',
  'provider',
  'endpoint',
  'documentation',
  'limitations',
  'conusProduct',
  'nonConusProduct',
] as const

export function validateObservedDataset(
  data: unknown,
  cities: readonly Pick<UsCity, 'slug' | 'latitude' | 'longitude'>[] = US_CITIES,
): string[] {
  const issues: string[] = []
  if (data === null || typeof data !== 'object') return ['dataset is not an object']
  const d = data as Partial<ObservedWeatherDataset>
  if (d.id !== OBSERVED_DATASET_ID) issues.push(`id must be ${OBSERVED_DATASET_ID}`)
  if (d.version !== OBSERVED_DATASET_VERSION) issues.push('version must be 1')
  if (d.periodStart !== OBSERVED_START || d.periodEnd !== OBSERVED_END) {
    issues.push('period must be 2021-01-01..2025-12-31')
  }
  if (d.calendar !== 'civil') issues.push('calendar must be civil')
  if (d.units?.temperature !== 'degC' || d.units?.precipitation !== 'mm') {
    issues.push('units must be degC / mm')
  }
  if (!Array.isArray(d.years) || d.years.join(',') !== OBSERVED_YEARS.join(',')) {
    issues.push('years must be 2021,2022,2023,2024,2025')
  }
  const prov = d.provenance
  if (!prov || typeof prov !== 'object') {
    issues.push('provenance missing')
  } else {
    for (const key of REQUIRED_PROVENANCE) {
      const value = prov[key]
      if (typeof value !== 'string' || value.trim().length === 0) {
        issues.push(`provenance.${key} missing`)
      }
    }
    if (prov.source === 'Deterministic latitude-seeded climatology (offline fallback)') {
      issues.push('provenance must not use the climate-normal fallback')
    }
    if (!Array.isArray(prov.findings) || !prov.findings.some((f) => f.includes('HTTP 429'))) {
      issues.push('provenance must record the Open-Meteo contention finding')
    }
  }
  if (typeof d.contentHash !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(d.contentHash)) {
    issues.push('contentHash must be sha256:<64 hex>')
  }
  if (!Array.isArray(d.spotChecks) || d.spotChecks.length !== AUDIT_SLUGS.length) {
    issues.push('spotChecks must cover seattle, phoenix, miami')
  } else {
    for (const slug of AUDIT_SLUGS) {
      const hit = d.spotChecks.find((s) => s.slug === slug)
      if (!hit || typeof hit.dailySeriesHash !== 'string' || !hit.dailySeriesHash.startsWith('sha256:')) {
        issues.push(`spotCheck missing for ${slug}`)
      }
    }
  }
  if (!Array.isArray(d.records)) {
    issues.push('records must be an array')
    return issues
  }
  if (d.records.length !== OBSERVED_RECORD_COUNT) {
    issues.push(`expected ${OBSERVED_RECORD_COUNT} records, got ${d.records.length}`)
  }
  if (cities.length !== OBSERVED_CITY_COUNT) {
    issues.push(`canonical city export must have ${OBSERVED_CITY_COUNT} cities`)
  }
  const pairs = new Set<string>()
  const bySlugYear = new Map<string, ObservedYearRecord>()
  for (let i = 0; i < d.records.length; i++) {
    const r = d.records[i]
    const prefix = `records[${i}]`
    if (!r || typeof r !== 'object') {
      issues.push(`${prefix} is not an object`)
      continue
    }
    if (typeof r.slug !== 'string' || r.slug.length === 0) issues.push(`${prefix}.slug missing`)
    if (!OBSERVED_YEARS.includes(r.year as ObservedYear)) issues.push(`${prefix}.year invalid`)
    const nums = [
      r.latitude,
      r.longitude,
      r.gridLatitude,
      r.gridLongitude,
      r.meanTemperatureC,
      r.totalPrecipitationMm,
      r.expectedDays,
      r.observedTemperatureDays,
      r.observedPrecipitationDays,
      r.completeness,
    ]
    if (nums.some((v) => !isFiniteNumber(v))) issues.push(`${prefix} has a non-finite value`)
    if (isFiniteNumber(r.meanTemperatureC) && (r.meanTemperatureC < TEMP_MIN_C || r.meanTemperatureC > TEMP_MAX_C)) {
      issues.push(`${prefix} meanTemperatureC out of range`)
    }
    if (
      isFiniteNumber(r.totalPrecipitationMm) &&
      (r.totalPrecipitationMm < PRECIP_MIN_MM || r.totalPrecipitationMm > PRECIP_MAX_MM)
    ) {
      issues.push(`${prefix} totalPrecipitationMm out of range`)
    }
    const expected = utcDaysInYear(r.year)
    if (r.expectedDays !== expected) issues.push(`${prefix} expectedDays should be ${expected}`)
    if (r.observedTemperatureDays > expected || r.observedPrecipitationDays > expected) {
      issues.push(`${prefix} observation days exceed calendar length`)
    }
    if (isFiniteNumber(r.completeness) && (r.completeness < MIN_COMPLETENESS || r.completeness > 1)) {
      issues.push(`${prefix} completeness out of range`)
    }
    const expectedProduct = productForSlug(r.slug)
    if (r.product !== expectedProduct) issues.push(`${prefix} product should be ${expectedProduct}`)
    if (expectedProduct === 'GHCN-Daily' && !r.stationId) issues.push(`${prefix} GHCN stationId missing`)
    if (expectedProduct === 'nClimGrid-daily' && r.stationId) issues.push(`${prefix} unexpected stationId`)
    const key = `${r.slug}:${r.year}`
    if (pairs.has(key)) issues.push(`duplicate ${key}`)
    pairs.add(key)
    bySlugYear.set(key, r)
  }
  let joined = 0
  for (const city of cities) {
    let present = 0
    for (const year of OBSERVED_YEARS) {
      const rec = bySlugYear.get(`${city.slug}:${year}`)
      if (!rec) {
        issues.push(`missing ${city.slug} ${year}`)
        continue
      }
      present++
      if (rec.latitude !== city.latitude || rec.longitude !== city.longitude) {
        issues.push(`coordinate mismatch for ${city.slug} ${year}`)
      }
    }
    if (present === OBSERVED_YEARS.length) joined++
  }
  if (joined !== cities.length) {
    issues.push(`city join is ${joined}/${cities.length}, expected ${cities.length}/${cities.length}`)
  }
  const extra = [...pairs].filter((key) => !cities.some((c) => c.slug === key.split(':')[0]))
  if (extra.length) issues.push(`unknown city keys: ${extra.join(',')}`)
  const expectedOrder = cities.flatMap((c) => OBSERVED_YEARS.map((year) => `${c.slug}:${year}`))
  const actualOrder = d.records.map((r) => `${r.slug}:${r.year}`)
  if (expectedOrder.length === actualOrder.length) {
    for (let i = 0; i < expectedOrder.length; i++) {
      if (expectedOrder[i] !== actualOrder[i]) {
        issues.push(`order mismatch at ${i}: expected ${expectedOrder[i]}, got ${actualOrder[i]}`)
        break
      }
    }
  }
  if (d.spotChecks) {
    for (const check of d.spotChecks) {
      for (const year of OBSERVED_YEARS) {
        const rec = bySlugYear.get(`${check.slug}:${year}`)
        const audit = check.years?.[String(year)]
        if (!rec || !audit) {
          issues.push(`spotCheck ${check.slug} ${year} missing`)
          continue
        }
        if (audit.meanTemperatureC !== rec.meanTemperatureC || audit.totalPrecipitationMm !== rec.totalPrecipitationMm) {
          issues.push(`spotCheck ${check.slug} ${year} does not match record`)
        }
      }
    }
  }
  return issues
}

let cached: ObservedWeatherDataset | undefined

export function loadObservedWeather(artifact: ObservedWeatherDataset): ObservedWeatherDataset {
  if (cached) return cached
  const issues = validateObservedDataset(artifact, US_CITIES)
  if (issues.length) {
    throw new Error(`observed weather artifact failed validation:\n${issues.join('\n')}`)
  }
  cached = artifact
  return artifact
}

export function observedYearsForCity(
  artifact: ObservedWeatherDataset,
  slug: string,
): ObservedYearRecord[] {
  return loadObservedWeather(artifact).records.filter((r) => r.slug === slug)
}

export function getObservedYear(
  artifact: ObservedWeatherDataset,
  slug: string,
  year: number,
): ObservedYearRecord | undefined {
  return loadObservedWeather(artifact).records.find((r) => r.slug === slug && r.year === year)
}
