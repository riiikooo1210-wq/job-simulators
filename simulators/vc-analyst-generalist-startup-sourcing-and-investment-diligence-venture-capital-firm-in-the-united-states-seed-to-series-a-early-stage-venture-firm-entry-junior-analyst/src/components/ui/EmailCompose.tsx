import { countWords } from './LongFormEditor'

interface EmailComposeProps {
  to: string
  from: string
  subject: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minWords?: number
  maxWords?: number
  disabled?: boolean
  onSend: () => void
  sendDisabled?: boolean
  compact?: boolean
}

export default function EmailCompose({
  to,
  from,
  subject,
  value,
  onChange,
  placeholder = 'Compose your email…',
  minWords,
  maxWords,
  disabled = false,
  onSend,
  sendDisabled = false,
  compact = false,
}: EmailComposeProps) {
  const windowCream = '#F7F1E3'
  const wordCount = minWords || maxWords ? countWords(value) : 0
  const overLimit = maxWords ? wordCount > maxWords : false
  const underMinimum = minWords ? wordCount < minWords : false

  const HeaderRow = ({ label, val }: { label: string; val: string }) => (
    <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', padding: compact ? '0.25rem 0.5rem' : '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
      <span style={{ width: compact ? '54px' : '64px', color: '#6B7280', fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#111827' }}>{val}</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, backgroundColor: windowCream }}>
      <HeaderRow label="From" val={from} />
      <HeaderRow label="To" val={to} />
      <HeaderRow label="Subject" val={subject} />

      <div
        style={{
          padding: compact ? '0.35rem 0.4rem 0.4rem' : '0.75rem',
          borderTop: '1px solid #E5E7EB',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div
          style={{
            border: overLimit ? '2px solid #C0392B' : '1px solid #D1D5DB',
            borderRadius: '4px',
            overflow: 'hidden',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            rows={8}
            style={{
              width: '100%',
              flex: 1,
              minHeight: 0,
              border: 'none',
              outline: 'none',
              resize: 'none',
              overflowY: 'auto',
              boxSizing: 'border-box',
              padding: compact ? '0.5rem 0.55rem' : '0.75rem',
              fontSize: '0.875rem',
              lineHeight: 1.6,
              fontFamily: 'Inter, system-ui, sans-serif',
              color: '#111827',
              backgroundColor: disabled ? '#EFE8D2' : windowCream,
              opacity: disabled ? 0.6 : 1,
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              padding: compact ? '0.25rem 0.45rem' : '0.375rem 0.75rem',
              backgroundColor: windowCream,
              borderTop: '1px solid #E5E7EB',
            }}
          >
            <div style={{ minWidth: 0 }}>
              {(minWords || maxWords) && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: overLimit ? '#C0392B' : underMinimum ? '#7A6B52' : '#3A6B5E',
                    fontWeight: overLimit || underMinimum ? 600 : 400,
                    lineHeight: 1.35,
                  }}
                >
                  {minWords ? `Min ${minWords} words. ` : ''}
                  {maxWords ? `Max ${maxWords} words. ` : ''}
                  Currently {wordCount} word{wordCount === 1 ? '' : 's'}.
                </span>
              )}
            </div>
            <button
              onClick={onSend}
              disabled={sendDisabled || disabled}
              style={{
                backgroundColor: sendDisabled || disabled ? '#D2A39A' : '#3A6B5E',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                padding: '0.375rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: sendDisabled || disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
