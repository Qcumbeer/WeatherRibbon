import { readFileSync } from 'node:fs'
import { US_CITIES } from '../src/cities.ts'
import {
  ANNUAL_META,
  ANNUAL_RECORDS,
  ANNUAL_YEARS,
  MIN_COMPLETENESS,
  annualForCity,
  formatPrecip,
  formatTemp,
  signedDelta,
} from '../src/annual.ts'

let failures = 0

function check(cond: boolean, label: string) {
  if (!cond) {
    failures++
    console.error(`  FAIL  ${label}`)
  } else {
    console.log(`  ok    ${label}`)
  }
}

const YEARS = [...ANNUAL_YEARS]
const slugs = US_CITIES.map((c) => c.slug)

console.log('\n=== Annual dataset contract ===')
check(ANNUAL_RECORDS.length === 500, `exactly 500 records (got ${ANNUAL_RECORDS.length})`)
check(YEARS.join(',') === '2021,2022,2023,2024,2025', 'window is 2021-2025 inclusive')
check(ANNUAL_META.window.start === 2021 && ANNUAL_META.window.end === 2025, 'meta window 2021-2025')
check(ANNUAL_META.units.meanTempF === '°F', 'temperature unit is °F')
check(ANNUAL_META.units.precipIn === 'in', 'precipitation unit is in')
check(ANNUAL_META.sourceName.includes('NOAA'), 'source names NOAA')
check(ANNUAL_META.license.includes('NOAA / NCEI public information'), 'license identifies NOAA public information')
check(ANNUAL_META.method.includes('nClimGrid'), 'method documents nClimGrid')
check(ANNUAL_META.method.includes('GHCN'), 'method documents GHCN for AK/HI')
check(ANNUAL_META.method.includes('Trace'), 'method documents trace precipitation')
check(/^sha256:[a-f0-9]{64}$/.test(ANNUAL_META.contentHash), 'artifact exposes a SHA-256 content hash')

const bySlug = new Map<string, typeof ANNUAL_RECORDS>()
for (const rec of ANNUAL_RECORDS) {
  const list = bySlug.get(rec.slug) ?? []
  list.push(rec)
  bySlug.set(rec.slug, list)
}

check(bySlug.size === 100, `100 unique slugs (got ${bySlug.size})`)
check(
  slugs.every((slug) => bySlug.has(slug)),
  'every canonical city joins the annual dataset',
)
check(
  [...bySlug.keys()].every((slug) => slugs.includes(slug)),
  'no extra slugs beyond the canonical 100',
)

console.log('\n=== Per-city years, order, values ===')
let orderOk = true
let i = 0
for (const city of US_CITIES) {
  const recs = bySlug.get(city.slug) ?? []
  const years = recs.map((r) => r.year)
  if (recs.length !== 5 || new Set(years).size !== 5 || YEARS.some((y, idx) => years[idx] !== y)) {
    failures++
    console.error(`  FAIL  ${city.slug} must have years 2021-2025 in order (got ${years.join(',')})`)
    continue
  }
  for (const rec of recs) {
    const expected = rec.year % 4 === 0 && (rec.year % 100 !== 0 || rec.year % 400 === 0) ? 366 : 365
    if (ANNUAL_RECORDS[i] !== rec) orderOk = false
    if (rec.expectedDays !== expected) {
      failures++
      console.error(`  FAIL  ${city.slug} ${rec.year} expectedDays ${rec.expectedDays} != ${expected}`)
    }
    if (rec.meanTempF === null || rec.precipIn === null) {
      failures++
      console.error(`  FAIL  ${city.slug} ${rec.year} has null observation`)
      continue
    }
    if (!Number.isFinite(rec.meanTempF) || !Number.isFinite(rec.precipIn)) {
      failures++
      console.error(`  FAIL  ${city.slug} ${rec.year} non-finite value`)
    }
    if (rec.meanTempF < 20 || rec.meanTempF > 90) {
      failures++
      console.error(`  FAIL  ${city.slug} ${rec.year} temp ${rec.meanTempF} outside 20-90°F`)
    }
    if (rec.precipIn < 0 || rec.precipIn > 120) {
      failures++
      console.error(`  FAIL  ${city.slug} ${rec.year} precip ${rec.precipIn} outside 0-120 in`)
    }
    if (rec.completeness < MIN_COMPLETENESS || rec.completeness > 1) {
      failures++
      console.error(
        `  FAIL  ${city.slug} ${rec.year} completeness ${rec.completeness} below ${MIN_COMPLETENESS}`,
      )
    }
    if (!rec.sourceId.startsWith('nclimgrid:') && !rec.sourceId.startsWith('ghcn:')) {
      failures++
      console.error(`  FAIL  ${city.slug} ${rec.year} bad sourceId ${rec.sourceId}`)
    }
    i++
  }
}
check(orderOk, 'records ordered by canonical rank then year')
check(i === 500, `walked 500 joined records (${i})`)

