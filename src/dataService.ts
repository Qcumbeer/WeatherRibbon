import { FEATURED, cityKey, sameCity, type CityRef } from './cities.ts'
import { fallbackClimate } from './fallbackClimate.ts'
import newYorkData from '../data/new-york.json' with { type: 'json' }
import losAngelesData from '../data/los-angeles.json' with { type: 'json' }
import chicagoData from '../data/chicago.json' with { type: 'json' }
import houstonData from '../data/houston.json' with { type: 'json' }
import phoenixData from '../data/phoenix.json' with { type: 'json' }
import philadelphiaData from '../data/philadelphia.json' with { type: 'json' }
import sanAntonioData from '../data/san-antonio.json' with { type: 'json' }
import sanDiegoData from '../data/san-diego.json' with { type: 'json' }
import dallasData from '../data/dallas.json' with { type: 'json' }
import sanJoseData from '../data/san-jose.json' with { type: 'json' }
import austinData from '../data/austin.json' with { type: 'json' }
import jacksonvilleData from '../data/jacksonville.json' with { type: 'json' }
import fortWorthData from '../data/fort-worth.json' with { type: 'json' }
import columbusData from '../data/columbus.json' with { type: 'json' }
import charlotteData from '../data/charlotte.json' with { type: 'json' }
import indianapolisData from '../data/indianapolis.json' with { type: 'json' }
import sanFranciscoData from '../data/san-francisco.json' with { type: 'json' }
import seattleData from '../data/seattle.json' with { type: 'json' }
import denverData from '../data/denver.json' with { type: 'json' }
import oklahomaCityData from '../data/oklahoma-city.json' with { type: 'json' }
import portlandData from '../data/portland.json' with { type: 'json' }
import louisvilleData from '../data/louisville.json' with { type: 'json' }
import detroitData from '../data/detroit.json' with { type: 'json' }
import memphisData from '../data/memphis.json' with { type: 'json' }
import baltimoreData from '../data/baltimore.json' with { type: 'json' }

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
  // True when the data comes from the synthetic offline fallback rather than
  // a real ERA5 data file. The UI surfaces a "mock" badge for these cities.
  mock?: boolean
}

const STATIC: Record<string, () => Promise<{ default: unknown }>> = {
  'new-york': () => Promise.resolve({ default: newYorkData }),
  'los-angeles': () => Promise.resolve({ default: losAngelesData }),
  'chicago': () => Promise.resolve({ default: chicagoData }),
  'houston': () => Promise.resolve({ default: houstonData }),
  'phoenix': () => Promise.resolve({ default: phoenixData }),
  'philadelphia': () => Promise.resolve({ default: philadelphiaData }),
  'san-antonio': () => Promise.resolve({ default: sanAntonioData }),
  'san-diego': () => Promise.resolve({ default: sanDiegoData }),
  'dallas': () => Promise.resolve({ default: dallasData }),
  'san-jose': () => Promise.resolve({ default: sanJoseData }),
  'austin': () => Promise.resolve({ default: austinData }),
  'jacksonville': () => Promise.resolve({ default: jacksonvilleData }),
  'fort-worth': () => Promise.resolve({ default: fortWorthData }),
  'columbus': () => Promise.resolve({ default: columbusData }),
  'charlotte': () => Promise.resolve({ default: charlotteData }),
  'indianapolis': () => Promise.resolve({ default: indianapolisData }),
  'san-francisco': () => Promise.resolve({ default: sanFranciscoData }),
  'seattle': () => Promise.resolve({ default: seattleData }),
  'denver': () => Promise.resolve({ default: denverData }),
  'oklahoma-city': () => Promise.resolve({ default: oklahomaCityData }),
  'portland': () => Promise.resolve({ default: portlandData }),
  'louisville': () => Promise.resolve({ default: louisvilleData }),
  'detroit': () => Promise.resolve({ default: detroitData }),
  'memphis': () => Promise.resolve({ default: memphisData }),
  'baltimore': () => Promise.resolve({ default: baltimoreData }),
}

const memory = new Map<string, CityData>()
const store: Storage | undefined = typeof localStorage === 'undefined' ? undefined : localStorage

function cacheKey(city: CityRef): string {
  return `climate:v2:${cityKey(city)}`
}

function readCache(city: CityRef): CityData | null {
  const key = cacheKey(city)
  const hit = memory.get(key)
  if (hit) return hit
  try {
    const raw = store?.getItem(key)
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
    store?.setItem(key, JSON.stringify(data))
  } catch {
    // quota or private mode
  }
}

export function staticSlug(city: CityRef): string | undefined {
  if (city.slug && STATIC[city.slug]) return city.slug
  return FEATURED.find((f) => f.slug && STATIC[f.slug] && sameCity(f, city))?.slug
}

// A city is "mock" when it has no real ERA5 data file and loadCity falls back
// to the synthetic climatology. Used by the index to badge mock cities without
// loading their (nonexistent) data.
export function isMockCity(city: CityRef): boolean {
  return staticSlug(city) === undefined
}

export async function loadCity(city: CityRef, signal?: AbortSignal): Promise<CityData> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const cached = readCache(city)
  if (cached) return { ...cached, name: city.name, region: city.region }

  const slug = staticSlug(city)
  if (slug) {
    const mod = await STATIC[slug]()
    const data = { ...(mod.default as CityData), mock: false }
    writeCache(city, data)
    return { ...data, name: city.name, region: city.region }
  }

  const data = { ...fallbackClimate(city), mock: true }
  writeCache(city, data)
  return data
}
