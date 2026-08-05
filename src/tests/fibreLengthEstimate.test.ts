import { describe, expect, it } from 'vitest'
import { defaultConfig } from '../app/defaults'
import { estimateFibreLength } from '../physics/fibreLengthEstimate'
import { dbToPower } from '../physics/units'

describe('fibre length estimator', () => {
  it('matches the analytic balanced, lossless formula', () => {
    const peak = 5.13
    const target = Math.PI
    const params = { ...defaultConfig.nolm, kappa: 0.5, fibre: { ...defaultConfig.nolm.fibre, attenuationDbPerM: 0 } }
    const expected = 2 * target / (params.fibre.gammaWInvM * peak * (1 - dbToPower(params.voaAttenuationDb)))
    expect(estimateFibreLength(params, peak, target).lengthM).toBeCloseTo(expected, 12)
  })
})
