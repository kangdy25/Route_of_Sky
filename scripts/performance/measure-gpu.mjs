import { spawn } from 'node:child_process'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { chromium } from '@playwright/test'

const root = process.cwd()
const label = readArgument('--label') ?? 'phase2-local'
const runs = Number(readArgument('--runs') ?? 3)
const sampleMs = Number(readArgument('--sample-ms') ?? process.env.PERF_SAMPLE_MS ?? 20_000)
const outputDir = resolve(root, 'docs/performance/phase2/runs')
const previewUrl = readArgument('--url') ?? 'http://127.0.0.1:4173'
const browserPath =
  readArgument('--browser-path') ??
  process.env.PERF_BROWSER_EXECUTABLE ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const skipBuild = process.argv.includes('--skip-build')
const softwareRendererPatterns = [/swiftshader/i, /llvmpipe/i, /software renderer/i]

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

function summarize(samples) {
  return {
    samples,
    median: percentile(samples, 0.5),
    p50: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
  }
}

function numericSamples(runResults, selector) {
  return runResults.map(selector).filter((value) => typeof value === 'number' && Number.isFinite(value))
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

async function getBuildMetrics() {
  const distDirectory = resolve(root, 'dist')
  const assetDirectory = resolve(distDirectory, 'assets')
  const assetNames = await readdir(assetDirectory)
  const getAssetMetric = async (extension) => {
    const name = assetNames.find((assetName) => assetName.endsWith(extension))
    if (!name) return null

    const content = await readFile(resolve(assetDirectory, name))
    return { name, rawBytes: content.length, gzipBytes: gzipSync(content, { level: 9 }).length }
  }

  const thumbnail = await stat(resolve(root, 'public/thumbnail.jpg')).catch(() => null)

  return {
    distBytes: await directorySize(distDirectory),
    appJavaScript: await getAssetMetric('.js'),
    appCss: await getAssetMetric('.css'),
    thumbnailBytes: thumbnail?.size ?? null,
  }
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
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(previewUrl)
      if (response.ok) return
    } catch {
      // Vite preview가 준비될 때까지 재시도합니다.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250))
  }
  throw new Error(`Vite preview server did not start: ${previewUrl}`)
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
    window.__routeOfSkyGpuMetrics = {
      cls: 0,
      lcp: [],
      longTasks: [],
      events: [],
      eventTimingSupported: typeof PerformanceObserver !== 'undefined',
    }
    const observe = (type, callback, options = {}) => {
      try {
        new PerformanceObserver((entries) => {
          for (const entry of entries.getEntries()) callback(entry)
        }).observe({ type, buffered: true, ...options })
        return true
      } catch {
        return false
      }
    }

    observe('largest-contentful-paint', (entry) => window.__routeOfSkyGpuMetrics.lcp.push(entry.startTime))
    observe('layout-shift', (entry) => {
      if (!entry.hadRecentInput) window.__routeOfSkyGpuMetrics.cls += entry.value
    })
    observe('longtask', (entry) => window.__routeOfSkyGpuMetrics.longTasks.push(entry.duration))
    window.__routeOfSkyGpuMetrics.eventTimingSupported = observe(
      'event',
      (entry) => window.__routeOfSkyGpuMetrics.events.push(entry.duration),
      { durationThreshold: 16 },
    )
  })
}

async function getHardwareAcceleration(browser) {
  const session = await browser.newBrowserCDPSession()
  const systemInfo = await session.send('SystemInfo.getInfo')
  await session.detach()
  const gpuText = JSON.stringify(systemInfo.gpu).toLowerCase()
  const usesSoftwareRenderer = softwareRendererPatterns.some((pattern) => pattern.test(gpuText))

  if (usesSoftwareRenderer) {
    throw new Error('Software WebGL renderer detected. Official GPU measurements require hardware acceleration.')
  }

  return true
}

