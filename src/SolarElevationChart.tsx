import { useId } from 'react'
import { isDST2026, sunPosition, YEAR } from './solar'

const WIDTH = 640
const HEIGHT = 340
const ML = 44
const MR = 16
const MT = 14
const MB = 40
const PLOT_W = WIDTH - ML - MR
const PLOT_H = HEIGHT - MT - MB

const GRID_DAYS = 73
const GRID_HOURS = 49
const STEP_DAY = YEAR / (GRID_DAYS - 1)
const STEP_HOUR = 24 / (GRID_HOURS - 1)

const SPARSE = new Set(['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'])
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

const GRID_HOURS_LABEL = [0, 3, 6, 9, 12, 15, 18, 21, 24]

const CONTOUR_LEVELS = [-18, -12, -6, 0, 10, 20, 30, 45, 60]

interface Dir {
  label: string
  azMin: number
  azMax: number
  color: string
}

const DIRS: Dir[] = [
  { label: 'N', azMin: 0, azMax: 22.5, color: '#4a6fa5' },
  { label: 'NE', azMin: 22.5, azMax: 67.5, color: '#6b8fc4' },
  { label: 'E', azMin: 67.5, azMax: 112.5, color: '#8ab8d9' },
  { label: 'SE', azMin: 112.5, azMax: 157.5, color: '#d4a86a' },
  { label: 'S', azMin: 157.5, azMax: 202.5, color: '#e08555' },
  { label: 'SW', azMin: 202.5, azMax: 247.5, color: '#c97a52' },
  { label: 'W', azMin: 247.5, azMax: 292.5, color: '#9d7090' },
  { label: 'NW', azMin: 292.5, azMax: 337.5, color: '#6b6488' },
  { label: 'N', azMin: 337.5, azMax: 360, color: '#4a6fa5' },
]

function azimuthColor(az: number): string {
  for (const d of DIRS) {
    if (az >= d.azMin && az < d.azMax) return d.color
  }
  return DIRS[0].color
}

