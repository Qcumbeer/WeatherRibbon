import { useEffect, useState } from 'react'
import { AirQualityChart } from './AirQualityChart'
import { ClimateChart } from './ClimateChart'
import { ClimateOverviewChart } from './ClimateOverviewChart'
import { CloudCoverChart } from './CloudCoverChart'
import { DaylightChart } from './DaylightChart'
import { HourlyChart } from './HourlyChart'
import { PrecipChanceChart } from './PrecipChanceChart'
import { RainfallChart } from './RainfallChart'
import { RainIntensityChart } from './RainIntensityChart'
import { SnowfallChart } from './SnowfallChart'
import { HumidityComfortChart } from './HumidityComfortChart'
import { SunriseSunsetChart } from './SunriseSunsetChart'
import { WindChart } from './WindChart'
import { CloudCoverPanel, SunshinePanel } from './SunCloudPanels'
import { CityPicker } from './CityPicker'
import { loadCity, type CityData, type CityRef } from './dataService'
import './App.css'

function App() {
  const [city, setCity] = useState<CityRef | null>(null)
  const [data, setData] = useState<CityData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!city) {
      setData(null)
      setError(null)
      return
    }
    const ctrl = new AbortController()
    setData(null)
    setError(null)
    setLoading(true)
    loadCity(city, ctrl.signal)
      .then((d) => {
        if (ctrl.signal.aborted) return
        setData(d)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
        setError(err instanceof Error ? err.message : 'Failed to load climate')
        setLoading(false)
      })
    return () => {
      ctrl.abort()
    }
  }, [city])

  return (
    <div className="shell">
      <header className="header">
        <p className="brand">Cities</p>
        <CityPicker value={city} onChange={setCity} />
      </header>

      <main className="main">
        {data && city ? (
          <div className="weather">
            <section className="card" aria-label="About this data">
              <p className="eyebrow">{data.region}</p>
              <h1>{data.name}</h1>
              <p className="panel-note">
                {data.source} &middot; {data.period}
              </p>
            </section>

            <HourlyChart name={data.name} climate={data.climate} />
            <ClimateChart name={data.name} climate={data.climate} />
            <ClimateOverviewChart name={data.name} climate={data.climate} />
            <PrecipChanceChart name={data.name} climate={data.climate} />
            <RainfallChart name={data.name} climate={data.climate} />
            <RainIntensityChart name={data.name} climate={data.climate} />
            <SnowfallChart name={data.name} climate={data.climate} />
            <HumidityComfortChart name={data.name} climate={data.climate} />
            <CloudCoverChart name={data.name} climate={data.climate} />

            <AirQualityChart
              name={data.name}
              latitude={data.latitude}
              longitude={data.longitude}
            />

            <div className="duo">
              <SunshinePanel name={data.name} climate={data.climate} />
              <CloudCoverPanel name={data.name} climate={data.climate} />
            </div>

            <WindChart name={data.name} climate={data.climate} />
            <DaylightChart name={data.name} latitude={data.latitude} />
            <SunriseSunsetChart
              name={data.name}
              latitude={data.latitude}
              longitude={data.longitude}
            />
          </div>
        ) : (
          <article className="card muted">
            <h1>{loading ? 'Loading…' : error ? 'Could not load city' : 'Choose a city'}</h1>
            <p>
              {loading
                ? 'Fetching 1991–2020 ERA5 climate…'
                : error
                  ? error
                  : 'Search any city, or pick from the featured list.'}
            </p>
          </article>
        )}
      </main>
    </div>
  )
}

export default App
