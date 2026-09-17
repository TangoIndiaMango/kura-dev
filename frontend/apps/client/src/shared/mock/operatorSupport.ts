export type OperatorCaseType = 'Dispute' | 'Support' | 'Billing' | 'Technical'
export type OperatorCaseStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED'

export interface OperatorCaseAttachment {
  id: string
  name: string
  contentType: string
  url: string
  uploadedAt: string
}

export interface OperatorCaseEvent {
  id: string
  kind: 'NOTE' | 'STATUS' | 'ATTACHMENT'
  body?: string
  attachment?: OperatorCaseAttachment
  at: string
  actor: string
}

export interface OperatorSupportCase {
  id: string
  code: string
  subject: string
  type: OperatorCaseType
  status: OperatorCaseStatus
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  openedAt: string
  /** Optional payment/swap receipt link */
  receiptId?: string
  events: OperatorCaseEvent[]
}

/** Yusuf Abdullahi's support cases — mirrors admin CASE-01 dispute. */
let casesStore: OperatorSupportCase[] = [
  {
    id: 'CASE-01',
    code: 'DS-2041',
    subject: 'Dispute on wallet debit PSP-9F3A2C',
    type: 'Dispute',
    status: 'OPEN',
    priority: 'HIGH',
    openedAt: 'Today · 09:12',
    receiptId: 'rc-funded-1',
    events: [
      {
        id: 'oce-1',
        kind: 'STATUS',
        body: 'Case opened from payment dispute',
        at: 'Today · 09:12',
        actor: 'You',
      },
      {
        id: 'oce-2',
        kind: 'ATTACHMENT',
        body: 'Bank alert screenshot',
        at: 'Today · 09:14',
        actor: 'You',
        attachment: {
          id: 'oatt-1',
          name: 'bank-alert.png',
          contentType: 'image/png',
          url: '/illustrations/payment-declined.png',
          uploadedAt: 'Today · 09:14',
        },
      },
      {
        id: 'oce-3',
        kind: 'NOTE',
        body: 'Support: reviewing PSP ledger against your NUBAN credit.',
        at: 'Today · 09:30',
        actor: 'KURA Support',
      },
    ],
  },
  {
    id: 'CASE-06',
    code: 'SC-1201',
    subject: 'PIN unlock after 3 fails',
    type: 'Support',
    status: 'CLOSED',
    priority: 'LOW',
    openedAt: 'Aug 28 · 14:10',
    events: [
      {
        id: 'oce-4',
        kind: 'STATUS',
        body: 'Case opened',
        at: 'Aug 28 · 14:10',
        actor: 'You',
      },
      {
        id: 'oce-5',
        kind: 'STATUS',
        body: 'PIN unlocked after face verify at hub',
        at: 'Aug 28 · 14:40',
        actor: 'KURA Support',
      },
    ],
  },
]

export function listOperatorCases() {
  return [...casesStore]
}

export function getOperatorCase(id: string) {
  return casesStore.find((c) => c.id === id) ?? null
}

export function createOperatorCase(input: {
  subject: string
  type: OperatorCaseType
  receiptId?: string
  note?: string
  file?: File | null
}): OperatorSupportCase {
  const n = casesStore.length + 1200
  const code = input.type === 'Dispute' ? `DS-${n}` : `SC-${n}`
  const id = `CASE-OP-${Date.now()}`
  const events: OperatorCaseEvent[] = [
    {
      id: `oce-${Date.now()}-s`,
      kind: 'STATUS',
      body: input.receiptId
        ? `Case opened from receipt ${input.receiptId}`
        : 'Case opened',
      at: 'Just now',
      actor: 'You',
    },
  ]
  if (input.note?.trim()) {
    events.push({
      id: `oce-${Date.now()}-n`,
      kind: 'NOTE',
      body: input.note.trim(),
      at: 'Just now',
      actor: 'You',
    })
  }
  if (input.file) {
    const url = URL.createObjectURL(input.file)
    events.push({
      id: `oce-${Date.now()}-a`,
      kind: 'ATTACHMENT',
      body: input.file.name,
      at: 'Just now',
      actor: 'You',
      attachment: {
        id: `oatt-${Date.now()}`,
        name: input.file.name,
        contentType: input.file.type || 'image/jpeg',
        url,
        uploadedAt: 'Just now',
      },
    })
  }
  const created: OperatorSupportCase = {
    id,
    code,
    subject: input.subject,
    type: input.type,
    status: 'OPEN',
    priority: input.type === 'Dispute' ? 'HIGH' : 'MEDIUM',
    openedAt: 'Just now',
    receiptId: input.receiptId,
    events,
  }
  casesStore = [created, ...casesStore]
  return created
}

export function addOperatorCaseAttachment(caseId: string, file: File) {
  const url = URL.createObjectURL(file)
  const attachment: OperatorCaseAttachment = {
    id: `oatt-${Date.now()}`,
    name: file.name,
    contentType: file.type || 'image/jpeg',
    url,
    uploadedAt: 'Just now',
  }
  casesStore = casesStore.map((c) => {
    if (c.id !== caseId) return c
    return {
      ...c,
      events: [
        {
          id: `oce-${Date.now()}`,
          kind: 'ATTACHMENT',
          body: file.name,
          at: 'Just now',
          actor: 'You',
          attachment,
        },
        ...c.events,
      ],
    }
  })
  return getOperatorCase(caseId)
}
