import { describe, expect, it } from 'vitest'
import { fft, inverseFft } from '../physics/spectrum'

describe('FFT', () => {
  it('round trips a complex field', () => {
    const input = { re: new Float64Array([1, 2, 0, -1, 0.3, 0, 0, 2]), im: new Float64Array([0, 1, 0.2, 0, -0.4, 0, 1, 0]) }
    const output = inverseFft(fft(input))
    for (let i = 0; i < input.re.length; i++) {
      expect(output.re[i]).toBeCloseTo(input.re[i], 12)
      expect(output.im[i]).toBeCloseTo(input.im[i], 12)
    }
  })
})
