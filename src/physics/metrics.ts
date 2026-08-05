import type { ComplexField, NolmParameters, NolmResult, PortMetrics, PowerInference, SimulationMetrics, TimeGrid } from '../types/physics'
import { power, zeros } from './complex'
import { simulateNolm } from './nolm'
import { attenuationDbPerMToNatural, dbToPower, powerToDb } from './units'

function max(values: Float64Array): number {
  let result = -Infinity
  for (const value of values) result = Math.max(result, value)
  return result
}

function portMetrics(
  output: ComplexField,
  cwOutputW: number,
  inferred: PowerInference,
  grid: TimeGrid,
  inputPeakToCw: number,
): PortMetrics {
  const p = power(output)
  let energy = 0
  let clippedEnergy = 0
  let peak = 0
  for (const value of p) {
    const excess = value - cwOutputW
    energy += excess * grid.dtS
    clippedEnergy += Math.max(0, excess) * grid.dtS
    peak = Math.max(peak, value)
  }
  const cwTransmission = inferred.pedestalPowerW > 0 ? cwOutputW / inferred.pedestalPowerW : 0
  const pulseTransmission = inferred.pulseEnergyJ > 0 ? energy / inferred.pulseEnergyJ : 0
  const peakToCw = cwOutputW > 0 ? peak / cwOutputW : Infinity
  const averagePulseToCw = cwOutputW > 0 ? energy / grid.periodS / cwOutputW : Infinity
  return {
    cwTransmission,
    cwTransmissionDb: powerToDb(cwTransmission),
    pulseTransmission,
    clippedPulseTransmission: inferred.pulseEnergyJ > 0 ? clippedEnergy / inferred.pulseEnergyJ : 0,
    peakToCw,
    averagePulseToCw,
    contrastImprovementDb: powerToDb(peakToCw / inputPeakToCw),
    cwOutputPowerW: cwOutputW,
    pulseOutputEnergyJ: energy,
  }
}

export function calculateMetrics(input: ComplexField, result: NolmResult, params: NolmParameters, inferred: PowerInference, grid: TimeGrid): SimulationMetrics {
  const cw = zeros(input.re.length)
  cw.re.fill(Math.sqrt(inferred.pedestalPowerW))
  const cwResult = simulateNolm(cw, params)
  const cwThrough = power(cwResult.through)[0]
  const cwReturned = power(cwResult.returned)[0]
  const inputPeakToCw = inferred.pedestalPowerW > 0 ? inferred.peakPowerW / inferred.pedestalPowerW : Infinity
  const inputPower = power(input)
  const throughPower = power(result.through)
  const returnedPower = power(result.returned)
  let residual = 0
  const alpha = attenuationDbPerMToNatural(params.fibre.attenuationDbPerM)
  const expectedLinearTransmission = dbToPower(params.voaAttenuationDb) * Math.exp(-alpha * params.fibre.lengthM)
  for (let i = 0; i < inputPower.length; i++) {
    const expected = inputPower[i] * expectedLinearTransmission
    if (expected > 1e-20) residual = Math.max(residual, Math.abs(throughPower[i] + returnedPower[i] - expected) / expected)
  }
  return {
    through: portMetrics(result.through, cwThrough, inferred, grid, inputPeakToCw),
    returned: portMetrics(result.returned, cwReturned, inferred, grid, inputPeakToCw),
    maximumClockwisePhase: max(result.phaseClockwise),
    maximumCounterClockwisePhase: max(result.phaseCounterClockwise),
    maximumDifferentialPhase: Math.max(Math.abs(max(result.phaseDifference)), Math.abs(Math.min(...result.phaseDifference))),
    energyConservationResidual: residual,
  }
}
