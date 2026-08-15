import { FEATURED, cityKey, sameCity, type CityRef } from './cities'
import { fetchClimate } from './climate'

export type { CityRef }
export { FEATURED }

export interface ClimateMonth {
  month: string
  high: number
  low: number
  feelsHigh: number
  feelsLow: number
  highBand: [number, number]
  lowBand: [number, number]
  precip: number
  precipBand: [number, number]
  sunshine: number
  cloud: number
  rain: number
  snow: number
  mixed: number
  snowfall: number
  snowBand: [number, number]
  wind: number
  windBand: [number, number]
  dewPoint: number
}

export interface CityData {
  name: string
  region: string
  latitude: number
  longitude: number
  source: string
  period: string
  climate: ClimateMonth[]
}

const STATIC: Record<string, () => Promise<{ default: unknown }>> = {
  seattle: () => import('../data/seattle.json'),
  'san-francisco': () => import('../data/san-francisco.json'),
}

const memory = new Map<string, CityData>()

function cacheKey(city: CityRef): string {
  return `climate:v1:${cityKey(city)}`
}

function readCache(city: CityRef): CityData | null {
  const key = cacheKey(city)
  const hit = memory.get(key)
  if (hit) return hit
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw) as CityData
    memory.set(key, data)
    return data
  } catch {
    return null
  }
}

function writeCache(city: CityRef, data: CityData) {
  const key = cacheKey(city)
  memory.set(key, data)
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // quota or private mode
  }
}

function staticSlug(city: CityRef): string | undefined {
  if (city.slug && STATIC[city.slug]) return city.slug
  return FEATURED.find((f) => f.slug && sameCity(f, city))?.slug
}

export async function loadCity(city: CityRef, signal?: AbortSignal): Promise<CityData> {
  const cached = readCache(city)
  if (cached) return { ...cached, name: city.name, region: city.region }

  const slug = staticSlug(city)
  if (slug) {
    const mod = await STATIC[slug]()
    const data = mod.default as CityData
    writeCache(city, data)
    return { ...data, name: city.name, region: city.region }
  }

  const data = await fetchClimate(city, signal)
  writeCache(city, data)
  return data
}
