export function isDevtoolsEnabled(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('devtools') === '1'
}
