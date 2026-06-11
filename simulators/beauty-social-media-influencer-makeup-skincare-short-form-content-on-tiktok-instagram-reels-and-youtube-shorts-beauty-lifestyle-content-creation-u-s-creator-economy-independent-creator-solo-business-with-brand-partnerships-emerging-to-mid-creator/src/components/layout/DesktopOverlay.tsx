import type { CSSProperties, ReactNode } from 'react'

interface Props {
  children: ReactNode
  width?: string
  height?: string
  frameHeight?: string
  backgroundSrc?: string
  backgroundScale?: number
  backgroundObjectPosition?: string
  contentPaddingBottom?: string
  windowStyle?: CSSProperties
}

/** Desktop background with overlaid app window — use for any scene where the candidate does computer work. */
export default function DesktopOverlay({
  children,
  width = '70%',
  height = '74%',
  frameHeight,
  backgroundSrc = '/scenes/laptop.png',
  backgroundScale,
  backgroundObjectPosition,
  contentPaddingBottom = '5%',
  windowStyle,
}: Props) {
  const usesOriginalLaptopDisplay =
    backgroundSrc === '/scenes/laptop.png' &&
    frameHeight === undefined &&
    backgroundScale === undefined &&
    backgroundObjectPosition === undefined
  const resolvedBackgroundObjectPosition = backgroundObjectPosition ?? 'center'
  const resolvedBackgroundScale = usesOriginalLaptopDisplay ? 1.02 : backgroundScale ?? 1
  const backgroundTransform = usesOriginalLaptopDisplay
    ? 'translate(-1.2%, -0.8%) scale(1.02)'
    : resolvedBackgroundScale !== 1
      ? `scale(${resolvedBackgroundScale})`
      : undefined

  return (
    <div
      style={{
        position: 'relative',
        width: 'calc(100% + 6rem)',
        height: frameHeight,
        marginLeft: '-3rem',
        marginRight: '-3rem',
        borderTop: '1px solid #000',
        borderBottom: '1px solid #000',
        overflow: 'hidden',
      }}
    >
      <img
        src={backgroundSrc}
        alt=""
        style={{
          width: '100%',
          height: frameHeight ? '100%' : undefined,
          display: 'block',
          objectFit: frameHeight ? 'cover' : undefined,
          objectPosition: resolvedBackgroundObjectPosition,
          transform: backgroundTransform,
          transformOrigin: usesOriginalLaptopDisplay ? 'center 48%' : resolvedBackgroundObjectPosition,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: contentPaddingBottom,
        }}
      >
        <div style={{ width, height, display: 'flex', flexDirection: 'column', ...windowStyle }}>
          {children}
        </div>
      </div>
    </div>
  )
}
