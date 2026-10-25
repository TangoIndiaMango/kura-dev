// After `vite build` (client) and `vite build --ssr`, write each page's static
// HTML into dist/, plus sitemap.xml and robots.txt. Hub JSON-LD comes from the
// live API at build time when it's reachable (skipped otherwise).
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dist = path.join(root, 'dist')
const ssr = path.join(root, 'dist-ssr')
// Same env Vite used for the client build (.env, .env.production, .env.local, process env).
const env = { ...loadEnv('production', root, 'VITE_'), ...process.env }
const SITE = (env.VITE_SITE_URL || 'https://kuramobility.com').replace(/\/$/, '')
const API = (env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const { render, paths } = await import(pathToFileURL(path.join(ssr, 'entry-server.js')).href)
const template = await readFile(path.join(dist, 'index.html'), 'utf8')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

async function hubsLd() {
  if (!API) return []
  try {
    const res = await fetch(`${API}/public/network/`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const net = await res.json()
    return net.hubs
      .filter((h) => h.status !== 'offline' && Math.abs(h.lat) + Math.abs(h.lng) > 0.02)
      .map((h) => ({
        '@type': 'LocalBusiness',
        name: `KURA — ${h.name}`,
        address: { '@type': 'PostalAddress', streetAddress: h.address, addressCountry: 'NG' },
        geo: { '@type': 'GeoCoordinates', latitude: h.lat, longitude: h.lng },
        parentOrganization: { '@id': `${SITE}/#org` },
      }))
  } catch {
    return []
  }
}

const org = {
  '@type': 'Organization',
  '@id': `${SITE}/#org`,
  name: 'KURA Mobility',
  url: SITE,
  logo: `${SITE}/brand/icon-192.png`,
  areaServed: 'NG',
}
const ld = JSON.stringify({ '@context': 'https://schema.org', '@graph': [org, ...(await hubsLd())] })

for (const p of paths) {
  const page = render(p)
  const url = `${SITE}${p === '/' ? '/' : p}`
  const head = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    p === '/' ? `<script type="application/ld+json">${ld.replace(/</g, '\\u003c')}</script>` : '',
  ].join('\n    ')
  const html = template.replace('<!--app-head-->', head).replace('<!--app-html-->', page.html)
  const file = p === '/' ? path.join(dist, 'index.html') : path.join(dist, p.slice(1), 'index.html')
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, html)
  console.log('prerendered', p)
}

await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `  <url><loc>${SITE}${p === '/' ? '/' : p}</loc></url>`)
    .join('\n')}\n</urlset>\n`,
)
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`)
await rm(ssr, { recursive: true, force: true })
