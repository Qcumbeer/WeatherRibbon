import type { CityRef } from './cities.ts'
import type { CityData, ClimateMonth } from './dataService.ts'

const PERIOD_START = 1991
const PERIOD_END = 2020
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WET_DAY_MM = 0.1

const DAILY = [
  'temperature_2m_max',
  'temperature_2m_min',
  'temperature_2m_mean',
  'apparent_temperature_max',
  'apparent_temperature_min',
  'precipitation_sum',
  'snowfall_sum',
  'sunshine_duration',
  'cloud_cover_mean',
  'dew_point_2m_mean',
  'wind_speed_10m_mean',
].join(',')

interface DailyResponse {
  daily: {
    time: string[]
    temperature_2m_max: (number | null)[]
    temperature_2m_min: (number | null)[]
    temperature_2m_mean: (number | null)[]
    apparent_temperature_max: (number | null)[]
    apparent_temperature_min: (number | null)[]
    precipitation_sum: (number | null)[]
    snowfall_sum: (number | null)[]
    sunshine_duration: (number | null)[]
    cloud_cover_mean: (number | null)[]
    dew_point_2m_mean: (number | null)[]
    wind_speed_10m_mean: (number | null)[]
  }
}

const cToF = (c: number) => (c * 9) / 5 + 32
const mmToIn = (mm: number) => mm / 25.4
const cmToIn = (cm: number) => cm / 2.54
const kmhToMph = (k: number) => k * 0.621371
const secToHr = (s: number) => s / 3600

