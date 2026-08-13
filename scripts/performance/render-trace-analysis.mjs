const softwareRendererPatterns = [/swiftshader/i, /llvmpipe/i, /software renderer/i]

export const TRACE_CATEGORY_KEYS = [
  'javascript',
  'gc',
  'paintRaster',
  'composite',
  'cesiumGpuProxy',
]

export function percentile(values, ratio) {
  if (!values.length) return null
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)
  return Number(sorted[index].toFixed(2))
}

export function summarize(values) {
  return {
    samples: values,
    median: percentile(values, 0.5),
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    total: Number(values.reduce((sum, value) => sum + value, 0).toFixed(2)),
  }
}

export function assertHardwareAcceleration(gpu) {
  const gpuText = JSON.stringify(gpu).toLowerCase()
  if (softwareRendererPatterns.some((pattern) => pattern.test(gpuText))) {
    throw new Error(
      'Software WebGL renderer detected. Official render traces require hardware acceleration.',
    )
  }

  return true
}

function getRendererMainThreads(traceEvents) {
  return new Set(
    traceEvents
      .filter(
        (event) =>
          event.ph === 'M' &&
          event.name === 'thread_name' &&
          /renderer.*main|crrenderermain/i.test(event.args?.name ?? ''),
      )
      .map((event) => `${event.pid}:${event.tid}`),
  )
}

function classifyMainThreadEvent(name) {
  if (/gc|v8\.gc/i.test(name)) return 'gc'
  if (
    /functioncall|evaluatescript|parsescript|compilescript|v8\.execute|scriptstreamer/i.test(name)
  ) {
    return 'javascript'
  }
  if (/paint|raster|prepaint|layout|updatelayer|commit/i.test(name)) return 'paintRaster'
  if (/composite|drawframe|submitcompositorframe|activatelayertree|beginmainframe/i.test(name)) {
    return 'composite'
  }
  return null
}

function isCesiumGpuProxyEvent(name) {
  return /webgl|gpu|gles|drawframe|draw|vizcompositor/i.test(name)
}

export function summarizeTrace(trace) {
  const traceEvents = Array.isArray(trace?.traceEvents) ? trace.traceEvents : []
  const rendererMainThreads = getRendererMainThreads(traceEvents)
  const mainThreadKeys = rendererMainThreads.size
    ? rendererMainThreads
    : new Set(
        traceEvents
          .filter((event) => event.name === 'RunTask')
          .map((event) => `${event.pid}:${event.tid}`),
      )
  const measurements = Object.fromEntries(
    [...TRACE_CATEGORY_KEYS, 'mainTask'].map((key) => [key, []]),
  )

  for (const event of traceEvents) {
    if (event.ph !== 'X' || !Number.isFinite(event.dur) || event.dur <= 0) continue

    const durationMs = event.dur / 1000
    const threadKey = `${event.pid}:${event.tid}`
    const name = event.name ?? ''
    const isMainThread = mainThreadKeys.has(threadKey)

    if (isMainThread && /runtask|task/i.test(name)) measurements.mainTask.push(durationMs)
    if (isMainThread) {
      const category = classifyMainThreadEvent(name)
      if (category) measurements[category].push(durationMs)
      continue
    }
    // GPU/Compositor thread events are kept as a Cesium-related proxy only.
    // Main-thread DrawFrame events already belong to the composite bucket and
    // must not be counted a second time when deciding the dominant cost.
    if (isCesiumGpuProxyEvent(name)) measurements.cesiumGpuProxy.push(durationMs)
  }

  const categories = Object.fromEntries(
    TRACE_CATEGORY_KEYS.map((key) => [key, summarize(measurements[key])]),
  )
  const ranking = TRACE_CATEGORY_KEYS.map((key) => ({ key, totalMs: categories[key].total })).sort(
    (left, right) => right.totalMs - left.totalMs,
  )
  const first = ranking[0]
  const second = ranking[1]
  const dominant =
    first.totalMs > 0 && (second.totalMs === 0 || first.totalMs >= second.totalMs * 1.5)
      ? first.key
      : 'unclassified'

  return {
    mainThreadTask: summarize(measurements.mainTask),
    categories,
    dominance: {
      category: dominant,
      firstTotalMs: first.totalMs,
      secondTotalMs: second.totalMs,
      ratioToSecond:
        second.totalMs === 0 ? null : Number((first.totalMs / second.totalMs).toFixed(2)),
      rule: 'all runs must share one category whose inclusive trace duration is at least 1.5x the second category',
    },
  }
}

export function compactTraceSummary(summary) {
  return {
    mainThreadTask: {
      count: summary.mainThreadTask.samples.length,
      totalMs: summary.mainThreadTask.total,
      p95Ms: summary.mainThreadTask.p95,
    },
    categories: Object.fromEntries(
      TRACE_CATEGORY_KEYS.map((key) => [
        key,
        {
          count: summary.categories[key].samples.length,
          totalMs: summary.categories[key].total,
          p95Ms: summary.categories[key].p95,
        },
      ]),
    ),
    dominance: summary.dominance,
  }
}

export function summarizeScenarioRuns(runs) {
  const traceCategorySummary = Object.fromEntries(
    TRACE_CATEGORY_KEYS.map((key) => [
      key,
      {
        totalMs: summarize(runs.map((run) => run.trace.categories[key].totalMs)),
        p95Ms: summarize(runs.map((run) => run.trace.categories[key].p95Ms ?? 0)),
      },
    ]),
  )
  const dominantCategories = runs.map((run) => run.trace.dominance.category)
  const sharedCategory = dominantCategories.every(
    (category) => category !== 'unclassified' && category === dominantCategories[0],
  )

  return {
    frameP95Ms: summarize(runs.map((run) => run.frameP95Ms)),
    mainThreadTaskP95Ms: summarize(runs.map((run) => run.trace.mainThreadTask.p95Ms ?? 0)),
    traceCategories: traceCategorySummary,
    bottleneck: {
      category: sharedCategory ? dominantCategories[0] : 'unclassified',
      runCategories: dominantCategories,
      ruleSatisfied: sharedCategory,
    },
  }
}
