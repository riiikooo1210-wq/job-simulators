import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  width?: string
  height?: string
}

/** Laptop background with overlaid app window for computer-work scenes. */
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
        background: '#E8DCC8',
        overflow: 'hidden',
      }}
    >
      <img src="/laptop.png" alt="" style={{ width: '100%', display: 'block' }} />
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
        <div
          style={{
            width,
            height,
            maxWidth: '100%',
            maxHeight: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
