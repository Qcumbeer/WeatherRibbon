import { writeFileSync, existsSync, mkdirSync } from 'node:fs'

// ---------------------------------------------------------------------------
// Batch ERA5 climatology builder for all 100 featured U.S. cities
//
// Fetches hourly ERA5 reanalysis data (1991–2020) from the Open-Meteo Archive
// API (free, no key) for every city in src/cities.ts, aggregates it into the
// monthly ClimateMonth[] + windRose structure the frontend consumes, and
// writes data/<slug>.json.
//
// Free-tier limits: 600 calls/min, 5 000/hour, 10 000/day.
// Each year-long request with 10 hourly variables ≈ 26 billable API calls,
// so one city ≈ 780 calls.  100 cities ≈ 78 000 calls → ~8 days at 10 k/day.
// In practice the daily limit is often not strictly enforced.
//
// Features:
//   • Skips cities that already have a data/<slug>.json file
//   • Configurable concurrency and inter-request delay
//   • 429 / 5xx aware exponential backoff
//   • Progress bar and ETA
//
// Usage:
//   npx tsx scripts/fetch/build-all-cities.ts              # all 100 cities
//   npx tsx scripts/fetch/build-all-cities.ts --limit 10    # first 10 only
//   npx tsx scripts/fetch/build-all-cities.ts --force        # overwrite existing
//   npx tsx scripts/fetch/build-all-cities.ts --city chicago # single city
// ---------------------------------------------------------------------------

