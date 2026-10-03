// Turns the Vite build in dist-single/ into one self-contained HTML file.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'dist-single'
let html = readFileSync(join(dir, 'index.html'), 'utf8')

html = html.replace(/<script type="module" crossorigin src="\/?([^"]+)"><\/script>/g, (_, src) => {
  const js = readFileSync(join(dir, src), 'utf8').replace(/<\/script/gi, '<\\/script')
  return `<script type="module">${js}</script>`
})
html = html.replace(/<link rel="stylesheet" crossorigin href="\/?([^"]+)">/g, (_, href) => {
  return `<style>${readFileSync(join(dir, href), 'utf8')}</style>`
})
const icon = readFileSync('public/icon.svg')
html = html
  .replace(/<link rel="manifest"[^>]*>\s*/, '')
  .replace('href="/icon.svg"', `href="data:image/svg+xml;base64,${icon.toString('base64')}"`)

writeFileSync(join(dir, 'flashback.html'), html)
console.log(`wrote ${dir}/flashback.html (${(html.length / 1024).toFixed(0)} KB)`)
