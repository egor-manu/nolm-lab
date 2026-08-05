import { describe, expect, it } from 'vitest'
import { couple } from '../physics/coupler'
import { zeros } from '../physics/complex'

describe('lossless complex coupler', () => {
  it('is unitary for arbitrary complex fields', () => {
    const a = { re: new Float64Array([1, -0.2]), im: new Float64Array([0.4, 0.7]) }
    const b = { re: new Float64Array([0.3, 0.9]), im: new Float64Array([-0.5, 0.1]) }
    const [c, d] = couple(a, b, 0.37)
    for (let i = 0; i < 2; i++) {
      const input = a.re[i] ** 2 + a.im[i] ** 2 + b.re[i] ** 2 + b.im[i] ** 2
      const output = c.re[i] ** 2 + c.im[i] ** 2 + d.re[i] ** 2 + d.im[i] ** 2
      expect(output).toBeCloseTo(input, 13)
    }
  })

  it('maps a balanced equal-phase round trip to the return port', () => {
    const input = { re: new Float64Array([1]), im: new Float64Array([0]) }
    const [cw, ccw] = couple(input, zeros(1), 0.5)
    const [through, returned] = couple(cw, ccw, 0.5)
    expect(through.re[0] ** 2 + through.im[0] ** 2).toBeLessThan(1e-28)
    expect(returned.re[0] ** 2 + returned.im[0] ** 2).toBeCloseTo(1, 14)
  })
})
