import { useRef, useEffect } from 'react'

interface LongFormEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minRows?: number
  maxWords?: number
  label?: string
  disabled?: boolean
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
          backgroundColor: '#F2EBD9',
          border: `1px solid ${overLimit ? '#c0392b' : '#000000'}`,
          padding: '0.75rem',
          fontSize: '0.875rem',
          lineHeight: 1.7,
          fontFamily: 'Inter, system-ui, sans-serif',
          resize: 'none',
          outline: 'none',
          borderRadius: 0,
          color: '#000',
          opacity: disabled ? 0.6 : 1,
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
