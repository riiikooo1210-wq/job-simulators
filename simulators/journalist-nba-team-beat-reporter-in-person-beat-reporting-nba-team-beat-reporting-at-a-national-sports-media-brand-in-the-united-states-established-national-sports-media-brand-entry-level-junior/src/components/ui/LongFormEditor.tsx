import { useRef, useEffect } from 'react'

interface LongFormEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minRows?: number
  maxWords?: number
  label?: string
  disabled?: boolean
  variant?: 'default' | 'cms'
}

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

export default function LongFormEditor({
  value,
  onChange,
  placeholder = 'Type your response here...',
  minRows = 6,
  maxWords,
  label,
  disabled = false,
  variant = 'default',
}: LongFormEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const wordCount = countWords(value)
  const overLimit = maxWords ? wordCount > maxWords : false

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, minRows * 24)}px`
  }, [value, minRows])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      {label && (
        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#000' }}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={minRows}
        disabled={disabled}
        style={{
          width: '100%',
          backgroundColor: variant === 'cms' ? '#FFFFFF' : '#F2EBD9',
          border: `1px solid ${overLimit ? '#c0392b' : variant === 'cms' ? '#AEB9C4' : '#000000'}`,
          padding: variant === 'cms' ? '0.95rem 1rem' : '0.75rem',
          fontSize: variant === 'cms' ? '0.93rem' : '0.875rem',
          lineHeight: variant === 'cms' ? 1.65 : 1.7,
          fontFamily: variant === 'cms' ? 'Georgia, "Times New Roman", serif' : 'Inter, system-ui, sans-serif',
          resize: 'none',
          outline: 'none',
          borderRadius: variant === 'cms' ? 3 : 0,
          color: '#000',
          opacity: disabled ? 0.6 : 1,
          boxShadow: variant === 'cms' ? 'inset 0 1px 2px rgba(15, 23, 42, 0.08)' : 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.7rem', color: overLimit ? '#c0392b' : '#555' }}>
        {wordCount} word{wordCount !== 1 ? 's' : ''}
        {maxWords && ` / ${maxWords} max`}
      </div>
    </div>
  )
}

export { countWords }
