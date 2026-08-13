import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertHardwareAcceleration,
  compactTraceSummary,
  percentile,
  summarizeScenarioRuns,
  summarizeTrace,
} from './render-trace-analysis.mjs'

test('software renderer GPU 정보를 거절한다', () => {
  assert.throws(
    () => assertHardwareAcceleration({ devices: [{ deviceString: 'Google SwiftShader' }] }),
    /Software WebGL renderer/,
  )
  assert.equal(
    assertHardwareAcceleration({ devices: [{ deviceString: 'hardware accelerated' }] }),
    true,
  )
})

test('백분위와 trace 비용 분류를 계산한다', () => {
  assert.equal(percentile([4, 1, 3, 2], 0.95), 4)

  const trace = {
    traceEvents: [
      { ph: 'M', name: 'thread_name', pid: 1, tid: 2, args: { name: 'CrRendererMain' } },
      { ph: 'X', name: 'RunTask', pid: 1, tid: 2, dur: 40000 },
      { ph: 'X', name: 'FunctionCall', pid: 1, tid: 2, dur: 30000 },
      { ph: 'X', name: 'Paint', pid: 1, tid: 2, dur: 10000 },
      { ph: 'X', name: 'DrawFrame', pid: 1, tid: 2, dur: 5000 },
      { ph: 'X', name: 'DrawFrame', pid: 1, tid: 3, dur: 5000 },
    ],
  }
  const summary = summarizeTrace(trace)

  assert.equal(summary.categories.javascript.total, 30)
  assert.equal(summary.categories.paintRaster.total, 10)
  assert.equal(summary.categories.composite.total, 5)
  assert.equal(summary.categories.cesiumGpuProxy.total, 5)
  assert.equal(summary.dominance.category, 'javascript')
  assert.deepEqual(compactTraceSummary(summary).categories.javascript, {
    count: 1,
    totalMs: 30,
    p95Ms: 30,
  })
})

test('세 반복에서 같은 지배 비용이 아닐 때 unclassified로 처리한다', () => {
  const createRun = (category) => ({
    frameP95Ms: 40,
    trace: {
      mainThreadTask: { p95Ms: 20 },
      categories: Object.fromEntries(
        ['javascript', 'gc', 'paintRaster', 'composite', 'cesiumGpuProxy'].map((key) => [
          key,
          { totalMs: key === category ? 30 : 5, p95Ms: key === category ? 30 : 5 },
        ]),
      ),
      dominance: { category },
    },
  })

  assert.equal(
    summarizeScenarioRuns([
      createRun('javascript'),
      createRun('paintRaster'),
      createRun('javascript'),
    ]).bottleneck.category,
    'unclassified',
  )
})
