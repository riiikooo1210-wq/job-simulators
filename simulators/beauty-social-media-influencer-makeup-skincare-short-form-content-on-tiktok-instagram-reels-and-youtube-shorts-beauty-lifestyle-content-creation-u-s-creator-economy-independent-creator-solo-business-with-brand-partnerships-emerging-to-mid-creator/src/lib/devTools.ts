const queryDevTools =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('devtools') === '1'

export const showDevTools =
  import.meta.env.VITE_SHOW_DEV_TOOLS === 'true' ||
  (import.meta.env.DEV && queryDevTools)
