import { useId } from 'react'
import { YEAR } from './solar'
import {
  moonDayEvents,
  moonPhaseMarks2026,
  type MoonPhaseMark,
} from './moon'

const WIDTH = 640
const HEIGHT = 368
const ML = 44
const MR = 16
const MT = 60
const MB = 40
const PLOT_W = WIDTH - ML - MR
const PLOT_H = HEIGHT - MT - MB

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

function dateLabel(day: number): string {
  let d = Math.floor(day)
  if (d < 0) d = 0
  if (d >= YEAR) d = YEAR - 1
  let acc = 0
  for (let i = 0; i < 12; i++) {
    if (d < acc + DAYS_IN_MONTH[i]) {
      return `${MONTHS[i]} ${d - acc + 1}`
    }
    acc += DAYS_IN_MONTH[i]
  }
  return 'Dec 31'
}

function matchInterval(
  iv: [number, number],
  next: [number, number][],
  used: Set<number>,
): [number, number] | null {
  let best = -1
  let bestDist = 2.5
  for (let k = 0; k < next.length; k++) {
    if (used.has(k)) continue
    const dist = Math.abs(iv[0] - next[k][0])
    if (dist < bestDist) {
      bestDist = dist
      best = k
    }
  }
  if (best < 0) return null
  used.add(best)
  return next[best]
}

function bandPaths(
  intervals: [number, number][][],
  xDay: (d: number) => number,
  yHour: (h: number) => number,
): string[] {
  const paths: string[] = []
  for (let i = 0; i < intervals.length; i++) {
    const x0 = xDay(i)
    const x1 = xDay(Math.min(YEAR, i + 1))
    const nxt = i + 1 < intervals.length ? intervals[i + 1] : []
    const used = new Set<number>()
    for (const iv of intervals[i]) {
      const pair = matchInterval(iv, nxt, used)
      if (pair) {
        paths.push(
          `M${x0.toFixed(1)} ${yHour(iv[1]).toFixed(1)} L${x1.toFixed(1)} ${yHour(pair[1]).toFixed(1)} L${x1.toFixed(1)} ${yHour(pair[0]).toFixed(1)} L${x0.toFixed(1)} ${yHour(iv[0]).toFixed(1)} Z`,
        )
      } else {
        paths.push(
          `M${x0.toFixed(1)} ${yHour(iv[1]).toFixed(1)} H${(x1 + 0.15).toFixed(1)} V${yHour(iv[0]).toFixed(1)} H${x0.toFixed(1)} Z`,
        )
      }
    }
  }
  return paths
}

export function MoonChart({
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
  const clipId = `${uid}-clip`

  const events = []
  for (let d = 0; d < YEAR; d++) {
    events.push(moonDayEvents(latitude, longitude, d))
  }
  const marks = moonPhaseMarks2026()
  const monthly = MID_DAY.map((d) => moonDayEvents(latitude, longitude, d))

  const xDay = (d: number) => ML + (d / YEAR) * PLOT_W
  const yHour = (h: number) => MT + ((24 - h) / 24) * PLOT_H
  const slot = PLOT_W / 12

  const bands = bandPaths(
    events.map((e) => e.intervals),
    xDay,
    yHour,
  )

  const news = marks.filter((m) => m.kind === 'new')
  const fulls = marks.filter((m) => m.kind === 'full')
  const firstFull = fulls[0]
  const lastFull = fulls[fulls.length - 1]

  return (
    <section
      className="hourly climate moon-chart"
      aria-labelledby={captionId}
    >
      <h2 className="forecast-title" id={captionId}>
        2026 Moon Rise, Set & Phases
      </h2>
      <p className="sr-only" id={descId}>
        {name} moonrise and moonset in local clock time (Pacific) from
        January through December 2026. Light-blue bands show when the moon
        is above the horizon. Vertical lines mark new moons and full moons.
        Computed for latitude {latitude.toFixed(2)}&deg;N, longitude{' '}
        {Math.abs(longitude).toFixed(2)}&deg;W.
      </p>

      <ul className="hourly-legend">
        <li>
          <span className="swatch moon-up-swatch" aria-hidden="true" />
          Moon above horizon
        </li>
        <li>
          <span className="swatch moon-new-mark" aria-hidden="true" />
          New moon
        </li>
        <li>
          <span className="swatch moon-full-mark" aria-hidden="true" />
          Full moon
        </li>
      </ul>

      <div className="hourly-chart-wrap">
        <svg
          className="hourly-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={`${captionId} ${descId}`}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={ML} y={MT} width={PLOT_W} height={PLOT_H} />
            </clipPath>
          </defs>

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

          <g clipPath={`url(#${clipId})`}>
            {bands.map((d, i) => (
              <path key={`up-${i}`} className="moon-up" d={d} />
            ))}
          </g>

          {marks.map((m: MoonPhaseMark) => {
            const x = xDay(m.day)
            const lx = x + 3
            const ly = MT - 4
            return (
              <g key={`${m.kind}-${m.day.toFixed(3)}`}>
                <line
                  className={`moon-phase-line ${m.kind}`}
                  x1={x}
                  x2={x}
                  y1={MT}
                  y2={MT + PLOT_H}
                />
                <text
                  className={`moon-phase-label ${m.kind}`}
                  x={lx}
                  y={ly}
                  textAnchor="start"
                  transform={`rotate(-90 ${lx} ${ly})`}
                >
                  {m.kind === 'new' ? 'New' : 'Full'} {dateLabel(m.day)}
                  <title>
                    {m.kind === 'new' ? 'New moon' : 'Full moon'} ·{' '}
                    {dateLabel(m.day)}
                  </title>
                </text>
              </g>
            )
          })}

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
        {fulls.length} full moons · {news.length} new moons · First full{' '}
        {firstFull ? dateLabel(firstFull.day) : '—'} · Last full{' '}
        {lastFull ? dateLabel(lastFull.day) : '—'}
      </p>

      <details className="hourly-details">
        <summary>View moon rise & set data</summary>
        <div className="hourly-table-wrap" tabIndex={0}>
          <table>
            <caption className="sr-only">
              {name} mid-month moonrise, moonset, phase, and illumination
              for 2026
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Moonrise</th>
                <th scope="col">Moonset</th>
                <th scope="col">Phase</th>
                <th scope="col">Lit</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m, i) => (
                <tr key={i}>
                  <th scope="row">{MONTHS[i]}</th>
                  <td>{m.rise === null ? '—' : clockTime(m.rise)}</td>
                  <td>{m.set === null ? '—' : clockTime(m.set)}</td>
                  <td>{m.phase}</td>
                  <td>{Math.round(m.illumination * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
