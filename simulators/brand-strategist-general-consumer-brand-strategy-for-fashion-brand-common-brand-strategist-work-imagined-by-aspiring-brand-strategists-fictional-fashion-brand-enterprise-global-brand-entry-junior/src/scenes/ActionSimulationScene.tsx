import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import type { ActionSimulationNode, ActionSimulationStep } from '../types/game'

interface Props { node: ActionSimulationNode }

interface ActionState {
  selectedObjects: string[]
  placements: Record<string, string>
  completedSteps: string[]
  warnings: string[]
}

const initialState: ActionState = { selectedObjects: [], placements: {}, completedSteps: [], warnings: [] }

function parseState(raw: string | undefined): ActionState {
  if (!raw) return initialState
  try {
    const parsed = JSON.parse(raw)
    return {
      selectedObjects: Array.isArray(parsed.selectedObjects) ? parsed.selectedObjects : [],
      placements: parsed.placements && typeof parsed.placements === 'object' ? parsed.placements : {},
      completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    }
  } catch {
    return initialState
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function missing(required: string[] | undefined, completed: string[]) {
  return (required || []).filter((id) => !completed.includes(id))
}

export default function ActionSimulationScene({ node }: Props) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const state = useMemo(() => parseState(responses[node.id]), [responses, node.id])
  const context = { playerName, branchFlags, mcSelections }

  const save = (next: ActionState) => {
    setFreeTextResponse(node.id, JSON.stringify({
      simulatedAction: node.simulatedAction,
      digitalPrimitives: node.digitalPrimitives,
      selectedObjects: next.selectedObjects,
      placements: next.placements,
      completedSteps: next.completedSteps,
      warnings: next.warnings,
    }, null, 2))
  }

  const selectObject = (id: string) => {
    if (state.selectedObjects.includes(id)) return
    save({ ...state, selectedObjects: [...state.selectedObjects, id] })
  }

  const placeObject = (objectId: string, targetId: string) => {
    const target = node.dropTargets?.find((t) => t.id === targetId)
    if (target?.accepts?.length && !target.accepts.includes(objectId)) {
      save({
        ...state,
        warnings: unique([...state.warnings, `${objectId} does not belong on ${target.label}.`]),
      })
      return
    }
    save({
      ...state,
      selectedObjects: unique([...state.selectedObjects, objectId]),
      placements: { ...state.placements, [objectId]: targetId },
    })
  }

  const completeStep = (step: ActionSimulationStep) => {
    if (state.completedSteps.includes(step.id)) return
    const missingSteps = missing(step.requiresSteps, state.completedSteps)
    const missingObjects = missing(step.requiresObjects, state.selectedObjects)
    if (missingSteps.length || missingObjects.length) {
      const issue = step.failureHint || `Complete prerequisites first: ${[...missingSteps, ...missingObjects].join(', ')}.`
      save({ ...state, warnings: unique([...state.warnings, issue]) })
      return
    }
    save({ ...state, completedSteps: [...state.completedSteps, step.id] })
  }

  const requiredObjects = node.requiredObjectIds || node.interactiveObjects?.filter((o) => o.required).map((o) => o.id) || []
  const requiredSteps = node.requiredStepIds || node.steps?.map((s) => s.id) || []
  const objectsDone = requiredObjects.every((id) => state.selectedObjects.includes(id) || Boolean(state.placements[id]))
  const stepsDone = requiredSteps.every((id) => state.completedSteps.includes(id))
  const canSubmit = objectsDone && stepsDone

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
          <div style={{ marginTop: '0.45rem', color: '#3A6B5E', fontWeight: 800, fontSize: '0.875rem' }}>
            {renderContentWithGlossary(interpolate(node.learningGoal, context))}
          </div>
        </div>

        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, context))}
          </div>
        )}

        <section
          style={{
            border: '1px solid #000',
            boxShadow: '5px 5px 0 #000',
            background: '#F7F1E3',
            padding: '1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <PanelTitle title="Digital Mechanics" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {node.digitalPrimitives.map((primitive) => (
                <span key={primitive} style={{ border: '1px solid #000', background: '#EFE8D2', padding: '0.35rem 0.5rem', fontSize: '0.72rem', fontWeight: 800 }}>
                  {primitive}
                </span>
              ))}
            </div>

            {!!node.interactiveObjects?.length && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <PanelTitle title="Objects" />
                {node.interactiveObjects.map((object) => {
                  const selected = state.selectedObjects.includes(object.id) || Boolean(state.placements[object.id])
                  return (
                    <button
                      key={object.id}
                      draggable={object.interactionRole === 'draggable'}
                      onDragStart={() => setDraggingId(object.id)}
                      onDragEnd={() => setDraggingId(null)}
                      onClick={() => selectObject(object.id)}
                      style={{
                        textAlign: 'left',
                        background: selected ? '#D9CFB9' : '#F2EBD9',
                        border: '1px solid #000',
                        boxShadow: selected ? 'none' : '2px 2px 0 #000',
                        padding: '0.625rem',
                        cursor: object.interactionRole === 'draggable' ? 'grab' : 'pointer',
                        fontFamily: 'Inter, system-ui, sans-serif',
                      }}
                    >
                      {object.assetPath && (
                        <img src={object.assetPath} alt="" style={{ width: '100%', maxHeight: 90, objectFit: 'contain', marginBottom: '0.45rem' }} />
                      )}
                      <div style={{ fontSize: '0.8125rem', fontWeight: 900 }}>{object.label}</div>
                      {object.detail && <div style={{ color: '#555', fontSize: '0.72rem', marginTop: '0.25rem' }}>{object.detail}</div>}
                      {object.readableText && selected && (
                        <div style={{ color: '#3A6B5E', fontSize: '0.72rem', marginTop: '0.35rem', fontWeight: 800 }}>{object.readableText}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!!node.dropTargets?.length && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <PanelTitle title="Targets" />
                {node.dropTargets.map((target) => (
                  <div
                    key={target.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggingId) placeObject(draggingId, target.id)
                      setDraggingId(null)
                    }}
                    style={{ border: '2px dashed #3A6B5E', background: '#EFE8D2', padding: '0.75rem', minHeight: 88 }}
                  >
                    {target.assetPath && <img src={target.assetPath} alt="" style={{ width: '100%', maxHeight: 90, objectFit: 'contain', marginBottom: '0.4rem' }} />}
                    <div style={{ fontSize: '0.8125rem', fontWeight: 900 }}>{target.label}</div>
                    {target.detail && <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '0.25rem' }}>{target.detail}</div>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                      {Object.entries(state.placements)
                        .filter(([, placedTargetId]) => placedTargetId === target.id)
                        .map(([objectId]) => (
                          <span key={objectId} style={{ border: '1px solid #000', background: '#F2EBD9', padding: '0.25rem 0.4rem', fontSize: '0.7rem', fontWeight: 800 }}>
                            {node.interactiveObjects?.find((o) => o.id === objectId)?.label || objectId}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!!node.steps?.length && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <PanelTitle title="Procedure" />
                {node.steps.map((step, index) => {
                  const done = state.completedSteps.includes(step.id)
                  return (
                    <button
                      key={step.id}
                      onClick={() => completeStep(step)}
                      disabled={done}
                      style={{
                        textAlign: 'left',
                        background: done ? '#D9CFB9' : '#FFF8E8',
                        border: '1px solid #000',
                        boxShadow: done ? 'none' : '2px 2px 0 #000',
                        padding: '0.625rem',
                        cursor: done ? 'default' : 'pointer',
                        fontFamily: 'Inter, system-ui, sans-serif',
                      }}
                    >
                      <div style={{ fontSize: '0.8125rem', fontWeight: 900 }}>{index + 1}. {step.label}</div>
                      <div style={{ color: '#555', fontSize: '0.72rem', marginTop: '0.25rem' }}>{step.instruction}</div>
                      {done && step.successFeedback && (
                        <div style={{ color: '#3A6B5E', fontSize: '0.72rem', marginTop: '0.35rem', fontWeight: 800 }}>{step.successFeedback}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {!!state.warnings.length && (
              <div style={{ border: '1px solid #B87D6B', background: '#F2EBD9', padding: '0.75rem' }}>
                <PanelTitle title="Feedback" />
                <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.78rem', lineHeight: 1.45 }}>
                  {state.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <ActionButton text="Complete action" onClick={() => goNext(node)} disabled={!canSubmit} variant={canSubmit ? 'primary' : 'secondary'} fullWidth={false} />
          {!canSubmit && <span style={{ fontSize: '0.75rem', color: '#666' }}>Complete the required interaction steps before continuing.</span>}
        </div>

        {import.meta.env.DEV && (
          <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
        )}
      </motion.div>
    </SceneWrapper>
  )
}

function PanelTitle({ title }: { title: string }) {
  return <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>{title}</div>
}
