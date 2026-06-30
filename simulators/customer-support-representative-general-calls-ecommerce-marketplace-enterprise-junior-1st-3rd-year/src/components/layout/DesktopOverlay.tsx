import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  width?: string
  height?: string
  screenRect?: Partial<ScreenRect>
}

interface ScreenRect {
  left: string
  top: string
  width: string
  height: string
}

const defaultScreenRect: ScreenRect = {
  left: '11.5%',
  top: '7%',
  width: '77%',
  height: '80%',
}

/** Desktop background with the app window placed inside the illustrated monitor screen. */
export default function DesktopOverlay({
  children,
  width = '96%',
  height = '92%',
  screenRect,
}: Props) {
  const resolvedScreenRect = { ...defaultScreenRect, ...screenRect }

  return (
    <div
      className="desktop-overlay"
      style={{
        position: 'relative',
        width: 'calc(100% + 6rem)',
        marginLeft: '-3rem',
        marginRight: '-3rem',
        borderTop: '1px solid #000',
        borderBottom: '1px solid #000',
        overflow: 'hidden',
      }}
    >
      <div
        className="desktop-overlay__stage"
        style={{
          position: 'relative',
          width: '100%',
        }}
      >
        <img className="desktop-overlay__image" src="/desktop.jpg" alt="" style={{ width: '100%', display: 'block' }} />
        <div
          className="desktop-overlay__screen"
          style={{
            position: 'absolute',
            left: resolvedScreenRect.left,
            top: resolvedScreenRect.top,
            width: resolvedScreenRect.width,
            height: resolvedScreenRect.height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: '2.3%',
          }}
        >
          <div
            className="desktop-overlay__content"
            style={{ width, height, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
