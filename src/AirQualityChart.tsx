import { useId, useMemo } from 'react'
import { AQI_CATEGORIES, aqiCategory, loadAirQuality } from './airQuality'

const WIDTH = 640
const HEIGHT = 300
const ML = 44
const MR = 16
const MT = 14
const MB = 40
const PLOT_W = WIDTH - ML - MR
const PLOT_H = HEIGHT - MT - MB

const Y_BREAKS = [0, 50, 100, 150, 200, 300, 500]

function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const hr = h === 0 ? 12 : h <= 12 ? h : h - 12
  return `${hr} ${period}`
}

function formatHourShort(h: number): string {
  const period = h < 12 ? 'a' : 'p'
  const hr = h === 0 ? 12 : h <= 12 ? h : h - 12
  return `${hr}${period}`
}

export function AirQualityChart({
  name,
  latitude,
  longitude,
}: {
  name: string
  latitude: number
  longitude: number
}) {
  const uid = useId()
  const captionId = `${uid}-caption`
  const descId = `${uid}-desc`

  const { hours, currentHour } = useMemo(
    () => loadAirQuality(latitude, longitude),
    [latitude, longitude],
  )
  const n = hours.length

  const maxAqi = Math.max(1, ...hours.map((h) => h.aqi))
  const yMax =
    Y_BREAKS.find((b) => b >= maxAqi) ?? 500
  const yFloor = Math.max(150, yMax)

  const xAt = (i: number) => ML + (i / (n - 1)) * PLOT_W
  const yAt = (v: number) => MT + ((yFloor - v) / yFloor) * PLOT_H

  const current = hours[0]
  const currentCat = aqiCategory(current.aqi)
  const peak = hours.reduce((a, b) => (b.aqi > a.aqi ? b : a))
  const low = hours.reduce((a, b) => (b.aqi < a.aqi ? b : a))

  const linePath = hours
    .map(
      (h, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)} ${yAt(h.aqi).toFixed(1)}`,
    )
    .join(' ')

  const yTicks = Y_BREAKS.filter((v) => v <= yFloor)
  const xLabels = [0, 3, 6, 9, 12, 15, 18, 21]

  const badgeDark = current.aqi > 100

  return (
    <section className="hourly climate aqi-chart" aria-labelledby={captionId}>
      <h2 className="forecast-title" id={captionId}>
        Air Quality Forecast
      </h2>
      <p className="sr-only" id={descId}>
        {name} forecast air quality index for the next 24 hours starting at{' '}
        {formatHour(currentHour)}, shown as a line over EPA category color bands
        from Good through Hazardous. Current AQI is {current.aqi} (
        {currentCat.name}). Peak {peak.aqi} ({formatHour(peak.hour)}), lowest{' '}
        {low.aqi} ({formatHour(low.hour)}). PM2.5 {current.pm25} micrograms per
        cubic meter, PM10 {current.pm10} micrograms per cubic meter, ozone{' '}
        {current.ozone} parts per billion.
      </p>

      <ul className="hourly-legend">
        {AQI_CATEGORIES.filter((c) => c.range[0] < yFloor).map((c) => (
          <li key={c.name}>
            <span
              className="swatch aqi-swatch"
              style={{ background: `var(${c.cssVar})` }}
              aria-hidden="true"
            />
            {c.name}
          </li>
        ))}
      </ul>

      <div className="hourly-chart-wrap">
        <svg
          className="hourly-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={`${captionId} ${descId}`}
        >
          {AQI_CATEGORIES.map((c) => {
            if (c.range[0] >= yFloor) return null
            const yTop = yAt(Math.min(c.range[1], yFloor))
            const yBot = yAt(c.range[0])
            return (
              <rect
                key={c.name}
                className="aqi-band"
                style={{ fill: `var(${c.cssVar})` }}
                x={ML}
                y={yTop}
                width={PLOT_W}
                height={Math.max(0, yBot - yTop)}
              >
                <title>
                  {c.name} ({c.range[0]}&ndash;{c.range[1]})
                </title>
              </rect>
            )
          })}

          {yTicks.map((v) => (
            <g key={`y-${v}`}>
              <line
                className="hourly-grid"
                x1={ML}
                x2={ML + PLOT_W}
                y1={yAt(v)}
                y2={yAt(v)}
              />
              <text
                className="hourly-axis"
                x={ML - 8}
                y={yAt(v) + 4}
                textAnchor="end"
              >
                {v}
              </text>
            </g>
          ))}

          <path className="aqi-line" d={linePath}>
            <title>AQI forecast (next 24 hours)</title>
          </path>

          <circle
            className="aqi-current-dot"
            cx={xAt(0)}
            cy={yAt(current.aqi)}
            r={5}
          >
            <title>
              Now: AQI {current.aqi} ({currentCat.name})
            </title>
          </circle>
          <text
            className="aqi-marker-label"
            x={xAt(0)}
            y={yAt(current.aqi) - 10}
            textAnchor="middle"
          >
            {current.aqi}
          </text>

          {xLabels.map((i) => {
            const h = (currentHour + i) % 24
            const isMinor = i % 6 !== 0
            return (
              <text
                key={`x-${i}`}
                className={
                  isMinor
                    ? 'hourly-axis hourly-tick aqi-tick-minor'
                    : 'hourly-axis hourly-tick'
                }
                x={xAt(i)}
                y={MT + PLOT_H + 20}
                textAnchor="middle"
              >
                {formatHourShort(h)}
              </text>
            )
          })}
        </svg>
      </div>

      <div className="aqi-current-info">
        <span
          className="aqi-badge"
          style={{
            background: `var(${currentCat.cssVar})`,
            color: badgeDark ? '#fff' : '#1a1a1a',
          }}
        >
          <span className="aqi-badge-value">{current.aqi}</span>
          <span className="aqi-badge-label">{currentCat.name}</span>
        </span>
        <ul className="aqi-pollutants">
          <li>
            <strong>PM2.5</strong> {current.pm25} &micro;g/m&sup3;
          </li>
          <li>
            <strong>PM10</strong> {current.pm10} &micro;g/m&sup3;
          </li>
          <li>
            <strong>Ozone</strong> {current.ozone} ppb
          </li>
        </ul>
      </div>

      <p className="panel-note aqi-advice">{currentCat.advice}</p>

      <details className="hourly-details">
        <summary>View hourly air quality data</summary>
        <div className="hourly-table-wrap" tabIndex={0}>
          <table>
            <caption className="sr-only">
              {name} hourly air quality forecast for the next 24 hours
            </caption>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">AQI</th>
                <th scope="col">Category</th>
                <th scope="col">PM2.5</th>
                <th scope="col">PM10</th>
                <th scope="col">Ozone</th>
              </tr>
            </thead>
            <tbody>
              {hours.map((h, i) => (
                <tr key={i}>
                  <th scope="row">{formatHour(h.hour)}</th>
                  <td>{h.aqi}</td>
                  <td>{aqiCategory(h.aqi).name}</td>
                  <td>{h.pm25} &micro;g/m&sup3;</td>
                  <td>{h.pm10} &micro;g/m&sup3;</td>
                  <td>{h.ozone} ppb</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
