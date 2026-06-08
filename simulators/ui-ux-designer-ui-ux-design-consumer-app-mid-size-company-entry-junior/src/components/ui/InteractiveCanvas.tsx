import { useState } from 'react'
import type { CanvasZone } from '../../types/game'

interface Props {
  imageUrl: string
  zones: CanvasZone[]
  visited: string[]
  onZoneTrigger: (zone: CanvasZone) => void
  alt?: string
}

export default function InteractiveCanvas({ imageUrl, zones, visited, onZoneTrigger, alt = '' }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        backgroundColor: '#E8DCC8',
        border: '1px solid #000',
        overflow: 'hidden',
      }}
    >
      <img
        src={imageUrl}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'cover',
          userSelect: 'none',
        }}
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.opacity = '0.2'
        }}
      />
      {zones.map((zone) => {
        const isVisited = visited.includes(zone.id)
        const isHovered = hoveredId === zone.id
        return (
          <button
            key={zone.id}
            onClick={() => onZoneTrigger(zone)}
            onMouseEnter={() => setHoveredId(zone.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              position: 'absolute',
              left: `${zone.xPct}%`,
              top: `${zone.yPct}%`,
              width: `${zone.wPct}%`,
              height: `${zone.hPct}%`,
              background: isHovered
                ? 'rgba(184,125,107,0.18)'
                : isVisited
                  ? 'rgba(58,107,94,0.10)'
                  : 'transparent',
              border: isHovered
                ? '2px dashed #B87D6B'
                : isVisited
                  ? '2px solid #3A6B5E'
                  : '2px dashed rgba(0,0,0,0.25)',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            aria-label={zone.label || zone.id}
          >
            {(isHovered || isVisited) && zone.label && (
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  background: isVisited ? '#3A6B5E' : '#B87D6B',
                  color: '#F2EBD9',
                  padding: '0.125rem 0.375rem',
                  border: '1px solid #000',
                  margin: '0.25rem',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {isVisited ? '✓ ' : ''}
                {zone.label}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
