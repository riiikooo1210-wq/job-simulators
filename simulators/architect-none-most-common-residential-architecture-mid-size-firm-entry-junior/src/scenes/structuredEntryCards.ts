export interface StructuredEntryCardSource {
  ref?: string
  title: string
  body: string
  status?: string
  originalRedline?: {
    ref?: string
    title: string
    body: string
    status?: string
  }
}

export interface StructuredEntryCardThreadEntry {
  kind: 'redline' | 'reply'
  label: 'Original redline' | 'Reply'
  ref?: string
  title: string
  body: string
  status?: string
}

export const VERIFY_REPLY_THREAD_COLORS = {
  largeBackground: '#F7F1E3',
  largeBorder: '#CDBF94',
  redlineBackground: '#FBF7EA',
  redlineBorder: '#D7CDBA',
  replyBackground: '#F2EBD9',
  replyBorder: '#CDBF94',
  connector: '#D7CDBA',
} as const

export function buildStructuredEntryCardThread(card: StructuredEntryCardSource): StructuredEntryCardThreadEntry[] {
  const reply: StructuredEntryCardThreadEntry = {
    kind: 'reply',
    label: 'Reply',
    ref: card.ref,
    title: card.title,
    body: card.body,
    status: card.status,
  }

  if (!card.originalRedline) return [reply]

  return [
    {
      kind: 'redline',
      label: 'Original redline',
      ref: card.originalRedline.ref,
      title: card.originalRedline.title,
      body: card.originalRedline.body,
      status: card.originalRedline.status,
    },
    reply,
  ]
}

export function hasOriginalRedlineThread(card: StructuredEntryCardSource): boolean {
  return Boolean(card.originalRedline)
}
