/** Matches create/edit/send — bay swap and the report builder — outside padded app chrome. */
const FULLSCREEN_FORM_PATH = /\/(new|edit|create|compose|send|swap|build)\/?$/i

const FULLSCREEN_FORM_EXCLUSIONS = new Set<string>([
  // none yet — add paths that should stay embedded
])

export function isFullscreenFormRoute(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (FULLSCREEN_FORM_EXCLUSIONS.has(path)) return false
  return FULLSCREEN_FORM_PATH.test(path)
}
