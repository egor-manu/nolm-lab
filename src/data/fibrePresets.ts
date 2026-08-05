import type { FibreParameters, FibrePresetId } from '../types/physics'

export interface FibrePreset {
  id: FibrePresetId
  label: string
  description: string
  gammaWInvM: number
  attenuationDbPerM: number
}

export const fibrePresets: Record<FibrePresetId, FibrePreset> = {
  smf28: {
    id: 'smf28',
    label: 'SMF28-like',
    description: 'Generic standard-fibre engineering preset',
    gammaWInvM: 1.2e-3,
    attenuationDbPerM: 0,
  },
  hnlf: {
    id: 'hnlf',
    label: 'HNLF-like',
    description: 'Generic highly nonlinear-fibre engineering preset',
    gammaWInvM: 12e-3,
    attenuationDbPerM: 0,
  },
}

export function fibreFromPreset(id: FibrePresetId, lengthM: number): FibreParameters {
  const preset = fibrePresets[id]
  return { preset: id, lengthM, gammaWInvM: preset.gammaWInvM, attenuationDbPerM: preset.attenuationDbPerM }
}
