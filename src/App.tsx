import { useEffect, useMemo, useRef, useState } from 'react'
import type { Data } from 'plotly.js'
import { defaultConfig, MODEL_VERSION } from './app/defaults'
import { Controls } from './components/Controls'
import { MetricCard } from './components/MetricCard'
import { NolmSchematic } from './components/NolmSchematic'
import { ScientificPlot } from './plots/ScientificPlot'
import type { LabConfig } from './types/physics'
import type { SweepParameter } from './workers/sweepWorker'
import type { Sweep2dMetric } from './workers/sweep2dWorker'
import { constructCoherentField, createTimeGrid, inferPower } from './physics/pulse'
import { simulateNolm } from './physics/nolm'
import { calculateMetrics } from './physics/metrics'
import { estimateFibreLength } from './physics/fibreLengthEstimate'
import { power } from './physics/complex'
import { spectrum } from './physics/spectrum'
import { numericalWarnings } from './physics/validation'
import { powerToDb } from './physics/units'
import { fibrePresets } from './data/fibrePresets'
import './styles.css'

interface SweepResult {
  x: Float64Array
  pulseTransmission: Float64Array
  peakPowerTransmission: Float64Array
  cwTransmission: Float64Array
  cwTransmissionDb: Float64Array
  peakToCwDb: Float64Array
  averagePulseToCwDb: Float64Array
  contrastImprovementDb: Float64Array
  phaseDifferencePi: Float64Array
}
interface SweepRange { start: number; stop: number; points: number; logarithmic: boolean }
interface Sweep2dSettings {
  xParameter: SweepParameter; yParameter: SweepParameter
  xStart: number; xStop: number; yStart: number; yStop: number
  xPoints: number; yPoints: number
  xLogarithmic: boolean; yLogarithmic: boolean
  metric: Sweep2dMetric
}
interface Sweep2dResult { x: Float64Array; y: Float64Array; z: Float64Array }
interface AseResult {
  meanThrough: Float64Array; meanReturned: Float64Array
  throughAse: { mean: number; standardDeviation: number }
  returnAse: { mean: number; standardDeviation: number }
  inputAsePowerW: number
}

