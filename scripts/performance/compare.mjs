import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const beforePath = resolve(root, process.argv[2] ?? 'docs/performance/runs/before.json')
const afterPath = resolve(root, process.argv[3] ?? 'docs/performance/runs/after.json')
const outputPath = resolve(root, 'docs/performance/comparison.md')

const before = JSON.parse(await readFile(beforePath, 'utf8'))
const after = JSON.parse(await readFile(afterPath, 'utf8'))

const metrics = [
  { name: '배포 산출물', path: 'build.distBytes', unit: 'mib', target: 10 * 1024 * 1024 },
  {
    name: '앱 JS gzip',
    path: 'build.appJavaScript.gzipBytes',
    unit: 'kib',
    target: 90 * 1024,
  },
  { name: 'CSS gzip', path: 'build.appCss.gzipBytes', unit: 'kib', target: 18 * 1024 },
  { name: '헤더 로고', path: 'build.headerLogo.bytes', unit: 'kib', target: 50 * 1024 },
  {
    name: '데스크톱 FCP',
    path: 'desktop.summary.page.firstContentfulPaintMs.median',
    unit: 'ms',
    target: 1800,
  },
  {
    name: '데스크톱 LCP',
    path: 'desktop.summary.page.largestContentfulPaintMs.median',
    unit: 'ms',
    target: 2500,
  },
  {
    name: '데스크톱 Viewer 준비',
    path: 'desktop.summary.scene.viewerReadyMs.median',
    unit: 'ms',
    target: 3000,
  },
  {
    name: '데스크톱 Rain p95',
    path: 'desktop.summary.scene.rainFrameP95Ms.median',
    unit: 'ms',
    target: 33.3,
  },
  {
    name: '데스크톱 Storm p95',
    path: 'desktop.summary.scene.stormFrameP95Ms.median',
    unit: 'ms',
    target: 33.3,
  },
  {
    name: '데스크톱 Snow p95',
    path: 'desktop.summary.scene.snowFrameP95Ms.median',
    unit: 'ms',
    target: 33.3,
  },
  {
    name: '저사양 FCP',
    path: 'lowEnd.summary.page.firstContentfulPaintMs.median',
    unit: 'ms',
    target: 2800,
  },
  {
    name: '저사양 LCP',
    path: 'lowEnd.summary.page.largestContentfulPaintMs.median',
    unit: 'ms',
    target: 4000,
  },
  {
    name: '저사양 Viewer 준비',
    path: 'lowEnd.summary.scene.viewerReadyMs.median',
    unit: 'ms',
    target: 5000,
  },
  {
    name: '저사양 Rain p95',
    path: 'lowEnd.summary.scene.rainFrameP95Ms.median',
    unit: 'ms',
    target: 50,
  },
  {
    name: '저사양 Storm p95',
    path: 'lowEnd.summary.scene.stormFrameP95Ms.median',
    unit: 'ms',
    target: 50,
  },
  {
    name: '저사양 Snow p95',
    path: 'lowEnd.summary.scene.snowFrameP95Ms.median',
    unit: 'ms',
    target: 50,
  },
  {
    name: 'API 네트워크 요청 수',
    path: 'desktop.summary.api.networkRequestCount.median',
    unit: 'count',
    target: 1,
  },
  {
    name: '날씨 캐시 반영',
    path: 'desktop.summary.page.weatherCacheHitMs.median',
    unit: 'ms',
    target: 100,
  },
  {
    name: '리소스 전송량',
    path: 'desktop.summary.page.resourceTransferBytes.median',
    unit: 'mib',
    target: null,
  },
]

function getValue(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object)
}

function format(value, unit) {
  if (typeof value !== 'number') return '측정 불가'
  if (unit === 'mib') return `${(value / 1024 / 1024).toFixed(2)} MiB`
  if (unit === 'kib') return `${(value / 1024).toFixed(2)} KiB`
  if (unit === 'ms') return `${value.toFixed(2)} ms`
  return `${value.toFixed(2)}건`
}

const rows = metrics.map(({ name, path, unit, target }) => {
  const beforeValue = getValue(before, path)
  const afterValue = getValue(after, path)
  const difference =
    typeof beforeValue === 'number' && typeof afterValue === 'number'
      ? afterValue - beforeValue
      : null
  const improvement =
    difference === null || beforeValue === 0
      ? null
      : ((beforeValue - afterValue) / beforeValue) * 100
  const change =
    difference === null
      ? '측정 불가'
      : `${format(Math.abs(difference), unit)} ${difference <= 0 ? '감소' : '증가'}`
  const targetStatus =
    target === null
      ? '관찰'
      : typeof afterValue === 'number' && afterValue <= target
        ? '통과'
        : '미달'
  return `| ${name} | ${format(beforeValue, unit)} | ${format(afterValue, unit)} | ${change} | ${improvement === null ? '측정 불가' : `${improvement.toFixed(1)}%`} | ${targetStatus} |`
})

const markdown = [
  '# 성능 최적화 전·후 비교',
  '',
  `측정일: ${after.generatedAt}`,
  '',
  '개선율 산식: `(Before - After) / Before × 100`',
  '',
  '| 지표 | Before | After | 절대 차이 | 개선율 | 목표 |',
  '| --- | ---: | ---: | ---: | ---: | --- |',
  ...rows,
  '',
  '> Google 3D Tiles와 실제 Weather API의 외부 네트워크 지연은 결과에 기록하되, 단독으로 회귀 판정하지 않습니다.',
  '',
].join('\n')
await writeFile(outputPath, markdown)
process.stdout.write('Comparison written to docs/performance/comparison.md\n')
