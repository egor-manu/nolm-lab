import type { ComplexField } from '../types/physics'
import { zeros } from './complex'

/**
 * Lossless coupler convention:
 * [outA, outB]^T = [[sqrt(1-k), i sqrt(k)], [i sqrt(k), sqrt(1-k)]] [inA, inB]^T.
 * At splitting, input A is the injected external port and outputs A/B launch CW/CCW.
 * At recombination, returned CW/CCW are inputs A/B and outputs A/B are through/return.
 * This locks a balanced, equal-phase low-power field to the return port.
 */
export function couple(a: ComplexField, b: ComplexField, kappa: number): [ComplexField, ComplexField] {
  if (!(kappa > 0 && kappa < 1)) throw new RangeError('Coupler kappa must be between 0 and 1')
  if (a.re.length !== b.re.length) throw new RangeError('Coupler fields must have equal length')
  const t = Math.sqrt(1 - kappa)
  const k = Math.sqrt(kappa)
  const outA = zeros(a.re.length)
  const outB = zeros(a.re.length)
  for (let i = 0; i < a.re.length; i++) {
    outA.re[i] = t * a.re[i] - k * b.im[i]
    outA.im[i] = t * a.im[i] + k * b.re[i]
    outB.re[i] = -k * a.im[i] + t * b.re[i]
    outB.im[i] = k * a.re[i] + t * b.im[i]
  }
  return [outA, outB]
}
