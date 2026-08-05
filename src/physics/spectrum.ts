import type { ComplexField, TimeGrid } from '../types/physics'
import { zeros } from './complex'

/** In-place radix-2 FFT. The inverse transform includes 1/N normalisation. */
export function fft(field: ComplexField, inverse = false): ComplexField {
  const n = field.re.length
  if (n !== field.im.length || n < 2 || (n & (n - 1)) !== 0) throw new RangeError('FFT length must be a power of two')
  const out = { re: new Float64Array(field.re), im: new Float64Array(field.im) }
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[out.re[i], out.re[j]] = [out.re[j], out.re[i]]
      ;[out.im[i], out.im[j]] = [out.im[j], out.im[i]]
    }
  }
  for (let length = 2; length <= n; length <<= 1) {
    const angle = (inverse ? 2 : -2) * Math.PI / length
    for (let start = 0; start < n; start += length) {
      for (let j = 0; j < length / 2; j++) {
        const c = Math.cos(angle * j)
        const s = Math.sin(angle * j)
        const even = start + j
        const odd = even + length / 2
        const tr = c * out.re[odd] - s * out.im[odd]
        const ti = c * out.im[odd] + s * out.re[odd]
        const er = out.re[even]
        const ei = out.im[even]
        out.re[even] = er + tr
        out.im[even] = ei + ti
        out.re[odd] = er - tr
        out.im[odd] = ei - ti
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { out.re[i] /= n; out.im[i] /= n }
  return out
}

export function spectrum(field: ComplexField, grid: TimeGrid): { frequencyHz: Float64Array; power: Float64Array } {
  const transformed = fft(field)
  const n = field.re.length
  const frequencyHz = new Float64Array(n)
  const spectralPower = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const source = (i + n / 2) % n
    frequencyHz[i] = (i - n / 2) / (n * grid.dtS)
    spectralPower[i] = transformed.re[source] ** 2 + transformed.im[source] ** 2
  }
  return { frequencyHz, power: spectralPower }
}

export function inverseFft(field: ComplexField): ComplexField {
  return fft(field, true)
}

export function unshiftSpectrum(shifted: ComplexField): ComplexField {
  const out = zeros(shifted.re.length)
  const half = shifted.re.length / 2
  for (let i = 0; i < shifted.re.length; i++) {
    const target = (i + half) % shifted.re.length
    out.re[target] = shifted.re[i]
    out.im[target] = shifted.im[i]
  }
  return out
}
