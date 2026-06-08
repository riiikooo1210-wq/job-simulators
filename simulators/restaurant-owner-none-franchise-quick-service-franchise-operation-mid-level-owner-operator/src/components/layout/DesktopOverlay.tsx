import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  width?: string
  height?: string
}

/** Tablet background with overlaid app window — use for any scene where the candidate does computer work. */
export default function DesktopOverlay({ children, width = '70%', height = '86%' }: Props) {
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
      }}
    >
      <img
        src="/tablet.png"
        alt=""
        style={{
          width: '100%',
          display: 'block',
          transform: 'translateY(-2%) scale(1.2)',
          transformOrigin: 'center center',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: '3%',
          transform: 'translateY(2%)',
        }}
      >
        <div style={{ width, height, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
