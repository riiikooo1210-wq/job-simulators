const queryDevTools =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('devtools') === '1'

export const showDevControls =
  import.meta.env.VITE_SHOW_DEV_CONTROLS === 'true' ||
  import.meta.env.VITE_SHOW_DEV_TOOLS === 'true' ||
  (import.meta.env.DEV && queryDevTools)
