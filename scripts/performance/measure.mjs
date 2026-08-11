import { spawn } from 'node:child_process'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const root = process.cwd()
const label = readArgument('--label') ?? 'local'
const runs = Number(readArgument('--runs') ?? 3)
const sampleMs = Number(process.env.PERF_SAMPLE_MS ?? 20_000)
const outputDir = resolve(root, 'docs/performance/runs')
const previewUrl = 'http://127.0.0.1:4173'

function readArgument(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

function percentile(values, ratio) {
  if (!values.length) return null
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)
  return Number(sorted[index].toFixed(2))
}

function median(values) {
  return percentile(values, 0.5)
}

function summarize(samples) {
  return {
    samples,
    median: median(samples),
    p50: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
  }
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

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`${command} exited with code ${code}`))
    })
  })
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(previewUrl)
      if (response.ok) return
    } catch {
      // 서버 시작 중에는 재시도합니다.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250))
  }
  throw new Error('Vite preview server did not start')
}

function weatherPayload() {
  return {
    location: { name: 'New York', localtime: '2026-06-27 09:30' },
    current: {
      temp_c: 23.4,
      humidity: 49,
      wind_kph: 18,
      wind_degree: 225,
      cloud: 36,
      precip_mm: 0.2,
      vis_km: 16,
      air_quality: { pm2_5: 8, 'us-epa-index': 2 },
    },
    forecast: { forecastday: [{ day: { mintemp_c: 18.2, maxtemp_c: 29.6 } }] },
  }
}

async function installObservers(page) {
  await page.addInitScript(() => {
    window.__routeOfSkyMetrics = { lcp: [], cls: 0, longTasks: [] }
    new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) window.__routeOfSkyMetrics.lcp.push(entry.startTime)
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) {
        if (!entry.hadRecentInput) window.__routeOfSkyMetrics.cls += entry.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries())
        window.__routeOfSkyMetrics.longTasks.push(entry.duration)
    }).observe({ type: 'longtask', buffered: true })
  })
}

async function captureFrameTiming(page, preset) {
  const settingsDialog = page.getByRole('dialog')
  if (!(await settingsDialog.isVisible())) {
    await page.getByRole('button', { name: 'Open settings' }).click()
    await settingsDialog.waitFor({ state: 'visible' })
  }
  await page.getByRole('button', { name: preset }).click()
  await page.evaluate(() => {
    window.__routeOfSkyFrameSamples = []
    let previous = performance.now()
    const collect = (now) => {
      window.__routeOfSkyFrameSamples.push(now - previous)
      previous = now
      window.__routeOfSkyFrameId = requestAnimationFrame(collect)
    }
    window.__routeOfSkyFrameId = requestAnimationFrame(collect)
  })
  await page.waitForTimeout(sampleMs)
  return page.evaluate(() => {
    cancelAnimationFrame(window.__routeOfSkyFrameId)
    return window.__routeOfSkyFrameSamples
  })
}

async function measureRun(cpuSlowdownMultiplier) {
  process.stdout.write(`측정 시작: CPU ×${cpuSlowdownMultiplier}\n`)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1365, height: 768 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  let apiRequestCount = 0

  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdownMultiplier })
  await installObservers(page)
  await page.route('**/v1/forecast.json**', async (route) => {
    apiRequestCount += 1
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(weatherPayload()) })
  })

  await page.goto(previewUrl, { waitUntil: 'domcontentloaded' })
  process.stdout.write(`페이지 진입 완료: CPU ×${cpuSlowdownMultiplier}\n`)
  await page
    .locator('#cesiumContainer canvas')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
  process.stdout.write(`Viewer 준비 완료: CPU ×${cpuSlowdownMultiplier}\n`)
  const viewerReadyMs = await page.evaluate(
    () => performance.getEntriesByName('route-of-sky:viewer-ready').at(-1)?.startTime ?? null,
  )
  await page.waitForTimeout(250)
  const tilesStableMs = await page.evaluate(
    () => performance.getEntriesByName('route-of-sky:tiles-stable').at(-1)?.startTime ?? null,
  )
  const frames = {}
  for (const preset of ['Rain', 'Storm', 'Snow']) {
    frames[preset.toLowerCase()] = await captureFrameTiming(page, preset)
    process.stdout.write(`${preset} 프레임 측정 완료: CPU ×${cpuSlowdownMultiplier}\n`)
  }

  await page.reload({ waitUntil: 'domcontentloaded' })
  process.stdout.write(`새로고침 완료: CPU ×${cpuSlowdownMultiplier}\n`)
  await page
    .locator('#cesiumContainer canvas')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
  const pageMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation').at(-1)
    const fcp = performance
      .getEntriesByType('paint')
      .find((entry) => entry.name === 'first-contentful-paint')
    const resources = performance.getEntriesByType('resource')
    return {
      domContentLoadedMs: navigation
        ? navigation.domContentLoadedEventEnd - navigation.startTime
        : null,
      loadMs: navigation ? navigation.loadEventEnd - navigation.startTime : null,
      firstContentfulPaintMs: fcp?.startTime ?? null,
      largestContentfulPaintMs: window.__routeOfSkyMetrics.lcp.at(-1) ?? null,
      weatherCacheHitMs:
        performance.getEntriesByName('route-of-sky:weather-cache-hydration').at(-1)?.duration ??
        null,
      cumulativeLayoutShift: Number(window.__routeOfSkyMetrics.cls.toFixed(4)),
      longTaskCount: window.__routeOfSkyMetrics.longTasks.length,
      longTaskP95Ms: window.__routeOfSkyMetrics.longTasks.length
        ? [...window.__routeOfSkyMetrics.longTasks].sort((a, b) => a - b)[
            Math.ceil(window.__routeOfSkyMetrics.longTasks.length * 0.95) - 1
          ]
        : 0,
      resourceTransferBytes: resources.reduce((total, entry) => total + entry.transferSize, 0),
      resourceDecodedBytes: resources.reduce((total, entry) => total + entry.decodedBodySize, 0),
    }
  })

  await browser.close()
  process.stdout.write(`측정 종료: CPU ×${cpuSlowdownMultiplier}\n`)
  return {
    cpuSlowdownMultiplier,
    api: {
      networkRequestCount: apiRequestCount,
      cacheHitCount: Math.max(0, 2 - apiRequestCount),
      cacheMissCount: Math.min(2, apiRequestCount),
    },
    page: pageMetrics,
    viewerReadyMs,
    tilesStableMs,
    frames: Object.fromEntries(
      Object.entries(frames).map(([name, samples]) => [name, summarize(samples)]),
    ),
  }
}

