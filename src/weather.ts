export type City = 'seattle' | 'san-francisco'

export interface CurrentConditions {
  temp: number
  feelsLike: number
  condition: string
  humidity: number
  wind: number
  windDir: string
  high: number
  low: number
}

export interface DayForecast {
  day: string
  condition: string
  high: number
  low: number
  precip: number
}

export interface CityWeather {
  name: string
  region: string
  note: string
  current: CurrentConditions
  forecast: DayForecast[]
}

export const WEATHER: Record<City, CityWeather> = {
  seattle: {
    name: 'Seattle',
    region: 'Washington',
    note: 'Puget Sound, evergreen hills, and a working waterfront.',
    current: {
      temp: 68,
      feelsLike: 67,
      condition: 'Partly cloudy',
      humidity: 62,
      wind: 7,
      windDir: 'SW',
      high: 74,
      low: 57,
    },
    forecast: [
      { day: 'Wed', condition: 'Partly cloudy', high: 74, low: 57, precip: 10 },
      { day: 'Thu', condition: 'Mostly sunny', high: 76, low: 58, precip: 0 },
      { day: 'Fri', condition: 'Sunny', high: 79, low: 60, precip: 0 },
      { day: 'Sat', condition: 'Sunny', high: 81, low: 61, precip: 0 },
      { day: 'Sun', condition: 'Mostly sunny', high: 78, low: 60, precip: 5 },
      { day: 'Mon', condition: 'Partly cloudy', high: 75, low: 58, precip: 15 },
      { day: 'Tue', condition: 'Light rain', high: 70, low: 56, precip: 60 },
      { day: 'Wed', condition: 'Showers', high: 68, low: 55, precip: 70 },
      { day: 'Thu', condition: 'Partly cloudy', high: 71, low: 56, precip: 20 },
      { day: 'Fri', condition: 'Mostly sunny', high: 74, low: 57, precip: 5 },
    ],
  },
  'san-francisco': {
    name: 'San Francisco',
    region: 'California',
    note: 'Fog, hills, and a bay that defines the city.',
    current: {
      temp: 61,
      feelsLike: 59,
      condition: 'Fog',
      humidity: 78,
      wind: 14,
      windDir: 'W',
      high: 66,
      low: 55,
    },
    forecast: [
      { day: 'Wed', condition: 'Fog', high: 66, low: 55, precip: 5 },
      { day: 'Thu', condition: 'Partly cloudy', high: 68, low: 56, precip: 0 },
      { day: 'Fri', condition: 'Mostly sunny', high: 70, low: 57, precip: 0 },
      { day: 'Sat', condition: 'Sunny', high: 72, low: 58, precip: 0 },
      { day: 'Sun', condition: 'Sunny', high: 71, low: 58, precip: 0 },
      { day: 'Mon', condition: 'Partly cloudy', high: 69, low: 57, precip: 5 },
      { day: 'Tue', condition: 'Fog', high: 65, low: 55, precip: 10 },
      { day: 'Wed', condition: 'Windy', high: 64, low: 54, precip: 5 },
      { day: 'Thu', condition: 'Partly cloudy', high: 67, low: 56, precip: 0 },
      { day: 'Fri', condition: 'Mostly sunny', high: 69, low: 57, precip: 0 },
    ],
  },
}
