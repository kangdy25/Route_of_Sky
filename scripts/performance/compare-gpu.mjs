import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const beforePath = resolve(
  root,
  readArgument('--before') ?? 'docs/performance/phase2/runs/real-gpu-before.json',
)
const afterPath = resolve(
  root,
  readArgument('--after') ?? 'docs/performance/phase2/runs/real-gpu-after.json',
)
const outputPath = resolve(
  root,
  readArgument('--output') ?? 'docs/performance/phase2/comparison.md',
)

function readArgument(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

function getPath(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source)
}

function format(value, unit) {
  if (value === null || value === undefined) return '측정 불가'
  if (unit === 'bytes') return `${(value / 1024).toFixed(2)} KiB`
  if (unit === 'count') return `${value.toFixed(0)}건`
  if (unit === 'ratio') return value.toFixed(4)
  return `${value.toFixed(2)} ms`
}

function difference(before, after, unit) {
  if (before === null || before === undefined || after === null || after === undefined) {
    return { absolute: '측정 불가', improvement: '측정 불가' }
  }

  const delta = before - after
  const absolute = `${unit === 'bytes' ? (Math.abs(delta) / 1024).toFixed(2) : Math.abs(delta).toFixed(2)} ${
    unit === 'bytes' ? 'KiB' : unit === 'count' ? '건' : unit === 'ratio' ? '' : 'ms'
  } ${delta >= 0 ? '감소' : '증가'}`
  const improvement = before === 0 ? '계산 불가' : `${((delta / before) * 100).toFixed(1)}%`
  return { absolute, improvement }
}

const before = JSON.parse(await readFile(beforePath, 'utf8'))
const after = JSON.parse(await readFile(afterPath, 'utf8'))
const metrics = [
  ['배포 산출물', 'build.distBytes', 'bytes', '13.63 MiB 이하'],
  ['앱 JS gzip', 'build.appJavaScript.gzipBytes', 'bytes', '90 KiB 이하'],
  ['앱 CSS gzip', 'build.appCss.gzipBytes', 'bytes', '18 KiB 이하'],
  ['데스크톱 FCP', 'desktop.summary.page.firstContentfulPaintMs.median', 'ms', '기준선 대비 개선'],
  [
    '데스크톱 LCP',
    'desktop.summary.page.largestContentfulPaintMs.median',
    'ms',
    '기준선 대비 개선',
  ],
  ['데스크톱 CLS', 'desktop.summary.page.cumulativeLayoutShift.median', 'ratio', '0.02 이하'],
  ['데스크톱 Viewer 준비', 'desktop.summary.scene.viewerReadyMs.median', 'ms', '기준선 대비 개선'],
  ['데스크톱 Long Task p95', 'desktop.summary.page.longTaskP95Ms.median', 'ms', '기준선 대비 개선'],
  [
    '데스크톱 Event Timing p95',
    'desktop.summary.page.eventTimingP95Ms.median',
    'ms',
    '기준선 대비 개선',
  ],
  ['데스크톱 Rain p95', 'desktop.summary.scene.rainFrameP95Ms.median', 'ms', '기준선 대비 개선'],
  ['데스크톱 Storm p95', 'desktop.summary.scene.stormFrameP95Ms.median', 'ms', '기준선 대비 개선'],
  ['데스크톱 Snow p95', 'desktop.summary.scene.snowFrameP95Ms.median', 'ms', '기준선 대비 개선'],
  ['저사양 FCP', 'lowEnd.summary.page.firstContentfulPaintMs.median', 'ms', '기준선 대비 개선'],
  ['저사양 Viewer 준비', 'lowEnd.summary.scene.viewerReadyMs.median', 'ms', '기준선 대비 개선'],
  ['저사양 Rain p95', 'lowEnd.summary.scene.rainFrameP95Ms.median', 'ms', '기준선 대비 개선'],
  ['저사양 Storm p95', 'lowEnd.summary.scene.stormFrameP95Ms.median', 'ms', '기준선 대비 개선'],
  ['저사양 Snow p95', 'lowEnd.summary.scene.snowFrameP95Ms.median', 'ms', '기준선 대비 개선'],
  [
    'API 네트워크 요청',
    'desktop.summary.api.networkRequestCount.median',
    'count',
    '캐시 시나리오 0건',
  ],
  ['API 캐시 반영', 'desktop.summary.page.weatherCacheHitMs.median', 'ms', 'p95 100ms 이하'],
  [
    '리소스 전송량',
    'desktop.summary.page.resourceTransferBytes.median',
    'bytes',
    '기준선 대비 개선',
  ],
]

const rows = metrics.map(([name, path, unit, target]) => {
  const beforeValue = getPath(before, path)
  const afterValue = getPath(after, path)
  const result = difference(beforeValue, afterValue, unit)
  return `| ${name} | ${format(beforeValue, unit)} | ${format(afterValue, unit)} | ${result.absolute} | ${result.improvement} | ${target} |`
})

const document = `# Phase 2 실제 GPU 성능 비교\n\n측정 환경은 로컬 Chrome 실제 GPU, 1365×768, HTTP 캐시 비활성화, 동일 시나리오 3회 중앙값입니다. 개선율은 (Before - After) / Before × 100입니다.\n\n| 지표 | Before | After | 절대 차이 | 개선율 | 목표 |\n| --- | ---: | ---: | ---: | ---: | --- |\n${rows.join('\n')}\n\n> 외부 Google 3D Tiles와 Weather API는 고정 응답 또는 관측 전용으로 다룹니다. 소프트웨어 WebGL 측정값은 공식 Phase 2 수치에 포함하지 않습니다.\n`

await writeFile(outputPath, document)
process.stdout.write(`Phase 2 comparison written to ${outputPath}\n`)
