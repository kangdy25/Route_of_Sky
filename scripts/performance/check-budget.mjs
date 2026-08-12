import { readFile, readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const root = process.cwd()
const limits = {
  appJavaScriptGzipBytes: 90 * 1024,
  appCssGzipBytes: 18 * 1024,
  distBytes: Math.round(13.63 * 1024 * 1024),
  thumbnailBytes: 250 * 1024,
}

async function directorySize(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  let total = 0
  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name)
    total += entry.isDirectory() ? await directorySize(entryPath) : (await stat(entryPath)).size
  }
  return total
}

async function gzipEntry(extension) {
  const directory = resolve(root, 'dist/assets')
  const files = await readdir(directory)
  const entry = files.find((file) => file.startsWith('index-') && file.endsWith(extension))
  if (!entry) throw new Error(`Could not find app entry ${extension} in dist/assets`)
  return gzipSync(await readFile(resolve(directory, entry)), { level: 9 }).length
}

const measurements = {
  'app JS gzip': [await gzipEntry('.js'), limits.appJavaScriptGzipBytes],
  'app CSS gzip': [await gzipEntry('.css'), limits.appCssGzipBytes],
  'dist size': [await directorySize(resolve(root, 'dist')), limits.distBytes],
  thumbnail: [(await stat(resolve(root, 'public/thumbnail.jpg'))).size, limits.thumbnailBytes],
}

let failed = false
for (const [name, [actual, limit]] of Object.entries(measurements)) {
  const status = actual <= limit ? 'PASS' : 'FAIL'
  process.stdout.write(`${status} ${name}: ${actual} / ${limit} bytes\n`)
  failed ||= actual > limit
}

if (failed) process.exitCode = 1
