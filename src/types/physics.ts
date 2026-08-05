export interface ComplexField {
  re: Float64Array
  im: Float64Array
}

export type PulseShape = 'gaussian' | 'superGaussian'
export type FieldMode = 'temporal' | 'imposedBandwidth'
export type FibrePresetId = 'smf28' | 'hnlf'
export type AseShape = 'gaussian' | 'flat'

export interface SourceParameters {
  wavelengthM: number
  repetitionRateHz: number
  averagePowerW: number
  aseFraction: number
  extinctionRatioDb: number
  pulseFwhmS: number
  pulseShape: PulseShape
  superGaussianOrder: number
  spectralFwhmM: number
  fieldMode: FieldMode
  chirp: number
}

export interface FibreParameters {
  preset: FibrePresetId
  lengthM: number
  gammaWInvM: number
  attenuationDbPerM: number
}

export interface NolmParameters {
  kappa: number
  voaAttenuationDb: number
  reverseVoa: boolean
  fibre: FibreParameters
}

export interface TimeGrid {
  timeS: Float64Array
  dtS: number
  periodS: number
  sampleCount: number
}

export interface PowerInference {
  peakPowerW: number
  pedestalPowerW: number
  coherentAveragePowerW: number
  aseAveragePowerW: number
  pulseEnergyJ: number
  dutyFactor: number
  peakToAverage: number
}

export interface NolmResult {
  through: ComplexField
  returned: ComplexField
  clockwiseReturn: ComplexField
  counterClockwiseReturn: ComplexField
  phaseClockwise: Float64Array
  phaseCounterClockwise: Float64Array
  phaseDifference: Float64Array
}

export interface PortMetrics {
  cwTransmission: number
  cwTransmissionDb: number
  pulseTransmission: number
  clippedPulseTransmission: number
  peakToCw: number
  averagePulseToCw: number
  contrastImprovementDb: number
  cwOutputPowerW: number
  pulseOutputEnergyJ: number
}

export interface SimulationMetrics {
  through: PortMetrics
  returned: PortMetrics
  maximumClockwisePhase: number
  maximumCounterClockwisePhase: number
  maximumDifferentialPhase: number
  energyConservationResidual: number
}

export interface AseSettings {
  enabled: boolean
  spectralFwhmHz: number
  shape: AseShape
  seed: number
  realizations: number
}

export interface LabConfig {
  modelVersion: string
  source: SourceParameters
  nolm: NolmParameters
  targetPhaseRad: number
  sampleCount: number
  ase: AseSettings
}
