import { useState } from 'react'
import { ClimateChart } from './ClimateChart'
import { CloudCoverChart } from './CloudCoverChart'
import { DaylightChart } from './DaylightChart'
import { HourlyChart } from './HourlyChart'
import { PrecipChanceChart } from './PrecipChanceChart'
import { RainfallChart } from './RainfallChart'
import { SnowfallChart } from './SnowfallChart'
import { SunriseSunsetChart } from './SunriseSunsetChart'
import { CloudCoverPanel, SunshinePanel } from './SunCloudPanels'
import { WEATHER, type City } from './weather'
import './App.css'

function App() {
  const [city, setCity] = useState<City | null>(null)
  const data = city ? WEATHER[city] : null

  return (
    <div className="shell">
      <header className="header">
        <p className="brand">Cities</p>
        <nav className="nav" aria-label="Cities">
          <button
            type="button"
            className={city === 'seattle' ? 'city-btn active' : 'city-btn'}
            aria-pressed={city === 'seattle'}
            onClick={() => setCity('seattle')}
          >
            Seattle
          </button>
          <button
            type="button"
            className={
              city === 'san-francisco' ? 'city-btn active' : 'city-btn'
            }
            aria-pressed={city === 'san-francisco'}
            onClick={() => setCity('san-francisco')}
          >
            San Francisco
          </button>
        </nav>
      </header>

      <main className="main">
        {data ? (
          <div className="weather">
            <section className="hero-card" aria-label="Current conditions">
              <div className="hero-top">
                <div>
                  <p className="eyebrow">{data.region}</p>
                  <h1>{data.name}</h1>
                  <p className="condition">{data.current.condition}</p>
                </div>
                <div className="temp-block">
                  <span className="temp">{data.current.temp}&deg;</span>
                  <span className="feels">
                    Feels like {data.current.feelsLike}&deg;
                  </span>
                </div>
              </div>

              <dl className="stats">
                <div className="stat">
                  <dt>High / Low</dt>
                  <dd>
                    {data.current.high}&deg; / {data.current.low}&deg;
                  </dd>
                </div>
                <div className="stat">
                  <dt>Humidity</dt>
                  <dd>{data.current.humidity}%</dd>
                </div>
                <div className="stat">
                  <dt>Wind</dt>
                  <dd>
                    {data.current.wind} mph {data.current.windDir}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="forecast" aria-label="10 day forecast">
              <h2 className="forecast-title">10-day forecast</h2>
              <ul className="forecast-list">
                {data.forecast.map((d, i) => (
                  <li className="forecast-row" key={`${d.day}-${i}`}>
                    <span className="f-day">{d.day}</span>
                    <span className="f-cond">{d.condition}</span>
                    <span className="f-precip">{d.precip}%</span>
                    <span className="f-temps">
                      <span className="f-high">{d.high}&deg;</span>
                      <span className="f-low">{d.low}&deg;</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <HourlyChart
              name={data.name}
              hourly={data.hourly}
              climate={data.climate}
            />
            <ClimateChart name={data.name} climate={data.climate} />
            <CloudCoverChart name={data.name} climate={data.climate} />
            <PrecipChanceChart name={data.name} climate={data.climate} />
            <RainfallChart name={data.name} climate={data.climate} />
            <SnowfallChart name={data.name} climate={data.climate} />
            <DaylightChart name={data.name} latitude={data.latitude} />
            <SunriseSunsetChart
              name={data.name}
              latitude={data.latitude}
              longitude={data.longitude}
            />

            <div className="duo">
              <SunshinePanel name={data.name} climate={data.climate} />
              <CloudCoverPanel name={data.name} climate={data.climate} />
            </div>
          </div>
        ) : (
          <article className="card muted">
            <h1>Choose a city</h1>
            <p>Select Seattle or San Francisco to see the weather.</p>
          </article>
        )}
      </main>
    </div>
  )
}

export default App
