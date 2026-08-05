import type { ComplexField, FibreParameters } from '../types/physics'
import { zeros } from './complex'
import { attenuationDbPerMToNatural } from './units'

export function effectiveLength(lengthM: number, alphaPowerPerM: number): number {
  return Math.abs(alphaPowerPerM) < 1e-15 ? lengthM : -Math.expm1(-alphaPowerPerM * lengthM) / alphaPowerPerM
}

export function propagateKerr(field: ComplexField, fibre: FibreParameters): { field: ComplexField; phase: Float64Array } {
  const alpha = attenuationDbPerMToNatural(fibre.attenuationDbPerM)
  const leff = effectiveLength(fibre.lengthM, alpha)
  const amplitudeLoss = Math.exp(-alpha * fibre.lengthM / 2)
  const out = zeros(field.re.length)
  const phase = new Float64Array(field.re.length)
  for (let i = 0; i < field.re.length; i++) {
    const p = field.re[i] ** 2 + field.im[i] ** 2
    const phi = fibre.gammaWInvM * leff * p
    phase[i] = phi
    const cos = Math.cos(phi) * amplitudeLoss
    const sin = Math.sin(phi) * amplitudeLoss
    out.re[i] = field.re[i] * cos - field.im[i] * sin
    out.im[i] = field.re[i] * sin + field.im[i] * cos
  }
  return { field: out, phase }
}
