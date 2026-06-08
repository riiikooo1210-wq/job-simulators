import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import LaptopFrame from '../components/ui/LaptopFrame'
import ActionButton from '../components/ui/ActionButton'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { showDevTools } from '../lib/devTools'
import { BriefingDrawerContent } from './BriefingScene'
import type { CommentQueueItem, CommentQueueNode } from '../types/game'

type CommentDecision = 'reply' | 'skip_public_reply' | ''

interface SavedComment {
  id: string
  username: string
  commentText: string
  decision: CommentDecision
  replyText: string
  handled: boolean
}

interface SavedQueue {
  comments: SavedComment[]
}

const emptyDecision: Pick<SavedComment, 'decision' | 'replyText' | 'handled'> = {
  decision: '',
  replyText: '',
  handled: false,
}

function buildSavedComment(comment: CommentQueueItem, saved?: Partial<SavedComment>): SavedComment {
  return {
    id: comment.id,
    username: comment.username,
    commentText: comment.text,
    decision: saved?.decision === 'reply' || saved?.decision === 'skip_public_reply' ? saved.decision : '',
    replyText: typeof saved?.replyText === 'string' ? saved.replyText : '',
    handled: Boolean(saved?.handled),
  }
}

function parseQueueState(raw: string | undefined, comments: CommentQueueItem[]): SavedQueue {
  const savedById = new Map<string, Partial<SavedComment>>()

  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      const savedComments = Array.isArray(parsed?.comments) ? parsed.comments : Array.isArray(parsed) ? parsed : []
      for (const saved of savedComments) {
        if (saved && typeof saved.id === 'string') savedById.set(saved.id, saved)
      }
    } catch {
      // fall through to a clean queue
    }
  }

  return {
    comments: comments.map((comment) => buildSavedComment(comment, savedById.get(comment.id))),
  }
}

function serializeQueue(comments: SavedComment[]): string {
  return JSON.stringify({ comments }, null, 2)
}

function statusLabel(comment: SavedComment): string {
  if (!comment.decision) return 'Needs decision'
  if (comment.decision === 'skip_public_reply') return 'Skipped publicly'
  if (comment.handled && comment.replyText.trim()) return 'Reply ready'
  return 'Draft reply'
}

function decisionLabel(decision: CommentDecision): string {
  if (decision === 'skip_public_reply') return 'Skip public reply'
  if (decision === 'reply') return 'Reply'
  return 'No decision'
}

