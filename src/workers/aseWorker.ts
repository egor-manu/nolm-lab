/// <reference lib="webworker" />
import type { ComplexField, LabConfig } from '../types/physics'
import { generateAseField } from '../physics/ase'
import { constructCoherentField, createTimeGrid, inferPower } from '../physics/pulse'
import { simulateNolm } from '../physics/nolm'
import { meanPower, power, zeros } from '../physics/complex'

interface AseRequest { config: LabConfig }

function add(a: ComplexField, b: ComplexField): ComplexField {
  const out = zeros(a.re.length)
  for (let i = 0; i < a.re.length; i++) { out.re[i] = a.re[i] + b.re[i]; out.im[i] = a.im[i] + b.im[i] }
  return out
}

self.onmessage = ({ data }: MessageEvent<AseRequest>) => {
  const { config } = data
  const grid = createTimeGrid(config.source.repetitionRateHz, config.sampleCount)
  const inferred = inferPower(config.source, grid)
  const coherent = constructCoherentField(config.source, grid, inferred)
  const coherentResult = simulateNolm(coherent, config.nolm)
  const throughCoherentPower = power(coherentResult.through)
  const returnCoherentPower = power(coherentResult.returned)
  const meanThrough = new Float64Array(grid.sampleCount)
  const meanReturned = new Float64Array(grid.sampleCount)
  const throughSamples: number[] = []
  const returnSamples: number[] = []

  for (let realization = 0; realization < config.ase.realizations; realization++) {
    const ase = generateAseField(grid, inferred.aseAveragePowerW, config.ase.spectralFwhmHz, config.ase.shape, config.ase.seed + realization)
    const totalResult = simulateNolm(add(coherent, ase), config.nolm)
    const pt = power(totalResult.through)
    const pr = power(totalResult.returned)
    for (let i = 0; i < grid.sampleCount; i++) { meanThrough[i] += pt[i]; meanReturned[i] += pr[i] }
    throughSamples.push(Math.max(0, meanPower(totalResult.through) - meanPower(coherentResult.through)))
    returnSamples.push(Math.max(0, meanPower(totalResult.returned) - meanPower(coherentResult.returned)))
    if (realization % 4 === 0) self.postMessage({ type: 'progress', completed: realization + 1, total: config.ase.realizations })
  }
  for (let i = 0; i < grid.sampleCount; i++) { meanThrough[i] /= config.ase.realizations; meanReturned[i] /= config.ase.realizations }
  const stats = (values: number[]) => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length - 1)
    return { mean, standardDeviation: Math.sqrt(variance) }
  }
  self.postMessage({
    type: 'result', meanThrough, meanReturned,
    throughAse: stats(throughSamples), returnAse: stats(returnSamples),
    inputAsePowerW: inferred.aseAveragePowerW,
    coherentThrough: throughCoherentPower,
    coherentReturned: returnCoherentPower,
  }, [meanThrough.buffer, meanReturned.buffer, throughCoherentPower.buffer, returnCoherentPower.buffer])
}

export {}
