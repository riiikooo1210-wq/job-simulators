import { useEffect, useState } from 'react'

export function useNarrowViewport(maxWidth = 720) {
  const getMatches = () =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(max-width: ${maxWidth}px)`).matches
      : false

  const [matches, setMatches] = useState(getMatches)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia(`(max-width: ${maxWidth}px)`)
    const update = () => setMatches(media.matches)

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [maxWidth])

  return matches
}
