import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { chromium } from '@playwright/test'

const root = process.cwd()
const targetUrl = readArgument('--url') ?? 'http://127.0.0.1:4173'
const output = resolve(root, readArgument('--output') ?? 'performance-capture.png')
const preset = readArgument('--preset') ?? 'Rain'
const quality = readArgument('--quality')
const matrixDirectoryArgument = readArgument('--matrix-output-directory')
const matrixDirectory = matrixDirectoryArgument ? resolve(root, matrixDirectoryArgument) : null
const matrixFormat = readArgument('--matrix-format') ?? 'png'

function readArgument(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
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

await mkdir(matrixDirectory ?? dirname(output), { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1365, height: 768 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
})
const page = await context.newPage()

async function captureState(selectedQuality, selectedPreset, destination) {
  await page.getByRole('button', { name: 'Open settings' }).click({
    force: true,
    noWaitAfter: true,
  })
  if (selectedQuality) {
    await page.getByLabel('렌더링 품질').selectOption(selectedQuality)
  }
  await page.getByRole('button', { name: selectedPreset, exact: true }).click({
    force: true,
    noWaitAfter: true,
  })
  await page.getByRole('button', { name: 'Close settings' }).last().click({
    force: true,
    noWaitAfter: true,
  })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(matrixDirectory ? 1_200 : 4_000)
  await page.screenshot({ path: destination })
}

if (!['png', 'jpeg'].includes(matrixFormat)) {
  throw new Error('--matrix-format must be png or jpeg')
}

try {
  await page.route('**/api/weather?**', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(weatherPayload()) }),
  )
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
  await page
    .locator('#cesiumContainer canvas')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
  if (matrixDirectory) {
    for (const selectedQuality of ['high', 'medium', 'low']) {
      for (const selectedPreset of ['Rain', 'Storm', 'Snow']) {
        const destination = resolve(
          matrixDirectory,
          `${selectedQuality}-${selectedPreset.toLowerCase()}.${matrixFormat}`,
        )
        await captureState(selectedQuality, selectedPreset, destination)
        process.stdout.write(`Visual check capture written to ${destination}\n`)
      }
    }
  } else {
    await captureState(quality, preset, output)
    process.stdout.write(`Performance capture written to ${output}\n`)
  }
} finally {
  await browser.close()
}
