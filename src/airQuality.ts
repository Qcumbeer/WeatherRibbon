export interface AirQualityHour {
  hour: number
  aqi: number
  pm25: number
  pm10: number
  ozone: number
}

export interface AirQualityData {
  hours: AirQualityHour[]
  currentHour: number
}

export interface AqiCategory {
  name: string
  range: [number, number]
  cssVar: string
  advice: string
}

export const AQI_CATEGORIES: AqiCategory[] = [
  {
    name: 'Good',
    range: [0, 50],
    cssVar: '--aqi-good',
    advice:
      'Air quality is satisfactory. Outdoor activity is safe for everyone.',
  },
  {
    name: 'Moderate',
    range: [51, 100],
    cssVar: '--aqi-moderate',
    advice:
      'Air quality is acceptable. Unusually sensitive people should consider reducing prolonged outdoor exertion.',
  },
  {
    name: 'Unhealthy for Sensitive Groups',
    range: [101, 150],
    cssVar: '--aqi-usg',
    advice:
      'Sensitive groups—including children, older adults, and those with respiratory conditions—should limit prolonged outdoor exertion.',
  },
  {
    name: 'Unhealthy',
    range: [151, 200],
    cssVar: '--aqi-unhealthy',
    advice:
      'Everyone may experience health effects. Sensitive groups should avoid outdoor exertion; everyone else should reduce it.',
  },
  {
    name: 'Very Unhealthy',
    range: [201, 300],
    cssVar: '--aqi-very',
    advice:
      'Health alert: everyone may experience more serious effects. Avoid outdoor activity.',
  },
  {
    name: 'Hazardous',
    range: [301, 500],
    cssVar: '--aqi-hazardous',
    advice:
      'Health warning of emergency conditions. Everyone should stay indoors and keep activity levels low.',
  },
]

export function aqiCategory(aqi: number): AqiCategory {
  return (
    AQI_CATEGORIES.find((c) => aqi >= c.range[0] && aqi <= c.range[1]) ??
    AQI_CATEGORIES[AQI_CATEGORIES.length - 1]
  )
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pm25ToAqi(c: number): number {
  if (c <= 12) return Math.round((c / 12) * 50)
  if (c <= 35.4) return Math.round(51 + ((c - 12.1) / (35.4 - 12.1)) * 49)
  if (c <= 55.4) return Math.round(101 + ((c - 35.5) / (55.4 - 35.5)) * 49)
  if (c <= 150.4) return Math.round(151 + ((c - 55.5) / (150.4 - 55.5)) * 49)
  if (c <= 250.4) return Math.round(201 + ((c - 150.5) / (250.4 - 150.5)) * 99)
  return Math.min(500, Math.round(301 + ((c - 250.5) / (500 - 250.5)) * 199))
}

function ozoneToAqi(ppb: number): number {
  if (ppb <= 54) return Math.round((ppb / 54) * 50)
  if (ppb <= 70) return Math.round(51 + ((ppb - 55) / (70 - 55)) * 49)
  if (ppb <= 85) return Math.round(101 + ((ppb - 71) / (85 - 71)) * 49)
  if (ppb <= 105) return Math.round(151 + ((ppb - 86) / (105 - 86)) * 49)
  if (ppb <= 200) return Math.round(201 + ((ppb - 106) / (200 - 106)) * 99)
  return 301
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}

export function loadAirQuality(latitude: number, longitude: number): AirQualityData {
  const now = new Date()
  const currentHour = now.getHours()
  const month = now.getMonth()

  const seed = Math.abs(Math.round(latitude * 10000 + longitude * 1000))
  const rand = mulberry32(seed)

  const summerFactor = Math.sin(((month - 3) / 12) * Math.PI * 2) * 0.4 + 1

  const pm25Base = 6 + rand() * 8
  const pm10Ratio = 1.4 + rand() * 0.6
  const ozoneBase = 22 + rand() * 16

  const hours: AirQualityHour[] = []

  for (let i = 0; i < 24; i++) {
    const h = (currentHour + i) % 24

    const ozoneDiurnal = Math.cos(((h - 15) / 24) * Math.PI * 2)
    const ozone = Math.max(
      8,
      ozoneBase + ozoneDiurnal * 18 * summerFactor + (rand() - 0.5) * 4,
    )

    const morningRush = Math.exp(-Math.pow((h - 8) / 2.5, 2)) * 3
    const eveningRush = Math.exp(-Math.pow((h - 18) / 2.5, 2)) * 2.5
    const pm25 = Math.max(
      1,
      pm25Base + morningRush + eveningRush + (rand() - 0.5) * 2,
    )

    const pm10 = Math.max(
      pm25,
      pm25 * pm10Ratio + morningRush * 1.5 + eveningRush * 1.2 + (rand() - 0.5) * 3,
    )

    const aqi = Math.round(Math.max(pm25ToAqi(pm25), ozoneToAqi(ozone)))

    hours.push({
      hour: h,
      aqi,
      pm25: round1(pm25),
      pm10: round1(pm10),
      ozone: Math.round(ozone),
    })
  }

  return { hours, currentHour }
}
