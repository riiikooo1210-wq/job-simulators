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
  showChannelHeader?: boolean
  compact?: boolean
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
  showChannelHeader = true,
  compact = false,
}: SlackComposeProps) {
  const wordCount = maxWords ? countWords(value) : 0
  const overLimit = maxWords ? wordCount > maxWords : false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: compact ? undefined : '100%' }}>
      {/* Channel header */}
      {showChannelHeader && (
        <div
          style={{
            padding: '0.625rem 1rem',
            borderBottom: '1px solid #D8CFBE',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            backgroundColor: '#F7F1E3',
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
          padding: compact ? '0.5rem 1rem' : '0.75rem 1rem',
          borderTop: '1px solid #D8CFBE',
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
            rows={compact ? 1 : 5}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: compact ? '0.55rem 0.75rem' : '0.75rem',
              fontSize: '0.875rem',
              lineHeight: 1.6,
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
              padding: compact ? '0.25rem 0.75rem' : '0.375rem 0.75rem',
              backgroundColor: '#EFE8D2',
              borderTop: '1px solid #D8CFBE',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {maxWords && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: overLimit ? '#B87D6B' : '#6f6a60',
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
                backgroundColor: sendDisabled || disabled ? '#D2A39A' : '#3A6B5E',
                color: '#F7F1E3',
                border: 'none',
                borderRadius: '4px',
                padding: '0.375rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: sendDisabled || disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!sendDisabled && !disabled) e.currentTarget.style.backgroundColor = '#3A6B5E'
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
