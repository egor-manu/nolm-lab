import { describe, expect, it } from 'vitest'
import { defaultConfig } from '../app/defaults'
import { power, zeros } from '../physics/complex'
import { simulateNolm } from '../physics/nolm'

describe('dispersion-free NOLM', () => {
  it('returns finite zeros for zero input', () => {
    const result = simulateNolm(zeros(8), defaultConfig.nolm)
    for (const field of [result.through, result.returned]) {
      expect([...field.re, ...field.im].every(Number.isFinite)).toBe(true)
      expect([...power(field)].every((value) => value === 0)).toBe(true)
    }
  })

  it('suppresses low-power CW at through port for a 50:50 coupler', () => {
    const input = { re: new Float64Array([1e-6]), im: new Float64Array([0]) }
    const result = simulateNolm(input, { ...defaultConfig.nolm, fibre: { ...defaultConfig.nolm.fibre, lengthM: 1 } })
    expect(power(result.through)[0] / power(input)[0]).toBeLessThan(1e-18)
    expect(power(result.returned)[0] / power(input)[0]).toBeCloseTo(0.1, 12)
  })

  it('conserves sample-wise power with no VOA or fibre loss', () => {
    const input = { re: new Float64Array([0.2, 1, -0.4]), im: new Float64Array([0.1, 0.3, 0.7]) }
    const params = { ...defaultConfig.nolm, voaAttenuationDb: 0, fibre: { ...defaultConfig.nolm.fibre, attenuationDbPerM: 0 } }
    const result = simulateNolm(input, params)
    const pIn = power(input), pT = power(result.through), pR = power(result.returned)
    for (let i = 0; i < pIn.length; i++) expect(pT[i] + pR[i]).toBeCloseTo(pIn[i], 12)
  })

  it('is purely linear when gamma is zero', () => {
    const input = { re: new Float64Array([1]), im: new Float64Array([0]) }
    const params = { ...defaultConfig.nolm, fibre: { ...defaultConfig.nolm.fibre, gammaWInvM: 0 } }
    const result = simulateNolm(input, params)
    expect(power(result.through)[0]).toBeLessThan(1e-28)
    expect(power(result.returned)[0]).toBeCloseTo(0.1, 13)
  })
})
