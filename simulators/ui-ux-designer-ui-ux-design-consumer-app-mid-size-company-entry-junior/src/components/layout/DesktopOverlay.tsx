import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  width?: string
  height?: string
  minHeight?: string
  contentBounds?: {
    left: string
    top: string
    width: string
    height: string
  }
  backgroundScale?: number
}

/** Desktop background with overlaid app window — use for any scene where the candidate does computer work. */
export default function DesktopOverlay({
  children,
  width = '75%',
  height = '80%',
  minHeight,
  contentBounds,
  backgroundScale = 1,
}: Props) {
  const contentStyle = contentBounds
    ? {
        position: 'absolute' as const,
        left: contentBounds.left,
        top: contentBounds.top,
        width: contentBounds.width,
        height: contentBounds.height,
        display: 'flex',
        flexDirection: 'column' as const,
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
      style={{
        position: 'relative',
        width: 'calc(100% + 6rem)',
        marginLeft: '-3rem',
        marginRight: '-3rem',
	        borderTop: '1px solid #000',
	        borderBottom: '1px solid #000',
	        overflow: 'hidden',
	        minHeight,
	        backgroundColor: minHeight ? '#E8DCC8' : undefined,
	      }}
    >
      <img
        src="/desktop.jpg"
        alt=""
        style={{
          width: '100%',
          display: 'block',
          transform: backgroundScale === 1 ? undefined : `scale(${backgroundScale})`,
          transformOrigin: '50% 50%',
        }}
      />
      <div style={contentStyle}>
        <div style={{ width: contentBounds ? '100%' : width, height: contentBounds ? '100%' : height, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
