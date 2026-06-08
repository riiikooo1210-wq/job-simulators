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
}: SlackComposeProps) {
  const wordCount = maxWords ? countWords(value) : 0
  const overLimit = maxWords ? wordCount > maxWords : false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Channel header */}
      <div
        style={{
          padding: '0.625rem 1rem',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
        }}
      >
        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1d1c1d' }}>
          {channel}
        </span>
      </div>

      {/* Compose area */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid #e0e0e0',
        }}
      >
        <div
          style={{
            border: overLimit ? '2px solid #c0392b' : '1px solid #ccc',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            rows={5}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: '0.75rem',
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
              padding: '0.375rem 0.75rem',
              backgroundColor: '#f8f8f8',
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
                backgroundColor: sendDisabled || disabled ? '#9bb59b' : '#007a5a',
                color: '#fff',
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
                if (!sendDisabled && !disabled) e.currentTarget.style.backgroundColor = '#005e47'
              }}
              onMouseLeave={(e) => {
                if (!sendDisabled && !disabled) e.currentTarget.style.backgroundColor = '#007a5a'
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