async function captureFrameTiming(page, preset) {
  const settingsDialog = page.getByRole('dialog')
  if (!(await settingsDialog.isVisible())) {
    await page.getByRole('button', { name: 'Open settings' }).click()
    await settingsDialog.waitFor({ state: 'visible' })
  }

  await page.getByRole('button', { name: preset, exact: true }).click()
  await page.evaluate(() => {
    window.__routeOfSkyFrameSamples = []
    let previous = performance.now()
    const collect = (now) => {
      const duration = now - previous
      if (duration > 0) window.__routeOfSkyFrameSamples.push(duration)
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

function summarizePageMetrics(metrics) {
  return {
    firstContentfulPaintMs: metrics.fcp ?? null,
    largestContentfulPaintMs: metrics.lcp.at(-1) ?? null,
    cumulativeLayoutShift: Number(metrics.cls.toFixed(4)),
    longTaskCount: metrics.longTasks.length,
    longTaskP95Ms: percentile(metrics.longTasks, 0.95) ?? 0,
    eventTimingP95Ms: metrics.eventTimingSupported ? percentile(metrics.events, 0.95) : null,
    eventTimingSupport: metrics.eventTimingSupported ? 'supported' : 'unsupported',
    resourceTransferBytes: metrics.resources.reduce((sum, resource) => sum + resource.transferSize, 0),
    resourceDecodedBytes: metrics.resources.reduce(
      (sum, resource) => sum + resource.decodedBodySize,
      0,
    ),
  }
}

async function measureRun(cpuSlowdownMultiplier) {
  process.stdout.write(`GPU 측정 시작: CPU ×${cpuSlowdownMultiplier}\n`)
  const browser = await chromium.launch({ executablePath: browserPath, headless: false })

  try {
    const hardwareAcceleration = await getHardwareAcceleration(browser)
    const context = await browser.newContext({
      viewport: { width: 1365, height: 768 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    const requestStartedAt = new Map()
    const apiResponseTimes = []
    let apiRequestCount = 0

    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/weather') {
        requestStartedAt.set(request, performance.now())
      }
    })
    page.on('response', (response) => {
      if (new URL(response.url()).pathname !== '/api/weather') return
      const startedAt = requestStartedAt.get(response.request())
      if (typeof startedAt === 'number') apiResponseTimes.push(performance.now() - startedAt)
    })

    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdownMultiplier })
    await installObservers(page)
    await page.route('**/api/weather?**', async (route) => {
      apiRequestCount += 1
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(weatherPayload()) })
    })

    await page.goto(previewUrl, { waitUntil: 'domcontentloaded' })
    await page.locator('#cesiumContainer canvas').first().waitFor({ state: 'visible', timeout: 20_000 })
    const viewerReadyMs = await page.evaluate(
      () => performance.getEntriesByName('route-of-sky:viewer-ready').at(-1)?.startTime ?? null,
    )
    await page.waitForTimeout(400)
    const tilesStableMs = await page.evaluate(
      () => performance.getEntriesByName('route-of-sky:tiles-stable').at(-1)?.startTime ?? null,
    )

    const interactionStartedAt = performance.now()
    const locationSelect = page.getByRole('combobox', { name: '지역 선택' })
    await locationSelect.selectOption('jp-tokyo', { force: true })
    await page.waitForTimeout(250)
    const locationChangeReadyMs = Number((performance.now() - interactionStartedAt).toFixed(2))

    const frames = {}
    for (const preset of ['Rain', 'Storm', 'Snow']) {
      frames[preset.toLowerCase()] = await captureFrameTiming(page, preset)
      process.stdout.write(`${preset} 프레임 측정 완료: CPU ×${cpuSlowdownMultiplier}\n`)
    }

    const quality = await page.evaluate(() => ({
      effectiveLevel: document.querySelector('[data-quality-level]')?.getAttribute('data-quality-level') ?? null,
      mode: document.querySelector('[data-quality-mode]')?.getAttribute('data-quality-mode') ?? null,
      transitions: performance
        .getEntriesByType('mark')
        .filter((entry) => entry.name.startsWith('route-of-sky:quality-applied-'))
        .map((entry) => ({ level: entry.name.replace('route-of-sky:quality-applied-', ''), atMs: entry.startTime })),
    }))

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('#cesiumContainer canvas').first().waitFor({ state: 'visible', timeout: 20_000 })
    await page.waitForTimeout(300)
    const metrics = await page.evaluate(() => {
      const fcp = performance.getEntriesByType('paint').find((entry) => entry.name === 'first-contentful-paint')
      return {
        ...window.__routeOfSkyGpuMetrics,
        fcp: fcp?.startTime ?? null,
        resources: performance.getEntriesByType('resource'),
        weatherCacheHitMs:
          performance.getEntriesByName('route-of-sky:weather-cache-hydration').at(-1)?.duration ?? null,
      }
    })

    await context.close()
    return {
      cpuSlowdownMultiplier,
      environment: { hardwareAcceleration, viewport: '1365x768', cacheDisabled: true },
      api: {
        networkRequestCount: apiRequestCount,
        cacheHitCount: Math.max(0, 2 - apiRequestCount),
        cacheMissCount: Math.min(2, apiRequestCount),
        responseP95Ms: percentile(apiResponseTimes, 0.95),
      },
      page: { ...summarizePageMetrics(metrics), weatherCacheHitMs: metrics.weatherCacheHitMs },
      viewerReadyMs,
      tilesStableMs,
      locationChangeReadyMs,
      quality,
      frames: Object.fromEntries(
        Object.entries(frames).map(([name, samples]) => [name, summarize(samples)]),
      ),
    }
  } finally {
    await browser.close()
    process.stdout.write(`GPU 측정 종료: CPU ×${cpuSlowdownMultiplier}\n`)
  }
}

