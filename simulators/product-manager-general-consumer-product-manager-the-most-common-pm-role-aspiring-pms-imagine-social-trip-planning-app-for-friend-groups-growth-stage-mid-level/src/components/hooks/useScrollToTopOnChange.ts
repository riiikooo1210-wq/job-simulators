import { useEffect } from 'react'

/**
 * Reset scroll position to the very top whenever `key` changes.
 * Temporarily disables `scroll-behavior: smooth` so the jump is instant,
 * then resets every scrollable container (window, html, body, ancestors).
 */
export function useScrollToTopOnChange(key: unknown) {
  useEffect(() => {
    const html = document.documentElement
    const prevBehavior = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto'

    const jumpToTop = () => {
      window.scrollTo(0, 0)
      html.scrollTop = 0
      document.body.scrollTop = 0
      document.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if (el.scrollTop > 0) {
          const overflowY = window.getComputedStyle(el).overflowY
          if (overflowY === 'auto' || overflowY === 'scroll') {
            el.scrollTop = 0
          }
        }
      })
    }

    jumpToTop()
    const r1 = requestAnimationFrame(jumpToTop)
    const t1 = window.setTimeout(() => {
      jumpToTop()
      html.style.scrollBehavior = prevBehavior
    }, 50)

    return () => {
      cancelAnimationFrame(r1)
      window.clearTimeout(t1)
      html.style.scrollBehavior = prevBehavior
    }
  }, [key])
}
