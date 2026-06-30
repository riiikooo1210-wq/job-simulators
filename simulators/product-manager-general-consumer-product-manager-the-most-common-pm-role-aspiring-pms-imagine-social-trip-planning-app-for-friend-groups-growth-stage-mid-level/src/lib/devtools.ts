export function devtoolsEnabled() {
  if (!import.meta.env?.DEV) return false
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('devtools') === '1'
}
