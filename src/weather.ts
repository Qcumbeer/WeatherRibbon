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
  rain: number
  snow: number
  mixed: number
  snowfall: number
  highBand: [number, number]
  lowBand: [number, number]
  feelsHigh: number
  feelsLow: number
  precipBand: [number, number]
  snowBand: [number, number]
  dewPoint: number
}

export interface CityWeather {
  name: string
  region: string
  note: string
  latitude: number
  longitude: number
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
    latitude: 47.61,
    longitude: -122.33,
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
      { month: 'Jan', high: 47, low: 37, precip: 5.6, sunshine: 86, cloud: 74, rain: 48, snow: 2, mixed: 2, snowfall: 1.2, highBand: [42, 52], lowBand: [33, 41], feelsHigh: 44, feelsLow: 33, precipBand: [3.6, 7.8], snowBand: [0.4, 2.6], dewPoint: 34 },
      { month: 'Feb', high: 50, low: 37, precip: 3.5, sunshine: 121, cloud: 68, rain: 43, snow: 1, mixed: 1, snowfall: 0.9, highBand: [45, 55], lowBand: [33, 42], feelsHigh: 47, feelsLow: 33, precipBand: [2.0, 5.2], snowBand: [0.2, 1.9], dewPoint: 34 },
      { month: 'Mar', high: 54, low: 39, precip: 3.7, sunshine: 171, cloud: 62, rain: 40, snow: 0, mixed: 1, snowfall: 0.2, highBand: [49, 59], lowBand: [35, 44], feelsHigh: 51, feelsLow: 35, precipBand: [2.2, 5.5], snowBand: [0.0, 0.5], dewPoint: 36 },
      { month: 'Apr', high: 59, low: 42, precip: 2.7, sunshine: 204, cloud: 52, rain: 34, snow: 0, mixed: 0, snowfall: 0.0, highBand: [54, 64], lowBand: [38, 47], feelsHigh: 56, feelsLow: 38, precipBand: [1.4, 4.1], snowBand: [0.0, 0.0], dewPoint: 39 },
      { month: 'May', high: 65, low: 47, precip: 1.9, sunshine: 248, cloud: 43, rain: 23, snow: 0, mixed: 0, snowfall: 0.0, highBand: [60, 70], lowBand: [42, 52], feelsHigh: 63, feelsLow: 43, precipBand: [0.8, 3.1], snowBand: [0.0, 0.0], dewPoint: 44 },
      { month: 'Jun', high: 70, low: 52, precip: 1.5, sunshine: 267, cloud: 38, rain: 15, snow: 0, mixed: 0, snowfall: 0.0, highBand: [65, 75], lowBand: [47, 57], feelsHigh: 69, feelsLow: 48, precipBand: [0.5, 2.6], snowBand: [0.0, 0.0], dewPoint: 48 },
      { month: 'Jul', high: 76, low: 56, precip: 0.7, sunshine: 304, cloud: 28, rain: 10, snow: 0, mixed: 0, snowfall: 0.0, highBand: [71, 81], lowBand: [51, 61], feelsHigh: 77, feelsLow: 52, precipBand: [0.15, 1.4], snowBand: [0.0, 0.0], dewPoint: 51 },
      { month: 'Aug', high: 76, low: 57, precip: 0.9, sunshine: 279, cloud: 30, rain: 8, snow: 0, mixed: 0, snowfall: 0.0, highBand: [71, 81], lowBand: [52, 62], feelsHigh: 78, feelsLow: 53, precipBand: [0.2, 1.7], snowBand: [0.0, 0.0], dewPoint: 52 },
      { month: 'Sep', high: 71, low: 53, precip: 1.6, sunshine: 210, cloud: 39, rain: 19, snow: 0, mixed: 0, snowfall: 0.0, highBand: [66, 76], lowBand: [48, 58], feelsHigh: 70, feelsLow: 49, precipBand: [0.6, 2.8], snowBand: [0.0, 0.0], dewPoint: 49 },
      { month: 'Oct', high: 60, low: 46, precip: 3.5, sunshine: 140, cloud: 58, rain: 37, snow: 0, mixed: 0, snowfall: 0.0, highBand: [55, 65], lowBand: [41, 51], feelsHigh: 57, feelsLow: 42, precipBand: [1.8, 5.4], snowBand: [0.0, 0.0], dewPoint: 44 },
      { month: 'Nov', high: 51, low: 40, precip: 7.5, sunshine: 81, cloud: 74, rain: 57, snow: 0, mixed: 0, snowfall: 0.1, highBand: [46, 56], lowBand: [36, 45], feelsHigh: 48, feelsLow: 36, precipBand: [4.8, 10.6], snowBand: [0.0, 0.3], dewPoint: 38 },
      { month: 'Dec', high: 46, low: 36, precip: 5.4, sunshine: 71, cloud: 78, rain: 51, snow: 1, mixed: 1, snowfall: 0.8, highBand: [41, 51], lowBand: [32, 40], feelsHigh: 43, feelsLow: 32, precipBand: [3.4, 7.6], snowBand: [0.2, 1.8], dewPoint: 34 },
    ],
  },
  'san-francisco': {
    name: 'San Francisco',
    region: 'California',
    note: 'Fog, hills, and a bay that defines the city.',
    latitude: 37.77,
    longitude: -122.42,
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
      { month: 'Jan', high: 58, low: 46, precip: 4.5, sunshine: 166, cloud: 55, rain: 30, snow: 0, mixed: 0, snowfall: 0.1, highBand: [55, 61], lowBand: [43, 49], feelsHigh: 56, feelsLow: 43, precipBand: [2.4, 6.8], snowBand: [0.0, 0.3], dewPoint: 44 },
      { month: 'Feb', high: 61, low: 48, precip: 4.0, sunshine: 182, cloud: 52, rain: 32, snow: 0, mixed: 0, snowfall: 0.05, highBand: [58, 64], lowBand: [45, 51], feelsHigh: 59, feelsLow: 45, precipBand: [2.0, 6.2], snowBand: [0.0, 0.25], dewPoint: 45 },
      { month: 'Mar', high: 63, low: 49, precip: 2.9, sunshine: 251, cloud: 48, rain: 23, snow: 0, mixed: 0, snowfall: 0.0, highBand: [60, 66], lowBand: [46, 52], feelsHigh: 61, feelsLow: 46, precipBand: [1.2, 4.8], snowBand: [0.0, 0.0], dewPoint: 47 },
      { month: 'Apr', high: 64, low: 50, precip: 1.5, sunshine: 282, cloud: 42, rain: 13, snow: 0, mixed: 0, snowfall: 0.0, highBand: [61, 67], lowBand: [47, 53], feelsHigh: 63, feelsLow: 47, precipBand: [0.4, 2.7], snowBand: [0.0, 0.0], dewPoint: 48 },
      { month: 'May', high: 66, low: 52, precip: 0.7, sunshine: 313, cloud: 36, rain: 5, snow: 0, mixed: 0, snowfall: 0.0, highBand: [63, 69], lowBand: [49, 55], feelsHigh: 65, feelsLow: 49, precipBand: [0.1, 1.5], snowBand: [0.0, 0.0], dewPoint: 50 },
      { month: 'Jun', high: 68, low: 53, precip: 0.2, sunshine: 300, cloud: 32, rain: 2, snow: 0, mixed: 0, snowfall: 0.0, highBand: [65, 71], lowBand: [50, 56], feelsHigh: 68, feelsLow: 50, precipBand: [0.0, 0.5], snowBand: [0.0, 0.0], dewPoint: 52 },
      { month: 'Jul', high: 68, low: 55, precip: 0.0, sunshine: 298, cloud: 28, rain: 1, snow: 0, mixed: 0, snowfall: 0.0, highBand: [65, 71], lowBand: [52, 58], feelsHigh: 69, feelsLow: 52, precipBand: [0.0, 0.15], snowBand: [0.0, 0.0], dewPoint: 53 },
      { month: 'Aug', high: 69, low: 56, precip: 0.1, sunshine: 273, cloud: 27, rain: 1, snow: 0, mixed: 0, snowfall: 0.0, highBand: [66, 72], lowBand: [53, 59], feelsHigh: 70, feelsLow: 53, precipBand: [0.0, 0.25], snowBand: [0.0, 0.0], dewPoint: 54 },
      { month: 'Sep', high: 71, low: 56, precip: 0.2, sunshine: 270, cloud: 25, rain: 3, snow: 0, mixed: 0, snowfall: 0.0, highBand: [68, 74], lowBand: [53, 59], feelsHigh: 71, feelsLow: 53, precipBand: [0.0, 0.6], snowBand: [0.0, 0.0], dewPoint: 54 },
      { month: 'Oct', high: 70, low: 54, precip: 1.0, sunshine: 251, cloud: 34, rain: 9, snow: 0, mixed: 0, snowfall: 0.0, highBand: [67, 73], lowBand: [51, 57], feelsHigh: 68, feelsLow: 51, precipBand: [0.2, 2.1], snowBand: [0.0, 0.0], dewPoint: 51 },
      { month: 'Nov', high: 64, low: 50, precip: 2.5, sunshine: 189, cloud: 48, rain: 18, snow: 0, mixed: 0, snowfall: 0.0, highBand: [61, 67], lowBand: [47, 53], feelsHigh: 62, feelsLow: 47, precipBand: [1.0, 4.2], snowBand: [0.0, 0.0], dewPoint: 47 },
      { month: 'Dec', high: 58, low: 46, precip: 4.0, sunshine: 158, cloud: 56, rain: 27, snow: 0, mixed: 0, snowfall: 0.05, highBand: [55, 61], lowBand: [43, 49], feelsHigh: 56, feelsLow: 43, precipBand: [2.0, 6.2], snowBand: [0.0, 0.25], dewPoint: 44 },
    ],
  },
}
