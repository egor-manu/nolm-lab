import type { ComplexField, NolmParameters, NolmResult } from '../types/physics'
import { scale, zeros } from './complex'
import { couple } from './coupler'
import { propagateKerr } from './nonlinearPropagation'
import { dbToPower } from './units'

export function simulateNolm(input: ComplexField, params: NolmParameters): NolmResult {
  const empty = zeros(input.re.length)
  const [clockwiseLaunch, counterClockwiseLaunch] = couple(input, empty, params.kappa)
  const voaAmplitude = Math.sqrt(dbToPower(params.voaAttenuationDb))

  const propagate = (field: ComplexField, voaFirst: boolean) => {
    const fibreInput = voaFirst ? scale(field, voaAmplitude) : field
    const propagated = propagateKerr(fibreInput, params.fibre)
    return { field: voaFirst ? propagated.field : scale(propagated.field, voaAmplitude), phase: propagated.phase }
  }

  const clockwise = propagate(clockwiseLaunch, !params.reverseVoa)
  const counterClockwise = propagate(counterClockwiseLaunch, params.reverseVoa)
  const [through, returned] = couple(clockwise.field, counterClockwise.field, params.kappa)
  const phaseDifference = new Float64Array(input.re.length)
  for (let i = 0; i < phaseDifference.length; i++) phaseDifference[i] = clockwise.phase[i] - counterClockwise.phase[i]
  return {
    through,
    returned,
    clockwiseReturn: clockwise.field,
    counterClockwiseReturn: counterClockwise.field,
    phaseClockwise: clockwise.phase,
    phaseCounterClockwise: counterClockwise.phase,
    phaseDifference,
  }
}
