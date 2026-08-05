/// <reference lib="webworker" />
import type { LabConfig } from '../types/physics'
import { calculateMetrics } from '../physics/metrics'
import { constructCoherentField, createTimeGrid, inferPower } from '../physics/pulse'
import { simulateNolm } from '../physics/nolm'
import { power } from '../physics/complex'
import { powerToDb } from '../physics/units'
import type { SweepParameter } from './sweepWorker'

export type Sweep2dMetric = 'pulseEnergyTransmission' | 'peakPowerTransmission' | 'cwTransmission' | 'peakToCwDb' | 'averagePulseToCwDb' | 'contrastImprovementDb'

interface SweepAxis { parameter: SweepParameter; start: number; stop: number; points: number; logarithmic: boolean }
interface Sweep2dRequest { config: LabConfig; x: SweepAxis; y: SweepAxis; metric: Sweep2dMetric }

function axisValues(axis: SweepAxis): Float64Array {
  const values = new Float64Array(axis.points)
  for (let index = 0; index < axis.points; index++) {
    const fraction = index / (axis.points - 1)
    values[index] = axis.logarithmic
      ? axis.start * (axis.stop / axis.start) ** fraction
      : axis.start + fraction * (axis.stop - axis.start)
  }
  return values
}

function applyParameter(config: LabConfig, parameter: SweepParameter, value: number) {
  if (parameter === 'length') config.nolm.fibre.lengthM = value
  else if (parameter === 'voa') config.nolm.voaAttenuationDb = value
  else if (parameter === 'kappa') config.nolm.kappa = value
  else if (parameter === 'power') config.source.averagePowerW = value
  else config.source.aseFraction = value
}

self.onmessage = ({ data }: MessageEvent<Sweep2dRequest>) => {
  if (data.x.parameter === data.y.parameter) throw new RangeError('The two sweep axes must use different parameters')
  const x = axisValues(data.x)
  const y = axisValues(data.y)
  const z = new Float64Array(x.length * y.length)
  const sampleCount = Math.min(data.config.sampleCount, 4096)

  for (let yIndex = 0; yIndex < y.length; yIndex++) {
    for (let xIndex = 0; xIndex < x.length; xIndex++) {
      const config = structuredClone(data.config)
      applyParameter(config, data.x.parameter, x[xIndex])
      applyParameter(config, data.y.parameter, y[yIndex])
      const grid = createTimeGrid(config.source.repetitionRateHz, sampleCount)
      const inferred = inferPower(config.source, grid)
      const input = constructCoherentField(config.source, grid, inferred)
      const result = simulateNolm(input, config.nolm)
      const metrics = calculateMetrics(input, result, config.nolm, inferred, grid)
      let value: number
      if (data.metric === 'pulseEnergyTransmission') value = metrics.through.pulseTransmission
      else if (data.metric === 'cwTransmission') value = metrics.through.cwTransmission
      else if (data.metric === 'peakToCwDb') value = powerToDb(metrics.through.peakToCw)
      else if (data.metric === 'averagePulseToCwDb') value = powerToDb(metrics.through.averagePulseToCw)
      else if (data.metric === 'contrastImprovementDb') value = metrics.through.contrastImprovementDb
      else {
        const outputPower = power(result.through)
        let peakOutput = 0
        for (const sample of outputPower) peakOutput = Math.max(peakOutput, sample)
        value = inferred.peakPowerW > 0 ? peakOutput / inferred.peakPowerW : 0
      }
      z[yIndex * x.length + xIndex] = value
    }
    self.postMessage({ type: 'progress', completed: yIndex + 1, total: y.length })
  }
  self.postMessage({ type: 'result', x, y, z }, [x.buffer, y.buffer, z.buffer])
}

export {}
