import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App, { PAGES, type Path } from './App'

export const paths = Object.keys(PAGES) as Path[]

/** Static HTML for one page (scripts/prerender.mjs writes it into dist). */
export function render(path: Path) {
  return {
    html: renderToString(
      <StrictMode>
        <App path={path} />
      </StrictMode>,
    ),
    ...PAGES[path],
  }
}
