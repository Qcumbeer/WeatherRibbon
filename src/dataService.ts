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
import nashvilleData from '../data/nashville.json' with { type: 'json' }
import washingtonData from '../data/washington.json' with { type: 'json' }
import elPasoData from '../data/el-paso.json' with { type: 'json' }
import bostonData from '../data/boston.json' with { type: 'json' }
import lasVegasData from '../data/las-vegas.json' with { type: 'json' }
import portlandData from '../data/portland.json' with { type: 'json' }
import louisvilleData from '../data/louisville.json' with { type: 'json' }
import detroitData from '../data/detroit.json' with { type: 'json' }
import memphisData from '../data/memphis.json' with { type: 'json' }
import baltimoreData from '../data/baltimore.json' with { type: 'json' }
import albuquerqueData from '../data/albuquerque.json' with { type: 'json' }
import milwaukeeData from '../data/milwaukee.json' with { type: 'json' }
import tucsonData from '../data/tucson.json' with { type: 'json' }
import fresnoData from '../data/fresno.json' with { type: 'json' }
import sacramentoData from '../data/sacramento.json' with { type: 'json' }
import kansasCityData from '../data/kansas-city.json' with { type: 'json' }
import mesaData from '../data/mesa.json' with { type: 'json' }
import atlantaData from '../data/atlanta.json' with { type: 'json' }
import omahaData from '../data/omaha.json' with { type: 'json' }
import coloradoSpringsData from '../data/colorado-springs.json' with { type: 'json' }
import raleighData from '../data/raleigh.json' with { type: 'json' }
import virginiaBeachData from '../data/virginia-beach.json' with { type: 'json' }
import longBeachData from '../data/long-beach.json' with { type: 'json' }
import miamiData from '../data/miami.json' with { type: 'json' }
import oaklandData from '../data/oakland.json' with { type: 'json' }
import minneapolisData from '../data/minneapolis.json' with { type: 'json' }
import tulsaData from '../data/tulsa.json' with { type: 'json' }
import bakersfieldData from '../data/bakersfield.json' with { type: 'json' }
import wichitaData from '../data/wichita.json' with { type: 'json' }
import arlingtonData from '../data/arlington.json' with { type: 'json' }
import tampaData from '../data/tampa.json' with { type: 'json' }
import newOrleansData from '../data/new-orleans.json' with { type: 'json' }
import clevelandData from '../data/cleveland.json' with { type: 'json' }
import honoluluData from '../data/honolulu.json' with { type: 'json' }
import anaheimData from '../data/anaheim.json' with { type: 'json' }
import lexingtonData from '../data/lexington.json' with { type: 'json' }
import stocktonData from '../data/stockton.json' with { type: 'json' }
import hendersonData from '../data/henderson.json' with { type: 'json' }
import corpusChristiData from '../data/corpus-christi.json' with { type: 'json' }
import saintPaulData from '../data/saint-paul.json' with { type: 'json' }
import irvineData from '../data/irvine.json' with { type: 'json' }
import newarkData from '../data/newark.json' with { type: 'json' }
import orlandoData from '../data/orlando.json' with { type: 'json' }
import cincinnatiData from '../data/cincinnati.json' with { type: 'json' }
import pittsburghData from '../data/pittsburgh.json' with { type: 'json' }
import greensboroData from '../data/greensboro.json' with { type: 'json' }
import stLouisData from '../data/st-louis.json' with { type: 'json' }
import lincolnData from '../data/lincoln.json' with { type: 'json' }
import planoData from '../data/plano.json' with { type: 'json' }
import durhamData from '../data/durham.json' with { type: 'json' }
import anchorageData from '../data/anchorage.json' with { type: 'json' }
import chandlerData from '../data/chandler.json' with { type: 'json' }
import buffaloData from '../data/buffalo.json' with { type: 'json' }
import chulaVistaData from '../data/chula-vista.json' with { type: 'json' }
import madisonData from '../data/madison.json' with { type: 'json' }
import gilbertData from '../data/gilbert.json' with { type: 'json' }
import toledoData from '../data/toledo.json' with { type: 'json' }
import renoData from '../data/reno.json' with { type: 'json' }
import fortWayneData from '../data/fort-wayne.json' with { type: 'json' }
import northLasVegasData from '../data/north-las-vegas.json' with { type: 'json' }
import laredoData from '../data/laredo.json' with { type: 'json' }
import stPetersburgData from '../data/st-petersburg.json' with { type: 'json' }
import jerseyCityData from '../data/jersey-city.json' with { type: 'json' }
import lubbockData from '../data/lubbock.json' with { type: 'json' }
import irvingData from '../data/irving.json' with { type: 'json' }
import winstonSalemData from '../data/winston-salem.json' with { type: 'json' }
import chesapeakeData from '../data/chesapeake.json' with { type: 'json' }
import glendaleData from '../data/glendale.json' with { type: 'json' }
import garlandData from '../data/garland.json' with { type: 'json' }
import scottsdaleData from '../data/scottsdale.json' with { type: 'json' }
import norfolkData from '../data/norfolk.json' with { type: 'json' }
import boiseData from '../data/boise.json' with { type: 'json' }
import fremontData from '../data/fremont.json' with { type: 'json' }
import spokaneData from '../data/spokane.json' with { type: 'json' }
import santaClaritaData from '../data/santa-clarita.json' with { type: 'json' }
import richmondData from '../data/richmond.json' with { type: 'json' }
import batonRougeData from '../data/baton-rouge.json' with { type: 'json' }
import hialeahData from '../data/hialeah.json' with { type: 'json' }
import sanBernardinoData from '../data/san-bernardino.json' with { type: 'json' }
import tacomaData from '../data/tacoma.json' with { type: 'json' }

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
  'nashville': () => Promise.resolve({ default: nashvilleData }),
  'washington': () => Promise.resolve({ default: washingtonData }),
  'el-paso': () => Promise.resolve({ default: elPasoData }),
  'boston': () => Promise.resolve({ default: bostonData }),
  'las-vegas': () => Promise.resolve({ default: lasVegasData }),
  'portland': () => Promise.resolve({ default: portlandData }),
  'louisville': () => Promise.resolve({ default: louisvilleData }),
  'detroit': () => Promise.resolve({ default: detroitData }),
  'memphis': () => Promise.resolve({ default: memphisData }),
  'baltimore': () => Promise.resolve({ default: baltimoreData }),
  'albuquerque': () => Promise.resolve({ default: albuquerqueData }),
  'milwaukee': () => Promise.resolve({ default: milwaukeeData }),
  'tucson': () => Promise.resolve({ default: tucsonData }),
  'fresno': () => Promise.resolve({ default: fresnoData }),
  'sacramento': () => Promise.resolve({ default: sacramentoData }),
  'kansas-city': () => Promise.resolve({ default: kansasCityData }),
  'mesa': () => Promise.resolve({ default: mesaData }),
  'atlanta': () => Promise.resolve({ default: atlantaData }),
  'omaha': () => Promise.resolve({ default: omahaData }),
  'colorado-springs': () => Promise.resolve({ default: coloradoSpringsData }),
  'raleigh': () => Promise.resolve({ default: raleighData }),
  'virginia-beach': () => Promise.resolve({ default: virginiaBeachData }),
  'long-beach': () => Promise.resolve({ default: longBeachData }),
  'miami': () => Promise.resolve({ default: miamiData }),
  'oakland': () => Promise.resolve({ default: oaklandData }),
  'minneapolis': () => Promise.resolve({ default: minneapolisData }),
  'tulsa': () => Promise.resolve({ default: tulsaData }),
  'bakersfield': () => Promise.resolve({ default: bakersfieldData }),
  'wichita': () => Promise.resolve({ default: wichitaData }),
  'arlington': () => Promise.resolve({ default: arlingtonData }),
  'tampa': () => Promise.resolve({ default: tampaData }),
  'new-orleans': () => Promise.resolve({ default: newOrleansData }),
  'cleveland': () => Promise.resolve({ default: clevelandData }),
  'honolulu': () => Promise.resolve({ default: honoluluData }),
  'anaheim': () => Promise.resolve({ default: anaheimData }),
  'lexington': () => Promise.resolve({ default: lexingtonData }),
  'stockton': () => Promise.resolve({ default: stocktonData }),
  'henderson': () => Promise.resolve({ default: hendersonData }),
  'corpus-christi': () => Promise.resolve({ default: corpusChristiData }),
  'saint-paul': () => Promise.resolve({ default: saintPaulData }),
  'irvine': () => Promise.resolve({ default: irvineData }),
  'newark': () => Promise.resolve({ default: newarkData }),
  'orlando': () => Promise.resolve({ default: orlandoData }),
  'cincinnati': () => Promise.resolve({ default: cincinnatiData }),
  'pittsburgh': () => Promise.resolve({ default: pittsburghData }),
  'greensboro': () => Promise.resolve({ default: greensboroData }),
  'st-louis': () => Promise.resolve({ default: stLouisData }),
  'lincoln': () => Promise.resolve({ default: lincolnData }),
  'plano': () => Promise.resolve({ default: planoData }),
  'durham': () => Promise.resolve({ default: durhamData }),
  'anchorage': () => Promise.resolve({ default: anchorageData }),
  'chandler': () => Promise.resolve({ default: chandlerData }),
  'buffalo': () => Promise.resolve({ default: buffaloData }),
  'chula-vista': () => Promise.resolve({ default: chulaVistaData }),
  'madison': () => Promise.resolve({ default: madisonData }),
  'gilbert': () => Promise.resolve({ default: gilbertData }),
  'toledo': () => Promise.resolve({ default: toledoData }),
  'reno': () => Promise.resolve({ default: renoData }),
  'fort-wayne': () => Promise.resolve({ default: fortWayneData }),
  'north-las-vegas': () => Promise.resolve({ default: northLasVegasData }),
  'laredo': () => Promise.resolve({ default: laredoData }),
  'st-petersburg': () => Promise.resolve({ default: stPetersburgData }),
  'jersey-city': () => Promise.resolve({ default: jerseyCityData }),
  'lubbock': () => Promise.resolve({ default: lubbockData }),
  'irving': () => Promise.resolve({ default: irvingData }),
  'winston-salem': () => Promise.resolve({ default: winstonSalemData }),
  'chesapeake': () => Promise.resolve({ default: chesapeakeData }),
  'glendale': () => Promise.resolve({ default: glendaleData }),
  'garland': () => Promise.resolve({ default: garlandData }),
  'scottsdale': () => Promise.resolve({ default: scottsdaleData }),
  'norfolk': () => Promise.resolve({ default: norfolkData }),
  'boise': () => Promise.resolve({ default: boiseData }),
  'fremont': () => Promise.resolve({ default: fremontData }),
  'spokane': () => Promise.resolve({ default: spokaneData }),
  'santa-clarita': () => Promise.resolve({ default: santaClaritaData }),
  'richmond': () => Promise.resolve({ default: richmondData }),
  'baton-rouge': () => Promise.resolve({ default: batonRougeData }),
  'hialeah': () => Promise.resolve({ default: hialeahData }),
  'san-bernardino': () => Promise.resolve({ default: sanBernardinoData }),
  'tacoma': () => Promise.resolve({ default: tacomaData }),
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

export async function loadCity(city: CityRef, signal?: AbortSignal): Promise<CityData> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const cached = readCache(city)
  if (cached) return { ...cached, name: city.name, region: city.region }

  const slug = staticSlug(city)
  if (slug) {
    const mod = await STATIC[slug]()
    const data = mod.default as CityData
    writeCache(city, data)
    return { ...data, name: city.name, region: city.region }
  }

  const data = fallbackClimate(city)
  writeCache(city, data)
  return data
}
