import { bySlug, type CityRef } from './cities.ts'

export type Route =
  | { view: 'index'; query: string }
  | { view: 'city'; slug: string }

const CITY_RE = /^\/city\/(.+)$/

export function parseHash(hash: string): Route {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  if (!h || h === '/' || h === '') {
    return { view: 'index', query: '' }
  }
  const cityMatch = h.match(CITY_RE)
  if (cityMatch) {
    const rest = cityMatch[1]
    const qIndex = rest.indexOf('?')
    const path = qIndex >= 0 ? rest.slice(0, qIndex) : rest
    return { view: 'city', slug: decodeURIComponent(path) }
  }
  if (h.startsWith('/?') || h.startsWith('?')) {
    const params = new URLSearchParams(h.split('?')[1] || '')
    return { view: 'index', query: params.get('q') ?? '' }
  }
  if (h.startsWith('/search')) {
    const params = new URLSearchParams(h.split('?')[1] || '')
    return { view: 'index', query: params.get('q') ?? '' }
  }
  return { view: 'index', query: '' }
}

export function serializeRoute(route: Route): string {
  if (route.view === 'index') {
    if (!route.query) return '#/'
    return `#/?q=${encodeURIComponent(route.query)}`
  }
  return `#/city/${route.slug}`
}

export function routeToCity(route: Route): CityRef | null {
  if (route.view !== 'city') return null
  return bySlug.get(route.slug) ?? null
}
