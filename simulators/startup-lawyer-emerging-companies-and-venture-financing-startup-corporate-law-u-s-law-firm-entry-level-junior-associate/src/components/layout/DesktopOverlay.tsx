import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  width?: string
  height?: string
  laptopZoom?: number
  laptopOffsetX?: string
  windowScale?: number
}

const DEFAULT_WINDOW_WIDTH = '75%'
const DEFAULT_WINDOW_HEIGHT = '80%'

function scalePercent(value: string, scale: number) {
  const match = value.match(/^(-?\d+(?:\.\d+)?)%$/)
  if (!match || scale === 1) return value
  return `${Number(match[1]) * scale}%`
}

/** Laptop background with overlaid app window for computer-work scenes. */
export default function DesktopOverlay({
  children,
  width = DEFAULT_WINDOW_WIDTH,
  height = DEFAULT_WINDOW_HEIGHT,
  laptopZoom,
  laptopOffsetX,
  windowScale = 1,
}: Props) {
  const usesOriginalLaptopDisplay = laptopZoom === undefined && laptopOffsetX === undefined
  const resolvedLaptopZoom = usesOriginalLaptopDisplay ? 1.02 : laptopZoom ?? 1
  const resolvedLaptopOffsetX = usesOriginalLaptopDisplay ? '-1.2%' : laptopOffsetX ?? '0'
  const resolvedLaptopOffsetY = usesOriginalLaptopDisplay ? '-0.8%' : '0'
  const resolvedWidth = scalePercent(width, windowScale)
  const resolvedHeight = scalePercent(height, windowScale)
  const laptopTransform = [
    resolvedLaptopOffsetX !== '0' || resolvedLaptopOffsetY !== '0'
      ? `translate(${resolvedLaptopOffsetX}, ${resolvedLaptopOffsetY})`
      : '',
    resolvedLaptopZoom === 1 ? '' : `scale(${resolvedLaptopZoom})`,
  ].filter(Boolean).join(' ')

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
      <img
        src="/laptop.png"
        alt=""
        style={{
          width: '100%',
          display: 'block',
          transform: laptopTransform || undefined,
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
        <div
          style={{
            width: resolvedWidth,
            height: resolvedHeight,
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
