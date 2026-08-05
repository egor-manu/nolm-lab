import { describe, expect, it } from 'vitest'
import { defaultConfig } from '../app/defaults'
import { createTimeGrid, inferPower, pulseIntensity } from '../physics/pulse'

describe('pulse and average-power model', () => {
  it('reproduces the physically consistent 20 dB reference peak power', () => {
    const grid = createTimeGrid(defaultConfig.source.repetitionRateHz, 65536)
    const referenceSource = { ...defaultConfig.source, extinctionRatioDb: 20 }
    expect(inferPower(referenceSource, grid).peakPowerW).toBeCloseTo(5.13, 2)
  })

  it('uses 30 dB as the application default extinction ratio', () => {
    expect(defaultConfig.source.extinctionRatioDb).toBe(30)
  })

  it.each([['gaussian', 1], ['superGaussian', 3]] as const)('uses intensity FWHM for %s pulses', (shape, order) => {
    const width = 30e-12
    expect(pulseIntensity(width / 2, width, shape, order)).toBeCloseTo(0.5, 13)
    expect(pulseIntensity(-width / 2, width, shape, order)).toBeCloseTo(0.5, 13)
  })
})