check(
  (bySlug.get('anchorage') ?? []).every((r) => r.sourceId === 'ghcn:USW00026451'),
  'Anchorage uses GHCN USW00026451',
)
check(
  (bySlug.get('honolulu') ?? []).every((r) => r.sourceId === 'ghcn:USW00022521'),
  'Honolulu uses GHCN USW00022521',
)
check(
  (bySlug.get('phoenix') ?? []).every((r) => r.sourceId === 'nclimgrid:21'),
  'Phoenix uses nClimGrid grid 21',
)

console.log('\n=== NOAA spot checks (not placeholders) ===')
function expectRecord(
  slug: string,
  year: number,
  meanTempF: number,
  precipIn: number,
) {
  const rec = (bySlug.get(slug) ?? []).find((r) => r.year === year)
  check(
    rec?.meanTempF === meanTempF && rec?.precipIn === precipIn,
    `${slug} ${year} is ${meanTempF} °F / ${precipIn} in`,
  )
}

expectRecord('phoenix', 2021, 75.1, 9.66)
expectRecord('phoenix', 2023, 74.4, 4.87)
expectRecord('phoenix', 2025, 76, 9.05)
expectRecord('miami', 2021, 77.7, 64.75)
expectRecord('miami', 2024, 78.2, 73.17)
expectRecord('seattle', 2021, 53.2, 40.79)
expectRecord('seattle', 2025, 54.1, 30.84)
expectRecord('honolulu', 2021, 78.3, 21.34)
expectRecord('anchorage', 2021, 35.9, 15.44)

const mean = (slug: string, key: 'meanTempF' | 'precipIn') => {
  const recs = bySlug.get(slug) ?? []
  return recs.reduce((s, r) => s + (r[key] ?? 0), 0) / recs.length
}

check(mean('phoenix', 'meanTempF') > mean('seattle', 'meanTempF') + 15, 'Phoenix much warmer than Seattle')
check(mean('phoenix', 'precipIn') < mean('seattle', 'precipIn'), 'Phoenix drier than Seattle')
check(mean('miami', 'precipIn') > mean('phoenix', 'precipIn') + 30, 'Miami much wetter than Phoenix')
check(mean('miami', 'meanTempF') > mean('seattle', 'meanTempF') + 15, 'Miami much warmer than Seattle')
check(mean('anchorage', 'meanTempF') < mean('seattle', 'meanTempF') - 8, 'Anchorage cooler than Seattle')
check(mean('honolulu', 'meanTempF') > 75, 'Honolulu stays warm')
check(mean('las-vegas', 'precipIn') < 6, 'Las Vegas remains arid')

const phoenixTemps = (bySlug.get('phoenix') ?? []).map((r) => r.meanTempF)
check(new Set(phoenixTemps).size > 1, 'Phoenix temperatures vary across the five years')

const phoenix = annualForCity(US_CITIES.find((c) => c.slug === 'phoenix')!)
check(phoenix?.length === 5, 'annualForCity joins Phoenix')
check(formatTemp(75.1) === '75.1 °F', 'formatTemp includes unit')
check(formatPrecip(9.65) === '9.65 in', 'formatPrecip includes unit')
check(formatTemp(null) === '—', 'formatTemp missing is em dash')
check(formatPrecip(0) === '0.00 in', 'zero precip is formatted, not missing')
check(signedDelta(-0.01, '°F', 1) === '0.0 °F', 'rounded zero does not render as negative zero')

const cityViewSrc = readFileSync(new URL('../src/CityView.tsx', import.meta.url), 'utf8')
check(cityViewSrc.includes('<FiveYearClimate city={city} />'), 'CityView mounts FiveYearClimate on city detail')

if (failures > 0) {
  console.error(`\n${failures} annual contract check(s) failed`)
  process.exit(1)
}
console.log('\nAll annual data-contract checks passed.')
