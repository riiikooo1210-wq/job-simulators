import ActionButton from './ActionButton'

interface SecureChatComposeProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minWords?: number
  maxWords?: number
  wordCount: number
  senderName: string
  senderInitial: string
  sent: boolean
  sendDisabled?: boolean
  onSend: () => void
  onContinue: () => void
}

export default function SecureChatCompose({
  value,
  onChange,
  placeholder = 'Type a message...',
  minWords,
  maxWords,
  wordCount,
  senderName,
  senderInitial,
  sent,
  sendDisabled = false,
  onSend,
  onContinue,
}: SecureChatComposeProps) {
  const overLimit = maxWords ? wordCount > maxWords : false
  const underMinimum = minWords ? wordCount < minWords : false
  const showCounter = !!minWords || !!maxWords

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: '#F7F1E3',
      }}
    >
      <div
        style={{
          flex: sent ? '0 0 auto' : '0 0 1.35rem',
          minHeight: sent ? 110 : 22,
          padding: sent ? '1rem' : '0.25rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          background:
            'linear-gradient(180deg, rgba(239, 232, 210, 0.54), rgba(247, 241, 227, 0.96))',
        }}
      >
        {sent && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'flex-end',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                maxWidth: '74%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '0.25rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.68rem',
                  color: '#3F605C',
                  fontWeight: 700,
                }}
              >
                {senderName} - now
              </div>
              <div
                style={{
                  background: '#F7F1E3',
                  color: '#1E1E1A',
                  border: '2px solid #3A6B5E',
                  borderRadius: '8px 8px 2px 8px',
                  padding: '0.7rem 0.85rem',
                  fontSize: '0.86rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                }}
              >
                {value.trim()}
              </div>
            </div>
            <div
              aria-hidden="true"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: '1px solid #000000',
                background: '#B87D6B',
                color: '#F2EBD9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.78rem',
                fontWeight: 800,
                flex: '0 0 auto',
              }}
            >
              {senderInitial}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          flex: '0 0 auto',
          borderTop: '1px solid #000000',
          background: '#EFE8D2',
          padding: '0.75rem',
        }}
      >
        {!sent ? (
          <div
            style={{
              border: overLimit ? '2px solid #B87D6B' : '1px solid #000000',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#F7F1E3',
              boxShadow: '3px 3px 0 #000000',
            }}
          >
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              rows={2}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                resize: 'none',
                padding: '0.55rem 0.65rem',
                fontSize: '0.88rem',
                lineHeight: 1.42,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#1E1E1A',
                background: '#F7F1E3',
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                borderTop: '1px solid #D8C99F',
                padding: '0.35rem 0.5rem',
                background: '#F2EBD9',
              }}
            >
              <span
                style={{
                  minHeight: '1rem',
                  fontSize: '0.68rem',
                  color: overLimit || underMinimum ? '#7B3F33' : '#3F605C',
                  fontWeight: overLimit || underMinimum ? 800 : 600,
                }}
              >
                {showCounter && (
                  <>
                    {minWords ? `Min ${minWords}. ` : ''}
                    {maxWords ? `Max ${maxWords}. ` : ''}
                    {wordCount} word{wordCount === 1 ? '' : 's'}.
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={onSend}
                disabled={sendDisabled}
                style={{
                  background: sendDisabled ? '#D8C99F' : '#B87D6B',
                  color: sendDisabled ? '#3F605C' : '#F7F1E3',
                  border: '1px solid #000000',
                  borderRadius: 4,
                  padding: '0.34rem 0.8rem',
                  minWidth: 76,
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: sendDisabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ActionButton text="Continue" onClick={onContinue} fullWidth={false} />
          </div>
        )}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0 }} />
    </div>
  )
}
