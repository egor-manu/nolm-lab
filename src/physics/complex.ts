import type { ComplexField } from '../types/physics'

export function zeros(length: number): ComplexField {
  return { re: new Float64Array(length), im: new Float64Array(length) }
}

export function cloneField(field: ComplexField): ComplexField {
  return { re: new Float64Array(field.re), im: new Float64Array(field.im) }
}

export function power(field: ComplexField): Float64Array {
  const result = new Float64Array(field.re.length)
  for (let i = 0; i < result.length; i++) result[i] = field.re[i] ** 2 + field.im[i] ** 2
  return result
}

export function meanPower(field: ComplexField): number {
  let sum = 0
  for (let i = 0; i < field.re.length; i++) sum += field.re[i] ** 2 + field.im[i] ** 2
  return sum / field.re.length
}

export function scale(field: ComplexField, re: number, im = 0): ComplexField {
  const out = zeros(field.re.length)
  for (let i = 0; i < out.re.length; i++) {
    out.re[i] = field.re[i] * re - field.im[i] * im
    out.im[i] = field.re[i] * im + field.im[i] * re
  }
  return out
}
