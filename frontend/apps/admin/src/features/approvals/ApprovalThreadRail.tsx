import { useEffect, useRef, useState } from 'react'
import { Button, Textarea } from '@mantine/core'
import type { ApprovalThreadMessage } from '@shared/mock/adminMockData'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function kindMeta(kind: ApprovalThreadMessage['kind']) {
  if (kind === 'request') {
    return { label: 'Submitted', tone: 'bg-[var(--pr)]', line: 'bg-[var(--pr)]' }
  }
  if (kind === 'decision') {
    return { label: 'Decision', tone: 'bg-[#1E8E4E]', line: 'bg-[#1E8E4E]' }
  }
  return { label: 'Comment', tone: 'bg-[var(--mu)]', line: 'bg-[var(--bd)]' }
}

/**
 * Always-visible conversation rail — vertical timeline the approver reads
 * while reviewing the proposed change on the right.
 */
export function ApprovalThreadRail({
  messages,
  onPost,
  canComment,
}: {
  messages: ApprovalThreadMessage[]
  onPost: (body: string) => void
  canComment: boolean
}) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages.length])

  return (
    <aside className="flex min-h-[420px] flex-col rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--sh)] xl:sticky xl:top-4 xl:max-h-[calc(100vh-7rem)]">
      <header className="shrink-0 border-b border-[var(--bd)] px-4 py-3">
        <h2 className="text-[14px] font-bold text-[var(--tx)]">Conversation</h2>
        <p className="mt-0.5 text-[12px] text-[var(--mu)]">
          Why this is queued — scroll here while you review the change.
        </p>
      </header>

      <ol className="m-0 flex-1 list-none space-y-0 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <li className="text-[13px] text-[var(--mu)]">No discussion yet.</li>
        ) : (
          messages.map((msg, i) => {
            const meta = kindMeta(msg.kind)
            const isLast = i === messages.length - 1
            return (
              <li key={msg.id} className="relative flex gap-3 pb-5 last:pb-0">
                {!isLast ? (
                  <span
                    className={`absolute left-[15px] top-9 h-[calc(100%-1.75rem)] w-0.5 ${meta.line}`}
                    aria-hidden
                  />
                ) : null}
                <div
                  className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${meta.tone}`}
                  title={meta.label}
                >
                  {initials(msg.author)}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[13px] font-bold text-[var(--tx)]">{msg.author}</span>
                    <span className="text-[11px] font-semibold text-[var(--pr)]">{msg.role}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
                    {meta.label}
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-snug text-[var(--tx)]">
                    {msg.body}
                  </p>
                  <p className="mt-1.5 text-[11px] text-[var(--su)]">{msg.at}</p>
                </div>
              </li>
            )
          })
        )}
        <div ref={bottomRef} />
      </ol>

      {canComment ? (
        <div className="shrink-0 border-t border-[var(--bd)] px-4 py-3">
          <Textarea
            placeholder="Add context…"
            minRows={2}
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            styles={{
              input: {
                background: 'var(--in)',
                borderColor: 'var(--bd)',
                color: 'var(--tx)',
              },
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button
              className="bg-[var(--pr)] hover:opacity-90"
              disabled={!draft.trim()}
              onClick={() => {
                const body = draft.trim()
                if (!body) return
                onPost(body)
                setDraft('')
              }}
            >
              Post
            </Button>
          </div>
        </div>
      ) : null}
    </aside>
  )
}
