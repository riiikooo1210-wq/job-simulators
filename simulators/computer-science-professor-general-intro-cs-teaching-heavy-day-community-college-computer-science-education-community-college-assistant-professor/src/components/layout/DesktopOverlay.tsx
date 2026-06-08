import { useState, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  width?: string
  height?: string
  backgroundSrc?: string
  fallbackSrc?: string
}

/** Laptop/desktop background with overlaid app window for computer-work scenes. */
export default function DesktopOverlay({
  children,
  width = '75%',
  height = '80%',
  backgroundSrc = '/desktop.jpg',
  fallbackSrc = '/desktop.jpg',
}: Props) {
  const [src, setSrc] = useState(backgroundSrc)

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
        src={src}
        alt=""
        style={{ width: '100%', display: 'block' }}
        onError={() => {
          if (src !== fallbackSrc) setSrc(fallbackSrc)
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
