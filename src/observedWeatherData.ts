import artifact from '../data/observed/2021-2025.json' with { type: 'json' }
import {
  getObservedYear,
  loadObservedWeather,
  observedYearsForCity,
  type ObservedWeatherDataset,
  type ObservedYearRecord,
} from './observedWeather.ts'

export type { ObservedWeatherDataset, ObservedYearRecord }

const dataset = loadObservedWeather(artifact as ObservedWeatherDataset)

export function loadObservedAnnualWeather(): ObservedWeatherDataset {
  return dataset
}

export function loadObservedYears(slug: string): ObservedYearRecord[] {
  return observedYearsForCity(dataset, slug)
}

export function loadObservedYear(slug: string, year: number): ObservedYearRecord | undefined {
  return getObservedYear(dataset, slug, year)
}