export default function CommentQueueScene({ node }: { node: CommentQueueNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)

  const queue = useMemo(
    () => parseQueueState(responses[node.bindingKey], node.comments),
    [responses, node.bindingKey, node.comments]
  )

  const saveComments = (nextComments: SavedComment[]) => {
    setFreeTextResponse(node.bindingKey, serializeQueue(nextComments))
  }

  const updateComment = (commentId: string, patch: Partial<SavedComment>) => {
    saveComments(
      queue.comments.map((comment) => (
        comment.id === commentId
          ? {
              ...comment,
              ...patch,
              username: comment.username,
              commentText: comment.commentText,
            }
          : comment
      ))
    )
  }

  const chooseDecision = (commentId: string, decision: CommentDecision) => {
    const current = queue.comments.find((comment) => comment.id === commentId)
    if (!current) return
    updateComment(commentId, {
      ...emptyDecision,
      decision,
      replyText: decision === 'reply' ? current.replyText : '',
      handled: decision === 'skip_public_reply',
    })
  }

  const updateReplyText = (commentId: string, replyText: string) => {
    updateComment(commentId, { replyText, handled: false })
  }

  const sendReply = (commentId: string) => {
    const current = queue.comments.find((comment) => comment.id === commentId)
    if (!current || !current.replyText.trim()) return
    updateComment(commentId, { handled: true })
  }

  const handledCount = queue.comments.filter((comment) => {
    if (comment.decision === 'skip_public_reply') return comment.handled
    return comment.decision === 'reply' && comment.handled && comment.replyText.trim().length > 0
  }).length
  const canSubmit = handledCount === queue.comments.length

  const completeForDev = () => {
    saveComments(node.comments.map((comment) => {
      const replies: Record<string, Partial<SavedComment>> = {
        receiptplease: {
          decision: 'reply',
          replyText: 'LumaVeil sent the tint as gifted PR, but this video was not paid and there was no required post. The concealer and blush were products I bought myself.',
          handled: true,
        },
        spfbase: {
          decision: 'reply',
          replyText: 'I only tested it on my normal base yesterday, not layered over sunscreen yet. I do not want to claim it passes an SPF layering test until I actually film that.',
          handled: true,
        },
        softglam_sam: {
          decision: 'reply',
          replyText: 'Thank you. The close-up texture shot is exactly what I want to keep doing, especially when PR products look prettier in soft lighting.',
          handled: true,
        },
        shadecheck: {
          decision: 'reply',
          replyText: 'I saw slight creasing around my nose after about four hours, but I did not test it for a full day. I would call this a first wear note, not a final wear-test verdict.',
          handled: true,
        },
        truthbomb: {
          decision: 'skip_public_reply',
          replyText: '',
          handled: true,
        },
        brandwatcher: {
          decision: 'reply',
          replyText: 'Fair question. This one was gifted PR, not a paid post, and LumaVeil did not approve the review. I still should have made the PR note clearer in the caption.',
          handled: true,
        },
      }
      return buildSavedComment(comment, replies[comment.id])
    }))
    goNext(node)
  }

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration={Boolean(node.illustration)}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
          {briefing && <ReferenceButton onClick={() => setRefOpen(true)} label="View Briefing" />}
        </div>

        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}

        <DesktopOverlay width="68%" height="72%">
          <LaptopFrame variant="doc" title={node.windowTitle ?? node.title} fill scrollable>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem',
                  borderBottom: '1px solid #D8CAB3',
                  paddingBottom: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
                    Audience comment queue
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#5E5549', marginTop: '0.2rem' }}>
                    These are comments on yesterday's LumaVeil video.
                  </div>
                </div>
                <div
                  style={{
                    border: '1px solid #3A6B5E',
                    backgroundColor: '#E8DCC8',
                    color: '#1F3D36',
                    padding: '0.35rem 0.55rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {handledCount}/{queue.comments.length} handled
                </div>
              </div>

              {(node.contextTitle || node.contextNotes?.length) && (
                <div
                  style={{
                    backgroundColor: '#EFE8D2',
                    border: '1px solid #CDBDA5',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
                    {node.contextTitle ?? 'Context for replies'}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {(node.contextNotes ?? []).map((note) => (
                      <li key={note} style={{ fontSize: '0.76rem', lineHeight: 1.45, color: '#2D2924' }}>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {queue.comments.map((comment) => {
                const replyIsReady = comment.decision === 'reply' && comment.replyText.trim().length > 0
                return (
                  <div
                    key={comment.id}
                    style={{
                      border: '1px solid #000',
                      boxShadow: '3px 3px 0 #000',
                      backgroundColor: '#F7F1E3',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.625rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1F1A17' }}>{comment.username}</span>
                        </div>
                        <p style={{ fontSize: '0.88rem', lineHeight: 1.45, color: '#211C18', marginTop: '0.35rem' }}>
                          {comment.commentText}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(['reply', 'skip_public_reply'] as CommentDecision[]).map((decision) => {
                        const active = comment.decision === decision
                        return (
                          <button
                            key={decision}
                            onClick={() => chooseDecision(comment.id, decision)}
                            style={{
                              border: '1px solid #000',
                              boxShadow: active ? 'inset 2px 2px 0 rgba(0,0,0,0.18)' : '2px 2px 0 #000',
                              backgroundColor: active ? '#3A6B5E' : '#F2EBD9',
                              color: active ? '#F7F1E3' : '#000',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.45rem 0.65rem',
                              fontFamily: 'Inter, system-ui, sans-serif',
                            }}
                          >
                            {decisionLabel(decision)}
                          </button>
                        )
                      })}
                    </div>

                    {comment.decision === 'reply' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <textarea
                          value={comment.replyText}
                          onChange={(e) => updateReplyText(comment.id, e.target.value)}
                          placeholder="Write the public reply you would send..."
                          rows={3}
                          style={{
                            padding: '0.55rem 0.65rem',
                            fontSize: '0.82rem',
                            lineHeight: 1.45,
                            fontFamily: 'Inter, system-ui, sans-serif',
                            border: '1px solid #000',
                            backgroundColor: '#FFFFFF',
                            color: '#000',
                            outline: 'none',
                            resize: 'vertical',
                          }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.7rem', color: replyIsReady ? '#3A6B5E' : '#B87D6B', fontWeight: 700 }}>
                            {comment.handled && replyIsReady ? 'Reply saved. Edit if needed before submitting.' : 'Send the reply to mark this comment handled.'}
                          </span>
                          <button
                            onClick={() => sendReply(comment.id)}
                            disabled={!replyIsReady}
                            style={{
                              border: '1px solid #000',
                              boxShadow: replyIsReady ? '2px 2px 0 #000' : 'none',
                              backgroundColor: replyIsReady ? '#B87D6B' : '#EFE8D2',
                              color: replyIsReady ? '#F7F1E3' : '#7B7168',
                              cursor: replyIsReady ? 'pointer' : 'not-allowed',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              padding: '0.45rem 0.75rem',
                              fontFamily: 'Inter, system-ui, sans-serif',
                            }}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}

                    {comment.decision === 'skip_public_reply' && (
                      <div style={{ fontSize: '0.76rem', color: '#5E5549', lineHeight: 1.45 }}>
                        No public reply will be sent for this comment. You can still switch to Reply before submitting.
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', borderTop: '1px solid #E1D4BE', paddingTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.68rem', color: '#6C6258', textTransform: 'uppercase', fontWeight: 800 }}>
                        {statusLabel(comment)}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#6C6258' }}>
                        {decisionLabel(comment.decision)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </LaptopFrame>
        </DesktopOverlay>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <ActionButton
            text="Submit Comment Decisions"
            onClick={() => goNext(node)}
            disabled={!canSubmit}
            variant={canSubmit ? 'primary' : 'secondary'}
          />
          {showDevTools && (
            <ActionButton text="Skip with sample comments (dev)" onClick={completeForDev} variant="secondary" fullWidth={false} />
          )}
        </div>
      </motion.div>

      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
