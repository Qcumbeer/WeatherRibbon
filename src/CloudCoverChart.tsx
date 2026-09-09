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

<<<<<<< HEAD
const OVERCAST_THRESHOLD = 50
=======
const SIGMA = 28

interface Category {
  key: string
  label: string
  center: number
  cls: string
}

const CATS: Category[] = [
  { key: 'clear', label: 'Clear', center: 15, cls: 'clear' },
  { key: 'partly-cloudy', label: 'Partly cloudy', center: 50, cls: 'partly' },
  { key: 'overcast', label: 'Overcast', center: 85, cls: 'overcast' },
]

function categoryFractions(cloud: number): number[] {
  const weights = CATS.map((cat) =>
    Math.exp(-((cloud - cat.center) ** 2) / (2 * SIGMA * SIGMA)),
  )
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  return weights.map((w) => (w / sum) * 100)
}

function stackedArea(
  climate: ClimateMonth[],
  fractions: number[][],
  xAt: (i: number) => number,
  yPct: (p: number) => number,
  catIndex: number,
): string {
  const n = climate.length
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    let bottom = 0
    for (let k = 0; k < catIndex; k++) bottom += fractions[i][k]
    parts.push(`${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)} ${yPct(bottom).toFixed(1)}`)
  }
  for (let i = n - 1; i >= 0; i--) {
    let top = 0
    for (let k = 0; k <= catIndex; k++) top += fractions[i][k]
    parts.push(`L${xAt(i).toFixed(1)} ${yPct(top).toFixed(1)}`)
  }
  parts.push('Z')
  return parts.join(' ')
}
>>>>>>> 3812df9 (Differentiate climate charts from WeatherSpark and drop redundant views.)

export function CloudCoverChart({
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

  const xDay = (d: number) => ML + (d / YEAR) * PLOT_W
  const xAt = (i: number) => ML + slot * (i + 0.5)
  const yAt = (v: number) => MT + ((100 - v) / 100) * PLOT_H

  const clouds = climate.map((m) => m.cloud)
  const series = sampleYear(clouds)

  const grid = [0, 25, 50, 75, 100]

  const clearestMonth = climate.reduce((a, b) => (b.cloud < a.cloud ? b : a))
  const cloudiestMonth = climate.reduce((a, b) => (b.cloud > a.cloud ? b : a))

  const overcastMonths = climate.filter((m) => m.cloud > OVERCAST_THRESHOLD)

  return (
    <section
      className="hourly climate cloudcover-chart"
      aria-labelledby={captionId}
    >
      <h2 className="forecast-title" id={captionId}>
<<<<<<< HEAD
        Cloud Cover
      </h2>
      <p className="sr-only" id={descId}>
        {name} monthly mean cloud cover percentage from January through
        December, shown as a line. Months above 50% cloud cover are shaded
        as overcast season.
=======
        Sky Conditions
      </h2>
      <p className="sr-only" id={descId}>
        {name} percentage of time spent in each sky condition &mdash; clear,
        partly cloudy, and overcast &mdash; from January through December.
        Categories stack to 100%.
>>>>>>> 3812df9 (Differentiate climate charts from WeatherSpark and drop redundant views.)
      </p>

      <ul className="hourly-legend">
        <li>
          <span className="swatch cc-line-swatch" aria-hidden="true" />
          Cloud cover %
        </li>
        <li>
          <span className="swatch cc-overcast-swatch" aria-hidden="true" />
          Overcast season (&gt;50%)
        </li>
      </ul>

      <div className="hourly-chart-wrap">
        <svg
          className="hourly-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={`${captionId} ${descId}`}
        >
          {overcastMonths.map((m) => {
            const idx = climate.indexOf(m)
            const x1 = ML + idx * slot
            const x2 = x1 + slot
            return (
              <rect
                key={`overcast-${m.month}`}
                className="cc-overcast-band"
                x={x1}
                y={MT}
                width={x2 - x1}
                height={PLOT_H}
              >
                <title>{m.month}: {m.cloud}% cloud cover (overcast)</title>
              </rect>
            )
          })}

          {grid.map((p) => {
            const y = yAt(p)
            return (
              <g key={`grid-${p}`}>
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
                  {p}%
                </text>
              </g>
            )
          })}

          <line
            className="cc-threshold"
            x1={ML}
            x2={ML + PLOT_W}
            y1={yAt(OVERCAST_THRESHOLD)}
            y2={yAt(OVERCAST_THRESHOLD)}
          />

          <path className="cc-line" d={lineFrom(series, xDay, yAt)}>
            <title>Monthly mean cloud cover</title>
          </path>

          {climate.map((m, i) => (
            <circle
              key={`dot-${m.month}`}
              className="cc-dot"
              cx={xDay(MID_DAY[i])}
              cy={yAt(m.cloud)}
              r={3.5}
            >
              <title>{m.month}: {m.cloud}% cloud cover</title>
            </circle>
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

      <p className="panel-note cc-note">
        Clearest {clearestMonth.month} ({clearestMonth.cloud}% cloud) &middot;{' '}
        Cloudiest {cloudiestMonth.month} ({cloudiestMonth.cloud}% cloud)
      </p>

      <details className="hourly-details">
        <summary>View cloud cover data</summary>
        <div className="hourly-table-wrap" tabIndex={0}>
          <table>
            <caption className="sr-only">
              {name} monthly mean cloud cover percentage
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Avg cloud</th>
                <th scope="col">Condition</th>
              </tr>
            </thead>
            <tbody>
              {climate.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{m.month}</th>
                  <td>{m.cloud}%</td>
                  <td>{m.cloud > OVERCAST_THRESHOLD ? 'Overcast' : 'Partly clear'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
