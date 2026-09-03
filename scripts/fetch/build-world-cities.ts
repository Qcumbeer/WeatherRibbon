import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const START_DATE = '19910101'
const END_DATE = '20201231'
const INTER_MS = 400
const MAX_RETRIES = 2
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const PARAMS = 'T2M_MAX,T2M_MIN,T2MDEW,PRECTOTCORR,PRECSNO,WS10M,WD10M,ALLSKY_SFC_SW_DWN,CLOUD_AMT,RH2M'

const US_SLUGS = new Set([
  'new-york', 'los-angeles', 'chicago', 'houston', 'dallas', 'miami',
  'philadelphia', 'atlanta', 'washington',
])

const COUNTRY_ALIASES: Record<string, string[]> = {
  'DR Congo': ['congo', 'democratic republic of the congo', 'dr congo', 'congo, democratic republic of the'],
  'Hong Kong SAR': ['hong kong'],
  "Côte d'Ivoire": ["côte d'ivoire", 'ivory coast', "cote d'ivoire"],
  'South Korea': ['south korea', 'republic of korea', 'korea'],
  'North Korea': ['north korea', "democratic people's republic of korea"],
  'Taiwan': ['taiwan', 'republic of china'],
  'Russia': ['russia', 'russian federation'],
  'United States': ['united states', 'united states of america'],
  'United Kingdom': ['united kingdom', 'united kingdom of great britain and northern ireland'],
  'Iran': ['iran', 'islamic republic of iran'],
  'Syria': ['syria', 'syrian arab republic'],
  'Tanzania': ['tanzania', 'united republic of tanzania'],
  'Vietnam': ['vietnam', 'viet nam'],
}

function slugify(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function searchName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/,.*$/, '').trim()
}

function countryMatches(want: string, got?: string): boolean {
  if (!got) return false
  const a = got.toLowerCase()
  const b = want.toLowerCase()
  if (a === b || a.includes(b) || b.includes(a)) return true
  return (COUNTRY_ALIASES[want] ?? []).some((alias) => a === alias || a.includes(alias))
}

const cToF = (c: number) => (c * 9) / 5 + 32
const mmToIn = (mm: number) => mm / 25.4
const msToMph = (ms: number) => ms * 2.23694
const mmWaterToInSnow = (mm: number) => (mm * 0.7) / 2.54
function pct(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const s = [...arr].sort((a, b) => a - b)
  const idx = (s.length - 1) * (p / 100)
  const lo = Math.floor(idx), hi = Math.ceil(idx)
  if (lo === hi) return s[lo]
  return s[lo] + (s[hi] - s[lo]) * (idx - lo)
}
function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}
function sectorOf(deg: number): number {
  const d = ((deg % 360) + 360) % 360
  return (Math.floor(((d + 22.5) % 360) / 45) | 0) % 8
}
function apparentTemp(tempC: number, rh: number, windMs: number): number {
  const e = (rh / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC))
  return tempC + 0.33 * e - 0.7 * windMs - 4.0
}
function estSunshineHours(monthIdx: number, cloudPct: number, lat: number): number {
  const season = -Math.cos((monthIdx / 12) * Math.PI * 2)
  const absLat = Math.abs(lat)
  const dayHours = 12 + 4.5 * season * Math.min(1, Math.max(0, (absLat - 15) / 45))
  return DAYS_IN_MONTH[monthIdx] * dayHours * (1 - cloudPct / 100)
}

interface GeoHit {
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}

async function geocode(name: string, country: string): Promise<{ lat: number; lon: number; region: string } | null> {
  const q = searchName(name)
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as { results?: GeoHit[] }
  const hits = data.results ?? []
  const hit = hits.find((h) => countryMatches(country, h.country)) ?? hits[0]
  if (!hit) return null
  const region = hit.admin1 && hit.admin1 !== hit.name ? `${hit.admin1}, ${country}` : country
  return { lat: hit.latitude, lon: hit.longitude, region }
}

interface NasaResponse {
  properties?: { parameter?: Record<string, Record<string, number>> }
}

async function fetchNasa(lat: number, lon: number): Promise<NasaResponse> {
  const url =
    `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${PARAMS}` +
    `&community=AG&longitude=${lon}&latitude=${lat}` +
    `&start=${START_DATE}&end=${END_DATE}&format=JSON`
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as NasaResponse
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err
      await new Promise((r) => setTimeout(r, 2000 * attempt))
    }
  }
  throw new Error('unreachable')
}

