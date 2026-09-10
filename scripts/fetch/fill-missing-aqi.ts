import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { CITIES } from '../../src/cities.ts'

const START_DATE = '2023-01-01'
const END_DATE = '2024-12-31'
const MAX_RETRIES = 5
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const AQI_CATEGORY_RANGES: [number, number][] = [
  [0, 50],
  [51, 100],
  [101, 150],
  [151, 200],
  [201, 300],
  [301, 500],
]

function aqiCategoryIndex(aqi: number): number {
  for (let i = 0; i < AQI_CATEGORY_RANGES.length; i++) {
    if (aqi >= AQI_CATEGORY_RANGES[i][0] && aqi <= AQI_CATEGORY_RANGES[i][1]) return i
  }
  return AQI_CATEGORY_RANGES.length - 1
}

interface AqHourlyResponse {
  hourly?: {
    time: string[]
    pm2_5: (number | null)[]
    pm10: (number | null)[]
    ozone: (number | null)[]
    us_aqi: (number | null)[]
  }
}

async function fetchAqi(lat: number, lon: number): Promise<AqHourlyResponse> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    `&start_date=${START_DATE}&end_date=${END_DATE}` +
    `&hourly=pm2_5,pm10,ozone,us_aqi&timezone=auto&domains=cams_global`

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as AqHourlyResponse
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err
      const backoff = Math.min(30000, 2000 * Math.pow(2, attempt - 1))
      console.error(`    retry ${attempt}/${MAX_RETRIES}: ${err} — waiting ${backoff}ms`)
      await new Promise((r) => setTimeout(r, backoff))
    }
  }
  throw new Error('unreachable')
}

async function buildAqi(name: string, lat: number, lon: number) {
  const data = await fetchAqi(lat, lon)
  const h = data.hourly
  if (!h?.time?.length) throw new Error('empty AQI')

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
    for (const d of dayAqiByMonth[m]) days[aqiCategoryIndex(d)]++
    return {
      month,
      aqi: Math.round(aqiSum[m] / n),
      pm25: Math.round((pm25Sum[m] / n) * 10) / 10,
      pm10: Math.round((pm10Sum[m] / n) * 10) / 10,
      ozone: Math.round(ozoneSum[m] / n),
      days,
    }
  })

  return {
    name,
    source: 'CAMS Global (via Open-Meteo Air Quality API)',
    period: `${START_DATE} to ${END_DATE}`,
    months,
  }
}

async function main() {
  mkdirSync('data/aqi', { recursive: true })
  const missing = CITIES.filter((c) => c.slug && !existsSync(`data/aqi/${c.slug}.json`))
  if (missing.length === 0) {
    console.log('All featured cities already have AQI data.')
    return
  }

  console.log(`Fetching AQI for ${missing.length} city(ies)…`)
  let ok = 0
  let failed = 0
  const failedSlugs: string[] = []

  for (const city of missing) {
    const slug = city.slug as string
    console.log(`  ${city.name} (${slug})`)
    try {
      const result = await buildAqi(city.name, city.latitude, city.longitude)
      writeFileSync(`data/aqi/${slug}.json`, JSON.stringify(result, null, 2) + '\n')
      console.log(`    wrote data/aqi/${slug}.json`)
      ok++
    } catch (err) {
      console.error(`    FAILED: ${err}`)
      failed++
      failedSlugs.push(slug)
    }
    await new Promise((r) => setTimeout(r, 400))
  }

  console.log(`\nDone. ${ok} succeeded, ${failed} failed.`)
  if (failedSlugs.length) console.log('Failed:', failedSlugs.join(', '))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
