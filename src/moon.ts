import { isDST2026, YEAR } from './solar'

const J2000_TO_2026 = 9496.5
const PACIFIC_STD = -8

function sind(d: number): number {
  return Math.sin((d * Math.PI) / 180)
}

function cosd(d: number): number {
  return Math.cos((d * Math.PI) / 180)
}

function asind(x: number): number {
  return (Math.asin(Math.max(-1, Math.min(1, x))) * 180) / Math.PI
}

function norm360(d: number): number {
  return ((d % 360) + 360) % 360
}

function j2000(day: number, hourLocal: number, tz: number): number {
  return J2000_TO_2026 + day + (hourLocal - tz) / 24
}

function tzOffset(day: number): number {
  return PACIFIC_STD + (isDST2026(day) ? 1 : 0)
}

function gmstDeg(d: number): number {
  return norm360(280.46061837 + 360.98564736629 * d)
}

function sunLongitude(d: number): number {
  const T = d / 36525
  const L0 = 280.46646 + 36000.76983 * T
  const M = 357.52911 + 35999.05029 * T
  const C =
    (1.914602 - 0.004817 * T) * sind(M) +
    0.019993 * sind(2 * M) +
    0.000289 * sind(3 * M)
  return norm360(L0 + C)
}

interface MoonEq {
  ra: number
  dec: number
  dist: number
  lon: number
}

function moonEquatorial(d: number): MoonEq {
  const T = d / 36525
  const L0 = 218.3164477 + 481267.88123421 * T
  const D = 297.8501921 + 445267.1114034 * T
  const M = 357.5291092 + 35999.0502909 * T
  const Mp = 134.9633964 + 477198.8675055 * T
  const F = 93.272095 + 483202.0175233 * T

  const lon = norm360(
    L0 +
      6.288774 * sind(Mp) +
      1.274027 * sind(2 * D - Mp) +
      0.658314 * sind(2 * D) +
      0.213618 * sind(2 * Mp) -
      0.185116 * sind(M) -
      0.114332 * sind(2 * F) +
      0.058793 * sind(2 * D - 2 * Mp) +
      0.057066 * sind(2 * D - M - Mp) +
      0.053322 * sind(2 * D + Mp) +
      0.045758 * sind(2 * D - M) -
      0.040923 * sind(M - Mp) -
      0.03472 * sind(D) -
      0.030383 * sind(M + Mp),
  )

  const lat =
    5.128122 * sind(F) +
    0.280602 * sind(Mp + F) +
    0.277693 * sind(Mp - F) +
    0.173237 * sind(2 * D - F) +
    0.055413 * sind(2 * D + F - Mp) +
    0.046271 * sind(2 * D - F - Mp) +
    0.032573 * sind(2 * D + F) +
    0.017198 * sind(2 * Mp + F)

  const dist =
    385000.56 -
    20905.355 * cosd(Mp) -
    3699.111 * cosd(2 * D - Mp) -
    2955.968 * cosd(2 * D) -
    569.925 * cosd(2 * Mp) +
    246.158 * cosd(2 * D - 2 * Mp)

  const eps = 23.439291 - 0.0130042 * T
  const lonR = (lon * Math.PI) / 180
  const latR = (lat * Math.PI) / 180
  const epsR = (eps * Math.PI) / 180

  const dec =
    (Math.asin(
      Math.sin(latR) * Math.cos(epsR) +
        Math.cos(latR) * Math.sin(epsR) * Math.sin(lonR),
    ) *
      180) /
    Math.PI

  const ra = norm360(
    (Math.atan2(
      Math.sin(lonR) * Math.cos(epsR) - Math.tan(latR) * Math.sin(epsR),
      Math.cos(lonR),
    ) *
      180) /
      Math.PI,
  )

  return { ra, dec, dist, lon }
}

function moonElongation(d: number): number {
  return norm360(moonEquatorial(d).lon - sunLongitude(d))
}

export function moonIllumination(d: number): number {
  return (1 - Math.cos((moonElongation(d) * Math.PI) / 180)) / 2
}

