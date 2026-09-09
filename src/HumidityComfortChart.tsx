import { useId } from 'react'
import type { ClimateMonth } from './dataService'
import { YEAR, MID_DAY, sampleYear, lineFrom } from './seasonal'

const WIDTH = 640
const HEIGHT = 300
const ML = 44
const MR = 16
const MT = 14
const MB = 40
const PLOT_W = WIDTH - ML - MR
const PLOT_H = HEIGHT - MT - MB

const SPARSE = new Set(['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'])
const Y_MAX = 100
const Y_TICKS = [0, 25, 50, 75, 100]

interface Zone {
  key: string
  label: string
  cls: string
  lo: number
  hi: number
}

<<<<<<< HEAD
const ZONES: Zone[] = [
  { key: 'dry', label: 'Dry', cls: 'dry', lo: 0, hi: 55 },
  { key: 'comfortable', label: 'Comfortable', cls: 'comfortable', lo: 55, hi: 60 },
  { key: 'humid', label: 'Humid', cls: 'humid', lo: 60, hi: 65 },
  { key: 'muggy', label: 'Muggy', cls: 'muggy', lo: 65, hi: 70 },
  { key: 'oppressive', label: 'Oppressive', cls: 'oppressive', lo: 70, hi: 75 },
  { key: 'miserable', label: 'Miserable', cls: 'miserable', lo: 75, hi: 90 },
]

=======
const BANDS: Band[] = [
  { key: 'dry', label: 'Dry', cls: 'dry' },
  { key: 'comfortable', label: 'Comfortable', cls: 'comfortable' },
  { key: 'humid', label: 'Humid', cls: 'humid' },
  { key: 'muggy', label: 'Muggy', cls: 'muggy' },
]

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax)
  return sign * y
}

function phi(x: number, mean: number): number {
  return 0.5 * (1 + erf((x - mean) / (SIGMA * Math.SQRT2)))
}

function bandFractions(dewPoint: number): number[] {
  const edges = [55, 65, 75]
  const cdfs = edges.map((edge) => phi(edge, dewPoint))
  return [
    cdfs[0] * 100,
    (cdfs[1] - cdfs[0]) * 100,
    (cdfs[2] - cdfs[1]) * 100,
    (1 - cdfs[2]) * 100,
  ]
}

