import dataset from '../data/annual/2021-2025.json' with { type: 'json' }
import { citySlug, type CityRef } from './cities.ts'

export const ANNUAL_YEARS = [2021, 2022, 2023, 2024, 2025] as const
export const MIN_COMPLETENESS = 0.95

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
  years: number[]
  source: string
  sourceName: string
  sourceUrl: string
  acisUrl: string
  license: string
  method: string
  units: { meanTempF: string; precipIn: string }
  retrieved: string
  timezone: string
}

export const ANNUAL_META = dataset.meta as AnnualMeta
export const ANNUAL_RECORDS = dataset.records as AnnualRecord[]

const bySlug = new Map<string, AnnualRecord[]>()
for (const rec of ANNUAL_RECORDS) {
  const list = bySlug.get(rec.slug)
  if (list) list.push(rec)
  else bySlug.set(rec.slug, [rec])
}

export type FiveYearStatus = 'ready' | 'loading' | 'error' | 'unavailable'

export function annualForCity(city: CityRef): AnnualRecord[] | null {
  const slug = city.slug || citySlug(city)
  if (!slug) return null
  return bySlug.get(slug) ?? null
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
  return records.map((r) => r[key]).filter((v): v is number => v !== null && Number.isFinite(v))
}

export function meanOf(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
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
    first?.meanTempF !== null &&
    first?.meanTempF !== undefined &&
    last?.meanTempF !== null &&
    last?.meanTempF !== undefined
      ? last.meanTempF - first.meanTempF
      : null
  const precipDelta =
    first?.precipIn !== null &&
    first?.precipIn !== undefined &&
    last?.precipIn !== null &&
    last?.precipIn !== undefined
      ? last.precipIn - first.precipIn
      : null
  return {
    tempRange: temps.length ? [Math.min(...temps), Math.max(...temps)] : null,
    precipRange: precips.length ? [Math.min(...precips), Math.max(...precips)] : null,
    tempDelta,
    precipDelta,
    tempMean: meanOf(temps),
    precipMean: meanOf(precips),
    minCompleteness: records.reduce((m, r) => Math.min(m, r.completeness), 1),
  }
}

export function signedDelta(value: number, unit: '°F' | 'in', digits: number): string {
  const abs = Math.abs(value).toFixed(digits)
  if (value > 0) return `+${abs} ${unit}`
  if (value < 0) return `−${abs} ${unit}`
  return `${abs} ${unit}`
}
