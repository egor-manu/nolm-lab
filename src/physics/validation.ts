import type { SourceParameters, TimeGrid } from '../types/physics'
import { wavelengthFwhmToFrequency } from './units'

export function numericalWarnings(source: SourceParameters, grid: TimeGrid, maxPhase: number): string[] {
  const warnings: string[] = []
  const samplesAcrossPulse = source.pulseFwhmS / grid.dtS
  if (samplesAcrossPulse < 20) warnings.push(`Pulse is under-resolved (${samplesAcrossPulse.toFixed(1)} samples across FWHM; use at least 20).`)
  const requestedBandwidth = wavelengthFwhmToFrequency(source.spectralFwhmM, source.wavelengthM)
  if (requestedBandwidth > 0.7 / grid.dtS) warnings.push('Requested spectral width approaches or exceeds the useful FFT bandwidth.')
  if (maxPhase > 100 * Math.PI) warnings.push('Nonlinear phase exceeds 100π; results are extremely sensitive to parameters and grid resolution.')
  if (![source.averagePowerW, source.pulseFwhmS, source.repetitionRateHz].every(Number.isFinite)) warnings.push('One or more source values are non-finite.')
  return warnings
}
