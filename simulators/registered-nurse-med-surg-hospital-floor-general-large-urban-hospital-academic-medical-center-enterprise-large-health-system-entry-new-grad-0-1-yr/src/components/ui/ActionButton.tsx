import { useState } from 'react'

interface ActionButtonProps {
  text: string
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  fullWidth?: boolean
}

const variantStyles = {
  primary: {
    background: '#B87D6B',
    color: '#F2EBD9',
  },
  secondary: {
    background: '#F2EBD9',
    color: '#000000',
  },
  danger: {
    background: '#D2A39A',
    color: '#000000',
  },
}

export default function ActionButton({
  text,
  onClick,
  disabled = false,
  variant = 'primary',
  fullWidth = true,
}: ActionButtonProps) {
  const [pressed, setPressed] = useState(false)
  const style = variantStyles[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => !disabled && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        background: style.background,
        color: style.color,
        border: '1px solid #000000',
        boxShadow: pressed || disabled ? 'none' : '4px 4px 0 #000000',
        transform: pressed && !disabled ? 'translateY(4px) translateX(4px)' : 'none',
        borderRadius: '2px',
        fontWeight: 500,
        fontSize: '1rem',
        padding: '0.875rem 2rem',
        width: fullWidth ? '100%' : 'auto',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'box-shadow 0.1s ease-out, transform 0.1s ease-out',
        textAlign: 'center',
      }}
    >
      {text}
    </button>
  )
}