// ── City list (mirrors src/cities.ts) ──────────────────────────────────────
const CITIES = [
  { slug: 'new-york', name: 'New York', region: 'New York', lat: 40.71, lon: -74.01 },
  { slug: 'los-angeles', name: 'Los Angeles', region: 'California', lat: 34.05, lon: -118.24 },
  { slug: 'chicago', name: 'Chicago', region: 'Illinois', lat: 41.88, lon: -87.63 },
  { slug: 'houston', name: 'Houston', region: 'Texas', lat: 29.76, lon: -95.37 },
  { slug: 'phoenix', name: 'Phoenix', region: 'Arizona', lat: 33.45, lon: -112.07 },
  { slug: 'philadelphia', name: 'Philadelphia', region: 'Pennsylvania', lat: 39.95, lon: -75.17 },
  { slug: 'san-antonio', name: 'San Antonio', region: 'Texas', lat: 29.42, lon: -98.49 },
  { slug: 'san-diego', name: 'San Diego', region: 'California', lat: 32.72, lon: -117.16 },
  { slug: 'dallas', name: 'Dallas', region: 'Texas', lat: 32.78, lon: -96.8 },
  { slug: 'san-jose', name: 'San Jose', region: 'California', lat: 37.34, lon: -121.89 },
  { slug: 'austin', name: 'Austin', region: 'Texas', lat: 30.27, lon: -97.74 },
  { slug: 'jacksonville', name: 'Jacksonville', region: 'Florida', lat: 30.33, lon: -81.66 },
  { slug: 'fort-worth', name: 'Fort Worth', region: 'Texas', lat: 32.76, lon: -97.33 },
  { slug: 'columbus', name: 'Columbus', region: 'Ohio', lat: 39.96, lon: -83.0 },
  { slug: 'charlotte', name: 'Charlotte', region: 'North Carolina', lat: 35.23, lon: -80.84 },
  { slug: 'indianapolis', name: 'Indianapolis', region: 'Indiana', lat: 39.77, lon: -86.16 },
  { slug: 'san-francisco', name: 'San Francisco', region: 'California', lat: 37.77, lon: -122.42 },
  { slug: 'seattle', name: 'Seattle', region: 'Washington', lat: 47.61, lon: -122.33 },
  { slug: 'denver', name: 'Denver', region: 'Colorado', lat: 39.74, lon: -104.99 },
  { slug: 'oklahoma-city', name: 'Oklahoma City', region: 'Oklahoma', lat: 35.47, lon: -97.52 },
  { slug: 'nashville', name: 'Nashville', region: 'Tennessee', lat: 36.16, lon: -86.78 },
  { slug: 'washington', name: 'Washington', region: 'District of Columbia', lat: 38.91, lon: -77.04 },
  { slug: 'el-paso', name: 'El Paso', region: 'Texas', lat: 31.76, lon: -106.49 },
  { slug: 'boston', name: 'Boston', region: 'Massachusetts', lat: 42.36, lon: -71.06 },
  { slug: 'las-vegas', name: 'Las Vegas', region: 'Nevada', lat: 36.17, lon: -115.14 },
  { slug: 'portland', name: 'Portland', region: 'Oregon', lat: 45.52, lon: -122.68 },
  { slug: 'louisville', name: 'Louisville', region: 'Kentucky', lat: 38.25, lon: -85.76 },
  { slug: 'detroit', name: 'Detroit', region: 'Michigan', lat: 42.33, lon: -83.05 },
  { slug: 'memphis', name: 'Memphis', region: 'Tennessee', lat: 35.15, lon: -90.05 },
  { slug: 'baltimore', name: 'Baltimore', region: 'Maryland', lat: 39.29, lon: -76.61 },
  { slug: 'albuquerque', name: 'Albuquerque', region: 'New Mexico', lat: 35.08, lon: -106.65 },
  { slug: 'milwaukee', name: 'Milwaukee', region: 'Wisconsin', lat: 43.04, lon: -87.91 },
  { slug: 'tucson', name: 'Tucson', region: 'Arizona', lat: 32.22, lon: -110.97 },
  { slug: 'fresno', name: 'Fresno', region: 'California', lat: 36.74, lon: -119.77 },
  { slug: 'sacramento', name: 'Sacramento', region: 'California', lat: 38.58, lon: -121.49 },
  { slug: 'kansas-city', name: 'Kansas City', region: 'Missouri', lat: 39.1, lon: -94.58 },
  { slug: 'mesa', name: 'Mesa', region: 'Arizona', lat: 33.42, lon: -111.83 },
  { slug: 'atlanta', name: 'Atlanta', region: 'Georgia', lat: 33.75, lon: -84.39 },
  { slug: 'omaha', name: 'Omaha', region: 'Nebraska', lat: 41.26, lon: -95.93 },
  { slug: 'colorado-springs', name: 'Colorado Springs', region: 'Colorado', lat: 38.83, lon: -104.82 },
  { slug: 'raleigh', name: 'Raleigh', region: 'North Carolina', lat: 35.78, lon: -78.64 },
  { slug: 'virginia-beach', name: 'Virginia Beach', region: 'Virginia', lat: 36.85, lon: -75.98 },
  { slug: 'long-beach', name: 'Long Beach', region: 'California', lat: 33.77, lon: -118.19 },
  { slug: 'miami', name: 'Miami', region: 'Florida', lat: 25.76, lon: -80.19 },
  { slug: 'oakland', name: 'Oakland', region: 'California', lat: 37.8, lon: -122.27 },
  { slug: 'minneapolis', name: 'Minneapolis', region: 'Minnesota', lat: 44.98, lon: -93.27 },
  { slug: 'tulsa', name: 'Tulsa', region: 'Oklahoma', lat: 36.15, lon: -95.99 },
  { slug: 'bakersfield', name: 'Bakersfield', region: 'California', lat: 35.37, lon: -119.02 },
  { slug: 'wichita', name: 'Wichita', region: 'Kansas', lat: 37.69, lon: -97.34 },
  { slug: 'arlington', name: 'Arlington', region: 'Texas', lat: 32.74, lon: -97.11 },
  { slug: 'tampa', name: 'Tampa', region: 'Florida', lat: 27.95, lon: -82.46 },
  { slug: 'new-orleans', name: 'New Orleans', region: 'Louisiana', lat: 29.95, lon: -90.07 },
  { slug: 'cleveland', name: 'Cleveland', region: 'Ohio', lat: 41.5, lon: -81.69 },
  { slug: 'honolulu', name: 'Honolulu', region: 'Hawaii', lat: 21.31, lon: -157.86 },
  { slug: 'anaheim', name: 'Anaheim', region: 'California', lat: 33.84, lon: -117.91 },
  { slug: 'lexington', name: 'Lexington', region: 'Kentucky', lat: 38.05, lon: -84.5 },
  { slug: 'stockton', name: 'Stockton', region: 'California', lat: 37.96, lon: -121.29 },
  { slug: 'henderson', name: 'Henderson', region: 'Nevada', lat: 36.04, lon: -114.98 },
  { slug: 'corpus-christi', name: 'Corpus Christi', region: 'Texas', lat: 27.8, lon: -97.4 },
  { slug: 'saint-paul', name: 'Saint Paul', region: 'Minnesota', lat: 44.94, lon: -93.09 },
  { slug: 'irvine', name: 'Irvine', region: 'California', lat: 33.68, lon: -117.83 },
  { slug: 'newark', name: 'Newark', region: 'New Jersey', lat: 40.74, lon: -74.17 },
  { slug: 'orlando', name: 'Orlando', region: 'Florida', lat: 28.54, lon: -81.38 },
  { slug: 'cincinnati', name: 'Cincinnati', region: 'Ohio', lat: 39.1, lon: -84.51 },
  { slug: 'pittsburgh', name: 'Pittsburgh', region: 'Pennsylvania', lat: 40.44, lon: -79.99 },
  { slug: 'greensboro', name: 'Greensboro', region: 'North Carolina', lat: 36.07, lon: -79.79 },
  { slug: 'st-louis', name: 'St. Louis', region: 'Missouri', lat: 38.63, lon: -90.19 },
  { slug: 'lincoln', name: 'Lincoln', region: 'Nebraska', lat: 40.81, lon: -96.7 },
  { slug: 'plano', name: 'Plano', region: 'Texas', lat: 33.02, lon: -96.7 },
  { slug: 'durham', name: 'Durham', region: 'North Carolina', lat: 35.99, lon: -78.9 },
  { slug: 'anchorage', name: 'Anchorage', region: 'Alaska', lat: 61.22, lon: -149.9 },
  { slug: 'chandler', name: 'Chandler', region: 'Arizona', lat: 33.31, lon: -111.84 },
  { slug: 'buffalo', name: 'Buffalo', region: 'New York', lat: 42.89, lon: -78.88 },
  { slug: 'chula-vista', name: 'Chula Vista', region: 'California', lat: 32.64, lon: -117.08 },
  { slug: 'madison', name: 'Madison', region: 'Wisconsin', lat: 43.07, lon: -89.4 },
  { slug: 'gilbert', name: 'Gilbert', region: 'Arizona', lat: 33.35, lon: -111.79 },
  { slug: 'toledo', name: 'Toledo', region: 'Ohio', lat: 41.65, lon: -83.56 },
  { slug: 'reno', name: 'Reno', region: 'Nevada', lat: 39.53, lon: -119.81 },
  { slug: 'fort-wayne', name: 'Fort Wayne', region: 'Indiana', lat: 41.08, lon: -85.14 },
  { slug: 'north-las-vegas', name: 'North Las Vegas', region: 'Nevada', lat: 36.2, lon: -115.12 },
  { slug: 'laredo', name: 'Laredo', region: 'Texas', lat: 27.51, lon: -99.51 },
  { slug: 'st-petersburg', name: 'St. Petersburg', region: 'Florida', lat: 27.77, lon: -82.64 },
  { slug: 'jersey-city', name: 'Jersey City', region: 'New Jersey', lat: 40.72, lon: -74.06 },
  { slug: 'lubbock', name: 'Lubbock', region: 'Texas', lat: 33.58, lon: -101.85 },
  { slug: 'irving', name: 'Irving', region: 'Texas', lat: 32.81, lon: -96.95 },
  { slug: 'winston-salem', name: 'Winston-Salem', region: 'North Carolina', lat: 36.1, lon: -80.24 },
  { slug: 'chesapeake', name: 'Chesapeake', region: 'Virginia', lat: 36.77, lon: -76.29 },
  { slug: 'glendale', name: 'Glendale', region: 'Arizona', lat: 33.54, lon: -112.19 },
  { slug: 'garland', name: 'Garland', region: 'Texas', lat: 32.91, lon: -96.64 },
  { slug: 'scottsdale', name: 'Scottsdale', region: 'Arizona', lat: 33.49, lon: -111.93 },
  { slug: 'norfolk', name: 'Norfolk', region: 'Virginia', lat: 36.85, lon: -76.29 },
  { slug: 'boise', name: 'Boise', region: 'Idaho', lat: 43.62, lon: -116.21 },
  { slug: 'fremont', name: 'Fremont', region: 'California', lat: 37.55, lon: -121.99 },
  { slug: 'spokane', name: 'Spokane', region: 'Washington', lat: 47.66, lon: -117.43 },
  { slug: 'santa-clarita', name: 'Santa Clarita', region: 'California', lat: 34.39, lon: -118.54 },
  { slug: 'richmond', name: 'Richmond', region: 'Virginia', lat: 37.54, lon: -77.44 },
  { slug: 'baton-rouge', name: 'Baton Rouge', region: 'Louisiana', lat: 30.45, lon: -91.15 },
  { slug: 'hialeah', name: 'Hialeah', region: 'Florida', lat: 25.86, lon: -80.28 },
  { slug: 'san-bernardino', name: 'San Bernardino', region: 'California', lat: 34.11, lon: -117.29 },
  { slug: 'tacoma', name: 'Tacoma', region: 'Washington', lat: 47.25, lon: -122.44 },
]

