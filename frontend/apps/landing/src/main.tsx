import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App, { PAGES, toPath } from './App'

const path = toPath(window.location.pathname)
document.title = PAGES[path].title
const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App path={path} />
  </StrictMode>
)

// Built pages arrive pre-rendered; in dev the root only holds the placeholder comment.
if (root.firstElementChild) hydrateRoot(root, app)
else createRoot(root).render(app)
