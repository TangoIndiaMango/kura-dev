// Builds responsive images: assets-src/<name>.jpg → public/images/<name>-<w>.{avif,webp,jpg}.
// Run after adding or replacing a photo: `npm run images`.
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const src = path.join(root, 'assets-src')
const out = path.join(root, 'public', 'images')
const WIDTHS = [640, 1280, 1920]

await mkdir(out, { recursive: true })
const manifest = {}
for (const file of (await readdir(src)).filter((f) => /\.(jpe?g|png)$/i.test(f))) {
  const name = file.replace(/\.[^.]+$/, '')
  const img = sharp(path.join(src, file)).rotate()
  const meta = await img.metadata()
  // Never upscale; always emit at least one size.
  const widths = WIDTHS.filter((w) => w <= meta.width)
  if (widths.length === 0) widths.push(meta.width)
  for (const w of widths) {
    const base = img.clone().resize({ width: w }).modulate({ saturation: 0.92 })
    await base.clone().avif({ quality: 52 }).toFile(path.join(out, `${name}-${w}.avif`))
    await base.clone().webp({ quality: 74 }).toFile(path.join(out, `${name}-${w}.webp`))
    await base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(out, `${name}-${w}.jpg`))
  }
  manifest[name] = { widths, ratio: +(meta.height / meta.width).toFixed(4) }
  console.log(name, widths.join(','))
}
console.log(JSON.stringify(manifest))