// ── Config ─────────────────────────────────────────────────────────────────
const PERIOD_START = 1991
const PERIOD_END = 2020
const INTER_REQUEST_MS = 3000 // delay between year requests within a city (~520 billable calls/min, under 600/min limit)
const INTER_CITY_MS = 2000 // delay between cities
const MAX_RETRIES = 5

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

// ── Constants (same as build-city.ts) ───────────────────────────────────────
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const VARIABLES = [
  'temperature_2m', 'apparent_temperature', 'cloudcover', 'precipitation',
  'snowfall', 'windspeed_10m', 'winddirection_10m', 'dewpoint_2m',
  'shortwave_radiation', 'sunshine_duration',
].join(',')
const CALM_KMH = 1.609
const WET_DAY_MM = 0.1
const cToF = (c: number) => (c * 9) / 5 + 32
const mmToIn = (mm: number) => mm / 25.4
const cmToIn = (cm: number) => cm / 2.54
const kmhToMph = (k: number) => k * 0.621371
const secToHr = (s: number) => s / 3600

function pct(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const s = [...arr].sort((a, b) => a - b)
  const idx = (s.length - 1) * (p / 100)
  const lo = Math.floor(idx), hi = Math.ceil(idx)
  if (lo === hi) return s[lo]
  return s[lo] + (s[hi] - s[lo]) * (idx - lo)
}
function sectorOf(deg: number): number {
  const d = ((deg % 360) + 360) % 360
  return (Math.floor(((d + 22.5) % 360) / 45) | 0) % 8
}
function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

