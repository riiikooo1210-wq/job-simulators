import type { ReactNode } from 'react'

interface MaterialSectionProps {
  title: string
  children: ReactNode
}

export default function MaterialSection({ title, children }: MaterialSectionProps) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          borderBottom: '1px solid #CDBF94',
          paddingBottom: '0.35rem',
        }}
      >
        <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
          {title}
        </span>
      </div>
      {children}
    </section>
  )
}
