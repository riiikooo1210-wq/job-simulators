import { useMemo } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import WorkSurfaceFrame from '../components/layout/WorkSurfaceFrame'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import type { CommentQueueItem, CommentQueueNode } from '../types/game'

type Decision = 'reply' | 'skip_public_reply' | ''

interface SavedComment {
  id: string
  username: string
  commentText: string
  decision: Decision
  replyText: string
  handled: boolean
}

function savedFromComment(comment: CommentQueueItem, saved?: Partial<SavedComment>): SavedComment {
  return {
    id: comment.id,
    username: comment.username,
    commentText: comment.text,
    decision: saved?.decision === 'reply' || saved?.decision === 'skip_public_reply' ? saved.decision : '',
    replyText: typeof saved?.replyText === 'string' ? saved.replyText : '',
    handled: Boolean(saved?.handled),
  }
}

function parseState(raw: string | undefined, comments: CommentQueueItem[]): SavedComment[] {
  const saved = new Map<string, Partial<SavedComment>>()
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      const savedComments = Array.isArray(parsed.comments) ? parsed.comments : Array.isArray(parsed) ? parsed : []
      for (const item of savedComments) {
        if (item?.id) saved.set(item.id, item)
      }
    } catch {
      // start fresh
    }
  }
  return comments.map((comment) => savedFromComment(comment, saved.get(comment.id)))
}

function serializeState(comments: SavedComment[]) {
  return JSON.stringify({ comments }, null, 2)
}

export default function CommentQueueScene({ node }: { node: CommentQueueNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()

  const comments = useMemo(() => parseState(responses[node.bindingKey], node.comments), [responses, node.bindingKey, node.comments])
  const save = (next: SavedComment[]) => setFreeTextResponse(node.bindingKey, serializeState(next))
  const update = (id: string, patch: Partial<SavedComment>) => {
    save(comments.map((comment) => comment.id === id ? { ...comment, ...patch } : comment))
  }
  const chooseDecision = (id: string, decision: Decision) => {
    update(id, { decision, handled: decision === 'skip_public_reply', replyText: decision === 'reply' ? comments.find((c) => c.id === id)?.replyText ?? '' : '' })
  }
  const handledCount = comments.filter((comment) => (
    comment.decision === 'skip_public_reply'
      ? comment.handled
      : comment.decision === 'reply' && comment.handled && comment.replyText.trim().length > 0
  )).length
  const canSubmit = comments.length > 0 && handledCount === comments.length

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}

        <WorkSurfaceFrame
          node={{ ...node, workSurface: node.workSurface ?? { kind: 'comment_queue', device: 'desktop' } }}
          variant="slack"
          title={node.windowTitle ?? 'Comment queue'}
          width="82%"
          height="78%"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '250px minmax(0,1fr)', minHeight: 520, height: '100%', background: '#F7F1E3' }}>
            <aside style={{ borderRight: '1px solid #CDBF94', padding: '0.875rem', background: '#EFE8D2', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                {node.contextTitle || 'Thread context'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(node.contextNotes || []).map((note, idx) => (
                  <div key={idx} style={{ background: '#FBF7EA', border: '1px solid #CDBF94', borderRadius: 6, padding: '0.55rem', fontSize: '0.74rem', lineHeight: 1.45 }}>
                    {renderContentWithGlossary(interpolate(note, { playerName, branchFlags, mcSelections }))}
                  </div>
                ))}
                <div style={{ fontSize: '0.75rem', color: '#6A604B' }}>{handledCount}/{comments.length} comments handled</div>
              </div>
            </aside>
            <main style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
              {comments.map((comment) => (
                <article key={comment.id} style={{ background: '#FBF7EA', border: '1px solid #CDBF94', borderRadius: 8, padding: '0.75rem', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#B87D6B', color: '#F2EBD9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900 }}>
                        {comment.username.slice(0, 1).toUpperCase()}
                      </div>
                      <strong style={{ fontSize: '0.82rem' }}>@{comment.username}</strong>
                    </div>
                    <div style={{ fontSize: '0.86rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{comment.commentText}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      <button
                        onClick={() => chooseDecision(comment.id, 'reply')}
                        style={{ border: comment.decision === 'reply' ? '2px solid #3A6B5E' : '1px solid #CDBF94', background: comment.decision === 'reply' ? '#EFE8D2' : '#F7F1E3', borderRadius: 5, padding: '0.42rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800 }}
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => chooseDecision(comment.id, 'skip_public_reply')}
                        style={{ border: comment.decision === 'skip_public_reply' ? '2px solid #3A6B5E' : '1px solid #CDBF94', background: comment.decision === 'skip_public_reply' ? '#EFE8D2' : '#F7F1E3', borderRadius: 5, padding: '0.42rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800 }}
                      >
                        Skip
                      </button>
                    </div>
                    {comment.decision === 'reply' && (
                      <>
                        <textarea
                          value={comment.replyText}
                          onChange={(e) => update(comment.id, { replyText: e.target.value, handled: false })}
                          placeholder="Write the public reply..."
                          rows={3}
                          style={{ border: '1px solid #CDBF94', background: '#F7F1E3', borderRadius: 5, padding: '0.5rem', resize: 'vertical', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.78rem', lineHeight: 1.45 }}
                        />
                        <button
                          disabled={!comment.replyText.trim()}
                          onClick={() => update(comment.id, { handled: true })}
                          style={{ background: comment.replyText.trim() ? '#3A6B5E' : '#D2A39A', color: comment.replyText.trim() ? '#F2EBD9' : '#1E1E1A', border: '1px solid #1E1E1A', borderRadius: 5, padding: '0.42rem', cursor: comment.replyText.trim() ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: '0.74rem' }}
                        >
                          Mark reply ready
                        </button>
                      </>
                    )}
                    <div style={{ fontSize: '0.68rem', color: comment.handled ? '#3A6B5E' : '#7A7158', fontWeight: 800 }}>
                      {comment.handled ? 'Handled' : 'Needs action'}
                    </div>
                  </div>
                </article>
              ))}
              <ActionButton text="Submit" onClick={() => goNext(node)} disabled={!canSubmit} variant={canSubmit ? 'primary' : 'secondary'} />
              <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
            </main>
          </div>
        </WorkSurfaceFrame>
      </motion.div>
    </SceneWrapper>
  )
}
