import type { ComplexField, PowerInference, SourceParameters, TimeGrid } from '../types/physics'
import { zeros } from './complex'

export function createTimeGrid(repetitionRateHz: number, sampleCount = 16384): TimeGrid {
  if (sampleCount < 2 || (sampleCount & (sampleCount - 1)) !== 0) throw new RangeError('Sample count must be a power of two')
  const periodS = 1 / repetitionRateHz
  const dtS = periodS / sampleCount
  const timeS = new Float64Array(sampleCount)
  for (let i = 0; i < sampleCount; i++) timeS[i] = (i - sampleCount / 2) * dtS
  return { timeS, dtS, periodS, sampleCount }
}

export function pulseIntensity(t: number, fwhmS: number, shape: SourceParameters['pulseShape'], order: number): number {
  if (shape === 'gaussian') return Math.exp(-4 * Math.log(2) * (t / fwhmS) ** 2)
  return Math.exp(-Math.log(2) * (2 * t / fwhmS) ** (2 * order))
}

export function inferPower(source: SourceParameters, grid: TimeGrid): PowerInference {
  if (source.aseFraction < 0 || source.aseFraction >= 1) throw new RangeError('ASE fraction must be in [0, 1)')
  let sum = 0
  for (const t of grid.timeS) sum += pulseIntensity(t, source.pulseFwhmS, source.pulseShape, source.superGaussianOrder)
  const dutyFactor = sum / grid.sampleCount
  const pedestalRatio = 10 ** (-source.extinctionRatioDb / 10)
  const coherentAveragePowerW = source.averagePowerW * (1 - source.aseFraction)
  const peakPowerW = coherentAveragePowerW / (pedestalRatio + (1 - pedestalRatio) * dutyFactor)
  const pedestalPowerW = peakPowerW * pedestalRatio
  const pulseEnergyJ = (peakPowerW - pedestalPowerW) * dutyFactor * grid.periodS
  return {
    peakPowerW,
    pedestalPowerW,
    coherentAveragePowerW,
    aseAveragePowerW: source.averagePowerW * source.aseFraction,
    pulseEnergyJ,
    dutyFactor,
    peakToAverage: peakPowerW / source.averagePowerW,
  }
}

export function constructCoherentField(source: SourceParameters, grid: TimeGrid, inferred = inferPower(source, grid)): ComplexField {
  const field = zeros(grid.sampleCount)
  const targetBandwidthHz = 299_792_458 * source.spectralFwhmM / source.wavelengthM ** 2
  const transformBandwidthHz = 0.441 / source.pulseFwhmS
  const bandwidthRatio = Math.max(1, targetBandwidthHz / transformBandwidthHz)
  const assumedChirp = source.fieldMode === 'imposedBandwidth' ? Math.sqrt(bandwidthRatio ** 2 - 1) : source.chirp
  for (let i = 0; i < grid.sampleCount; i++) {
    const t = grid.timeS[i]
    const g = pulseIntensity(t, source.pulseFwhmS, source.pulseShape, source.superGaussianOrder)
    const p = inferred.pedestalPowerW + (inferred.peakPowerW - inferred.pedestalPowerW) * g
    const phase = assumedChirp * (t / source.pulseFwhmS) ** 2
    field.re[i] = Math.sqrt(p) * Math.cos(phase)
    field.im[i] = Math.sqrt(p) * Math.sin(phase)
  }
  return field
}
