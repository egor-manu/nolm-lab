/// <reference lib="webworker" />
import type { LabConfig } from '../types/physics'
import { calculateMetrics } from '../physics/metrics'
import { constructCoherentField, createTimeGrid, inferPower } from '../physics/pulse'
import { simulateNolm } from '../physics/nolm'
import { power } from '../physics/complex'
import { powerToDb } from '../physics/units'

export type SweepParameter = 'length' | 'voa' | 'kappa' | 'power' | 'aseFraction'

interface SweepRequest { config: LabConfig; parameter: SweepParameter; start: number; stop: number; points: number; logarithmic: boolean }

function configured(base: LabConfig, parameter: SweepParameter, value: number): LabConfig {
  const config = structuredClone(base)
  if (parameter === 'length') config.nolm.fibre.lengthM = value
  else if (parameter === 'voa') config.nolm.voaAttenuationDb = value
  else if (parameter === 'kappa') config.nolm.kappa = value
  else if (parameter === 'power') config.source.averagePowerW = value
  else config.source.aseFraction = value
  return config
}

self.onmessage = ({ data }: MessageEvent<SweepRequest>) => {
  const x = new Float64Array(data.points)
  const pulseTransmission = new Float64Array(data.points)
  const peakPowerTransmission = new Float64Array(data.points)
  const cwTransmission = new Float64Array(data.points)
  const cwTransmissionDb = new Float64Array(data.points)
  const peakToCwDb = new Float64Array(data.points)
  const averagePulseToCwDb = new Float64Array(data.points)
  const contrastImprovementDb = new Float64Array(data.points)
  const phaseDifferencePi = new Float64Array(data.points)
  for (let index = 0; index < data.points; index++) {
    const fraction = index / (data.points - 1)
    const value = data.logarithmic ? data.start * (data.stop / data.start) ** fraction : data.start + fraction * (data.stop - data.start)
    const config = configured(data.config, data.parameter, value)
    const grid = createTimeGrid(config.source.repetitionRateHz, Math.min(config.sampleCount, 4096))
    const inferred = inferPower(config.source, grid)
    const input = constructCoherentField(config.source, grid, inferred)
    const result = simulateNolm(input, config.nolm)
    const metrics = calculateMetrics(input, result, config.nolm, inferred, grid)
    x[index] = value
    pulseTransmission[index] = metrics.through.pulseTransmission
    cwTransmission[index] = metrics.through.cwTransmission
    cwTransmissionDb[index] = metrics.through.cwTransmissionDb
    peakToCwDb[index] = powerToDb(metrics.through.peakToCw)
    averagePulseToCwDb[index] = powerToDb(metrics.through.averagePulseToCw)
    contrastImprovementDb[index] = metrics.through.contrastImprovementDb
    phaseDifferencePi[index] = metrics.maximumDifferentialPhase / Math.PI
    const outputPower = power(result.through)
    let peakOutput = 0
    for (const value of outputPower) peakOutput = Math.max(peakOutput, value)
    peakPowerTransmission[index] = inferred.peakPowerW > 0 ? peakOutput / inferred.peakPowerW : 0
  }
  const result = { x, pulseTransmission, peakPowerTransmission, cwTransmission, cwTransmissionDb, peakToCwDb, averagePulseToCwDb, contrastImprovementDb, phaseDifferencePi }
  self.postMessage(result, Object.values(result).map((values) => values.buffer))
}

export {}
