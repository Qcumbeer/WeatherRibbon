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

export interface HourlyPoint {
  hour: string
  temp: number
  precip: number
}

export interface ClimateMonth {
  month: string
  high: number
  low: number
  precip: number
  sunshine: number
  cloud: number
}

export interface CityWeather {
  name: string
  region: string
  note: string
  current: CurrentConditions
  forecast: DayForecast[]
  hourly: HourlyPoint[]
  climate: ClimateMonth[]
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
    hourly: [
      { hour: '12 AM', temp: 59, precip: 20 },
      { hour: '1 AM', temp: 58, precip: 25 },
      { hour: '2 AM', temp: 57, precip: 20 },
      { hour: '3 AM', temp: 57, precip: 15 },
      { hour: '4 AM', temp: 57, precip: 10 },
      { hour: '5 AM', temp: 58, precip: 10 },
      { hour: '6 AM', temp: 59, precip: 5 },
      { hour: '7 AM', temp: 61, precip: 5 },
      { hour: '8 AM', temp: 63, precip: 5 },
      { hour: '9 AM', temp: 65, precip: 5 },
      { hour: '10 AM', temp: 67, precip: 0 },
      { hour: '11 AM', temp: 69, precip: 0 },
      { hour: '12 PM', temp: 71, precip: 0 },
      { hour: '1 PM', temp: 72, precip: 0 },
      { hour: '2 PM', temp: 73, precip: 0 },
      { hour: '3 PM', temp: 74, precip: 5 },
      { hour: '4 PM', temp: 73, precip: 5 },
      { hour: '5 PM', temp: 71, precip: 10 },
      { hour: '6 PM', temp: 69, precip: 10 },
      { hour: '7 PM', temp: 67, precip: 10 },
      { hour: '8 PM', temp: 65, precip: 15 },
      { hour: '9 PM', temp: 63, precip: 15 },
      { hour: '10 PM', temp: 61, precip: 15 },
      { hour: '11 PM', temp: 60, precip: 20 },
    ],
    climate: [
      { month: 'Jan', high: 47, low: 37, precip: 5.6, sunshine: 86, cloud: 74 },
      { month: 'Feb', high: 50, low: 37, precip: 3.5, sunshine: 121, cloud: 68 },
      { month: 'Mar', high: 54, low: 39, precip: 3.7, sunshine: 171, cloud: 62 },
      { month: 'Apr', high: 59, low: 42, precip: 2.7, sunshine: 204, cloud: 52 },
      { month: 'May', high: 65, low: 47, precip: 1.9, sunshine: 248, cloud: 43 },
      { month: 'Jun', high: 70, low: 52, precip: 1.5, sunshine: 267, cloud: 38 },
      { month: 'Jul', high: 76, low: 56, precip: 0.7, sunshine: 304, cloud: 28 },
      { month: 'Aug', high: 76, low: 57, precip: 0.9, sunshine: 279, cloud: 30 },
      { month: 'Sep', high: 71, low: 53, precip: 1.6, sunshine: 210, cloud: 39 },
      { month: 'Oct', high: 60, low: 46, precip: 3.5, sunshine: 140, cloud: 58 },
      { month: 'Nov', high: 51, low: 40, precip: 6.1, sunshine: 81, cloud: 74 },
      { month: 'Dec', high: 46, low: 36, precip: 5.4, sunshine: 71, cloud: 78 },
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
    hourly: [
      { hour: '12 AM', temp: 56, precip: 5 },
      { hour: '1 AM', temp: 55, precip: 5 },
      { hour: '2 AM', temp: 55, precip: 10 },
      { hour: '3 AM', temp: 55, precip: 10 },
      { hour: '4 AM', temp: 55, precip: 10 },
      { hour: '5 AM', temp: 55, precip: 10 },
      { hour: '6 AM', temp: 56, precip: 10 },
      { hour: '7 AM', temp: 57, precip: 5 },
      { hour: '8 AM', temp: 58, precip: 5 },
      { hour: '9 AM', temp: 59, precip: 5 },
      { hour: '10 AM', temp: 61, precip: 0 },
      { hour: '11 AM', temp: 63, precip: 0 },
      { hour: '12 PM', temp: 64, precip: 0 },
      { hour: '1 PM', temp: 65, precip: 0 },
      { hour: '2 PM', temp: 66, precip: 0 },
      { hour: '3 PM', temp: 66, precip: 0 },
      { hour: '4 PM', temp: 65, precip: 0 },
      { hour: '5 PM', temp: 64, precip: 0 },
      { hour: '6 PM', temp: 62, precip: 5 },
      { hour: '7 PM', temp: 61, precip: 5 },
      { hour: '8 PM', temp: 59, precip: 5 },
      { hour: '9 PM', temp: 58, precip: 5 },
      { hour: '10 PM', temp: 57, precip: 5 },
      { hour: '11 PM', temp: 56, precip: 5 },
    ],
    climate: [
      { month: 'Jan', high: 58, low: 46, precip: 4.5, sunshine: 166, cloud: 55 },
      { month: 'Feb', high: 61, low: 48, precip: 4.0, sunshine: 182, cloud: 52 },
      { month: 'Mar', high: 63, low: 49, precip: 2.9, sunshine: 251, cloud: 48 },
      { month: 'Apr', high: 64, low: 50, precip: 1.5, sunshine: 282, cloud: 42 },
      { month: 'May', high: 66, low: 52, precip: 0.7, sunshine: 313, cloud: 36 },
      { month: 'Jun', high: 68, low: 53, precip: 0.2, sunshine: 300, cloud: 32 },
      { month: 'Jul', high: 68, low: 55, precip: 0.0, sunshine: 298, cloud: 28 },
      { month: 'Aug', high: 69, low: 56, precip: 0.1, sunshine: 273, cloud: 27 },
      { month: 'Sep', high: 71, low: 56, precip: 0.2, sunshine: 270, cloud: 25 },
      { month: 'Oct', high: 70, low: 54, precip: 1.0, sunshine: 251, cloud: 34 },
      { month: 'Nov', high: 64, low: 50, precip: 2.5, sunshine: 189, cloud: 48 },
      { month: 'Dec', high: 58, low: 46, precip: 4.0, sunshine: 158, cloud: 56 },
    ],
  },
}
