import { useId } from 'react'
import type { ClimateMonth } from './weather'

const WIDTH = 640
const HEIGHT = 248
const ML = 40
const MR = 40
const MT = 16
const MB = 36
const PLOT_W = WIDTH - ML - MR
const PLOT_H = HEIGHT - MT - MB

const SPARSE = new Set(['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'])

function ticks(lo: number, hi: number, count: number) {
  const step = (hi - lo) / (count - 1)
  return Array.from({ length: count }, (_, i) => lo + step * i)
}

function linePath(
  points: ClimateMonth[],
  xAt: (i: number) => number,
  yAt: (m: ClimateMonth) => number,
) {
  return points
    .map((m, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)} ${yAt(m).toFixed(1)}`)
    .join(' ')
}

export function ClimateChart({
  name,
  climate,
}: {
  name: string
  climate: ClimateMonth[]
}) {
  const uid = useId()
  const captionId = `${uid}-caption`
  const descId = `${uid}-desc`
  const n = climate.length
  const highs = climate.map((m) => m.high)
  const lows = climate.map((m) => m.low)
  const precips = climate.map((m) => m.precip)
  const tLo = Math.floor((Math.min(...lows) - 4) / 5) * 5
  const tHi = Math.ceil((Math.max(...highs) + 4) / 5) * 5
  const pHi = Math.max(4, Math.ceil(Math.max(0, ...precips)))
  const tRange = tHi - tLo || 1
  const slot = PLOT_W / n
  const barW = slot * 0.5

  const xAt = (i: number) => ML + slot * (i + 0.5)
  const yTemp = (t: number) => MT + ((tHi - t) / tRange) * PLOT_H
  const yPrecip = (p: number) => MT + ((pHi - p) / pHi) * PLOT_H

  const highLine = linePath(climate, xAt, (m) => yTemp(m.high))
  const lowLine = linePath(climate, xAt, (m) => yTemp(m.low))

  return (
    <section className="hourly climate" aria-labelledby={captionId}>
      <h2 className="forecast-title" id={captionId}>
        Climate
      </h2>
      <p className="sr-only" id={descId}>
        {name} monthly climate with average high and low temperatures in
        degrees Fahrenheit and precipitation in inches from January through
        December.
      </p>

      <ul className="hourly-legend">
        <li>
          <span className="swatch high" aria-hidden="true" />
          Avg high (°F)
        </li>
        <li>
          <span className="swatch low" aria-hidden="true" />
          Avg low (°F)
        </li>
        <li>
          <span className="swatch precip" aria-hidden="true" />
          Precipitation (in)
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
                  {(((t - tLo) / tRange) * pHi).toFixed(1)}″
                </text>
              </g>
            )
          })}

          {climate.map((m, i) => {
            const y = yPrecip(m.precip)
            const height = MT + PLOT_H - y
            if (height <= 0) return null
            return (
              <rect
                key={`bar-${m.month}`}
                className="hourly-bar"
                x={xAt(i) - barW / 2}
                y={y}
                width={barW}
                height={height}
                rx={2}
              >
                <title>
                  {m.month}: {m.precip.toFixed(1)} inches of precipitation
                </title>
              </rect>
            )
          })}

          <path className="hourly-line low" d={lowLine} />
          <path className="hourly-line" d={highLine} />

          {climate.map((m, i) => (
            <g key={`dots-${m.month}`}>
              <circle
                className="hourly-dot"
                cx={xAt(i)}
                cy={yTemp(m.high)}
                r={3.5}
              >
                <title>
                  {m.month} high: {m.high}°F
                </title>
              </circle>
              <circle
                className="hourly-dot low"
                cx={xAt(i)}
                cy={yTemp(m.low)}
                r={3}
              >
                <title>
                  {m.month} low: {m.low}°F
                </title>
              </circle>
            </g>
          ))}

          {climate.map((m, i) => (
            <text
              key={`x-${m.month}`}
              className={
                SPARSE.has(m.month)
                  ? 'hourly-axis hourly-tick'
                  : 'hourly-axis hourly-tick climate-tick-minor'
              }
              x={xAt(i)}
              y={MT + PLOT_H + 20}
              textAnchor="middle"
            >
              {m.month}
            </text>
          ))}
        </svg>
      </div>

      <details className="hourly-details">
        <summary>View climate data</summary>
        <div className="hourly-table-wrap" tabIndex={0}>
          <table>
            <caption className="sr-only">
              {name} monthly average high, low, and precipitation
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Avg high</th>
                <th scope="col">Avg low</th>
                <th scope="col">Precipitation</th>
              </tr>
            </thead>
            <tbody>
              {climate.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{m.month}</th>
                  <td>{m.high}&deg;F</td>
                  <td>{m.low}&deg;F</td>
                  <td>{m.precip.toFixed(1)} in</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
