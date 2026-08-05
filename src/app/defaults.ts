import type { LabConfig } from '../types/physics'
import { fibreFromPreset } from '../data/fibrePresets'
import { MHz, mW, nm, ps, wavelengthFwhmToFrequency } from '../physics/units'

export const MODEL_VERSION = 'dispersion-free-v1'

export const defaultConfig: LabConfig = {
  modelVersion: MODEL_VERSION,
  source: {
    wavelengthM: 1550 * nm,
    repetitionRateHz: 300 * MHz,
    averagePowerW: 100 * mW,
    aseFraction: 0,
    extinctionRatioDb: 30,
    pulseFwhmS: 30 * ps,
    pulseShape: 'gaussian',
    superGaussianOrder: 3,
    spectralFwhmM: 4 * nm,
    fieldMode: 'temporal',
    chirp: 0,
  },
  nolm: {
    kappa: 0.5,
    voaAttenuationDb: 10,
    reverseVoa: false,
    fibre: fibreFromPreset('hnlf', 100),
  },
  targetPhaseRad: Math.PI,
  sampleCount: 16384,
  ase: {
    enabled: false,
    spectralFwhmHz: wavelengthFwhmToFrequency(4 * nm, 1550 * nm),
    shape: 'gaussian',
    seed: 12345,
    realizations: 32,
  },
}
