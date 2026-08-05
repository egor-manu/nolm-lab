import { describe, expect, it } from 'vitest'
import { generateAseField } from '../physics/ase'
import { meanPower } from '../physics/complex'
import { createTimeGrid } from '../physics/pulse'

describe('ASE field', () => {
  it('normalises the generated complex noise to requested average power', () => {
    const field = generateAseField(createTimeGrid(300e6, 4096), 0.012, 500e9, 'gaussian', 42)
    expect(meanPower(field)).toBeCloseTo(0.012, 12)
  })
})
