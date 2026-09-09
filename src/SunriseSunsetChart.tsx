import { useId } from 'react'
import { dayEvents, isDST2026, YEAR } from './solar'

const WIDTH = 640
const HEIGHT = 320
const ML = 44
const MR = 16
const MT = 14
const MB = 40
const PLOT_W = WIDTH - ML - MR
const PLOT_H = HEIGHT - MT - MB
const STEP = 2

const SPARSE = new Set(['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'])
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const MID_DAY = (() => {
  const out: number[] = []
  let acc = 0
  for (let i = 0; i < 12; i++) {
    out.push(acc + 14)
    acc += DAYS_IN_MONTH[i]
  }
  return out
})()

const DST_DAYS = { start: 66, end: 304 }

const GRID_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24]

function hourLabel(h: number): string {
  const hr = h % 24
  const period = hr < 12 ? 'am' : 'pm'
  const disp = hr % 12 === 0 ? 12 : hr % 12
  return `${disp}${period}`
}

function clockTime(hours: number): string {
  const total = Math.round(hours * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  const hr24 = ((h % 24) + 24) % 24
  const period = hr24 < 12 ? 'am' : 'pm'
  const disp = hr24 % 12 === 0 ? 12 : hr24 % 12
  return `${disp}:${String(m).padStart(2, '0')} ${period}`
}

function curvePath(
  values: number[],
  xDay: (d: number) => number,
  yHour: (h: number) => number,
): string {
  const parts: string[] = []
  for (let i = 0; i < values.length; i++) {
    const day = i * STEP
    const prevDay = (i - 1) * STEP
    const gap =
      i > 0 && isDST2026(prevDay) !== isDST2026(day)
    parts.push(
      `${i === 0 || gap ? 'M' : 'L'}${xDay(day).toFixed(1)} ${yHour(values[i]).toFixed(1)}`,
    )
  }
  return parts.join(' ')
}

export function SunriseSunsetChart({
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

  const events: ReturnType<typeof dayEvents>[] = []
  for (let d = 0; d < YEAR; d += STEP) {
    events.push(dayEvents(latitude, longitude, d))
  }

  const xDay = (d: number) => ML + (d / YEAR) * PLOT_W
  const yHour = (h: number) => MT + ((24 - h) / 24) * PLOT_H
  const slot = PLOT_W / 12

  const sunriseVals = events.map((e) => e.sunrise)
  const sunsetVals = events.map((e) => e.sunset)

  const monthly = MID_DAY.map((d) => dayEvents(latitude, longitude, d))

  const earliestSunrise = sunriseVals.reduce((a, b) => (b < a ? b : a))
  const latestSunset = sunsetVals.reduce((a, b) => (b > a ? b : a))

  return (
    <section
      className="hourly climate sunrise-sunset-chart"
      aria-labelledby={captionId}
    >
      <h2 className="forecast-title" id={captionId}>
        Sunrise and Sunset
      </h2>
      <p className="sr-only" id={descId}>
        {name} sunrise and sunset in local clock time (Pacific) from January
        through December 2026. The shaded band marks the daylight saving time
        period. Computed for latitude {latitude.toFixed(2)}&deg;N, longitude{' '}
        {Math.abs(longitude).toFixed(2)}&deg;W.
      </p>

      <ul className="hourly-legend">
        <li>
          <span className="swatch dl-curve sunrise" aria-hidden="true" />
          Sunrise
        </li>
        <li>
          <span className="swatch dl-curve sunset" aria-hidden="true" />
          Sunset
        </li>
        <li>
          <span className="swatch dl-dst-mark" aria-hidden="true" />
          Daylight saving time
        </li>
      </ul>

      <div className="hourly-chart-wrap">
        <svg
          className="hourly-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={`${captionId} ${descId}`}
        >
          <rect
            className="dl-dst-area"
            x={xDay(DST_DAYS.start)}
            y={MT}
            width={xDay(DST_DAYS.end) - xDay(DST_DAYS.start)}
            height={PLOT_H}
          />

          {GRID_HOURS.map((h) => {
            const y = yHour(h)
            return (
              <g key={`grid-${h}`}>
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
                  {hourLabel(h)}
                </text>
              </g>
            )
          })}

          <path
            className="dl-curve-line sunrise"
            d={curvePath(sunriseVals, xDay, yHour)}
          >
            <title>Sunrise</title>
          </path>
          <path
            className="dl-curve-line sunset"
            d={curvePath(sunsetVals, xDay, yHour)}
          >
            <title>Sunset</title>
          </path>

          {MONTHS.map((mon, i) => (
            <text
              key={`x-${mon}`}
              className={
                SPARSE.has(mon)
                  ? 'hourly-axis hourly-tick'
                  : 'hourly-axis hourly-tick climate-tick-minor'
              }
              x={ML + slot * (i + 0.5)}
              y={MT + PLOT_H + 20}
              textAnchor="middle"
            >
              {mon}
            </text>
          ))}
        </svg>
      </div>

      <p className="panel-note cc-note">
        Earliest sunrise {clockTime(earliestSunrise)} &middot; Latest sunset{' '}
        {clockTime(latestSunset)} &middot; DST Mar 8&ndash;Nov 1
      </p>

      <details className="hourly-details">
        <summary>View sunrise & sunset data</summary>
        <div className="hourly-table-wrap" tabIndex={0}>
          <table>
            <caption className="sr-only">
              {name} monthly sunrise, sunset, and daylight hours for 2026
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Sunrise</th>
                <th scope="col">Sunset</th>
                <th scope="col">Daylight</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m, i) => (
                <tr key={i}>
                  <th scope="row">{MONTHS[i]}</th>
                  <td>{clockTime(m.sunrise)}</td>
                  <td>{clockTime(m.sunset)}</td>
                  <td>{m.daylight.toFixed(1)} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