>>>>>>> 3812df9 (Differentiate climate charts from WeatherSpark and drop redundant views.)
export function HumidityComfortChart({
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
  const slot = PLOT_W / n
  const barW = slot * 0.55

  const xDay = (d: number) => ML + (d / YEAR) * PLOT_W
  const xAt = (i: number) => ML + slot * (i + 0.5)
<<<<<<< HEAD
  const yFloor = 35
  const yCeil = 80
  const yAt = (v: number) => MT + ((yCeil - v) / (yCeil - yFloor)) * PLOT_H
=======
  const yPct = (p: number) => MT + ((Y_MAX - p) / Y_MAX) * PLOT_H
>>>>>>> 3812df9 (Differentiate climate charts from WeatherSpark and drop redundant views.)

  const dews = climate.map((m) => m.dewPoint)
  const series = sampleYear(dews)

<<<<<<< HEAD
  const grid = [40, 50, 60, 70, 80]

=======
>>>>>>> 3812df9 (Differentiate climate charts from WeatherSpark and drop redundant views.)
  const driestMonth = climate.reduce((a, b) =>
    b.dewPoint < a.dewPoint ? b : a,
  )
  const muggiestMonth = climate.reduce((a, b) =>
    b.dewPoint > a.dewPoint ? b : a,
  )

  return (
    <section
      className="hourly climate humidity-chart"
      aria-labelledby={captionId}
    >
      <h2 className="forecast-title" id={captionId}>
<<<<<<< HEAD
        Dew Point &amp; Comfort
      </h2>
      <p className="sr-only" id={descId}>
        {name} monthly mean dew point from January through December, shown as
        a line over comfort zones. Dry below 55 degrees, comfortable 55 to 60,
        humid 60 to 65, muggy 65 to 70, oppressive 70 to 75, and miserable 75
        and above.
=======
        Dew Point Comfort
      </h2>
      <p className="sr-only" id={descId}>
        {name} percentage of time spent in each dew-point comfort band &mdash;
        dry below 55 degrees, comfortable 55 to 65, humid 65 to 75, and muggy
        75 and above &mdash; from January through December. Categories stack
        to 100%.
>>>>>>> 3812df9 (Differentiate climate charts from WeatherSpark and drop redundant views.)
      </p>

      <ul className="hourly-legend">
        <li>
          <span className="swatch hc-line-swatch" aria-hidden="true" />
          Dew point
        </li>
        {ZONES.slice().reverse().map((zone) => (
          <li key={zone.key}>
            <span
              className={`swatch hc-swatch ${zone.cls}`}
              aria-hidden="true"
            />
            {zone.label}
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
<<<<<<< HEAD
          {ZONES.map((zone) => {
            const yTop = yAt(Math.min(zone.hi, yCeil))
            const yBot = yAt(Math.max(zone.lo, yFloor))
=======
          {Y_TICKS.map((p) => {
            const y = yPct(p)
>>>>>>> 3812df9 (Differentiate climate charts from WeatherSpark and drop redundant views.)
            return (
              <rect
                key={zone.key}
                className={`hc-zone ${zone.cls}`}
                x={ML}
                y={yTop}
                width={PLOT_W}
                height={Math.max(0, yBot - yTop)}
              >
                <title>{zone.label} ({zone.lo}–{zone.hi}°)</title>
              </rect>
            )
          })}

          {grid.map((v) => {
            const y = yAt(v)
            return (
              <g key={`grid-${v}`}>
                <line
                  className="hourly-grid"
                  x1={ML}
                  x2={ML + PLOT_W}
                  y1={y}
                  y2={y}
                />
                <text
                  className="hourly-axis"
                  x={ML - 8}
                  y={y + 4}
                  textAnchor="end"
                >
                  {v}°
                </text>
              </g>
            )
          })}

<<<<<<< HEAD
          <path className="hc-line" d={lineFrom(series, xDay, yAt)}>
            <title>Monthly mean dew point</title>
          </path>

          {climate.map((m, i) => (
            <circle
              key={`dot-${m.month}`}
              className="hc-dot"
              cx={xDay(MID_DAY[i])}
              cy={yAt(m.dewPoint)}
              r={3.5}
            >
              <title>{m.month}: {m.dewPoint}° dew point</title>
            </circle>
          ))}
=======
          {climate.map((m, i) => {
            const x = xAt(i) - barW / 2
            let bottom = 0
            return (
              <g key={`bar-${m.month}`}>
                {BANDS.map((band, bi) => {
                  const p = fractions[i][bi]
                  if (p <= 0) return null
                  const yTop = yPct(bottom + p)
                  const yBot = yPct(bottom)
                  bottom += p
                  return (
                    <rect
                      key={band.key}
                      className={`hc-bar ${band.cls}`}
                      x={x}
                      y={yTop}
                      width={barW}
                      height={Math.max(0, yBot - yTop)}
                    >
                      <title>
                        {`${m.month} ${band.label.toLowerCase()}: ${p.toFixed(0)}%`}
                      </title>
                    </rect>
                  )
                })}
              </g>
            )
          })}
>>>>>>> 3812df9 (Differentiate climate charts from WeatherSpark and drop redundant views.)

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

      <p className="panel-note cc-note">
        Driest {driestMonth.month} ({driestMonth.dewPoint}&deg; dew point)
        &middot; Muggiest {muggiestMonth.month} ({muggiestMonth.dewPoint}&deg;
        dew point)
      </p>

      <details className="hourly-details">
        <summary>View dew point data</summary>
        <div className="hourly-table-wrap" tabIndex={0}>
          <table>
            <caption className="sr-only">
              {name} monthly mean dew point
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Dew point</th>
                <th scope="col">Comfort</th>
              </tr>
            </thead>
            <tbody>
              {climate.map((m) => {
                const zone = ZONES.find((z) => m.dewPoint >= z.lo && m.dewPoint < z.hi) ?? ZONES[0]
                return (
                  <tr key={m.month}>
                    <th scope="row">{m.month}</th>
                    <td>{m.dewPoint}&deg;</td>
                    <td>{zone.label}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