function hourLabel(h: number): string {
  const hr = h % 24
  const period = hr < 12 ? 'am' : 'pm'
  const disp = hr % 12 === 0 ? 12 : hr % 12
  return `${disp}${period}`
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function elevationGrid(
  lat: number,
  lng: number,
): Float32Array {
  const grid = new Float32Array(GRID_DAYS * GRID_HOURS)
  for (let di = 0; di < GRID_DAYS; di++) {
    const day = di * STEP_DAY
    const dst = isDST2026(day) ? 1 : 0
    for (let hi = 0; hi < GRID_HOURS; hi++) {
      const hour = hi * STEP_HOUR
      const pos = sunPosition(lat, lng, day, hour - dst)
      grid[di * GRID_HOURS + hi] = pos.elevation
    }
  }
  return grid
}

function azimuthGrid(
  lat: number,
  lng: number,
): Float32Array {
  const grid = new Float32Array(GRID_DAYS * GRID_HOURS)
  for (let di = 0; di < GRID_DAYS; di++) {
    const day = di * STEP_DAY
    const dst = isDST2026(day) ? 1 : 0
    for (let hi = 0; hi < GRID_HOURS; hi++) {
      const hour = hi * STEP_HOUR
      const pos = sunPosition(lat, lng, day, hour - dst)
      grid[di * GRID_HOURS + hi] = pos.azimuth
    }
  }
  return grid
}

type Edge = [number, number]

function marchLevel(
  grid: Float32Array,
  level: number,
  xAt: (di: number) => number,
  yAt: (hi: number) => number,
): string[] {
  const paths: string[] = []
  for (let di = 0; di < GRID_DAYS - 1; di++) {
    for (let hi = 0; hi < GRID_HOURS - 1; hi++) {
      const tl = grid[di * GRID_HOURS + hi]
      const tr = grid[di * GRID_HOURS + hi + 1]
      const bl = grid[(di + 1) * GRID_HOURS + hi]
      const br = grid[(di + 1) * GRID_HOURS + hi + 1]

      const edges: Edge[] = []
      if ((tl - level) * (tr - level) <= 0 && tl !== tr) {
        const t = (level - tl) / (tr - tl)
        edges.push([
          lerp(xAt(di), xAt(di + 1), 0),
          lerp(yAt(hi), yAt(hi + 1), t),
        ])
      }
      if ((tr - level) * (br - level) <= 0 && tr !== br) {
        const t = (level - tr) / (br - tr)
        edges.push([
          lerp(xAt(di + 1), xAt(di), 0),
          lerp(yAt(hi), yAt(hi + 1), t),
        ])
      }
      if ((bl - level) * (br - level) <= 0 && bl !== br) {
        const t = (level - bl) / (br - bl)
        edges.push([
          lerp(xAt(di), xAt(di + 1), 0),
          lerp(yAt(hi + 1), yAt(hi), t),
        ])
      }
      if ((tl - level) * (bl - level) <= 0 && tl !== bl) {
        const t = (level - tl) / (bl - tl)
        edges.push([
          lerp(xAt(di), xAt(di + 1), t),
          lerp(yAt(hi), yAt(hi + 1), 0),
        ])
      }

      if (edges.length >= 2) {
        for (let e = 0; e + 1 < edges.length; e += 2) {
          const [x1, y1] = edges[e]
          const [x2, y2] = edges[e + 1]
          paths.push(
            `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`,
          )
        }
      }
    }
  }
  return paths
}

export function SolarElevationChart({
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

  const xAt = (di: number) => ML + (di / (GRID_DAYS - 1)) * PLOT_W
  const yAt = (hi: number) => MT + ((GRID_HOURS - 1 - hi) / (GRID_HOURS - 1)) * PLOT_H

  const cellW = PLOT_W / (GRID_DAYS - 1)
  const cellH = PLOT_H / (GRID_HOURS - 1)

  const eGrid = elevationGrid(latitude, longitude)
  const aGrid = azimuthGrid(latitude, longitude)

  const contours = CONTOUR_LEVELS.map((level) => ({
    level,
    paths: marchLevel(eGrid, level, xAt, yAt),
  }))

  let maxElev = -90
  for (let i = 0; i < eGrid.length; i++) {
    if (eGrid[i] > maxElev) maxElev = eGrid[i]
  }

  const monthDayLabels = MONTHS.map((mon, i) => {
    let acc = 0
    for (let k = 0; k < i; k++) acc += DAYS_IN_MONTH[k]
    return { mon, day: acc + 14 }
  })

  return (
    <section
      className="hourly climate solar-elevation-chart"
      aria-labelledby={captionId}
    >
      <h2 className="forecast-title" id={captionId}>
        Solar Elevation and Azimuth
      </h2>
      <p className="sr-only" id={descId}>
        {name} sun elevation angle and azimuth (compass direction) heat map
        for 2026, plotted by day of year and local clock time. Background
        color encodes compass direction; contour lines show elevation
        angles in degrees above the horizon. Computed for latitude{' '}
        {latitude.toFixed(2)}&deg;N, longitude{' '}
        {Math.abs(longitude).toFixed(2)}&deg;W.
      </p>

      <ul className="hourly-legend">
        {DIRS.slice(0, 8).map((d) => (
          <li key={d.label}>
            <span
              className="swatch se-swatch"
              style={{ background: d.color }}
              aria-hidden="true"
            />
            {d.label}
          </li>
        ))}
        <li>
          <span className="swatch se-contour" aria-hidden="true" />
          Elevation contours
        </li>
      </ul>

      <div className="hourly-chart-wrap">
        <svg
          className="hourly-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={`${captionId} ${descId}`}
        >
          {GRID_HOURS_LABEL.map((h) => {
            const hi = Math.round(h / STEP_HOUR)
            const y = yAt(hi)
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

          {Array.from({ length: GRID_DAYS - 1 }, (_, di) =>
            Array.from({ length: GRID_HOURS - 1 }, (_, hi) => {
              const az = aGrid[di * GRID_HOURS + hi]
              const el = eGrid[di * GRID_HOURS + hi]
              const x = xAt(di) - cellW / 2
              const y = yAt(hi + 1) - cellH / 2
              return (
                <rect
                  key={`cell-${di}-${hi}`}
                  x={x.toFixed(1)}
                  y={y.toFixed(1)}
                  width={(cellW + 1).toFixed(1)}
                  height={(cellH + 1).toFixed(1)}
                  fill={azimuthColor(az)}
                  opacity={el < -18 ? 0.12 : 1}
                />
              )
            }),
          )}

          {contours.map((c) =>
            c.paths.map((d, i) => (
              <path
                key={`contour-${c.level}-${i}`}
                className={`se-contour-line${c.level === 0 ? ' horizon' : ''}`}
                d={d}
              >
                {i === 0 && <title>{c.level}&deg; elevation</title>}
              </path>
            )),
          )}

          {monthDayLabels.map(({ mon, day }) => (
            <text
              key={`x-${mon}`}
              className={
                SPARSE.has(mon)
                  ? 'hourly-axis hourly-tick'
                  : 'hourly-axis hourly-tick climate-tick-minor'
              }
              x={ML + (day / YEAR) * PLOT_W}
              y={MT + PLOT_H + 20}
              textAnchor="middle"
            >
              {mon}
            </text>
          ))}
        </svg>
      </div>

      <p className="panel-note cc-note">
        Peak solar elevation {maxElev.toFixed(0)}&deg; &middot; Contours at{' '}
        {CONTOUR_LEVELS.filter((l) => l >= -18).join('/')}&deg;
      </p>

      <details className="hourly-details">
        <summary>View solar elevation data</summary>
        <div className="hourly-table-wrap" tabIndex={0}>
          <table>
            <caption className="sr-only">
              {name} monthly peak solar elevation and azimuth at solar noon
              for 2026
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Peak elevation</th>
                <th scope="col">Noon azimuth</th>
              </tr>
            </thead>
            <tbody>
              {monthDayLabels.map(({ mon, day }, i) => {
                const pos = sunPosition(latitude, longitude, day, 12)
                return (
                  <tr key={i}>
                    <th scope="row">{mon}</th>
                    <td>{pos.elevation.toFixed(1)}&deg;</td>
                    <td>{pos.azimuth.toFixed(0)}&deg;</td>
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
