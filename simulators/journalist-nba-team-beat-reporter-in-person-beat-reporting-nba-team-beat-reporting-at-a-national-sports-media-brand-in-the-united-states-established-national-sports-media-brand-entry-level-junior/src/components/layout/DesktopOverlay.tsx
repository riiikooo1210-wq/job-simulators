import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  width?: string
  height?: string
  fitToScreen?: boolean
}

/** Desktop background with overlaid app window — use for any scene where the candidate does computer work. */
export default function DesktopOverlay({ children, width, height, fitToScreen = false }: Props) {
  const contentWidth = fitToScreen ? width ?? '100%' : width ?? '75%'
  const contentHeight = fitToScreen ? height ?? '100%' : height ?? '80%'
  const shellWidth = fitToScreen ? 'calc(100vw - 0.5rem)' : 'calc(100% + 6rem)'
  const shellMargin = fitToScreen ? 'calc(50% - 50vw + 0.25rem)' : '-3rem'
  const overlayStyle = fitToScreen
    ? {
        position: 'absolute' as const,
        left: '8.2%',
        top: '7.2%',
        width: '83.6%',
        height: '84.8%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.35% 1.8% 2.05%',
        boxSizing: 'border-box' as const,
      }
    : {
        position: 'absolute' as const,
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: '3%',
      }

  return (
    <div
      className={fitToScreen ? 'desktop-overlay desktop-overlay--fit-to-screen' : 'desktop-overlay'}
      style={{
        position: 'relative',
        width: shellWidth,
        marginLeft: shellMargin,
        marginRight: shellMargin,
        borderTop: '1px solid #000',
        borderBottom: '1px solid #000',
        overflow: 'hidden',
      }}
    >
      <img
        className="desktop-overlay-image"
        src="/laptop.png"
        alt=""
        style={{
          width: '100%',
          display: 'block',
          transform: 'translate(-1.2%, -0.8%) scale(1.02)',
          transformOrigin: 'center 48%',
        }}
      />
      <div className="desktop-overlay-positioner" style={overlayStyle}>
        <div className="desktop-overlay-content" style={{ width: contentWidth, height: contentHeight, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