function aggregate(runResults) {
  const metric = (selector) => summarize(numericSamples(runResults, selector))
  const frameMetric = (preset) =>
    metric((run) => run.frames[preset]?.p95)

  return {
    page: {
      firstContentfulPaintMs: metric((run) => run.page.firstContentfulPaintMs),
      largestContentfulPaintMs: metric((run) => run.page.largestContentfulPaintMs),
      cumulativeLayoutShift: metric((run) => run.page.cumulativeLayoutShift),
      longTaskP95Ms: metric((run) => run.page.longTaskP95Ms),
      eventTimingP95Ms: metric((run) => run.page.eventTimingP95Ms),
      weatherCacheHitMs: metric((run) => run.page.weatherCacheHitMs),
      resourceTransferBytes: metric((run) => run.page.resourceTransferBytes),
    },
    scene: {
      viewerReadyMs: metric((run) => run.viewerReadyMs),
      tilesStableMs: metric((run) => run.tilesStableMs),
      locationChangeReadyMs: metric((run) => run.locationChangeReadyMs),
      rainFrameP95Ms: frameMetric('rain'),
      stormFrameP95Ms: frameMetric('storm'),
      snowFrameP95Ms: frameMetric('snow'),
      qualityTransitionCount: metric((run) => run.quality.transitions.length),
    },
    api: {
      networkRequestCount: metric((run) => run.api.networkRequestCount),
      cacheHitCount: metric((run) => run.api.cacheHitCount),
      cacheMissCount: metric((run) => run.api.cacheMissCount),
      responseP95Ms: metric((run) => run.api.responseP95Ms),
    },
  }
}

if (!Number.isInteger(runs) || runs < 1) {
  throw new Error('--runs must be a positive integer')
}

await mkdir(outputDir, { recursive: true })
if (!skipBuild) await run('pnpm', ['build'])
const preview = spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4173'], {
  cwd: root,
  stdio: 'ignore',
})

try {
  await waitForServer()
  const desktopRuns = []
  const lowEndRuns = []
  for (let index = 0; index < runs; index += 1) {
    desktopRuns.push(await measureRun(1))
    lowEndRuns.push(await measureRun(4))
  }

  const result = {
    schemaVersion: 1,
    label,
    generatedAt: new Date().toISOString(),
    conditions: {
      browser: 'Google Chrome',
      browserPath: 'configured locally',
      headless: false,
      actualGpuRequired: true,
      rawGpuInfoPersisted: false,
      runs,
      sampleMs,
      viewport: '1365x768',
      cacheDisabled: true,
      lowEndCpuSlowdownMultiplier: 4,
      weatherResponse: 'fixed mock',
    },
    build: await getBuildMetrics(),
    desktop: { runs: desktopRuns, summary: aggregate(desktopRuns) },
    lowEnd: { runs: lowEndRuns, summary: aggregate(lowEndRuns) },
  }
  const destination = resolve(outputDir, `${label}.json`)
  await writeFile(destination, `${JSON.stringify(result, null, 2)}\n`)
  process.stdout.write(`GPU performance results written to ${destination}\n`)
} finally {
  preview.kill('SIGTERM')
}
