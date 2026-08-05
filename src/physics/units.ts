export const c = 299_792_458
export const nm = 1e-9
export const ps = 1e-12
export const mW = 1e-3
export const MHz = 1e6

export function dbToPower(db: number): number {
  return 10 ** (-db / 10)
}

export function powerToDb(value: number, floorDb = -300): number {
  return value > 0 ? Math.max(10 * Math.log10(value), floorDb) : floorDb
}

export function attenuationDbPerMToNatural(dbPerM: number): number {
  return dbPerM * Math.log(10) / 10
}

export function wavelengthFwhmToFrequency(fwhmM: number, centreM: number): number {
  return c * fwhmM / (centreM * centreM)
}