function buildClimate(
  city: { slug: string; name: string; region: string; lat: number; lon: number },
  data: NasaResponse,
) {
  const p = data.properties?.parameter
  if (!p?.T2M_MAX || !p.T2M_MIN) throw new Error('missing NASA parameters')
  const dates = Object.keys(p.T2M_MAX).sort()
  if (dates.length < 300) throw new Error(`too few days (${dates.length})`)

  const dailyMaxT: number[][] = Array.from({ length: 12 }, () => [])
  const dailyMinT: number[][] = Array.from({ length: 12 }, () => [])
  const dailyMaxApp: number[][] = Array.from({ length: 12 }, () => [])
  const dailyMinApp: number[][] = Array.from({ length: 12 }, () => [])
  const dailyDew: number[][] = Array.from({ length: 12 }, () => [])
  const dailyWind: number[][] = Array.from({ length: 12 }, () => [])
  const dailyShortwave: number[][] = Array.from({ length: 12 }, () => [])
  const dailyCloud: number[][] = Array.from({ length: 12 }, () => [])
  const monthlyPrecip: Map<number, number>[] = Array.from({ length: 12 }, () => new Map())
  const monthlySnow: Map<number, number>[] = Array.from({ length: 12 }, () => new Map())
  const rainDays = new Array(12).fill(0)
  const snowDays = new Array(12).fill(0)
  const mixedDays = new Array(12).fill(0)
  const totalDays = new Array(12).fill(0)
  const windRoseSectors: number[][] = Array.from({ length: 12 }, () => [0, 0, 0, 0, 0, 0, 0, 0])
  const windRoseTotal: number[] = new Array(12).fill(0)

  for (const date of dates) {
    const maxT = p.T2M_MAX[date]
    const minT = p.T2M_MIN[date]
    if (maxT === undefined || minT === undefined) continue
    const year = parseInt(date.slice(0, 4), 10)
    const month = parseInt(date.slice(4, 6), 10) - 1
    const dew = p.T2MDEW?.[date] ?? minT
    const precip = p.PRECTOTCORR?.[date] ?? 0
    const snowMm = p.PRECSNO?.[date] ?? 0
    const windMs = p.WS10M?.[date] ?? 0
    const windDir = p.WD10M?.[date] ?? 0
    const sw = p.ALLSKY_SFC_SW_DWN?.[date] ?? 0
    const cloud = p.CLOUD_AMT?.[date] ?? 0
    const rh = p.RH2M?.[date] ?? 50
    const meanT = (maxT + minT) / 2
    dailyMaxT[month].push(maxT)
    dailyMinT[month].push(minT)
    dailyMaxApp[month].push(apparentTemp(maxT, rh, windMs))
    dailyMinApp[month].push(apparentTemp(minT, rh, windMs))
    dailyDew[month].push(dew)
    dailyWind[month].push(windMs)
    dailyShortwave[month].push(sw)
    dailyCloud[month].push(cloud)
    totalDays[month]++
    if (precip > 0.1) {
      if (meanT > 3) rainDays[month]++
      else if (meanT < -1) snowDays[month]++
      else mixedDays[month]++
    }
    monthlyPrecip[month].set(year, (monthlyPrecip[month].get(year) ?? 0) + precip)
    monthlySnow[month].set(year, (monthlySnow[month].get(year) ?? 0) + snowMm)
    if (windMs > 0.447) {
      windRoseSectors[month][sectorOf(windDir)]++
      windRoseTotal[month]++
    }
  }

  const climate = MONTH_NAMES.map((month, m) => {
    const precipVals = [...monthlyPrecip[m].values()]
    const snowVals = [...monthlySnow[m].values()]
    const cloudAvg = avg(dailyCloud[m])
    return {
      month,
      high: Math.round(cToF(avg(dailyMaxT[m])) * 10) / 10,
      low: Math.round(cToF(avg(dailyMinT[m])) * 10) / 10,
      feelsHigh: Math.round(cToF(avg(dailyMaxApp[m])) * 10) / 10,
      feelsLow: Math.round(cToF(avg(dailyMinApp[m])) * 10) / 10,
      highBand: [Math.round(cToF(pct(dailyMaxT[m], 20)) * 10) / 10, Math.round(cToF(pct(dailyMaxT[m], 80)) * 10) / 10] as [number, number],
      lowBand: [Math.round(cToF(pct(dailyMinT[m], 20)) * 10) / 10, Math.round(cToF(pct(dailyMinT[m], 80)) * 10) / 10] as [number, number],
      precip: Math.round(mmToIn(avg(precipVals)) * 100) / 100,
      precipBand: [Math.round(mmToIn(pct(precipVals, 20)) * 100) / 100, Math.round(mmToIn(pct(precipVals, 80)) * 100) / 100] as [number, number],
      sunshine: Math.round(estSunshineHours(m, cloudAvg, city.lat) * 10) / 10,
      cloud: Math.round(cloudAvg * 10) / 10,
      rain: Math.round((rainDays[m] / Math.max(1, totalDays[m])) * 100 * 10) / 10,
      snow: Math.round((snowDays[m] / Math.max(1, totalDays[m])) * 100 * 10) / 10,
      mixed: Math.round((mixedDays[m] / Math.max(1, totalDays[m])) * 100 * 10) / 10,
      snowfall: Math.round(mmWaterToInSnow(avg(snowVals)) * 100) / 100,
      snowBand: [Math.round(mmWaterToInSnow(pct(snowVals, 20)) * 100) / 100, Math.round(mmWaterToInSnow(pct(snowVals, 80)) * 100) / 100] as [number, number],
      wind: Math.round(msToMph(avg(dailyWind[m])) * 10) / 10,
      windBand: [Math.round(msToMph(pct(dailyWind[m], 20)) * 10) / 10, Math.round(msToMph(pct(dailyWind[m], 80)) * 10) / 10] as [number, number],
      dewPoint: Math.round(cToF(avg(dailyDew[m])) * 10) / 10,
      shortwave: Math.round(avg(dailyShortwave[m]) * 100) / 100,
      shortwaveBand: [Math.round(pct(dailyShortwave[m], 20) * 100) / 100, Math.round(pct(dailyShortwave[m], 80) * 100) / 100] as [number, number],
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
    source: 'MERRA-2 (via NASA POWER API)',
    period: '1991-2020',
    climate,
    windRose,
  }
}

async function fetchAqi(lat: number, lon: number) {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    `&start_date=2023-01-01&end_date=2024-12-31` +
    `&hourly=pm2_5,pm10,ozone,us_aqi&timezone=auto&domains=cams_global`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`AQI HTTP ${res.status}`)
  const data = (await res.json()) as {
    hourly?: {
      time: string[]
      pm2_5: (number | null)[]
      pm10: (number | null)[]
      ozone: (number | null)[]
      us_aqi: (number | null)[]
    }
  }
  const h = data.hourly
  if (!h?.time?.length) throw new Error('empty AQI')
  const ranges: [number, number][] = [[0, 50], [51, 100], [101, 150], [151, 200], [201, 300], [301, 500]]
  const cat = (aqi: number) => {
    for (let i = 0; i < ranges.length; i++) if (aqi >= ranges[i][0] && aqi <= ranges[i][1]) return i
    return ranges.length - 1
  }
  const pm25Sum = new Array(12).fill(0)
  const pm10Sum = new Array(12).fill(0)
  const ozoneSum = new Array(12).fill(0)
  const aqiSum = new Array(12).fill(0)
  const counts = new Array(12).fill(0)
  const dayAqiByMonth: number[][] = Array.from({ length: 12 }, () => [])
  const byDate = new Map<string, { aqis: number[]; pm25s: number[]; pm10s: number[]; ozones: number[] }>()
  for (let i = 0; i < h.time.length; i++) {
    const date = h.time[i].slice(0, 10)
    if (!byDate.has(date)) byDate.set(date, { aqis: [], pm25s: [], pm10s: [], ozones: [] })
    const d = byDate.get(date)!
    if (h.us_aqi[i] !== null) d.aqis.push(h.us_aqi[i]!)
    if (h.pm2_5[i] !== null) d.pm25s.push(h.pm2_5[i]!)
    if (h.pm10[i] !== null) d.pm10s.push(h.pm10[i]!)
    if (h.ozone[i] !== null) d.ozones.push(h.ozone[i]!)
  }
  for (const [date, vals] of byDate) {
    const month = parseInt(date.slice(5, 7), 10) - 1
    if (vals.pm25s.length) pm25Sum[month] += vals.pm25s.reduce((a, b) => a + b, 0) / vals.pm25s.length
    if (vals.pm10s.length) pm10Sum[month] += vals.pm10s.reduce((a, b) => a + b, 0) / vals.pm10s.length
    if (vals.ozones.length) ozoneSum[month] += vals.ozones.reduce((a, b) => a + b, 0) / vals.ozones.length
    if (vals.aqis.length) {
      const daily = vals.aqis.reduce((a, b) => a + b, 0) / vals.aqis.length
      aqiSum[month] += daily
      dayAqiByMonth[month].push(daily)
    }
    counts[month]++
  }
  const months = MONTH_NAMES.map((month, m) => {
    const n = counts[m] || 1
    const days = new Array(6).fill(0)
    for (const d of dayAqiByMonth[m]) days[cat(d)]++
    return {
      month,
      aqi: Math.round(aqiSum[m] / n),
      pm25: Math.round((pm25Sum[m] / n) * 10) / 10,
      pm10: Math.round((pm10Sum[m] / n) * 10) / 10,
      ozone: Math.round(ozoneSum[m] / n),
      days,
    }
  })
  return { months }
}

interface WorldEntry {
  name: string
  country: string
  population: number
}

async function main() {
  mkdirSync('data', { recursive: true })
  mkdirSync('data/aqi', { recursive: true })
  mkdirSync('src', { recursive: true })

  const raw = JSON.parse(readFileSync('data/world-cities.json', 'utf8')) as { cities: WorldEntry[] }
  const usedSlugs = new Set(US_SLUGS)
  const resolved: {
    slug: string
    name: string
    region: string
    country: string
    population: number
    latitude: number
    longitude: number
  }[] = []

  let skipped = 0
  let done = 0
  const start = Date.now()

  for (const entry of raw.cities) {
    const baseSlug = slugify(searchName(entry.name)) || slugify(entry.name)
    let slug = baseSlug
    if (usedSlugs.has(slug) || existsSync(`data/${slug}.json`)) {
      if (entry.country === 'United States' || US_SLUGS.has(slug)) {
        console.log(`skip existing ${entry.name}`)
        skipped++
        continue
      }
      slug = `${baseSlug}-${slugify(entry.country)}`
      if (usedSlugs.has(slug) || existsSync(`data/${slug}.json`)) {
        console.log(`skip slug clash ${entry.name}`)
        skipped++
        continue
      }
    }

    console.log(`[${done + skipped + 1}/${raw.cities.length}] ${entry.name}, ${entry.country}`)
    let geo: { lat: number; lon: number; region: string } | null = null
    try {
      geo = await geocode(entry.name, entry.country)
    } catch {
      geo = null
    }
    if (!geo) {
      console.log('  skip: geocode')
      skipped++
      await new Promise((r) => setTimeout(r, INTER_MS))
      continue
    }

    try {
      const nasa = await fetchNasa(geo.lat, geo.lon)
      const city = { slug, name: entry.name, region: geo.region, lat: geo.lat, lon: geo.lon }
      const climate = buildClimate(city, nasa)
      writeFileSync(`data/${slug}.json`, JSON.stringify(climate, null, 2) + '\n')
      try {
        const aqi = await fetchAqi(geo.lat, geo.lon)
        writeFileSync(`data/aqi/${slug}.json`, JSON.stringify({ name: entry.name, source: 'CAMS Global (via Open-Meteo Air Quality API)', period: '2023-01-01 to 2024-12-31', months: aqi.months }, null, 2) + '\n')
      } catch {
        console.log('  aqi skipped')
      }
      usedSlugs.add(slug)
      resolved.push({
        slug,
        name: entry.name,
        region: geo.region,
        country: entry.country,
        population: entry.population,
        latitude: Math.round(geo.lat * 100) / 100,
        longitude: Math.round(geo.lon * 100) / 100,
      })
      done++
      console.log(`  ok ${slug}`)
    } catch (err) {
      console.log(`  skip: ${err}`)
      skipped++
    }
    await new Promise((r) => setTimeout(r, INTER_MS))
  }

  const ts = `export interface WorldCity {
  slug: string
  name: string
  region: string
  country: string
  population: number
  latitude: number
  longitude: number
}

export const WORLD_CITIES: WorldCity[] = ${JSON.stringify(resolved, null, 2)}
`
  writeFileSync('src/worldCities.ts', ts)
  const elapsed = ((Date.now() - start) / 1000).toFixed(0)
  console.log(`\nDone in ${elapsed}s. ${done} fetched, ${skipped} skipped. Wrote src/worldCities.ts`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
