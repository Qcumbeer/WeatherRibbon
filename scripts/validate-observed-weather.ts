import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { US_CITIES } from '../src/cities.ts'
import {
  AUDIT_SLUGS,
  OBSERVED_DAILY_COUNT,
  OBSERVED_END,
  OBSERVED_RECORD_COUNT,
  OBSERVED_START,
  OBSERVED_YEARS,
  addUtcDays,
  aggregateCivilYears,
  getObservedYear,
  loadObservedWeather,
  observedYearsForCity,
  parseAcisValue,
  validateObservedDataset,
  verifyAcisDailyResponse,
  type ObservedWeatherDataset,
} from '../src/observedWeather.ts'
import { loadObservedAnnualWeather, loadObservedYear, loadObservedYears } from '../src/observedWeatherData.ts'
import { recordsContentHash } from './observed-hash.ts'

let failures = 0

function check(cond: boolean, label: string) {
  if (!cond) {
    failures++
    console.error(`  FAIL  ${label}`)
  } else {
    console.log(`  ok    ${label}`)
  }
}

const artifactPath = join(dirname(fileURLToPath(import.meta.url)), '../data/observed-weather-2021-2025.json')
const raw = readFileSync(artifactPath, 'utf8')
const dataset = JSON.parse(raw) as ObservedWeatherDataset

console.log('\n=== Observed weather artifact ===')
const issues = validateObservedDataset(dataset, US_CITIES)
check(issues.length === 0, issues.length ? `contract: ${issues[0]}` : 'dataset contract passes')
for (const issue of issues.slice(1, 8)) console.error(`         ${issue}`)

check(dataset.records.length === OBSERVED_RECORD_COUNT, `exactly ${OBSERVED_RECORD_COUNT} records`)
check(new Set(dataset.records.map((r) => r.slug)).size === 100, '100 distinct city slugs')
check(
  OBSERVED_YEARS.every((year) => dataset.records.filter((r) => r.year === year).length === 100),
  'each year present once per city',
)
check(dataset.contentHash === recordsContentHash(dataset.records), 'contentHash matches records')
check(raw.endsWith('\n'), 'artifact ends with trailing newline')
check(raw === `${JSON.stringify(dataset, null, 2)}\n`, 'canonical pretty-print is deterministic')
check(
  dataset.provenance.findings.some((f) => f.includes('HTTP 429')),
  'Open-Meteo contention recorded as a finding',
)

const loaded = loadObservedWeather(dataset)
check(loaded.records.length === 500, 'typed loader returns 500 records')
check(observedYearsForCity(dataset, 'seattle').length === 5, 'loader years for seattle')
check(getObservedYear(dataset, 'phoenix', 2024)?.expectedDays === 366, '2024 leap year has 366 days')
check(loadObservedAnnualWeather().records.length === 500, 'consumer loader returns 500 records')
check(loadObservedYears('seattle').length === 5, 'consumer years for seattle')
check(loadObservedYear('phoenix', 2024)?.expectedDays === 366, 'consumer 2024 leap year')
check(getObservedYear(dataset, 'anchorage', 2021)?.product === 'GHCN-Daily', 'Anchorage uses GHCN-Daily')
check(getObservedYear(dataset, 'honolulu', 2021)?.stationId === 'USW00022521', 'Honolulu station is USW00022521')
check(getObservedYear(dataset, 'seattle', 2021)?.product === 'nClimGrid-daily', 'Seattle uses nClimGrid-daily')

console.log('\n=== Audit cities ===')
for (const slug of AUDIT_SLUGS) {
  const rows = observedYearsForCity(dataset, slug)
  check(rows.length === 5, `${slug} has five years`)
  const spot = dataset.spotChecks.find((s) => s.slug === slug)
  check(!!spot, `${slug} spotCheck present`)
}

console.log('\n=== Negative: missing city-year ===')
const missingYear = structuredClone(dataset)
missingYear.records = missingYear.records.filter((r) => !(r.slug === 'seattle' && r.year === 2023))
const missingIssues = validateObservedDataset(missingYear, US_CITIES)
check(
  missingIssues.some((i) => i.includes('missing seattle 2023')),
  'validator fails on missing seattle 2023',
)
check(missingIssues.some((i) => i.includes('expected 500')), 'validator fails on 499-record artifact')

console.log('\n=== Negative: partial upstream payload ===')
function expectThrow(label: string, fn: () => void) {
  try {
    fn()
    check(false, label)
  } catch {
    check(true, label)
  }
}

expectThrow('rejects non-object upstream', () => {
  verifyAcisDailyResponse(null, { latitude: 47.61, longitude: -122.33, product: 'nClimGrid-daily' })
})
expectThrow('rejects API error body', () => {
  verifyAcisDailyResponse(
    { error: 'bad args' },
    { latitude: 47.61, longitude: -122.33, product: 'nClimGrid-daily' },
  )
})
expectThrow('rejects missing data array', () => {
  verifyAcisDailyResponse(
    { meta: {} },
    { latitude: 47.61, longitude: -122.33, product: 'nClimGrid-daily' },
  )
})

expectThrow('rejects truncated date spine', () => {
  verifyAcisDailyResponse(
    { data: [['2021-01-01', 40, 0.1], ['2021-01-02', 41, 0]] },
    { latitude: 47.61, longitude: -122.33, product: 'nClimGrid-daily' },
  )
})

const spine = Array.from({ length: OBSERVED_DAILY_COUNT }, (_, i) => addUtcDays(OBSERVED_START, i))
const complete = spine.map((date) => [date, 50, 0.1])
expectThrow('rejects gapped civil dates', () => {
  const gapped = complete.map((row) => [...row])
  gapped[10][0] = '2021-01-12'
  verifyAcisDailyResponse(
    { data: gapped },
    { latitude: 47.61, longitude: -122.33, product: 'nClimGrid-daily' },
  )
})

const withMissing = complete.map((row) => [...row])
for (let i = 0; i < 20; i++) withMissing[i][1] = 'M'
expectThrow('rejects incomplete year observations', () => {
  const daily = verifyAcisDailyResponse(
    { data: withMissing },
    { latitude: 47.61, longitude: -122.33, product: 'nClimGrid-daily' },
  )
  aggregateCivilYears(daily, { slug: 'seattle', latitude: 47.61, longitude: -122.33 })
})

check(parseAcisValue('T', 'precip') === 0, 'trace precipitation parses as 0')
check(parseAcisValue('M', 'temp') === null, 'missing temperature stays null')
expectThrow('rejects unparseable values', () => {
  parseAcisValue('abc', 'temp')
})

const good = verifyAcisDailyResponse(
  { data: complete },
  { latitude: 47.61, longitude: -122.33, product: 'nClimGrid-daily' },
)
check(good.time[0] === OBSERVED_START && good.time[good.time.length - 1] === OBSERVED_END, 'valid complete payload accepted')
check(good.time.length === OBSERVED_DAILY_COUNT, 'valid payload has 1826 civil days')

if (failures > 0) {
  console.error(`\n${failures} observed-weather check(s) failed`)
  process.exit(1)
}
console.log('\nAll observed-weather checks passed.')
