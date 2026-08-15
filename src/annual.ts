import { type CityRef, citySlug } from './cities.ts'
import { MIN_COMPLETENESS, OBSERVED_YEARS } from './observedWeather.ts'
import { loadObservedAnnualWeather } from './observedWeatherData.ts'

export const ANNUAL_YEARS = OBSERVED_YEARS
export { MIN_COMPLETENESS }

export interface AnnualRecord {
  slug: string
  year: number
  meanTempF: number | null
  precipIn: number | null
  tempDays: number
  precipDays: number
  expectedDays: number
  completeness: number
  sourceId: string
}

export interface AnnualMeta {
  title: string
  window: { start: number; end: number; label: string }
  years: readonly number[]
  source: string
  sourceName: string
  sourceUrl: string
  license: string
  method: string
  units: { meanTempF: string; precipIn: string }
  retrieved: string
  timezone: string
  contentHash: string
}

const observed = loadObservedAnnualWeather()

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function sourceId(product: string, stationId: string | null): string {
  return product === 'GHCN-Daily' ? `ghcn:${stationId ?? 'unknown'}` : 'nclimgrid:21'
}

export const ANNUAL_META: AnnualMeta = {
  title: 'Annual mean temperature and total precipitation, 2021–2025',
  window: { start: 2021, end: 2025, label: '2021–2025 complete calendar years' },
  years: ANNUAL_YEARS,
  source: `${observed.provenance.conusProduct}; ${observed.provenance.nonConusProduct} for Anchorage and Honolulu`,
  sourceName: observed.provenance.provider,
  sourceUrl: observed.provenance.nclimgridDocumentation,
  license: observed.provenance.license,
  method: observed.provenance.limitations,
  units: { meanTempF: '°F', precipIn: 'in' },
  retrieved: observed.periodEnd,
  timezone: observed.provenance.timezone,
  contentHash: observed.contentHash,
}

export const ANNUAL_RECORDS: AnnualRecord[] = observed.records.map((record) => ({
  slug: record.slug,
  year: record.year,
  meanTempF: round((record.meanTemperatureC * 9) / 5 + 32, 1),
  precipIn: round(record.totalPrecipitationMm / 25.4, 2),
  tempDays: record.observedTemperatureDays,
  precipDays: record.observedPrecipitationDays,
  expectedDays: record.expectedDays,
  completeness: record.completeness,
  sourceId: sourceId(record.product, record.stationId),
}))

const bySlug = new Map<string, AnnualRecord[]>()
for (const record of ANNUAL_RECORDS) {
  const records = bySlug.get(record.slug)
  if (records) records.push(record)
  else bySlug.set(record.slug, [record])
}

export type FiveYearStatus = 'ready' | 'loading' | 'error' | 'unavailable'

export function annualForCity(city: CityRef): AnnualRecord[] | null {
  const slug = city.slug || citySlug(city)
  if (!slug) return null
  const records = bySlug.get(slug)
  return records ? [...records] : null
}

export function fiveYearStatus(city: CityRef, records = annualForCity(city)): FiveYearStatus {
  if (!city.slug && !citySlug(city)) return 'unavailable'
  if (!records || records.length === 0) return 'error'
  return 'ready'
}

export function formatTemp(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(1)} °F`
}

export function formatPrecip(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(2)} in`
}

export function formatCompleteness(value: number): string {
  return `${Math.round(value * 100)}%`
}

function finiteValues(records: AnnualRecord[], key: 'meanTempF' | 'precipIn'): number[] {
  return records.map((record) => record[key]).filter((value): value is number => value !== null && Number.isFinite(value))
}

export function meanOf(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((total, value) => total + value, 0) / values.length
}

export interface WindowSummary {
  tempRange: [number, number] | null
  precipRange: [number, number] | null
  tempDelta: number | null
  precipDelta: number | null
  tempMean: number | null
  precipMean: number | null
  minCompleteness: number
}

export function summarizeWindow(records: AnnualRecord[]): WindowSummary {
  const temps = finiteValues(records, 'meanTempF')
  const precips = finiteValues(records, 'precipIn')
  const first = records[0]
  const last = records[records.length - 1]
  const tempDelta =
    first?.meanTempF != null && last?.meanTempF != null ? last.meanTempF - first.meanTempF : null
  const precipDelta =
    first?.precipIn != null && last?.precipIn != null ? last.precipIn - first.precipIn : null
  return {
    tempRange: temps.length ? [Math.min(...temps), Math.max(...temps)] : null,
    precipRange: precips.length ? [Math.min(...precips), Math.max(...precips)] : null,
    tempDelta,
    precipDelta,
    tempMean: meanOf(temps),
    precipMean: meanOf(precips),
    minCompleteness: records.reduce((minimum, record) => Math.min(minimum, record.completeness), 1),
  }
}

export function signedDelta(value: number, unit: '°F' | 'in', digits: number): string {
  const rounded = Number(value.toFixed(digits))
  const absolute = Math.abs(rounded).toFixed(digits)
  if (rounded > 0) return `+${absolute} ${unit}`
  if (rounded < 0) return `−${absolute} ${unit}`
  return `${absolute} ${unit}`
}
