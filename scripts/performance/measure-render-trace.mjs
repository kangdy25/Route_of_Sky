import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

import {
  assertHardwareAcceleration,
  compactTraceSummary,
  percentile,
  summarizeScenarioRuns,
  summarizeTrace,
} from './render-trace-analysis.mjs'

const root = process.cwd()
const label = readArgument('--label') ?? 'render-trace-baseline'
const runs = Number(readArgument('--runs') ?? 3)
const sampleMs = Number(readArgument('--sample-ms') ?? process.env.PERF_SAMPLE_MS ?? 20_000)
const outputDirectory = resolve(root, 'docs/performance/phase3/runs')
const previewUrl = readArgument('--url') ?? 'http://127.0.0.1:4173'
const browserPath =
  readArgument('--browser-path') ??
  process.env.PERF_BROWSER_EXECUTABLE ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const skipBuild = process.argv.includes('--skip-build')
const scenarios = [
  { id: 'desktop-high', cpuSlowdownMultiplier: 1, quality: 'high' },
  { id: 'low-end-medium', cpuSlowdownMultiplier: 4, quality: 'medium' },
]
const presets = ['Rain', 'Storm', 'Snow']

function readArgument(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' })
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
      // preview server가 준비될 때까지 재시도합니다.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250))
  }
  throw new Error('Vite preview server did not start')
}

function weatherPayload() {
  return {
    location: { name: 'Weather fixture', localtime: '2026-06-27 09:30' },
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

async function getHardwareAcceleration(browser) {
  const session = await browser.newBrowserCDPSession()
  const systemInfo = await session.send('SystemInfo.getInfo')
  await session.detach()
  return assertHardwareAcceleration(systemInfo.gpu)
}

async function readTraceStream(cdp, stream) {
  let traceText = ''
  let eof = false
  while (!eof) {
    const chunk = await cdp.send('IO.read', { handle: stream })
    traceText += chunk.data
    eof = chunk.eof
  }
  await cdp.send('IO.close', { handle: stream })
  return traceText
}

async function collectAnonymizedTrace(cdp, collect) {
  let completeListener
  const completed = new Promise((resolvePromise) => {
    completeListener = (event) => resolvePromise(event)
    cdp.on('Tracing.tracingComplete', completeListener)
  })
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'route-of-sky-trace-'))

  try {
    await cdp.send('Tracing.start', {
      transferMode: 'ReturnAsStream',
      traceConfig: {
        recordMode: 'recordContinuously',
        includedCategories: [
          'devtools.timeline',
          'disabled-by-default-devtools.timeline',
          'disabled-by-default-devtools.timeline.frame',
          'disabled-by-default-v8.gc',
          'toplevel',
          'blink.user_timing',
          'cc',
          'gpu',
          'disabled-by-default-gpu.service',
        ],
      },
    })
    await collect()
    await cdp.send('Tracing.end')
    const complete = await completed
    const traceText = await readTraceStream(cdp, complete.stream)
    const temporaryTracePath = join(temporaryDirectory, 'trace.json')
    await writeFile(temporaryTracePath, traceText)
    return summarizeTrace(JSON.parse(await readFile(temporaryTracePath, 'utf8')))
  } finally {
    if (completeListener) cdp.off('Tracing.tracingComplete', completeListener)
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

async function measureScenarioRun(scenario, preset, runNumber) {
  const browser = await chromium.launch({ executablePath: browserPath, headless: false })
  try {
    const hardwareAcceleration = await getHardwareAcceleration(browser)
    const context = await browser.newContext({
      viewport: { width: 1365, height: 768 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await page.addInitScript((quality) => {
      window.localStorage.setItem('route-of-sky:scene-quality-mode', quality)
    }, scenario.quality)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp.send('Emulation.setCPUThrottlingRate', {
      rate: scenario.cpuSlowdownMultiplier,
    })
    await page.route('**/api/weather?**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(weatherPayload()),
      })
    })

    await page.goto(previewUrl, { waitUntil: 'domcontentloaded' })
    await page
      .locator('#cesiumContainer canvas')
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 })
    await page
      .locator(`section[data-quality-level="${scenario.quality}"]`)
      .waitFor({ state: 'visible', timeout: 10_000 })
    await page.getByRole('button', { name: 'Open settings' }).click({ force: true })
    await page.getByRole('button', { name: preset, exact: true }).click({ force: true })
    await page.waitForTimeout(500)
    await page.evaluate(() => {
      window.__routeOfSkyTraceFrameSamples = []
      let previous = performance.now()
      const collect = (now) => {
        const duration = now - previous
        if (duration > 0) window.__routeOfSkyTraceFrameSamples.push(duration)
        previous = now
        window.__routeOfSkyTraceFrameId = requestAnimationFrame(collect)
      }
      window.__routeOfSkyTraceFrameId = requestAnimationFrame(collect)
    })
    const trace = compactTraceSummary(
      await collectAnonymizedTrace(cdp, () => page.waitForTimeout(sampleMs)),
    )
    const frameSamples = await page.evaluate(() => {
      cancelAnimationFrame(window.__routeOfSkyTraceFrameId)
      return window.__routeOfSkyTraceFrameSamples
    })
    await context.close()

    const frameP95Ms = percentile(frameSamples, 0.95)
    process.stdout.write(
      `Trace 완료: ${scenario.id} ${preset} run ${runNumber}, frame p95 ${frameP95Ms}ms\n`,
    )
    return {
      run: runNumber,
      frameP95Ms,
      trace,
      environment: {
        hardwareAcceleration,
        viewport: '1365x768',
        cacheDisabled: true,
        cpuSlowdownMultiplier: scenario.cpuSlowdownMultiplier,
        quality: scenario.quality,
      },
    }
  } finally {
    await browser.close()
  }
}

if (!Number.isInteger(runs) || runs < 1) {
  throw new Error('--runs must be a positive integer')
}

await mkdir(outputDirectory, { recursive: true })
if (!skipBuild) await run('pnpm', ['build'])
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
  const result = {
    schemaVersion: 1,
    label,
    generatedAt: new Date().toISOString(),
    conditions: {
      browser: 'Google Chrome',
      headless: false,
      actualGpuRequired: true,
      rawGpuInfoPersisted: false,
      rawTracePersisted: false,
      viewport: '1365x768',
      cacheDisabled: true,
      sampleMs,
      runs,
      weatherResponse: 'fixed mock',
      dominanceRule:
        'same leading category across all three runs and at least 1.5x second category',
    },
    scenarios: {},
  }

  for (const scenario of scenarios) {
    const scenarioResult = { ...scenario, presets: {} }
    for (const preset of presets) {
      const scenarioRuns = []
      for (let runNumber = 1; runNumber <= runs; runNumber += 1) {
        scenarioRuns.push(await measureScenarioRun(scenario, preset, runNumber))
      }
      scenarioResult.presets[preset.toLowerCase()] = {
        runs: scenarioRuns,
        summary: summarizeScenarioRuns(scenarioRuns),
      }
    }
    result.scenarios[scenario.id] = scenarioResult
  }

  const destination = resolve(outputDirectory, `${label}.json`)
  await writeFile(destination, `${JSON.stringify(result, null, 2)}\n`)
  process.stdout.write(`Anonymized render trace summary written to ${destination}\n`)
} finally {
  preview.kill('SIGTERM')
}
