import { countWords } from './LongFormEditor'

interface SlackComposeProps {
  channel: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxWords?: number
  disabled?: boolean
  onSend: () => void
  sendDisabled?: boolean
  showHeader?: boolean
  rows?: number
}

export default function SlackCompose({
  channel,
  value,
  onChange,
  placeholder = 'Type a message...',
  maxWords,
  disabled = false,
  onSend,
  sendDisabled = false,
  showHeader = true,
  rows = 5,
}: SlackComposeProps) {
  const wordCount = maxWords ? countWords(value) : 0
  const overLimit = maxWords ? wordCount > maxWords : false
  const compact = !showHeader

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: compact ? 'auto' : '100%', flexShrink: compact ? 0 : undefined }}>
      {showHeader && (
        <div
          style={{
            padding: '0.625rem 1rem',
            borderBottom: '1px solid #CDBF94',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            backgroundColor: '#EFE8D2',
          }}
        >
          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1d1c1d' }}>
            {channel}
          </span>
        </div>
      )}

      {/* Compose area */}
      <div
        style={{
          padding: compact ? '0.4rem 0.65rem' : '0.75rem 1rem',
          borderTop: '1px solid #CDBF94',
          backgroundColor: '#F7F1E3',
        }}
      >
        <div
          style={{
          border: overLimit ? '2px solid #B87D6B' : '1px solid #CDBF94',
          borderRadius: '6px',
          overflow: 'hidden',
          backgroundColor: '#F7F1E3',
        }}
      >
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: compact ? '0.45rem 0.55rem' : '0.75rem',
              fontSize: compact ? '0.78rem' : '0.875rem',
              lineHeight: compact ? 1.35 : 1.6,
              fontFamily: 'Inter, system-ui, sans-serif',
              color: '#1d1c1d',
              backgroundColor: disabled ? '#EDE5D3' : '#F7F1E3',
              opacity: disabled ? 0.6 : 1,
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: compact ? '0.25rem 0.55rem' : '0.375rem 0.75rem',
              backgroundColor: '#EFE8D2',
              borderTop: '1px solid #CDBF94',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {maxWords && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: overLimit ? '#c0392b' : '#999',
                    fontWeight: overLimit ? 600 : 400,
                  }}
                >
                  {wordCount}/{maxWords} words
                </span>
              )}
            </div>
            <button
              onClick={onSend}
              disabled={sendDisabled || disabled}
              style={{
                backgroundColor: sendDisabled || disabled ? '#DCE6D2' : '#3A6B5E',
                color: sendDisabled || disabled ? '#6f6758' : '#F7F1E3',
                border: '1px solid #000',
                borderRadius: '4px',
                padding: compact ? '0.25rem 0.8rem' : '0.375rem 1rem',
                fontSize: compact ? '0.74rem' : '0.8125rem',
                fontWeight: 700,
                cursor: sendDisabled || disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!sendDisabled && !disabled) e.currentTarget.style.backgroundColor = '#315D50'
              }}
              onMouseLeave={(e) => {
                if (!sendDisabled && !disabled) e.currentTarget.style.backgroundColor = '#3A6B5E'
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
