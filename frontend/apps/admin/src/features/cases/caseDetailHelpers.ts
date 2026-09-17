/** Drop raw http(s) links from note/activity copy — attachments render as cards. */
export function formatCaseWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function noteBodyText(
  body: string | null | undefined,
  attachmentUrl?: string | null,
) {
  let text = (body ?? '').trim()
  if (attachmentUrl) {
    text = text.split(attachmentUrl).join(' ')
  }
  text = text.replace(/https?:\/\/\S+/gi, ' ')
  return text.replace(/\s*[·•|]\s*/g, ' ').replace(/\s+/g, ' ').trim()
}
