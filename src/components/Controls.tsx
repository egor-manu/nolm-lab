import type { Dispatch, SetStateAction } from 'react'
import type { FibrePresetId, LabConfig } from '../types/physics'
import { fibrePresets } from '../data/fibrePresets'

interface Props { config: LabConfig; setConfig: Dispatch<SetStateAction<LabConfig>>; estimatedLengthM: number }

function NumberField({ label, value, onChange, min, max, step, unit }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; unit?: string }) {
  return <label className="control"><span>{label}</span><span className="input-wrap"><input type="number" value={Number.isFinite(value) ? value : ''} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />{unit && <em>{unit}</em>}</span></label>
}

export function Controls({ config, setConfig, estimatedLengthM }: Props) {
  const source = (patch: Partial<LabConfig['source']>) => setConfig((old) => ({ ...old, source: { ...old.source, ...patch } }))
  const nolm = (patch: Partial<LabConfig['nolm']>) => setConfig((old) => ({ ...old, nolm: { ...old.nolm, ...patch } }))
  const fibre = (patch: Partial<LabConfig['nolm']['fibre']>) => setConfig((old) => ({ ...old, nolm: { ...old.nolm, fibre: { ...old.nolm.fibre, ...patch } } }))
  const choosePreset = (preset: FibrePresetId) => fibre({ preset, gammaWInvM: fibrePresets[preset].gammaWInvM, attenuationDbPerM: fibrePresets[preset].attenuationDbPerM })
  return <aside className="controls">
    <details open><summary>01 · Source</summary><div className="control-grid">
      <NumberField label="Wavelength" value={config.source.wavelengthM * 1e9} onChange={(v) => source({ wavelengthM: v * 1e-9 })} min={1000} max={2200} unit="nm" />
      <NumberField label="Repetition rate" value={config.source.repetitionRateHz / 1e6} onChange={(v) => source({ repetitionRateHz: v * 1e6 })} min={1} unit="MHz" />
      <NumberField label="Total average power" value={config.source.averagePowerW * 1e3} onChange={(v) => source({ averagePowerW: v * 1e-3 })} min={1} max={1000} unit="mW" />
      <NumberField label="ASE fraction" value={config.source.aseFraction * 100} onChange={(v) => source({ aseFraction: v / 100 })} min={0} max={99} unit="%" />
      <NumberField label="EOM extinction" value={config.source.extinctionRatioDb} onChange={(v) => source({ extinctionRatioDb: v })} min={0} unit="dB" />
    </div></details>
    <details open><summary>02 · Pulse</summary><div className="control-grid">
      <label className="control"><span>Intensity shape</span><select value={config.source.pulseShape} onChange={(e) => source({ pulseShape: e.target.value as LabConfig['source']['pulseShape'] })}><option value="gaussian">Gaussian</option><option value="superGaussian">Super-Gaussian</option></select></label>
      <NumberField label="Intensity FWHM" value={config.source.pulseFwhmS * 1e12} onChange={(v) => source({ pulseFwhmS: v * 1e-12 })} min={0.1} unit="ps" />
      {config.source.pulseShape === 'superGaussian' && <NumberField label="Super-Gaussian order" value={config.source.superGaussianOrder} onChange={(v) => source({ superGaussianOrder: v })} min={1} max={10} step={1} />}
      <NumberField label="Reference spectral FWHM" value={config.source.spectralFwhmM * 1e9} onChange={(v) => source({ spectralFwhmM: v * 1e-9 })} min={0.01} unit="nm" />
      <label className="control"><span>Field construction</span><select value={config.source.fieldMode} onChange={(e) => source({ fieldMode: e.target.value as LabConfig['source']['fieldMode'] })}><option value="temporal">Temporal envelope</option><option value="imposedBandwidth">Imposed bandwidth (assumed phase)</option></select></label>
      {config.source.fieldMode === 'temporal' && <NumberField label="Quadratic chirp" value={config.source.chirp} onChange={(v) => source({ chirp: v })} step={0.1} />}
      <p className="field-note">Duration and spectral width do not uniquely define the complex field. Imposed-bandwidth mode constructs one assumed quadratic-phase field.</p>
    </div></details>
    <details open><summary>03 · Coupler & VOA</summary><div className="control-grid">
      <label className="control range"><span>Cross coupling κ · {(config.nolm.kappa * 100).toFixed(1)}:{(100 - config.nolm.kappa * 100).toFixed(1)}</span><input type="range" min="1" max="99" step="0.5" value={config.nolm.kappa * 100} onChange={(e) => nolm({ kappa: Number(e.target.value) / 100 })} /></label>
      <NumberField label="VOA attenuation" value={config.nolm.voaAttenuationDb} onChange={(v) => nolm({ voaAttenuationDb: v })} min={0} max={30} step={0.1} unit="dB" />
      <label className="toggle"><input type="checkbox" checked={config.nolm.reverseVoa} onChange={(e) => nolm({ reverseVoa: e.target.checked })} /><span>Reverse VOA orientation</span></label>
    </div></details>
    <details open><summary>04 · Nonlinear fibre</summary><div className="control-grid">
      <label className="control"><span>Engineering preset</span><select value={config.nolm.fibre.preset} onChange={(e) => choosePreset(e.target.value as FibrePresetId)}><option value="smf28">SMF28-like</option><option value="hnlf">HNLF-like</option></select></label>
      <NumberField label="Nonlinearity γ" value={config.nolm.fibre.gammaWInvM * 1e3} onChange={(v) => fibre({ gammaWInvM: v * 1e-3 })} min={0} unit="W⁻¹ km⁻¹" />
      <NumberField label="Length" value={config.nolm.fibre.lengthM} onChange={(v) => fibre({ lengthM: v })} min={0} unit="m" />
      <label className="control range"><span>Practical length slider · direct entry may exceed it</span><input type="range" min="0" max={Math.max(1000, Number.isFinite(estimatedLengthM) ? estimatedLengthM * 2 : 1000)} step="1" value={Math.min(config.nolm.fibre.lengthM, Math.max(1000, Number.isFinite(estimatedLengthM) ? estimatedLengthM * 2 : 1000))} onChange={(e) => fibre({ lengthM: Number(e.target.value) })} /></label>
      <NumberField label="Power attenuation" value={config.nolm.fibre.attenuationDbPerM * 1000} onChange={(v) => fibre({ attenuationDbPerM: v / 1000 })} min={0} unit="dB/km" />
      <NumberField label="Target differential phase" value={config.targetPhaseRad / Math.PI} onChange={(v) => setConfig((old) => ({ ...old, targetPhaseRad: v * Math.PI }))} min={0.01} step={0.5} unit="π rad" />
      <button className="secondary" disabled={!Number.isFinite(estimatedLengthM)} onClick={() => fibre({ lengthM: estimatedLengthM })}>Use target estimate · {Number.isFinite(estimatedLengthM) ? `${estimatedLengthM.toFixed(1)} m` : 'unattainable'}</button>
    </div></details>
    <details><summary>05 · Numerical & stochastic ASE</summary><div className="control-grid">
      <label className="control"><span>Sample count</span><select value={config.sampleCount} onChange={(e) => setConfig((old) => ({ ...old, sampleCount: Number(e.target.value) }))}><option value="4096">2¹² · reduced</option><option value="16384">2¹⁴ · standard</option><option value="32768">2¹⁵ · fine</option></select></label>
      <label className="toggle"><input type="checkbox" checked={config.ase.enabled} onChange={(e) => setConfig((old) => ({ ...old, ase: { ...old.ase, enabled: e.target.checked } }))} /><span>Enable stochastic ASE</span></label>
      <NumberField label="ASE realisations" value={config.ase.realizations} onChange={(v) => setConfig((old) => ({ ...old, ase: { ...old.ase, realizations: Math.round(v) } }))} min={1} max={200} step={1} />
      <NumberField label="Random seed" value={config.ase.seed} onChange={(v) => setConfig((old) => ({ ...old, ase: { ...old.ase, seed: Math.round(v) } }))} step={1} />
      <NumberField label="ASE spectral FWHM" value={config.ase.spectralFwhmHz / 1e12} onChange={(v) => setConfig((old) => ({ ...old, ase: { ...old.ase, spectralFwhmHz: v * 1e12 } }))} min={0.001} unit="THz" />
      <label className="control"><span>ASE spectral shape</span><select value={config.ase.shape} onChange={(e) => setConfig((old) => ({ ...old, ase: { ...old.ase, shape: e.target.value as LabConfig['ase']['shape'] } }))}><option value="gaussian">Gaussian</option><option value="flat">Flat</option></select></label>
    </div></details>
  </aside>
}
