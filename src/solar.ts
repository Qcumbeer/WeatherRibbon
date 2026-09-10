export const YEAR = 365

export function declination(day: number): number {
  return -23.44 * Math.cos((2 * Math.PI * (day + 10)) / YEAR)
}

export function daylightHours(lat: number, day: number): number {
  const phi = (lat * Math.PI) / 180
  const dec = (declination(day) * Math.PI) / 180
  const h = (-0.833 * Math.PI) / 180
  const cosW =
    (Math.sin(h) - Math.sin(phi) * Math.sin(dec)) /
    (Math.cos(phi) * Math.cos(dec))
  if (cosW > 1) return 0
  if (cosW < -1) return 24
  return (2 * (Math.acos(cosW) * 180) / Math.PI) / 15
}