const cloneDefaults = () => structuredClone(defaultConfig)
const finite = (value: number, digits = 3) => Number.isFinite(value) ? value.toFixed(digits) : '∞'
const percent = (value: number) => `${finite(value * 100, 2)}%`
const db = (value: number) => `${finite(value, 2)} dB`
const sweepParameterLabels: Record<SweepParameter, string> = { power: 'Mean input power', length: 'Fibre length', voa: 'VOA attenuation', kappa: 'Coupler ratio', aseFraction: 'ASE fraction' }

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [config, setConfig] = useState<LabConfig>(cloneDefaults)
  const [sweepParameter, setSweepParameter] = useState<SweepParameter>('length')
  const [sweepRange, setSweepRange] = useState<SweepRange>({ start: 0, stop: 1000, points: 101, logarithmic: false })
  const [sweep, setSweep] = useState<SweepResult | null>(null)
  const [sweepBusy, setSweepBusy] = useState(false)
  const [sweep2dSettings, setSweep2dSettings] = useState<Sweep2dSettings>({
    xParameter: 'voa', yParameter: 'length', xStart: 0, xStop: 30, yStart: 0, yStop: 200,
    xPoints: 31, yPoints: 41, xLogarithmic: false, yLogarithmic: false, metric: 'pulseEnergyTransmission',
  })
  const [sweep2d, setSweep2d] = useState<Sweep2dResult | null>(null)
  const [sweep2dProgress, setSweep2dProgress] = useState(0)
  const sweep2dWorker = useRef<Worker | null>(null)
  const [aseResult, setAseResult] = useState<AseResult | null>(null)
  const [aseProgress, setAseProgress] = useState(0)
  const aseWorker = useRef<Worker | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const simulation = useMemo(() => {
    const grid = createTimeGrid(config.source.repetitionRateHz, config.sampleCount)
    const inferred = inferPower(config.source, grid)
    const input = constructCoherentField(config.source, grid, inferred)
    const result = simulateNolm(input, config.nolm)
    const metrics = calculateMetrics(input, result, config.nolm, inferred, grid)
    const estimate = estimateFibreLength(config.nolm, inferred.peakPowerW, config.targetPhaseRad)
    return { grid, inferred, input, result, metrics, estimate, warnings: numericalWarnings(config.source, grid, metrics.maximumDifferentialPhase) }
  }, [config])

  useEffect(() => {
    const worker = new Worker(new URL('./workers/sweepWorker.ts', import.meta.url), { type: 'module' })
    setSweepBusy(true)
    const factors: Record<SweepParameter, number> = { length: 1, voa: 1, kappa: 0.01, power: 0.001, aseFraction: 0.01 }
    const factor = factors[sweepParameter]
    const start = sweepRange.start * factor
    const stop = sweepRange.stop * factor
    const logarithmic = sweepRange.logarithmic && start > 0
    const timer = window.setTimeout(() => worker.postMessage({ config, parameter: sweepParameter, start, stop, points: sweepRange.points, logarithmic }), 180)
    worker.onmessage = ({ data }: MessageEvent<SweepResult>) => { setSweep(data); setSweepBusy(false) }
    return () => { window.clearTimeout(timer); worker.terminate() }
  }, [config, sweepParameter, sweepRange])

  useEffect(() => {
    sweep2dWorker.current?.terminate()
    sweep2dWorker.current = null
    setSweep2d(null)
    setSweep2dProgress(0)
  }, [config, sweep2dSettings])

  useEffect(() => () => { aseWorker.current?.terminate(); sweep2dWorker.current?.terminate() }, [])

  const runAse = () => {
    aseWorker.current?.terminate(); setAseResult(null); setAseProgress(0)
    const worker = new Worker(new URL('./workers/aseWorker.ts', import.meta.url), { type: 'module' })
    aseWorker.current = worker
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') setAseProgress(data.completed / data.total)
      else { setAseResult(data); setAseProgress(1); worker.terminate(); aseWorker.current = null }
    }
    worker.postMessage({ config })
  }

  const run2dSweep = () => {
    sweep2dWorker.current?.terminate()
    setSweep2d(null)
    setSweep2dProgress(0)
    const worker = new Worker(new URL('./workers/sweep2dWorker.ts', import.meta.url), { type: 'module' })
    sweep2dWorker.current = worker
    const factors: Record<SweepParameter, number> = { length: 1, voa: 1, kappa: 0.01, power: 0.001, aseFraction: 0.01 }
    const xFactor = factors[sweep2dSettings.xParameter]
    const yFactor = factors[sweep2dSettings.yParameter]
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') setSweep2dProgress(data.completed / data.total)
      else { setSweep2d(data); setSweep2dProgress(1); worker.terminate(); sweep2dWorker.current = null }
    }
    worker.postMessage({
      config,
      x: { parameter: sweep2dSettings.xParameter, start: sweep2dSettings.xStart * xFactor, stop: sweep2dSettings.xStop * xFactor, points: sweep2dSettings.xPoints, logarithmic: sweep2dSettings.xLogarithmic && sweep2dSettings.xStart > 0 },
      y: { parameter: sweep2dSettings.yParameter, start: sweep2dSettings.yStart * yFactor, stop: sweep2dSettings.yStop * yFactor, points: sweep2dSettings.yPoints, logarithmic: sweep2dSettings.yLogarithmic && sweep2dSettings.yStart > 0 },
      metric: sweep2dSettings.metric,
    })
  }

  const { grid, inferred, input, result, metrics, estimate } = simulation
  const presetEstimates = useMemo(() => Object.fromEntries(Object.entries(fibrePresets).map(([id, preset]) => [id, estimateFibreLength({ ...config.nolm, fibre: { ...config.nolm.fibre, gammaWInvM: preset.gammaWInvM } }, inferred.peakPowerW, config.targetPhaseRad).lengthM])), [config.nolm, config.targetPhaseRad, inferred.peakPowerW]) as Record<'smf28' | 'hnlf', number>
  const inputPower = useMemo(() => power(input), [input])
  const throughPower = useMemo(() => power(result.through), [result])
  const returnPower = useMemo(() => power(result.returned), [result])
  const timePs = useMemo(() => Array.from(grid.timeS, (v) => v * 1e12), [grid])
  const temporalWindow = Math.max(config.source.pulseFwhmS * 1e12 * 8, 120)

  const spectra = useMemo(() => {
    const entries = [spectrum(input, grid), spectrum(result.through, grid), spectrum(result.returned, grid)]
    const maxPower = Math.max(...entries[0].power)
    return { frequency: Array.from(entries[0].frequencyHz, (v) => v / 1e12), powers: entries.map((entry) => Array.from(entry.power, (v) => powerToDb(v / maxPower, -80))) }
  }, [grid, input, result])

  const timeData: Data[] = [
    { x: timePs, y: Array.from(inputPower), name: 'Input', type: 'scatter', mode: 'lines', line: { color: '#e9c46a', width: 2 } },
    { x: timePs, y: Array.from(throughPower), name: 'Through', type: 'scatter', mode: 'lines', line: { color: '#63d6c4', width: 2 } },
    { x: timePs, y: Array.from(returnPower), name: 'Return', type: 'scatter', mode: 'lines', line: { color: '#7898ff', width: 1.5 } },
  ]
  const spectrumData: Data[] = ['Input', 'Through', 'Return'].map((name, index) => ({ x: spectra.frequency, y: spectra.powers[index], name, type: 'scatter', mode: 'lines', line: { color: ['#e9c46a', '#63d6c4', '#7898ff'][index], width: index === 1 ? 2 : 1.5 } }))
  const phaseData: Data[] = [
    { x: timePs, y: Array.from(result.phaseClockwise), name: 'CW', type: 'scatter', mode: 'lines', line: { color: '#f4a261' } },
    { x: timePs, y: Array.from(result.phaseCounterClockwise), name: 'CCW', type: 'scatter', mode: 'lines', line: { color: '#7898ff' } },
    { x: timePs, y: Array.from(result.phaseDifference), name: 'Δφ', type: 'scatter', mode: 'lines', line: { color: '#63d6c4', width: 2 } },
  ]
  const sweepScale: Record<SweepParameter, [number, string, string]> = {
    length: [1, 'Fibre length', 'm'], voa: [1, 'VOA attenuation', 'dB'], kappa: [100, 'Coupler cross coupling κ', '%'], power: [1000, 'Mean input power', 'mW'], aseFraction: [100, 'ASE fraction', '%'],
  }
  const sweepX = sweep ? Array.from(sweep.x, (value) => value * sweepScale[sweepParameter][0]) : []
  const transmissionSweepData: Data[] = sweep ? [
    { x: sweepX, y: Array.from(sweep.pulseTransmission, (v) => v * 100), name: 'Pulse energy', type: 'scatter', mode: 'lines', line: { color: '#63d6c4', width: 2.5 } },
    { x: sweepX, y: Array.from(sweep.peakPowerTransmission, (v) => v * 100), name: 'Peak power', type: 'scatter', mode: 'lines', line: { color: '#e9c46a', width: 2 } },
    { x: sweepX, y: Array.from(sweep.cwTransmission, (v) => v * 100), name: 'CW', type: 'scatter', mode: 'lines', line: { color: '#7898ff', width: 2 } },
  ] : []
  const ratioSweepData: Data[] = sweep ? [
    { x: sweepX, y: Array.from(sweep.peakToCwDb), name: 'Peak pulse / CW', type: 'scatter', mode: 'lines', line: { color: '#e9c46a', width: 2 } },
    { x: sweepX, y: Array.from(sweep.averagePulseToCwDb), name: 'Avg pulse / CW', type: 'scatter', mode: 'lines', line: { color: '#63d6c4', width: 2 } },
    { x: sweepX, y: Array.from(sweep.contrastImprovementDb), name: 'Contrast improvement', type: 'scatter', mode: 'lines', line: { color: '#f08a7e', width: 2 } },
    { x: sweepX, y: Array.from(sweep.cwTransmissionDb), name: 'CW transmission', type: 'scatter', mode: 'lines', line: { color: '#7898ff', width: 1.5, dash: 'dot' } },
  ] : []
  const phaseSweepData: Data[] = sweep ? [
    { x: sweepX, y: Array.from(sweep.phaseDifferencePi), name: 'Peak |Δφ|', type: 'scatter', mode: 'lines', line: { color: '#b58cff', width: 2 } },
  ] : []
  const changeSweepParameter = (parameter: SweepParameter) => {
    setSweepParameter(parameter)
    const estimatedStop = Number.isFinite(estimate.lengthM) ? Math.max(100, estimate.lengthM * 2) : 1000
    const defaults: Record<SweepParameter, SweepRange> = {
      length: { start: 0, stop: Math.round(estimatedStop), points: 101, logarithmic: false },
      voa: { start: 0, stop: 30, points: 101, logarithmic: false },
      kappa: { start: 1, stop: 99, points: 99, logarithmic: false },
      power: { start: 1, stop: 1000, points: 101, logarithmic: true },
      aseFraction: { start: 0, stop: 80, points: 81, logarithmic: false },
    }
    setSweepRange(defaults[parameter])
  }
  const sweep2dMetricLabels: Record<Sweep2dMetric, [string, string, number]> = {
    pulseEnergyTransmission: ['Pulse-energy transmission', '%', 100],
    peakPowerTransmission: ['Peak-power transmission', '%', 100],
    cwTransmission: ['CW transmission', '%', 100],
    peakToCwDb: ['Peak pulse / CW ratio', 'dB', 1],
    averagePulseToCwDb: ['Average pulse / CW ratio', 'dB', 1],
    contrastImprovementDb: ['Contrast improvement', 'dB', 1],
  }
  const heatmapData: Data[] = useMemo(() => {
    if (!sweep2d) return []
    const xScale = sweepScale[sweep2dSettings.xParameter][0]
    const yScale = sweepScale[sweep2dSettings.yParameter][0]
    const valueScale = sweep2dMetricLabels[sweep2dSettings.metric][2]
    const z = Array.from({ length: sweep2d.y.length }, (_, yIndex) =>
      Array.from(sweep2d.z.slice(yIndex * sweep2d.x.length, (yIndex + 1) * sweep2d.x.length), (value) => value * valueScale),
    )
    return [{
      type: 'heatmap',
      x: Array.from(sweep2d.x, (value) => value * xScale),
      y: Array.from(sweep2d.y, (value) => value * yScale),
      z,
      colorscale: [[0, '#071019'], [0.35, '#17545b'], [0.7, '#54b7a8'], [1, '#f0cf75']],
      colorbar: { title: { text: sweep2dMetricLabels[sweep2dSettings.metric][1] }, thickness: 14 },
      hovertemplate: `%{x:.4g} ${sweepScale[sweep2dSettings.xParameter][2]}<br>%{y:.4g} ${sweepScale[sweep2dSettings.yParameter][2]}<br>%{z:.4g} ${sweep2dMetricLabels[sweep2dSettings.metric][1]}<extra></extra>`,
    }]
  }, [sweep2d, sweep2dSettings])

  const importConfig = async (file?: File) => {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as LabConfig
      if (parsed.modelVersion !== MODEL_VERSION) throw new Error('Unsupported model version')
      setConfig(parsed)
    } catch (error) { window.alert(`Could not import configuration: ${error instanceof Error ? error.message : 'invalid file'}`) }
  }
  const summary = `NOLM Lab: ${fibrePresets[config.nolm.fibre.preset].label}, L=${config.nolm.fibre.lengthM.toFixed(1)} m, κ=${(config.nolm.kappa * 100).toFixed(1)}%, VOA=${config.nolm.voaAttenuationDb.toFixed(1)} dB, Ppeak=${inferred.peakPowerW.toFixed(3)} W, Tpulse=${percent(metrics.through.pulseTransmission)}, TCW=${db(metrics.through.cwTransmissionDb)}.`
  const exportCsv = () => {
    const rows = ['time_s,input_W,through_W,return_W,frequency_Hz,input_spectrum_dB,through_spectrum_dB,return_spectrum_dB']
    for (let i = 0; i < grid.sampleCount; i++) rows.push([grid.timeS[i], inputPower[i], throughPower[i], returnPower[i], spectra.frequency[i] * 1e12, spectra.powers[0][i], spectra.powers[1][i], spectra.powers[2][i]].join(','))
    download('nolm-lab-data.csv', rows.join('\n'), 'text/csv')
  }

  return <div className="app-shell">
    <header className="topbar">
      <div><p className="eyebrow">DISPERSION-FREE · COMPLEX FIELD · v0.1</p><h1>NOLM <span>Lab</span></h1><p>Design and estimate nonlinear loop-mirror pulse switching and coherent-background rejection.</p></div>
      <div className="header-actions">
        <button className="secondary" onClick={() => setConfig(cloneDefaults())}>Reset defaults</button>
        <button className="secondary" onClick={() => download('nolm-lab-config.json', JSON.stringify(config, null, 2), 'application/json')}>Export JSON</button>
        <button className="secondary" onClick={exportCsv}>Export CSV</button>
        <button className="secondary" onClick={() => fileInput.current?.click()}>Import JSON</button>
        <button onClick={() => navigator.clipboard.writeText(summary)}>Copy design summary</button>
        <input ref={fileInput} hidden type="file" accept="application/json" onChange={(e) => void importConfig(e.target.files?.[0])} />
      </div>
    </header>

    <div className="workspace">
      <Controls config={config} setConfig={setConfig} estimatedLengthM={estimate.lengthM} />
      <main>
        <section className="overview-grid">
          <NolmSchematic kappa={config.nolm.kappa} attenuationDb={config.nolm.voaAttenuationDb} lengthM={config.nolm.fibre.lengthM} reverse={config.nolm.reverseVoa} />
          <section className="metrics-grid" aria-label="Key simulation metrics">
            <MetricCard accent label="Inferred pulse peak" value={`${finite(inferred.peakPowerW)} W`} detail="30 dB EOM extinction default" />
            <MetricCard label="Through pulse transmission" value={percent(metrics.through.pulseTransmission)} detail={`clipped ${percent(metrics.through.clippedPulseTransmission)}`} />
            <MetricCard label="Through CW transmission" value={db(metrics.through.cwTransmissionDb)} detail={percent(metrics.through.cwTransmission)} />
            <MetricCard label="Contrast improvement" value={db(metrics.through.contrastImprovementDb)} detail={`peak/CW ${finite(metrics.through.peakToCw, 1)}× · avg/CW ${finite(metrics.through.averagePulseToCw, 1)}×`} />
            <MetricCard label="Peak differential phase" value={`${finite(metrics.maximumDifferentialPhase / Math.PI, 2)} π`} detail={`CW ${finite(metrics.maximumClockwisePhase, 2)} · CCW ${finite(metrics.maximumCounterClockwisePhase, 2)} rad`} />
            <MetricCard label={`${finite(config.targetPhaseRad / Math.PI, 2)}π target length`} value={estimate.attainable ? `${finite(estimate.lengthM, 1)} m` : 'Unattainable'} detail={`SMF ${finite(presetEstimates.smf28, 0)} m · HNLF ${finite(presetEstimates.hnlf, 0)} m`} />
          </section>
        </section>

        {(simulation.warnings.length > 0 || !estimate.attainable) && <section className="warnings panel"><strong>Numerical / physical warnings</strong>{[...simulation.warnings, estimate.warning].filter(Boolean).map((warning) => <p key={warning}>{warning}</p>)}</section>}

        <section className="panel sweep-lab">
          <div className="sweep-header">
            <div><p className="eyebrow">ONE-PARAMETER DESIGN SWEEP</p><h2>How outputs change with {sweepScale[sweepParameter][1].toLowerCase()}</h2></div>
            {sweepBusy && <span className="busy">recalculating…</span>}
          </div>
          <div className="sweep-controls">
            <label>Sweep parameter<select value={sweepParameter} onChange={(e) => changeSweepParameter(e.target.value as SweepParameter)}><option value="power">Mean input power</option><option value="length">Fibre length</option><option value="voa">VOA attenuation</option><option value="kappa">Coupler ratio</option><option value="aseFraction">ASE fraction</option></select></label>
            <label>Start<div className="sweep-input"><input type="number" value={sweepRange.start} onChange={(e) => setSweepRange((old) => ({ ...old, start: Number(e.target.value) }))} /><span>{sweepScale[sweepParameter][2]}</span></div></label>
            <label>Stop<div className="sweep-input"><input type="number" value={sweepRange.stop} onChange={(e) => setSweepRange((old) => ({ ...old, stop: Number(e.target.value) }))} /><span>{sweepScale[sweepParameter][2]}</span></div></label>
            <label>Points<input type="number" min="21" max="301" step="10" value={sweepRange.points} onChange={(e) => setSweepRange((old) => ({ ...old, points: Math.max(21, Math.min(301, Number(e.target.value))) }))} /></label>
            <label className="toggle sweep-toggle"><input type="checkbox" checked={sweepRange.logarithmic} disabled={sweepRange.start <= 0} onChange={(e) => setSweepRange((old) => ({ ...old, logarithmic: e.target.checked }))} />Log spacing</label>
          </div>
          <div className="sweep-plot-grid">
            <div className="sweep-plot"><ScientificPlot height={300} data={transmissionSweepData} title="Through-port transmission" xTitle={`${sweepScale[sweepParameter][1]} (${sweepScale[sweepParameter][2]})`} yTitle="Transmission (%)" /></div>
            <div className="sweep-plot"><ScientificPlot height={300} data={ratioSweepData} title="Pulse-to-CW and contrast" xTitle={`${sweepScale[sweepParameter][1]} (${sweepScale[sweepParameter][2]})`} yTitle="Ratio / gain (dB)" /></div>
            <div className="sweep-plot phase-sweep"><ScientificPlot height={245} data={phaseSweepData} title="Differential nonlinear phase" xTitle={`${sweepScale[sweepParameter][1]} (${sweepScale[sweepParameter][2]})`} yTitle="Peak |Δφ| (π rad)" /></div>
          </div>
        </section>

        <section className="panel sweep2d-lab">
          <div className="sweep-header">
            <div><p className="eyebrow">TWO-PARAMETER DESIGN MAP</p><h2>{sweep2dMetricLabels[sweep2dSettings.metric][0]}</h2><p>Hold every other setting fixed and map the selected through-port coefficient over two independent parameters.</p></div>
            <div className="sweep2d-actions"><button onClick={run2dSweep}>{sweep2dWorker.current ? 'Restart sweep' : 'Run 2D sweep'}</button>{sweep2dProgress > 0 && sweep2dProgress < 1 && <progress value={sweep2dProgress} max="1" />}</div>
          </div>
          <div className="sweep2d-controls">
            <label>Horizontal axis<select value={sweep2dSettings.xParameter} onChange={(e) => setSweep2dSettings((old) => ({ ...old, xParameter: e.target.value as SweepParameter }))}>{Object.entries(sweepParameterLabels).map(([value, label]) => <option key={value} value={value} disabled={value === sweep2dSettings.yParameter}>{label}</option>)}</select></label>
            <label>X start<input type="number" value={sweep2dSettings.xStart} onChange={(e) => setSweep2dSettings((old) => ({ ...old, xStart: Number(e.target.value) }))} /></label>
            <label>X stop<input type="number" value={sweep2dSettings.xStop} onChange={(e) => setSweep2dSettings((old) => ({ ...old, xStop: Number(e.target.value) }))} /></label>
            <label>X points<input type="number" min="11" max="61" value={sweep2dSettings.xPoints} onChange={(e) => setSweep2dSettings((old) => ({ ...old, xPoints: Math.max(11, Math.min(61, Number(e.target.value))) }))} /></label>
            <label className="toggle sweep-toggle"><input type="checkbox" checked={sweep2dSettings.xLogarithmic} disabled={sweep2dSettings.xStart <= 0} onChange={(e) => setSweep2dSettings((old) => ({ ...old, xLogarithmic: e.target.checked }))} />Log X</label>
            <label>Vertical axis<select value={sweep2dSettings.yParameter} onChange={(e) => setSweep2dSettings((old) => ({ ...old, yParameter: e.target.value as SweepParameter }))}>{Object.entries(sweepParameterLabels).map(([value, label]) => <option key={value} value={value} disabled={value === sweep2dSettings.xParameter}>{label}</option>)}</select></label>
            <label>Y start<input type="number" value={sweep2dSettings.yStart} onChange={(e) => setSweep2dSettings((old) => ({ ...old, yStart: Number(e.target.value) }))} /></label>
            <label>Y stop<input type="number" value={sweep2dSettings.yStop} onChange={(e) => setSweep2dSettings((old) => ({ ...old, yStop: Number(e.target.value) }))} /></label>
            <label>Y points<input type="number" min="11" max="61" value={sweep2dSettings.yPoints} onChange={(e) => setSweep2dSettings((old) => ({ ...old, yPoints: Math.max(11, Math.min(61, Number(e.target.value))) }))} /></label>
            <label className="toggle sweep-toggle"><input type="checkbox" checked={sweep2dSettings.yLogarithmic} disabled={sweep2dSettings.yStart <= 0} onChange={(e) => setSweep2dSettings((old) => ({ ...old, yLogarithmic: e.target.checked }))} />Log Y</label>
            <label className="metric-select">Mapped coefficient<select value={sweep2dSettings.metric} onChange={(e) => setSweep2dSettings((old) => ({ ...old, metric: e.target.value as Sweep2dMetric }))}><option value="pulseEnergyTransmission">Pulse-energy transmission</option><option value="peakPowerTransmission">Peak-power transmission</option><option value="cwTransmission">CW transmission</option><option value="peakToCwDb">Peak pulse / CW ratio</option><option value="averagePulseToCwDb">Average pulse / CW ratio</option><option value="contrastImprovementDb">Contrast improvement</option></select></label>
          </div>
          {sweep2d ? <div className="heatmap"><ScientificPlot height={480} data={heatmapData} title={`${sweep2dMetricLabels[sweep2dSettings.metric][0]} map`} xTitle={`${sweepScale[sweep2dSettings.xParameter][1]} (${sweepScale[sweep2dSettings.xParameter][2]})`} yTitle={`${sweepScale[sweep2dSettings.yParameter][1]} (${sweepScale[sweep2dSettings.yParameter][2]})`} /></div> : <div className="heatmap-empty"><span>VOA attenuation × fibre length</span><p>Run the sweep to calculate a {sweep2dSettings.xPoints} × {sweep2dSettings.yPoints} design map.</p></div>}
        </section>

        <details className="diagnostics panel">
          <summary>Single operating-point time, spectrum and phase plots</summary>
          <section className="plot-grid">
            <div className="plot"><ScientificPlot data={timeData} title="Time-domain power" xTitle="Time (ps)" yTitle="Power (W)" /><p className="plot-caption">One full {finite(grid.periodS * 1e9)} ns period; zoom around ±{temporalWindow.toFixed(0)} ps.</p></div>
            <div className="plot"><ScientificPlot data={spectrumData} title="Complex-field spectrum" xTitle="Frequency detuning (THz)" yTitle="Normalised spectral power (dB)" /></div>
            <div className="plot"><ScientificPlot data={phaseData} title="Nonlinear phase diagnostics" xTitle="Time (ps)" yTitle="Phase (rad)" /></div>
          </section>
        </details>

        <section className="panel ase-panel">
          <div><p className="eyebrow">OPTIONAL STOCHASTIC MODEL</p><h2>ASE ensemble</h2><p>Each realisation adds a zero-mean complex Gaussian ASE field to the coherent field before Kerr propagation. Pulse and noise are never propagated separately.</p></div>
          <div className="ase-actions"><button disabled={!config.ase.enabled || inferred.aseAveragePowerW <= 0 || aseWorker.current !== null} onClick={runAse}>Run {config.ase.realizations} realisations</button>{aseProgress > 0 && aseProgress < 1 && <progress value={aseProgress} max="1" />}</div>
          {aseResult && <div className="ase-results"><MetricCard label="Through ASE transmission" value={db(powerToDb(aseResult.throughAse.mean / aseResult.inputAsePowerW))} detail={`σ ${finite(aseResult.throughAse.standardDeviation * 1e3)} mW`} /><MetricCard label="Through ASE suppression" value={db(-powerToDb(aseResult.throughAse.mean / aseResult.inputAsePowerW))} /><MetricCard label="Return ASE transmission" value={percent(aseResult.returnAse.mean / aseResult.inputAsePowerW)} detail={`ensemble input ${finite(aseResult.inputAsePowerW * 1e3)} mW`} /></div>}
        </section>

        <details className="panel assumptions"><summary>Model assumptions and metric definitions</summary><div className="assumption-columns"><div><h3>Fast model</h3><p>Scalar PM-aligned slowly varying envelope; ideal lossless complex coupler; instantaneous Kerr response; lumped VOA; one traversal; optional fibre attenuation.</p><p>No chromatic dispersion, Raman response, self-steepening, nonlinear absorption, SBS/SRS threshold, damage threshold, polarisation dynamics, component insertion loss, or resonator dynamics.</p></div><div><h3>Reported contrast</h3><p>CW transmission comes from a separate pedestal-only field calculation. Pulse energy subtracts that CW output level. Contrast improvement compares output peak-to-CW with its input value.</p><p>ASE is a statistical complex field when enabled. Temporal duration and spectral width remain independent inputs and cannot uniquely define phase.</p></div></div></details>
        <footer>This is an engineering estimator, not experimental validation. Verify candidate designs against component limits, dispersion, nonlinear scattering and measured data.</footer>
      </main>
    </div>
  </div>
}
