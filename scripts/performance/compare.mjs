import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const beforePath = resolve(root, process.argv[2] ?? 'docs/performance/runs/before.json')
const afterPath = resolve(root, process.argv[3] ?? 'docs/performance/runs/after.json')
const outputPath = resolve(root, 'docs/performance/comparison.md')

const before = JSON.parse(await readFile(beforePath, 'utf8'))
const after = JSON.parse(await readFile(afterPath, 'utf8'))

const metrics = [
  ['배포 산출물', 'build.distBytes', 'bytes', 10 * 1024 * 1024],
  ['FCP', 'desktop.summary.page.firstContentfulPaintMs.median', 'ms', 1800],
  ['LCP', 'desktop.summary.page.largestContentfulPaintMs.median', 'ms', 2500],
  ['Viewer 준비', 'desktop.summary.scene.viewerReadyMs.median', 'ms', 3000],
  ['Rain p95 프레임 시간', 'desktop.summary.scene.rainFrameP95Ms.median', 'ms', 33.3],
  ['Storm p95 프레임 시간', 'desktop.summary.scene.stormFrameP95Ms.median', 'ms', 33.3],
  ['Snow p95 프레임 시간', 'desktop.summary.scene.snowFrameP95Ms.median', 'ms', 33.3],
  ['API 네트워크 요청 수', 'desktop.summary.api.networkRequestCount.median', 'count', 1],
]

function getValue(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object)
}

function format(value, unit) {
  if (typeof value !== 'number') return '측정 불가'
  if (unit === 'bytes') return `${(value / 1024 / 1024).toFixed(2)} MB`
  if (unit === 'ms') return `${value.toFixed(2)} ms`
  return `${value.toFixed(2)}건`
}

const rows = metrics.map(([name, path, unit, target]) => {
  const beforeValue = getValue(before, path)
  const afterValue = getValue(after, path)
  const delta =
    typeof beforeValue === 'number' && typeof afterValue === 'number'
      ? afterValue - beforeValue
      : null
  const improvement =
    delta === null || beforeValue === 0 ? null : ((beforeValue - afterValue) / beforeValue) * 100
  const targetStatus = typeof afterValue === 'number' && afterValue <= target ? '통과' : '미달'
  return `| ${name} | ${format(beforeValue, unit)} | ${format(afterValue, unit)} | ${format(delta, unit)} | ${improvement === null ? '측정 불가' : `${improvement.toFixed(1)}%`} | ${targetStatus} |`
})

const markdown = [
  '# 성능 최적화 전·후 비교',
  '',
  `측정일: ${after.generatedAt}`,
  '',
  '개선율 산식: `(Before - After) / Before × 100`',
  '',
  '| 지표 | Before | After | 절대 차이 (After - Before) | 개선율 | 목표 |',
  '| --- | ---: | ---: | ---: | ---: | --- |',
  ...rows,
  '',
  '> Google 3D Tiles와 실제 Weather API의 외부 네트워크 지연은 결과에 기록하되, 단독으로 회귀 판정하지 않습니다.',
  '',
].join('\n')
await writeFile(outputPath, markdown)
process.stdout.write('Comparison written to docs/performance/comparison.md\n')
