import { useMemo, useState, type ReactNode } from 'react'
import { getSupportConsoleCase } from '../../data/supportConsole'
import { renderContentWithGlossary } from './JargonTerm'
import type { SourceInboxFile, SupportConsoleScenarioId } from '../../types/game'

function StatusDot({ status }: { status: 'done' | 'active' | 'watch' | 'risk' }) {
  return <span className={`support-console__status-dot support-console__status-dot--${status}`} aria-hidden="true" />
}

function Field({ label, value, tone }: { label: string; value: string; tone?: 'normal' | 'warning' | 'risk' }) {
  return (
    <div className={`support-console__field${tone ? ` support-console__field--${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ArticleCard({
  title,
  category,
  updated,
  status,
  active,
  opened,
  onClick,
}: {
  title: string
  category: string
  updated: string
  status: string
  active: boolean
  opened?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`support-console__article-card${active ? ' support-console__article-card--active' : ''}`}
      onClick={onClick}
    >
      <span className="support-console__article-card-top">
        <span>{category}</span>
        <span>{opened ? 'Opened' : status}</span>
      </span>
      <strong>{title}</strong>
      <span>{updated}</span>
    </button>
  )
}

function renderSourceFile(file: SourceInboxFile | null) {
  if (!file) {
    return (
      <div className="support-console__empty-preview">
        Select an article to preview the policy.
      </div>
    )
  }

  return (
    <div className="support-console__article-preview">
      <div className="support-console__article-preview-header">
        <span>{file.kind}</span>
        <h3>{file.previewTitle}</h3>
      </div>
      <div className="support-console__article-sections">
        {file.sections?.map((section) => (
          <section key={section.heading} className="support-console__article-section">
            <h4>{section.heading}</h4>
            <p>{renderContentWithGlossary(section.body)}</p>
          </section>
        ))}
      </div>
    </div>
  )
}

function renderKnowledgeArticle(caseData: ReturnType<typeof getSupportConsoleCase>, activeArticleId: string) {
  const activeArticle = caseData.articles.find((article) => article.id === activeArticleId) || caseData.articles[0]

  return (
    <div className="support-console__article-preview">
      <div className="support-console__article-preview-header">
        <span>{activeArticle.category}</span>
        <h3>{activeArticle.title}</h3>
      </div>
      <div className="support-console__article-sections">
        {activeArticle.sections.map((section) => (
          <section key={section.heading} className="support-console__article-section">
            <h4>{section.heading}</h4>
            <p>{renderContentWithGlossary(section.body)}</p>
          </section>
        ))}
      </div>
    </div>
  )
}

function ConsoleHeader({ scenarioId, mode }: { scenarioId: SupportConsoleScenarioId; mode: 'prep' | 'call' }) {
  const caseData = getSupportConsoleCase(scenarioId)

  return (
    <header className="support-console__header">
      <div>
        <div className="support-console__eyebrow">Mercury Assist</div>
        <h2>{mode === 'prep' ? 'Knowledge base prep' : 'Live support console'}</h2>
      </div>
      <div className="support-console__queue-strip" aria-label="Queue status">
        <Field label="Line" value={caseData.queue.line} />
        <Field label="Topic" value={caseData.queue.topic} />
        <Field label="Wait" value={caseData.queue.waitTime} />
        <Field label="Priority" value={caseData.queue.priority} tone={caseData.queue.priority === 'Sensitive' ? 'risk' : caseData.queue.priority === 'Elevated' ? 'warning' : 'normal'} />
      </div>
    </header>
  )
}

function SideNav({ active }: { active: 'kb' | 'call' | 'crm' }) {
  const items = [
    { id: 'call', label: 'Call' },
    { id: 'crm', label: 'CRM' },
    { id: 'kb', label: 'KB' },
    { id: 'case', label: 'Case' },
  ]

  return (
    <nav className="support-console__nav" aria-label="Mercury support apps">
      {items.map((item) => (
        <span
          key={item.id}
          className={`support-console__nav-item${item.id === active ? ' support-console__nav-item--active' : ''}`}
        >
          <span>{item.label.slice(0, 2).toUpperCase()}</span>
          <strong>{item.label}</strong>
        </span>
      ))}
    </nav>
  )
}

export function SupportConsolePrep({
  scenarioId,
  files,
  requiredFileIds,
  visitedFileIds,
  activeFileId,
  onOpenFile,
}: {
  scenarioId: SupportConsoleScenarioId
  files: SourceInboxFile[]
  requiredFileIds: string[]
  visitedFileIds: string[]
  activeFileId: string | null
  onOpenFile: (fileId: string) => void
}) {
  const caseData = getSupportConsoleCase(scenarioId)
  const [query, setQuery] = useState('')
  const activeFile = files.find((file) => file.id === activeFileId) || null
  const filteredFiles = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return files
    return files.filter((file) => `${file.name} ${file.previewTitle} ${file.sections?.map((s) => `${s.heading} ${s.body}`).join(' ') || ''}`.toLowerCase().includes(normalized))
  }, [files, query])

  return (
    <div className="support-console support-console--prep">
      <ConsoleHeader scenarioId={scenarioId} mode="prep" />
      <div className="support-console__body">
        <SideNav active="kb" />
        <main className="support-console__prep-grid">
          <section className="support-console__panel support-console__queue-panel">
            <div className="support-console__panel-title">Inbound queue card</div>
            <Field label="Detected topic" value={caseData.queue.topic} />
            <Field label="SLA" value={caseData.queue.sla} />
            <div className="support-console__locked-box">
              <strong>{caseData.locked.title}</strong>
              <span>{caseData.locked.searchHint}</span>
            </div>
            <div className="support-console__masked-list">
              {caseData.locked.maskedRows.map((row) => <span key={row}>{row}</span>)}
            </div>
          </section>

          <section className="support-console__panel support-console__kb-panel">
            <div className="support-console__panel-header">
              <div>
                <div className="support-console__panel-title">Knowledge base</div>
                <span>{requiredFileIds.filter((id) => visitedFileIds.includes(id)).length}/{requiredFileIds.length} required opened</span>
              </div>
              <label className="support-console__search">
                <span>Search</span>
                <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Policy, trace, refund..." />
              </label>
            </div>
            <div className="support-console__article-list">
              {filteredFiles.map((file) => (
                <ArticleCard
                  key={file.id}
                  title={file.previewTitle}
                  category={file.kind}
                  updated={file.modified || 'Current policy'}
                  status={requiredFileIds.includes(file.id) ? 'Required' : 'Optional'}
                  active={file.id === activeFileId}
                  opened={visitedFileIds.includes(file.id)}
                  onClick={() => onOpenFile(file.id)}
                />
              ))}
            </div>
          </section>

          <section className="support-console__panel support-console__preview-panel">
            {renderSourceFile(activeFile)}
          </section>
        </main>
      </div>
    </div>
  )
}

export function SupportConsoleCall({
  scenarioId,
  crmUnlocked,
  callPanel,
}: {
  scenarioId: SupportConsoleScenarioId
  crmUnlocked: boolean
  callPanel: ReactNode
}) {
  const caseData = getSupportConsoleCase(scenarioId)
  const [activeArticleId, setActiveArticleId] = useState(caseData.articles[0]?.id || 'shared_call_flow')

  return (
    <div className="support-console support-console--call">
      <ConsoleHeader scenarioId={scenarioId} mode="call" />
      <div className="support-console__body">
        <SideNav active="call" />
        <main className="support-console__call-grid">
          <section className="support-console__panel support-console__live-panel">
            {callPanel}
          </section>

          <section className="support-console__panel support-console__crm-panel">
            <div className="support-console__panel-title">CRM and case record</div>
            {!crmUnlocked ? (
              <>
                <div className="support-console__locked-box support-console__locked-box--large">
                  <strong>{caseData.locked.title}</strong>
                  <span>{caseData.locked.searchHint}</span>
                </div>
                <div className="support-console__masked-list">
                  {caseData.locked.maskedRows.map((row) => <span key={row}>{row} locked</span>)}
                </div>
              </>
            ) : (
              <>
                <div className="support-console__customer-card">
                  <div className="support-console__avatar">{caseData.customer.initials}</div>
                  <div>
                    <strong>{caseData.customer.name}</strong>
                    <span>{caseData.customer.tier}</span>
                  </div>
                </div>
                <div className="support-console__field-grid">
                  <Field label="Case" value={caseData.caseRecord.caseId} />
                  <Field label="Order" value={caseData.caseRecord.orderId} />
                  <Field label="Product" value={caseData.caseRecord.product} />
                  <Field label="Status" value={caseData.caseRecord.status} tone={scenarioId === 'risk_refund' ? 'risk' : scenarioId === 'late_delivery' ? 'warning' : 'normal'} />
                  <Field label="Delivery" value={caseData.orderSummary.deliveryStatus} />
                  <Field label="Policy" value={caseData.orderSummary.policyStatus} tone={scenarioId === 'risk_refund' ? 'risk' : 'normal'} />
                </div>
                <div className="support-console__safe-actions">
                  <strong>Agent-safe next steps</strong>
                  {caseData.safeActions.map((action) => <span key={action}>{renderContentWithGlossary(action)}</span>)}
                </div>
                {caseData.internalNotes.length > 0 && (
                  <div className="support-console__internal-notes">
                    <strong>Internal notes</strong>
                    {caseData.internalNotes.map((note) => <span key={note}>{renderContentWithGlossary(note)}</span>)}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="support-console__panel support-console__timeline-panel">
            <div className="support-console__panel-title">Order timeline</div>
            {crmUnlocked ? (
              <div className="support-console__timeline">
                {caseData.timeline.map((event) => (
                  <div key={`${event.time}-${event.title}`} className="support-console__timeline-item">
                    <StatusDot status={event.status} />
                    <div>
                      <span>{event.time}</span>
                      <strong>{event.title}</strong>
                      <p>{event.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="support-console__empty-preview support-console__empty-preview--compact">
                Timeline appears after verified CRM lookup.
              </div>
            )}
          </section>

          <section className="support-console__panel support-console__policy-panel">
            <div className="support-console__panel-header">
              <div>
                <div className="support-console__panel-title">Knowledge base</div>
                <span>Visible during the call</span>
              </div>
            </div>
            <div className="support-console__article-tabs">
              {caseData.articles.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  className={article.id === activeArticleId ? 'is-active' : ''}
                  onClick={() => setActiveArticleId(article.id)}
                >
                  {article.title}
                </button>
              ))}
            </div>
            {renderKnowledgeArticle(caseData, activeArticleId)}
          </section>
        </main>
      </div>
    </div>
  )
}