function collectMetric(runResults, selector) {
  return runResults.map(selector).filter((value) => typeof value === 'number')
}

function aggregate(runResults) {
  const frameSummary = (name) =>
    summarize(
      runResults.map((run) => run.frames[name].p95).filter((value) => typeof value === 'number'),
    )
  return {
    page: {
      firstContentfulPaintMs: summarize(
        collectMetric(runResults, (run) => run.page.firstContentfulPaintMs),
      ),
      largestContentfulPaintMs: summarize(
        collectMetric(runResults, (run) => run.page.largestContentfulPaintMs),
      ),
      domContentLoadedMs: summarize(
        collectMetric(runResults, (run) => run.page.domContentLoadedMs),
      ),
      loadMs: summarize(collectMetric(runResults, (run) => run.page.loadMs)),
      weatherCacheHitMs: summarize(collectMetric(runResults, (run) => run.page.weatherCacheHitMs)),
      resourceTransferBytes: summarize(
        collectMetric(runResults, (run) => run.page.resourceTransferBytes),
      ),
    },
    scene: {
      viewerReadyMs: summarize(collectMetric(runResults, (run) => run.viewerReadyMs)),
      tilesStableMs: summarize(collectMetric(runResults, (run) => run.tilesStableMs)),
      rainFrameP95Ms: frameSummary('rain'),
      stormFrameP95Ms: frameSummary('storm'),
      snowFrameP95Ms: frameSummary('snow'),
    },
    api: {
      networkRequestCount: summarize(
        collectMetric(runResults, (run) => run.api.networkRequestCount),
      ),
      cacheHitCount: summarize(collectMetric(runResults, (run) => run.api.cacheHitCount)),
      cacheMissCount: summarize(collectMetric(runResults, (run) => run.api.cacheMissCount)),
    },
  }
}

await mkdir(outputDir, { recursive: true })
await run('pnpm', ['build'])
const preview = spawn(
  'pnpm',
  ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4173'],
  {
    cwd: root,
    stdio: 'ignore',
  },
)

try {
  await waitForServer()
  const desktopRuns = []
  const lowEndRuns = []
  for (let index = 0; index < runs; index += 1) {
    desktopRuns.push(await measureRun(1))
    lowEndRuns.push(await measureRun(4))
  }
  const result = {
    label,
    generatedAt: new Date().toISOString(),
    conditions: {
      runs,
      sampleMs,
      viewport: '1365x768',
      cacheDisabled: true,
      lowEndCpuSlowdownMultiplier: 4,
    },
    build: { distBytes: await directorySize(resolve(root, 'dist')) },
    desktop: { runs: desktopRuns, summary: aggregate(desktopRuns) },
    lowEnd: { runs: lowEndRuns, summary: aggregate(lowEndRuns) },
  }
  await writeFile(resolve(outputDir, `${label}.json`), `${JSON.stringify(result, null, 2)}\n`)
  process.stdout.write(`Performance results written to docs/performance/runs/${label}.json\n`)
} finally {
  preview.kill('SIGTERM')
}
