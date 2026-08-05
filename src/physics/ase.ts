import type { AseShape, ComplexField, TimeGrid } from '../types/physics'
import { meanPower, scale, zeros } from './complex'
import { inverseFft, unshiftSpectrum } from './spectrum'

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0
    seed = seed + 0x6d2b79f5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function normal(random: () => number): [number, number] {
  const radius = Math.sqrt(-2 * Math.log(Math.max(random(), 1e-15)))
  const angle = 2 * Math.PI * random()
  return [radius * Math.cos(angle), radius * Math.sin(angle)]
}

export function generateAseField(grid: TimeGrid, averagePowerW: number, fwhmHz: number, shape: AseShape, seed: number): ComplexField {
  if (averagePowerW === 0) return zeros(grid.sampleCount)
  const random = mulberry32(seed)
  const shifted = zeros(grid.sampleCount)
  const nyquist = 1 / (2 * grid.dtS)
  for (let i = 0; i < grid.sampleCount; i++) {
    const f = (i - grid.sampleCount / 2) / grid.periodS
    const envelope = shape === 'gaussian'
      ? Math.exp(-4 * Math.log(2) * (f / fwhmHz) ** 2)
      : Math.abs(f) <= Math.min(fwhmHz / 2, nyquist) ? 1 : 0
    const [a, b] = normal(random)
    shifted.re[i] = a * Math.sqrt(envelope / 2)
    shifted.im[i] = b * Math.sqrt(envelope / 2)
  }
  const field = inverseFft(unshiftSpectrum(shifted))
  const measured = meanPower(field)
  return measured > 0 ? scale(field, Math.sqrt(averagePowerW / measured)) : field
}