interface HourlyResponse {
  hourly: {
    time: string[]
    temperature_2m: (number | null)[]
    apparent_temperature: (number | null)[]
    cloudcover: (number | null)[]
    precipitation: (number | null)[]
    snowfall: (number | null)[]
    windspeed_10m: (number | null)[]
    winddirection_10m: (number | null)[]
    dewpoint_2m: (number | null)[]
    shortwave_radiation: (number | null)[]
    sunshine_duration: (number | null)[]
  }
}

async function fetchYear(lat: number, lon: number, year: number): Promise<HourlyResponse> {
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${year}-01-01&end_date=${year}-12-31` +
    `&hourly=${VARIABLES}&timezone=auto`

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

interface DayRecord {
  month: number
  maxTemp: number
  minTemp: number
  maxApparent: number
  minApparent: number
  totalPrecip: number
  totalSnowfall: number
  meanTemp: number
  meanWind: number
  totalSunshine: number
  meanCloud: number
  meanDewpoint: number
  totalShortwave: number
  windDirs: number[]
}

function aggregateDays(h: HourlyResponse['hourly']): DayRecord[] {
  const days: DayRecord[] = []
  const byDate = new Map<string, number[]>()
  for (let i = 0; i < h.time.length; i++) {
    const date = h.time[i].slice(0, 10)
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(i)
  }
  for (const [date, indices] of byDate) {
    const month = parseInt(date.slice(5, 7), 10) - 1
    let maxT = -Infinity, minT = Infinity, maxA = -Infinity, minA = Infinity
    let precip = 0, snow = 0, sunshine = 0, shortwave = 0
    let sumT = 0, sumWind = 0, sumCloud = 0, sumDew = 0, count = 0
    const windDirs: number[] = []
    for (const i of indices) {
      const t = h.temperature_2m[i]
      const a = h.apparent_temperature[i]
      if (t !== null) { maxT = Math.max(maxT, t); minT = Math.min(minT, t); sumT += t; count++ }
      if (a !== null) { maxA = Math.max(maxA, a); minA = Math.min(minA, a) }
      const p = h.precipitation[i]; if (p !== null) precip += p
      const s = h.snowfall[i]; if (s !== null) snow += s
      const sun = h.sunshine_duration[i]; if (sun !== null) sunshine += sun
      const sw = h.shortwave_radiation[i]; if (sw !== null) shortwave += sw / 1000
      const w = h.windspeed_10m[i]
      const wd = h.winddirection_10m[i]
      if (w !== null) { sumWind += w; if (w > CALM_KMH && wd !== null) windDirs.push(wd) }
      const c = h.cloudcover[i]; if (c !== null) sumCloud += c
      const d = h.dewpoint_2m[i]; if (d !== null) sumDew += d
    }
    if (count === 0) continue
    days.push({
      month, maxTemp: maxT, minTemp: minT, maxApparent: maxA, minApparent: minA,
      totalPrecip: precip, totalSnowfall: snow, meanTemp: sumT / count,
      meanWind: sumWind / indices.length, totalSunshine: sunshine,
      meanCloud: sumCloud / indices.length, meanDewpoint: sumDew / indices.length,
      totalShortwave: shortwave, windDirs,
    })
  }
  return days
}

async function buildCity(city: { slug: string; name: string; region: string; lat: number; lon: number }) {
  const dailyMaxT: number[][] = Array.from({ length: 12 }, () => [])
  const dailyMinT: number[][] = Array.from({ length: 12 }, () => [])
  const dailyMaxA: number[][] = Array.from({ length: 12 }, () => [])
  const dailyMinA: number[][] = Array.from({ length: 12 }, () => [])
  const dailyWind: number[][] = Array.from({ length: 12 }, () => [])
  const dailyShortwave: number[][] = Array.from({ length: 12 }, () => [])
  const allCloud: number[][] = Array.from({ length: 12 }, () => [])
  const allDew: number[][] = Array.from({ length: 12 }, () => [])
  const monthlyPrecip: Map<string, number>[] = Array.from({ length: 12 }, () => new Map())
  const monthlySnow: Map<string, number>[] = Array.from({ length: 12 }, () => new Map())
  const monthlySunshine: Map<string, number>[] = Array.from({ length: 12 }, () => new Map())
  const rainDays = new Array(12).fill(0)
  const snowDays = new Array(12).fill(0)
  const mixedDays = new Array(12).fill(0)
  const totalDays = new Array(12).fill(0)
  const windRoseSectors: number[][] = Array.from({ length: 12 }, () => [0, 0, 0, 0, 0, 0, 0, 0])
  const windRoseTotal: number[] = new Array(12).fill(0)

  for (let year = PERIOD_START; year <= PERIOD_END; year++) {
    const data = await fetchYear(city.lat, city.lon, year)
    const days = aggregateDays(data.hourly)
    for (const d of days) {
      const m = d.month
      dailyMaxT[m].push(d.maxTemp)
      dailyMinT[m].push(d.minTemp)
      dailyMaxA[m].push(d.maxApparent)
      dailyMinA[m].push(d.minApparent)
      dailyWind[m].push(d.meanWind)
      dailyShortwave[m].push(d.totalShortwave)
      allCloud[m].push(d.meanCloud)
      allDew[m].push(d.meanDewpoint)
      totalDays[m]++
      if (d.totalPrecip > WET_DAY_MM) {
        if (d.meanTemp > 3) rainDays[m]++
        else if (d.meanTemp < -1) snowDays[m]++
        else mixedDays[m]++
      }
      monthlyPrecip[m].set(year, (monthlyPrecip[m].get(year) ?? 0) + d.totalPrecip)
      monthlySnow[m].set(year, (monthlySnow[m].get(year) ?? 0) + d.totalSnowfall)
      monthlySunshine[m].set(year, (monthlySunshine[m].get(year) ?? 0) + d.totalSunshine)
      for (const wd of d.windDirs) {
        windRoseSectors[m][sectorOf(wd)]++
        windRoseTotal[m]++
      }
    }
    if (year < PERIOD_END) await new Promise((r) => setTimeout(r, INTER_REQUEST_MS))
  }

  const climate = MONTH_NAMES.map((month, m) => {
    const precipVals = [...monthlyPrecip[m].values()]
    const snowVals = [...monthlySnow[m].values()]
    const sunVals = [...monthlySunshine[m].values()]
    return {
      month,
      high: Math.round(cToF(avg(dailyMaxT[m])) * 10) / 10,
      low: Math.round(cToF(avg(dailyMinT[m])) * 10) / 10,
      feelsHigh: Math.round(cToF(avg(dailyMaxA[m])) * 10) / 10,
      feelsLow: Math.round(cToF(avg(dailyMinA[m])) * 10) / 10,
      highBand: [Math.round(cToF(pct(dailyMaxT[m], 25)) * 10) / 10, Math.round(cToF(pct(dailyMaxT[m], 75)) * 10) / 10] as [number, number],
      lowBand: [Math.round(cToF(pct(dailyMinT[m], 25)) * 10) / 10, Math.round(cToF(pct(dailyMinT[m], 75)) * 10) / 10] as [number, number],
      precip: Math.round(mmToIn(avg(precipVals)) * 100) / 100,
      precipBand: [Math.round(mmToIn(pct(precipVals, 25)) * 100) / 100, Math.round(mmToIn(pct(precipVals, 75)) * 100) / 100] as [number, number],
      sunshine: Math.round(secToHr(avg(sunVals)) * 10) / 10,
      cloud: Math.round(avg(allCloud[m]) * 10) / 10,
      rain: Math.round((rainDays[m] / totalDays[m]) * 100 * 10) / 10,
      snow: Math.round((snowDays[m] / totalDays[m]) * 100 * 10) / 10,
      mixed: Math.round((mixedDays[m] / totalDays[m]) * 100 * 10) / 10,
      snowfall: Math.round(cmToIn(avg(snowVals)) * 100) / 100,
      snowBand: [Math.round(cmToIn(pct(snowVals, 25)) * 100) / 100, Math.round(cmToIn(pct(snowVals, 75)) * 100) / 100] as [number, number],
      wind: Math.round(kmhToMph(avg(dailyWind[m])) * 10) / 10,
      windBand: [Math.round(kmhToMph(pct(dailyWind[m], 25)) * 10) / 10, Math.round(kmhToMph(pct(dailyWind[m], 75)) * 10) / 10] as [number, number],
      dewPoint: Math.round(cToF(avg(allDew[m])) * 10) / 10,
      shortwave: Math.round(avg(dailyShortwave[m]) * 100) / 100,
      shortwaveBand: [Math.round(pct(dailyShortwave[m], 25) * 100) / 100, Math.round(pct(dailyShortwave[m], 75) * 100) / 100] as [number, number],
    }
  })

  const windRose = MONTH_NAMES.map((month, m) => {
    const total = windRoseTotal[m] || 1
    const sectors = windRoseSectors[m].map((c) => Math.round((c / total) * 1000) / 10)
    return { month, n: sectors[0], ne: sectors[1], e: sectors[2], se: sectors[3], s: sectors[4], sw: sectors[5], w: sectors[6], nw: sectors[7] }
  })

  return {
    name: city.name,
    region: city.region,
    latitude: city.lat,
    longitude: city.lon,
    source: 'ERA5 (via Open-Meteo Archive API)',
    period: `${PERIOD_START}-${PERIOD_END}`,
    climate,
    windRose,
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync('data', { recursive: true })

  let cities = CITIES
  if (cityFilter) {
    cities = CITIES.filter((c) => c.slug === cityFilter || c.name.toLowerCase() === cityFilter.toLowerCase())
    if (cities.length === 0) {
      console.error(`City "${cityFilter}" not found in the list of 100 cities.`)
      process.exit(1)
    }
  }
  if (!force) {
    cities = cities.filter((c) => !existsSync(`data/${c.slug}.json`))
  }
  if (limit > 0) cities = cities.slice(0, limit)

  if (cities.length === 0) {
    console.log('All cities already have data files. Use --force to overwrite.')
    return
  }

  console.log(`\nBuilding climate data for ${cities.length} city(ies)…\n`)

  let done = 0
  let failed = 0
  const startTime = Date.now()

  for (const city of cities) {
    const pct = Math.round((done / cities.length) * 100)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const eta = done > 0 ? Math.round(((Date.now() - startTime) / done) * (cities.length - done)) : 0
    console.log(`[${pct}%] (${done + 1}/${cities.length}) ${city.name} — elapsed ${elapsed}s, ETA ~${Math.round(eta)}s`)

    try {
      const result = await buildCity(city)
      const outPath = `data/${city.slug}.json`
      writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n')
      console.log(`  ✓ wrote ${outPath}`)
      done++
    } catch (err) {
      console.error(`  ✗ FAILED: ${err}`)
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
