import { createHash } from 'node:crypto'
import type { ObservedYearRecord } from '../src/observedWeather.ts'

export function sha256Hex(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

export function recordsContentHash(records: ObservedYearRecord[]): string {
  return sha256Hex(JSON.stringify(records))
}

export function dailySeriesHash(time: string[], temp: (number | null)[], precip: (number | null)[]): string {
  return sha256Hex(`${time.join(',')}|${temp.join(',')}|${precip.join(',')}`)
}