function pct(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const s = [...arr].sort((a, b) => a - b)
  const idx = (s.length - 1) * (p / 100)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return s[lo]
  return s[lo] + (s[hi] - s[lo]) * (idx - lo)
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

interface LocationPayload {
  latitude?: number
  longitude?: number
  daily?: DailyResponse['daily']
  error?: boolean
  reason?: string
}

function archiveUrl(latitude: string, longitude: string): string {
  return (
    `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}` +
    `&start_date=${PERIOD_START}-01-01&end_date=${PERIOD_END}-12-31` +
    `&daily=${DAILY}&timezone=auto`
  )
}

async function fetchArchiveJson(url: string, signal?: AbortSignal): Promise<unknown> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    try {
      const res = await fetch(url, { signal })
      if (res.status === 429) {
        let reason = 'rate limited (HTTP 429)'
        try {
          const body = (await res.json()) as { reason?: string }
          if (body.reason) reason = body.reason
        } catch {
          // body was not JSON; keep the generic message
        }
        throw new Error(reason)
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (signal?.aborted) throw err
      if (attempt === 4) throw err
      const msg = err instanceof Error ? err.message : String(err)
      // The archive API enforces both minutely and hourly request budgets. On an
      // hourly 429, retrying quickly only burns more of the budget, so wait for
      // the window to roll over instead of churning.
      const wait = /hour/i.test(msg)
        ? 40 * 60 * 1000
        : /rate|429|limit|minute/i.test(msg)
          ? 60000
          : 3000 * attempt
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw new Error('unreachable')
}

// Fetches one request for one or more locations (comma-joined coordinates) and
// returns the per-location daily arrays in input order. Batching many cities
// into a single request keeps the call count under the archive API's hourly
// request budget.
export async function fetchDailyMulti(cities: CityRef[], signal?: AbortSignal): Promise<DailyResponse['daily'][]> {
  if (cities.length === 0) return []
  const latitude = cities.map((c) => c.latitude).join(',')
  const longitude = cities.map((c) => c.longitude).join(',')
  const body = await fetchArchiveJson(archiveUrl(latitude, longitude), signal)

  if (cities.length === 1) {
    const single = body as LocationPayload
    if (single.error || !single.daily) throw new Error(single.reason || 'Archive API returned no daily data')
    return [single.daily]
  }

  const arr = body as LocationPayload[]
  if (!Array.isArray(arr)) {
    const single = body as LocationPayload
    throw new Error(single.reason || 'Expected an array of locations from the archive API')
  }
  if (arr.length !== cities.length) throw new Error(`Expected ${cities.length} locations, got ${arr.length}`)
  return arr.map((loc) => {
    if (loc.error || !loc.daily) throw new Error(loc.reason || 'Archive API returned no daily data for a location')
    return loc.daily
  })
}

export async function fetchClimate(city: CityRef, signal?: AbortSignal): Promise<CityData> {
  const [daily] = await fetchDailyMulti([city], signal)
  return climateFromDaily(daily, city)
}

export function climateFromDaily(d: DailyResponse['daily'], city: CityRef): CityData {
  const dailyMaxT: number[][] = Array.from({ length: 12 }, () => [])
  const dailyMinT: number[][] = Array.from({ length: 12 }, () => [])
  const dailyMaxA: number[][] = Array.from({ length: 12 }, () => [])
  const dailyMinA: number[][] = Array.from({ length: 12 }, () => [])
  const dailyWind: number[][] = Array.from({ length: 12 }, () => [])
  const allCloud: number[][] = Array.from({ length: 12 }, () => [])
  const allDew: number[][] = Array.from({ length: 12 }, () => [])
  const monthlyPrecip: Map<number, number>[] = Array.from({ length: 12 }, () => new Map())
  const monthlySnow: Map<number, number>[] = Array.from({ length: 12 }, () => new Map())
  const monthlySunshine: Map<number, number>[] = Array.from({ length: 12 }, () => new Map())
  const rainDays = new Array(12).fill(0)
  const snowDays = new Array(12).fill(0)
  const mixedDays = new Array(12).fill(0)
  const totalDays = new Array(12).fill(0)

  for (let i = 0; i < d.time.length; i++) {
    const maxT = d.temperature_2m_max[i]
    const minT = d.temperature_2m_min[i]
    if (maxT === null || minT === null) continue
    const m = parseInt(d.time[i].slice(5, 7), 10) - 1
    const year = parseInt(d.time[i].slice(0, 4), 10)
    const meanT = d.temperature_2m_mean[i] ?? (maxT + minT) / 2
    const precip = d.precipitation_sum[i] ?? 0
    const snow = d.snowfall_sum[i] ?? 0

    dailyMaxT[m].push(maxT)
    dailyMinT[m].push(minT)
    if (d.apparent_temperature_max[i] !== null) dailyMaxA[m].push(d.apparent_temperature_max[i]!)
    if (d.apparent_temperature_min[i] !== null) dailyMinA[m].push(d.apparent_temperature_min[i]!)
    if (d.wind_speed_10m_mean[i] !== null) dailyWind[m].push(d.wind_speed_10m_mean[i]!)
    if (d.cloud_cover_mean[i] !== null) allCloud[m].push(d.cloud_cover_mean[i]!)
    if (d.dew_point_2m_mean[i] !== null) allDew[m].push(d.dew_point_2m_mean[i]!)
    totalDays[m]++

    if (precip > WET_DAY_MM) {
      if (meanT > 3) rainDays[m]++
      else if (meanT < -1) snowDays[m]++
      else mixedDays[m]++
    }

    monthlyPrecip[m].set(year, (monthlyPrecip[m].get(year) ?? 0) + precip)
    monthlySnow[m].set(year, (monthlySnow[m].get(year) ?? 0) + snow)
    monthlySunshine[m].set(year, (monthlySunshine[m].get(year) ?? 0) + (d.sunshine_duration[i] ?? 0))
  }

  const climate: ClimateMonth[] = MONTH_NAMES.map((month, m) => {
    const precipVals = [...monthlyPrecip[m].values()]
    const snowVals = [...monthlySnow[m].values()]
    const sunVals = [...monthlySunshine[m].values()]
    const n = totalDays[m] || 1
    return {
      month,
      high: Math.round(cToF(avg(dailyMaxT[m])) * 10) / 10,
      low: Math.round(cToF(avg(dailyMinT[m])) * 10) / 10,
      feelsHigh: Math.round(cToF(avg(dailyMaxA[m])) * 10) / 10,
      feelsLow: Math.round(cToF(avg(dailyMinA[m])) * 10) / 10,
      highBand: [Math.round(cToF(pct(dailyMaxT[m], 25)) * 10) / 10, Math.round(cToF(pct(dailyMaxT[m], 75)) * 10) / 10],
      lowBand: [Math.round(cToF(pct(dailyMinT[m], 25)) * 10) / 10, Math.round(cToF(pct(dailyMinT[m], 75)) * 10) / 10],
      precip: Math.round(mmToIn(avg(precipVals)) * 100) / 100,
      precipBand: [Math.round(mmToIn(pct(precipVals, 25)) * 100) / 100, Math.round(mmToIn(pct(precipVals, 75)) * 100) / 100],
      sunshine: Math.round(secToHr(avg(sunVals)) * 10) / 10,
      cloud: Math.round(avg(allCloud[m]) * 10) / 10,
      rain: Math.round((rainDays[m] / n) * 100 * 10) / 10,
      snow: Math.round((snowDays[m] / n) * 100 * 10) / 10,
      mixed: Math.round((mixedDays[m] / n) * 100 * 10) / 10,
      snowfall: Math.round(cmToIn(avg(snowVals)) * 100) / 100,
      snowBand: [Math.round(cmToIn(pct(snowVals, 25)) * 100) / 100, Math.round(cmToIn(pct(snowVals, 75)) * 100) / 100],
      wind: Math.round(kmhToMph(avg(dailyWind[m])) * 10) / 10,
      windBand: [Math.round(kmhToMph(pct(dailyWind[m], 25)) * 10) / 10, Math.round(kmhToMph(pct(dailyWind[m], 75)) * 10) / 10],
      dewPoint: Math.round(cToF(avg(allDew[m])) * 10) / 10,
    }
  })

  return {
    name: city.name,
    region: city.region,
    latitude: city.latitude,
    longitude: city.longitude,
    source: 'ERA5 (via Open-Meteo Archive API)',
    period: `${PERIOD_START}-${PERIOD_END}`,
    climate,
  }
}
