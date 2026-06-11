import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  width?: string
  height?: string
}

/** Desktop background with overlaid app window — use for any scene where the candidate does computer work. */
export default function DesktopOverlay({ children, width = '75%', height = '80%' }: Props) {
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
        src="/laptop.png"
        alt=""
        style={{
          width: '100%',
          display: 'block',
          transform: 'translate(-1.2%, -0.8%) scale(1.02)',
          transformOrigin: 'center 48%',
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
        }}
      >
        <div style={{ width, height, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
