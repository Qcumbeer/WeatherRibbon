import { useMemo } from 'react'
import { CityIndex } from './CityIndex'
import { CityView } from './CityView'
import { type CityRef } from './dataService'
import { useHashRoute } from './useHashRoute'
import { routeToCity } from './router'
import './App.css'

function App() {
  const [route, navigate] = useHashRoute()

  const city = useMemo<CityRef | null>(() => routeToCity(route), [route])

  return (
    <div className="shell">
      <header className="header">
        <a
          className="brand"
          href="#/"
          onClick={(e) => {
            e.preventDefault()
            navigate({ view: 'index', query: '' })
          }}
        >
          Weatherfork
        </a>
        {city && (
          <a
            className="header-back"
            href={city ? '#/' : undefined}
            onClick={(e) => {
              e.preventDefault()
              navigate({ view: 'index', query: '' })
            }}
          >
            ← All cities
          </a>
        )}
      </header>

      <main className="main">
        {route.view === 'index' ? (
          <CityIndex
            query={route.query}
            onQueryChange={(q) => navigate({ view: 'index', query: q })}
            onNavigate={(hash) => {
              window.location.hash = hash
            }}
          />
        ) : city ? (
          <CityView
            key={`${city.latitude.toFixed(2)},${city.longitude.toFixed(2)}`}
            city={city}
            onBack={() => navigate({ view: 'index', query: '' })}
          />
        ) : (
          <article className="card muted">
            <h1>City not found</h1>
            <p>
              That city link is not available.{' '}
              <a
                href="#/"
                onClick={(e) => {
                  e.preventDefault()
                  navigate({ view: 'index', query: '' })
                }}
              >
                Browse all cities
              </a>
            </p>
          </article>
        )}
      </main>
    </div>
  )
}

export default App
