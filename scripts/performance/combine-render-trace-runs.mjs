import { readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const root = process.cwd()
const inputFiles = [
  'render-final-desktop-high-rain.json',
  'render-final-desktop-high-storm.json',
  'render-final-desktop-high-snow.json',
  'render-final-cpu4-medium-rain.json',
  'render-final-cpu4-medium-storm.json',
  'render-final-cpu4-medium-snow.json',
].map((file) => resolve(root, 'docs/performance/runs', file))
const destination = resolve(root, 'docs/performance/runs/render-final-after.json')

const fragments = await Promise.all(
  inputFiles.map(async (file) => ({
    file,
    data: JSON.parse(await readFile(file, 'utf8')),
  })),
)
const first = fragments[0].data
const result = {
  schemaVersion: first.schemaVersion,
  label: 'render-final-after',
  generatedAt: new Date().toISOString(),
  conditions: {
    ...first.conditions,
    combinedFrom: fragments.map(({ file }) => basename(file)),
  },
  scenarios: {},
}

for (const { file, data } of fragments) {
  for (const [scenarioId, scenario] of Object.entries(data.scenarios)) {
    const target = (result.scenarios[scenarioId] ??= {
      id: scenario.id,
      cpuSlowdownMultiplier: scenario.cpuSlowdownMultiplier,
      quality: scenario.quality,
      presets: {},
    })
    for (const [preset, measurement] of Object.entries(scenario.presets)) {
      if (target.presets[preset]) {
        throw new Error(`Duplicate ${scenarioId}/${preset} in ${file}`)
      }
      target.presets[preset] = measurement
    }
  }
}

await writeFile(destination, `${JSON.stringify(result, null, 2)}\n`)
process.stdout.write(`Combined anonymized render trace summary written to ${destination}\n`)
