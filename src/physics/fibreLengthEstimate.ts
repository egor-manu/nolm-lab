import type { NolmParameters } from '../types/physics'
import { attenuationDbPerMToNatural, dbToPower } from './units'

export interface LengthEstimate {
  lengthM: number
  effectiveLengthRequiredM: number
  attainable: boolean
  warning?: string
}

/** Solves the VOA-adjacent launched-power phase difference for arbitrary kappa. */
export function estimateFibreLength(params: NolmParameters, peakPowerW: number, targetPhaseRad: number): LengthEstimate {
  const eta = dbToPower(params.voaAttenuationDb)
  const k = params.kappa
  const coefficient = params.reverseVoa ? Math.abs((1 - k) - k * eta) : Math.abs((1 - k) * eta - k)
  const denominator = params.fibre.gammaWInvM * peakPowerW * coefficient
  if (denominator <= 0) return { lengthM: Infinity, effectiveLengthRequiredM: Infinity, attainable: false, warning: 'No differential nonlinear phase is available at this setting.' }
  const required = targetPhaseRad / denominator
  const alpha = attenuationDbPerMToNatural(params.fibre.attenuationDbPerM)
  if (alpha <= 1e-15) return { lengthM: required, effectiveLengthRequiredM: required, attainable: true }
  if (required * alpha >= 1) return { lengthM: Infinity, effectiveLengthRequiredM: required, attainable: false, warning: 'Fibre loss limits the effective length below this phase target.' }
  return { lengthM: -Math.log(1 - alpha * required) / alpha, effectiveLengthRequiredM: required, attainable: true }
}
