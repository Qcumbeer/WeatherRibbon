import { US_CITIES, CENSUS_VINTAGE, type UsCity } from '../src/cities.ts'
import { loadCity } from '../src/dataService.ts'

let failures = 0

function check(cond: boolean, label: string) {
  if (!cond) {
    failures++
    console.error(`  FAIL  ${label}`)
  } else {
    console.log(`  ok    ${label}`)
  }
}

console.log(`Census vintage: ${CENSUS_VINTAGE}`)

// 1) Exactly 100 cities.
check(US_CITIES.length === 100, `collection has exactly 100 cities (got ${US_CITIES.length})`)

// 2) Ranks are exactly 1..100, unique and contiguous.
const ranks = US_CITIES.map((c) => c.rank)
const rankSet = new Set(ranks)
check(rankSet.size === 100, 'ranks are unique')
const contiguous = Array.from({ length: 100 }, (_, i) => i + 1).every((r) => rankSet.has(r))
check(contiguous, 'ranks cover 1..100 with no gaps')

// 3) Slugs are unique, non-empty, stable kebab-case.
const slugs = US_CITIES.map((c) => c.slug)
check(new Set(slugs).size === 100, 'slugs are unique')
check(
  slugs.every((s) => typeof s === 'string' && s.length > 0 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)),
  'slugs are non-empty stable kebab-case',
)

// 4) Coordinates are valid (finite, in plausible US bounds).
check(
  US_CITIES.every(
    (c) =>
      Number.isFinite(c.latitude) &&
      Number.isFinite(c.longitude) &&
      c.latitude >= 17 &&
      c.latitude <= 72 &&
      c.longitude >= -161 &&
      c.longitude <= -66,
  ),
  'all coordinates finite and within US bounds',
)

// 5) Required labels: name and region present and non-empty.
check(
  US_CITIES.every((c) => c.name.trim().length > 0 && c.region.trim().length > 0),
  'every city has non-empty name and region',
)

// 6) Population rank is strictly decreasing with rank order.
const sorted = [...US_CITIES].sort((a, b) => a.rank - b.rank)
const monotonic = sorted.every((c, i) => i === 0 || sorted[i - 1].population > c.population)
check(monotonic, 'population strictly decreases as rank increases')

// 7) Representative cities present.
const bySlug = new Map(US_CITIES.map((c) => [c.slug, c]))
const reps = ['new-york', 'los-angeles', 'chicago', 'seattle', 'san-francisco', 'honolulu', 'anchorage', 'miami']
for (const slug of reps) {
  check(bySlug.has(slug), `representative city present: ${slug}`)
}
check(bySlug.get('new-york')?.rank === 1, 'New York is rank 1')
check(bySlug.get('seattle')?.slug === 'seattle', 'Seattle override slug preserved')
check(bySlug.get('san-francisco')?.slug === 'san-francisco', 'San Francisco override slug preserved')

// 8) Data loads successfully for all 100 cities and renders valid values.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function validClimate(c: UsCity, data: Awaited<ReturnType<typeof loadCity>>): string | null {
  if (!data || !Array.isArray(data.climate) || data.climate.length !== 12) return 'climate must have 12 months'
  for (let i = 0; i < 12; i++) {
    const m = data.climate[i]
    if (m.month !== MONTHS[i]) return `month[${i}] mislabeled`
    const nums = [m.high, m.low, m.precip, m.sunshine, m.cloud, m.wind, m.dewPoint, m.rain, m.snow]
    if (nums.some((v) => !Number.isFinite(v))) return `month[${i}] has non-finite value`
    if (m.cloud < 0 || m.cloud > 100) return `month[${i}] cloud out of range`
    if (m.rain < 0 || m.snow < 0) return `month[${i}] negative precip-phase fraction`
  }
  if (data.name !== c.name) return 'name mismatch'
  return null
}

let loadOk = 0
for (const city of US_CITIES) {
  const data = await loadCity(city)
  const err = validClimate(city, data)
  if (err) {
    failures++
    console.error(`  FAIL  load ${city.slug}: ${err}`)
  } else {
    loadOk++
  }
}
check(loadOk === 100, `data loads with valid values for all 100 cities (${loadOk}/100)`)

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll city collection checks passed.')
