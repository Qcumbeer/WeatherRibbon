import { useId } from 'react'
import type { HourlyPoint } from './weather'

const WIDTH = 640
const HEIGHT = 248
const ML = 40
const MR = 40
const MT = 16
const MB = 36
const PLOT_W = WIDTH - ML - MR
const PLOT_H = HEIGHT - MT - MB

const MAJOR = new Set([
  '12 AM',
  '3 AM',
  '6 AM',
  '9 AM',
  '12 PM',
  '3 PM',
  '6 PM',
  '9 PM',
])
const SPARSE = new Set(['12 AM', '6 AM', '12 PM', '6 PM'])

function shortHour(hour: string) {
  return hour.replace(' AM', 'a').replace(' PM', 'p')
}

function ticks(lo: number, hi: number, count: number) {
  const step = (hi - lo) / (count - 1)
  return Array.from({ length: count }, (_, i) => lo + step * i)
}

export function HourlyChart({
  name,
  hourly,
}: {
  name: string
  hourly: HourlyPoint[]
}) {
  const uid = useId()
  const captionId = `${uid}-caption`
  const descId = `${uid}-desc`
  const n = hourly.length
  const temps = hourly.map((h) => h.temp)
  const precips = hourly.map((h) => h.precip)
  const tLo = Math.floor((Math.min(...temps) - 3) / 5) * 5
  const tHi = Math.ceil((Math.max(...temps) + 3) / 5) * 5
  const pHi = Math.max(40, Math.ceil(Math.max(0, ...precips) / 20) * 20)
  const tRange = tHi - tLo || 1
  const barW = (PLOT_W / n) * 0.5

  const xAt = (i: number) =>
    ML + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W)
  const yTemp = (t: number) => MT + ((tHi - t) / tRange) * PLOT_H
  const yPrecip = (p: number) => MT + ((pHi - p) / pHi) * PLOT_H

  const line = hourly
    .map((h, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)} ${yTemp(h.temp).toFixed(1)}`)
    .join(' ')
  const area = `${line} L${xAt(n - 1).toFixed(1)} ${MT + PLOT_H} L${xAt(0).toFixed(1)} ${MT + PLOT_H} Z`

  return (
    <section className="hourly" aria-labelledby={captionId}>
      <h2 className="forecast-title" id={captionId}>
        Hourly
      </h2>
      <p className="sr-only" id={descId}>
        {name} hourly temperature in degrees Fahrenheit and chance of
        precipitation for the next 24 hours.
      </p>

      <ul className="hourly-legend">
        <li>
          <span className="swatch temp" aria-hidden="true" />
          Temperature (°F)
        </li>
        <li>
          <span className="swatch precip" aria-hidden="true" />
          Precipitation (%)
        </li>
      </ul>

      <div className="hourly-chart-wrap">
        <svg
          className="hourly-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={`${captionId} ${descId}`}
        >
          {ticks(tLo, tHi, 4).map((t) => {
            const y = yTemp(t)
            return (
              <g key={`grid-${t}`}>
                <line
                  className="hourly-grid"
                  x1={ML}
                  x2={ML + PLOT_W}
                  y1={y}
                  y2={y}
                />
                <text className="hourly-axis" x={ML - 8} y={y + 4} textAnchor="end">
                  {Math.round(t)}°
                </text>
                <text
                  className="hourly-axis hourly-axis-right"
                  x={ML + PLOT_W + 8}
                  y={y + 4}
                  textAnchor="start"
                >
                  {Math.round(((t - tLo) / tRange) * pHi)}%
                </text>
              </g>
            )
          })}

          {hourly.map((h, i) => {
            const y = yPrecip(h.precip)
            const height = MT + PLOT_H - y
            if (height <= 0) return null
            return (
              <rect
                key={`bar-${h.hour}`}
                className="hourly-bar"
                x={xAt(i) - barW / 2}
                y={y}
                width={barW}
                height={height}
                rx={2}
              >
                <title>
                  {h.hour}: {h.precip}% chance of precipitation
                </title>
              </rect>
            )
          })}

          <path className="hourly-area" d={area} />
          <path className="hourly-line" d={line} />

          {hourly.map((h, i) =>
            MAJOR.has(h.hour) ? (
              <circle
                key={`dot-${h.hour}`}
                className="hourly-dot"
                cx={xAt(i)}
                cy={yTemp(h.temp)}
                r={3.5}
              >
                <title>
                  {h.hour}: {h.temp}°F
                </title>
              </circle>
            ) : null,
          )}

          {hourly.map((h, i) =>
            MAJOR.has(h.hour) ? (
              <text
                key={`x-${h.hour}`}
                className={
                  SPARSE.has(h.hour)
                    ? 'hourly-axis hourly-tick'
                    : 'hourly-axis hourly-tick hourly-tick-minor'
                }
                x={xAt(i)}
                y={MT + PLOT_H + 20}
                textAnchor="middle"
              >
                {shortHour(h.hour)}
              </text>
            ) : null,
          )}
        </svg>
      </div>

      <details className="hourly-details">
        <summary>View hourly data</summary>
        <div className="hourly-table-wrap" tabIndex={0}>
          <table>
            <caption className="sr-only">
              {name} hourly temperature and precipitation
            </caption>
            <thead>
              <tr>
                <th scope="col">Hour</th>
                <th scope="col">Temperature</th>
                <th scope="col">Precipitation</th>
              </tr>
            </thead>
            <tbody>
              {hourly.map((h) => (
                <tr key={h.hour}>
                  <th scope="row">{h.hour}</th>
                  <td>{h.temp}&deg;F</td>
                  <td>{h.precip}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