export function moonPhaseName(d: number): string {
  const e = moonElongation(d)
  if (e < 22.5 || e >= 337.5) return 'New'
  if (e < 67.5) return 'Waxing crescent'
  if (e < 112.5) return 'First quarter'
  if (e < 157.5) return 'Waxing gibbous'
  if (e < 202.5) return 'Full'
  if (e < 247.5) return 'Waning gibbous'
  if (e < 292.5) return 'Last quarter'
  return 'Waning crescent'
}

function moonAltAbove(lat: number, lng: number, d: number): number {
  const { ra, dec, dist } = moonEquatorial(d)
  const ha = ((gmstDeg(d) + lng - ra + 180) % 360 + 360) % 360 - 180
  const alt = asind(sind(lat) * sind(dec) + cosd(lat) * cosd(dec) * cosd(ha))
  const hp = asind(Math.min(1, 6378.14 / dist))
  return alt - (0.7275 * hp - 0.5667)
}

export interface MoonDay {
  rise: number | null
  set: number | null
  intervals: [number, number][]
  illumination: number
  phase: string
}

export function moonDayEvents(
  lat: number,
  lng: number,
  day: number,
): MoonDay {
  const tz = tzOffset(day)
  const step = 0.25
  const n = Math.round(24 / step)
  const alts = new Array<number>(n + 1)
  for (let i = 0; i <= n; i++) {
    alts[i] = moonAltAbove(lat, lng, j2000(day, i * step, tz))
  }

  const intervals: [number, number][] = []
  let rise: number | null = null
  let set: number | null = null
  let open: number | null = alts[0] >= 0 ? 0 : null

  for (let i = 1; i <= n; i++) {
    const a0 = alts[i - 1]
    const a1 = alts[i]
    const h0 = (i - 1) * step
    if (a0 < 0 && a1 >= 0) {
      const t = h0 + (step * -a0) / (a1 - a0)
      if (rise === null) rise = t
      open = t
    } else if (a0 >= 0 && a1 < 0) {
      const t = h0 + (step * a0) / (a0 - a1)
      if (set === null) set = t
      if (open !== null) {
        intervals.push([open, Math.min(24, t)])
        open = null
      }
    }
  }
  if (open !== null) intervals.push([open, 24])

  const noon = j2000(day, 12, tz)
  return {
    rise,
    set,
    intervals,
    illumination: moonIllumination(noon),
    phase: moonPhaseName(noon),
  }
}

export interface MoonPhaseMark {
  day: number
  kind: 'new' | 'full'
}

function utcToLocalDay(utcDay: number): number {
  let local = utcDay - 8 / 24
  if (isDST2026(local)) local = utcDay - 7 / 24
  return local
}

function crossTime(
  d0: number,
  e0: number,
  d1: number,
  e1: number,
  target: number,
): number {
  let a = e0
  let b = e1
  if (target === 0) {
    if (a > 180) a -= 360
    if (b > 180) b -= 360
  }
  return d0 + ((target - a) / (b - a)) * (d1 - d0)
}

export function moonPhaseMarks2026(): MoonPhaseMark[] {
  const marks: MoonPhaseMark[] = []
  const step = 0.25
  let prev = moonElongation(J2000_TO_2026)
  for (let utc = step; utc <= YEAR + 1; utc += step) {
    const curr = moonElongation(J2000_TO_2026 + utc)
    let kind: 'new' | 'full' | null = null
    let t = 0
    if (prev > 300 && curr < 60) {
      kind = 'new'
      t = crossTime(utc - step, prev, utc, curr, 0)
    } else if (prev < 180 && curr >= 180) {
      kind = 'full'
      t = crossTime(utc - step, prev, utc, curr, 180)
    }
    if (kind) {
      const local = utcToLocalDay(t)
      if (local >= 0 && local < YEAR) {
        marks.push({ day: local, kind })
      }
    }
    prev = curr
  }
  return marks
}
