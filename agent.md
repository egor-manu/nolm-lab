# AGENT.md — NOLM Web Simulator

## 1. Project goal

Build a single-page, browser-based simulator for a nonlinear optical loop mirror (NOLM) used to suppress the residual CW pedestal and ASE accompanying an amplified optical pulse train.

The app is intended as a practical design and estimation tool for colleagues. It must help users estimate suitable NOLM parameters, especially:

- fibre type and fibre length;
- coupler splitting ratio;
- VOA attenuation;
- expected pulse transmission at the useful port;
- expected CW/pedestal rejection;
- expected improvement in the ratio of pulsed power to CW-background power;
- approximate ASE rejection;
- time-domain and spectral-domain output.

The application must run locally on `localhost` during development and later deploy as a static GitHub Pages site.

Do not build a backend. All calculations must run in the browser.

---

## 2. Intended physical configuration

Use the topology shown in the supplied sketch.

The NOLM consists of:

- one lossless 2×2 fibre coupler;
- a loop made predominantly from nonlinear PM fibre;
- one lumped VOA placed close to one end of the loop;
- an input field injected into one external coupler port;
- the useful signal taken from the opposite external port, referred to in this project as the transmitted or through port;
- the other external port treated as the reflected/return port.

The topology is asymmetric because of the VOA position:

- one counter-propagating field passes through the VOA first and then propagates through almost the full nonlinear-fibre length;
- the other field propagates through almost the full nonlinear-fibre length first and passes through the VOA only near the end;
- both fields pass through the VOA once;
- both therefore experience the same final lumped linear attenuation;
- they accumulate different nonlinear phase shifts because their powers inside the nonlinear fibre differ.

Implement a control that reverses the VOA orientation, i.e. exchanges which propagation direction encounters the VOA before the fibre.

The initial model should treat the VOA as directly adjacent to the coupler. Keep the internal model extensible so that a normalised VOA position along the loop can be added later.

---

## 3. Application scope

### Required in the first working release

Implement:

- deterministic pulse-plus-CW-pedestal simulation;
- optional approximate stochastic ASE simulation;
- dispersion-free Kerr propagation;
- arbitrary coupler power ratio from 1:99 to 99:1;
- VOA attenuation from 0 to 30 dB;
- selectable standard-fibre and HNLF-like presets;
- editable fibre length;
- editable fibre nonlinear coefficient;
- editable fibre attenuation, defaulting to zero;
- Gaussian and super-Gaussian pulse shapes;
- average-power-based input;
- time-domain plots;
- spectrum plots;
- both external output ports;
- pulse, CW, ASE and contrast metrics;
- one-dimensional parameter sweeps;
- automatic fibre-length estimate;
- local execution with Vite;
- static GitHub Pages deployment;
- unit tests for the physics.

### Planned but not required for the first working release

Architect the code so these can be added without rewriting the app:

- split-step Fourier NLSE solver;
- chromatic dispersion;
- third-order dispersion;
- arbitrary VOA position;
- measured complex-field import;
- measured spectrum import;
- custom fibre presets;
- two-dimensional sweeps and heat maps;
- optimisation under constraints;
- Raman response;
- self-steepening;
- component insertion losses;
- URL-based configuration sharing.

Do not implement Raman, self-steepening, polarisation dynamics or a full vector NLSE in the initial release.

---

## 4. Technology stack

Use:

- React;
- TypeScript;
- Vite;
- Plotly.js for plots;
- Vitest for tests;
- Web Workers for stochastic ASE calculations and larger parameter sweeps;
- plain CSS or a lightweight CSS approach;
- no server;
- no database;
- no proprietary APIs.

The application must work with:

```bash
npm install
npm run dev
```

and produce a production build with:

```bash
npm run build
```

Configure deployment to GitHub Pages using GitHub Actions.

The repository should remain easy to inspect and modify by researchers who are not professional front-end developers.

---

## 5. Code organisation

Use a modular structure similar to:

```text
src/
  app/
  components/
  plots/
  physics/
    coupler.ts
    pulse.ts
    inputField.ts
    nonlinearPropagation.ts
    nolm.ts
    metrics.ts
    spectrum.ts
    ase.ts
    fibreLengthEstimate.ts
    units.ts
    validation.ts
  workers/
    aseWorker.ts
    sweepWorker.ts
  data/
    fibrePresets.ts
  tests/
    coupler.test.ts
    pulse.test.ts
    nolm.test.ts
    metrics.test.ts
    spectrum.test.ts
  types/
```

Keep the numerical physics independent from React components.

Do not place physical calculations directly inside UI components.

Use explicit TypeScript types for:

- physical input parameters;
- fibre parameters;
- coupler parameters;
- VOA parameters;
- time grid;
- complex field;
- output fields;
- calculated metrics;
- sweep definitions.

---

## 6. Units and conventions

Use SI internally.

Display laboratory-friendly units in the interface:

- wavelength: nm;
- repetition rate: MHz or GHz;
- duration: ps;
- spectral width: nm and optionally THz;
- average power: mW or W;
- peak power: W;
- fibre length: m or km;
- nonlinear coefficient: W⁻¹ km⁻¹;
- attenuation: dB/km;
- VOA attenuation: dB;
- energy: pJ or nJ;
- frequency detuning: GHz or THz.

Use one central units module. Avoid scattered conversion constants.

### Field convention

Use the complex slowly varying envelope \(E(t)\) with:

\[
P(t)=|E(t)|^2.
\]

Do not simulate the 1550 nm optical carrier oscillation directly.

### Coupler convention

Define:

\[
\kappa = \text{power cross-coupling fraction},
\]

with:

- \(\kappa=0.5\): 50:50;
- \(\kappa=0.01\): 1% cross-coupled and 99% through-coupled.

Use the lossless coupler matrix:

\[
\begin{pmatrix}
E_3\\
E_4
\end{pmatrix}
=
\begin{pmatrix}
\sqrt{1-\kappa} & i\sqrt{\kappa}\\
i\sqrt{\kappa} & \sqrt{1-\kappa}
\end{pmatrix}
\begin{pmatrix}
E_1\\
E_2
\end{pmatrix}.
\]

Use the same matrix consistently at splitting and recombination, with port order documented in code and in the UI.

Do not use only power splitting. Preserve complex amplitudes and coupler phase factors.

---

## 7. Default physical parameters

Use these defaults:

| Parameter | Default |
|---|---:|
| Central wavelength | 1550 nm |
| Repetition rate | 300 MHz |
| Pulse period | 3.333333 ns |
| Pulse intensity FWHM | 30 ps |
| Total average input power | 100 mW |
| Allowed average-power range | 1 mW to 1 W |
| EOM extinction ratio | 20 dB |
| Broadened spectral FWHM | 4 nm |
| ASE fraction of total average power | user-editable; default 0 |
| Coupler ratio | 50:50 |
| Coupler range | 1:99 to 99:1 |
| VOA attenuation | user-editable, default 10 dB |
| VOA range | 0 to 30 dB |
| Fibre loss | 0 dB/km initially |
| Component insertion losses | 0 dB initially |
| Polarisation | scalar PM-aligned field |
| Useful port | transmitted/through port |
| Dispersion | disabled |

### Fibre presets

Provide at least:

#### SMF28-like

- \(\gamma=1.2\ \mathrm{W^{-1}km^{-1}}\);
- attenuation \(=0\ \mathrm{dB/km}\) initially;
- editable length;
- suggested initial sweep range based on the automatic length estimator.

#### HNLF-like

- \(\gamma=12\ \mathrm{W^{-1}km^{-1}}\);
- attenuation \(=0\ \mathrm{dB/km}\) initially;
- editable length;
- suggested initial sweep range based on the automatic length estimator.

All preset values must remain editable.

Label them as generic engineering presets, not manufacturer-certified fibre data.

---

## 8. Input power model

The primary laboratory input is total average optical power.

Let:

- \(P_{\mathrm{avg,total}}\): total average power entering the NOLM;
- \(r_{\mathrm{ASE}}\): ASE fraction of total average power, \(0\le r_{\mathrm{ASE}}<1\);
- \(P_{\mathrm{avg,coh}}=(1-r_{\mathrm{ASE}})P_{\mathrm{avg,total}}\);
- \(f_{\mathrm{rep}}\): pulse repetition rate;
- \(T_{\mathrm{rep}}=1/f_{\mathrm{rep}}\);
- \(P_{\mathrm{peak}}\): maximum coherent instantaneous power;
- \(P_{\mathrm{off}}\): coherent residual CW pedestal;
- \(\mathrm{ER}_{\mathrm{dB}}\): EOM extinction ratio.

Use:

\[
P_{\mathrm{off}}=
P_{\mathrm{peak}}10^{-\mathrm{ER}_{\mathrm{dB}}/10}.
\]

Construct the coherent instantaneous power as:

\[
P_{\mathrm{coh}}(t)
=
P_{\mathrm{off}}
+
\left(P_{\mathrm{peak}}-P_{\mathrm{off}}\right)g(t),
\]

where \(g(t)\) is the normalised pulse intensity shape with maximum 1.

The coherent average power over one period must satisfy:

\[
P_{\mathrm{avg,coh}}
=
\frac{1}{T_{\mathrm{rep}}}
\int_{-T_{\mathrm{rep}}/2}^{T_{\mathrm{rep}}/2}
P_{\mathrm{coh}}(t)\,dt.
\]

Solve numerically or analytically for \(P_{\mathrm{peak}}\).

The interface must display:

- entered total average power;
- coherent average power;
- ASE average power;
- inferred pedestal power;
- inferred pulse peak power;
- pulse energy above the pedestal;
- duty factor;
- peak-to-average ratio.

### Important default estimate

For:

- total average power \(=100\ \mathrm{mW}\);
- zero ASE;
- repetition rate \(=300\ \mathrm{MHz}\);
- Gaussian intensity FWHM \(=30\ \mathrm{ps}\);
- extinction ratio \(=20\ \mathrm{dB}\);

the inferred peak power is approximately:

\[
P_{\mathrm{peak}}\approx 5.13\ \mathrm{W}.
\]

This includes the average-power contribution of the 20 dB residual CW pedestal.

For comparison, if the same 100 mW average power were attributed entirely to Gaussian pulses with no pedestal, the inferred peak power would be approximately:

\[
P_{\mathrm{peak}}\approx 10.44\ \mathrm{W}.
\]

Use the first value as the physically consistent default estimate.

The app must recompute the inferred peak power whenever average power, ASE fraction, repetition rate, duration, pulse shape or extinction ratio changes.

---

## 9. Pulse shapes

Implement:

### Gaussian intensity

\[
g(t)=
\exp\left[
-4\ln 2
\left(
\frac{t}{\tau_{\mathrm{FWHM}}}
\right)^2
\right].
\]

### Super-Gaussian intensity

\[
g(t)=
\exp\left[
-\ln 2
\left(
\frac{2t}{\tau_{\mathrm{FWHM}}}
\right)^{2m}
\right],
\]

where \(m\ge1\).

Use:

- default super-Gaussian order \(m=3\);
- editable range \(1\le m\le10\).

Check the FWHM convention numerically in tests.

The initial temporal phase may be set using a quadratic phase parameter, but chirp must not alter the time-domain switching result in the dispersion-free model except through the complex output spectrum.

---

## 10. Spectral width treatment

The source has already passed through an amplifier and nonlinear broadening fibre before entering the NOLM.

Therefore:

- temporal FWHM and spectral FWHM are independent user inputs;
- do not force a transform-limited relation;
- do not infer that duration and spectral width uniquely determine the complex field;
- label any constructed phase model as an assumption.

Default spectral FWHM:

\[
\Delta\lambda_{\mathrm{FWHM}}=4\ \mathrm{nm}
\]

at 1550 nm.

For the initial deterministic mode, support two field-construction modes:

### Mode A: temporal-envelope mode

- construct the selected temporal power profile;
- apply optional quadratic temporal phase;
- calculate the resulting spectrum;
- display the calculated spectral width;
- treat the entered 4 nm value as a reference target only.

### Mode B: imposed-bandwidth approximate mode

Construct a plausible complex field with the selected temporal intensity FWHM and approximate spectral FWHM.

Use a documented numerical phase-adjustment procedure or a quadratic-phase approximation.

Clearly show:

> Duration and spectral width do not uniquely define the complex field. This mode produces one assumed field consistent with the selected summary parameters.

Do not silently claim uniqueness.

Later, allow complex-field upload.

---

## 11. ASE model

ASE is distinct from the coherent CW pedestal.

The initial release should support an optional stochastic ASE mode.

Inputs:

- ASE fraction of total average power;
- ASE spectral FWHM;
- spectral shape: flat or Gaussian;
- random seed;
- number of realisations;
- default number of realisations: 32;
- user-selectable range: 1 to 200.

Generate a zero-mean complex Gaussian random field in the frequency domain:

\[
E_{\mathrm{ASE}}(f)
=
\sqrt{S_{\mathrm{ASE}}(f)\Delta f}\,\xi(f),
\]

where \(\xi(f)\) contains independent circular complex Gaussian samples.

Transform to the time domain and normalise the ensemble to the requested ASE average power.

For each realisation, propagate the total field:

\[
E_{\mathrm{total}}(t)
=
E_{\mathrm{coh}}(t)+E_{\mathrm{ASE}}(t).
\]

Do not propagate pulse and ASE separately through the Kerr nonlinearity and then merely add output powers, because the nonlinear phase depends on total instantaneous intensity.

Display stochastic results as ensemble means, with optional shaded variability.

Keep a fast deterministic mode that excludes ASE.

---

## 12. Dispersion-free fibre propagation

For fibre power-attenuation coefficient \(\alpha\) in \(\mathrm{m^{-1}}\):

\[
L_{\mathrm{eff}}
=
\frac{1-\exp(-\alpha L)}{\alpha},
\]

and for \(\alpha\rightarrow0\):

\[
L_{\mathrm{eff}}\rightarrow L.
\]

If fibre attenuation is given in dB/km, convert correctly to the natural power attenuation coefficient.

For an input field \(E(t)\), the dispersion-free Kerr propagation through fibre length \(L\) is:

\[
E(L,t)
=
E(0,t)
\exp\left(-\frac{\alpha L}{2}\right)
\exp\left(i\gamma L_{\mathrm{eff}}|E(0,t)|^2\right).
\]

Use consistent units for \(\gamma\).

Internally convert \(\gamma\) from \(\mathrm{W^{-1}km^{-1}}\) to \(\mathrm{W^{-1}m^{-1}}\).

---

## 13. VOA model

Let \(A_{\mathrm{VOA,dB}}\) be the VOA power attenuation.

Power transmission:

\[
\eta_{\mathrm{V}}
=
10^{-A_{\mathrm{VOA,dB}}/10}.
\]

Field transmission:

\[
a_{\mathrm{V}}
=
\sqrt{\eta_{\mathrm{V}}}.
\]

Apply the VOA as a lumped field multiplier.

One direction receives the VOA before nonlinear propagation; the other receives it after nonlinear propagation.

Both directions pass through the VOA exactly once.

---

## 14. NOLM calculation

Implement the calculation at the field level.

For an input \(E_{\mathrm{in}}(t)\), split using the coupler matrix.

Track:

- clockwise field;
- counter-clockwise field;
- which one sees the VOA first;
- nonlinear phase accumulated by each;
- final complex fields returning to the coupler;
- both external output fields after recombination.

Do not derive output powers by inserting only a scalar nonlinear-phase difference into a memorised transmission formula. The field-level implementation is required for later extension to ASE and NLSE propagation.

For diagnostics, calculate:

\[
\phi_{\mathrm{NL,cw}}(t),
\qquad
\phi_{\mathrm{NL,ccw}}(t),
\]

and:

\[
\Delta\phi_{\mathrm{NL}}(t)
=
\phi_{\mathrm{NL,cw}}(t)
-
\phi_{\mathrm{NL,ccw}}(t).
\]

For a 50:50 coupler and negligible fibre loss, the expected peak nonlinear-phase difference in the idealised VOA-adjacent geometry is approximately:

\[
|\Delta\phi_{\mathrm{NL,peak}}|
=
\frac{\gamma L P_{\mathrm{peak}}}{2}
\left(1-\eta_{\mathrm{V}}\right).
\]

Use this only as a diagnostic and initial estimate. The actual output must come from the full complex-field calculation.

---

## 15. Fibre-length estimator

The app must estimate a useful initial fibre-length range.

Define a target nonlinear-phase difference \(\Delta\phi_{\mathrm{target}}\), user-selectable, with useful presets:

- \(\pi/2\);
- \(\pi\);
- custom.

For a 50:50 coupler, negligible fibre attenuation and the default VOA placement:

\[
L_{\mathrm{target}}
\approx
\frac{2\Delta\phi_{\mathrm{target}}}
{\gamma P_{\mathrm{peak}}(1-\eta_{\mathrm{V}})}.
\]

For arbitrary coupler ratio, use the corresponding launched powers and solve numerically.

The UI should:

- show the estimated length;
- select a sweep range automatically around that estimate;
- permit manual override;
- initially cap the ordinary slider at a practical range;
- permit direct numeric entry beyond the slider range;
- warn when the result exceeds a user-friendly range;
- warn when fibre attenuation makes additional length ineffective.

Do not assume 100 m is always sufficient.

For the default operating point, calculate and display separate estimates for SMF28-like and HNLF-like fibre.

---

## 16. Time grid

Simulate one pulse period:

\[
T_{\mathrm{rep}}=1/f_{\mathrm{rep}}.
\]

At 300 MHz:

\[
T_{\mathrm{rep}}\approx3.333\ \mathrm{ns}.
\]

The time grid must resolve a 30 ps pulse and support a meaningful FFT.

Use a power-of-two sample count.

Provide:

- automatic mode;
- advanced manual mode.

Automatic mode should choose a sufficiently fine grid based on pulse duration and period.

Start with a default of at least \(2^{14}\) samples if browser performance permits.

Validate that the pulse has enough samples across its FWHM.

Warn if the selected grid is under-resolved.

For stochastic ASE or large sweeps, allow reduced-resolution mode with a visible warning.

---

## 17. Spectrum calculation

Calculate spectra from the complex field using an FFT.

Display frequency detuning relative to the optical carrier.

Also offer wavelength detuning near 1550 nm using the proper frequency-to-wavelength mapping.

Provide:

- linear spectral power;
- normalised dB spectrum;
- input spectrum;
- transmitted-port spectrum;
- reflected-port spectrum;
- optional coherent-only and total spectra;
- optional spectral-envelope smoothing.

The periodic one-window simulation represents a 300 MHz pulse train. Explain that the exact spectrum contains comb lines separated by 300 MHz.

Support:

- comb-resolved view;
- smoothed spectral-envelope view.

Avoid plotting log values below a reasonable numerical floor.

---

## 18. Metrics

The main design target is the output ratio between the pulsed component and the coherent CW component.

Calculate all metrics for both external ports, while emphasising the transmitted/through port.

### CW-only transmission

Run a separate deterministic CW-only calculation using:

\[
E_{\mathrm{CW}}=\sqrt{P_{\mathrm{off}}}.
\]

Define:

\[
T_{\mathrm{CW}}
=
\frac{P_{\mathrm{CW,out}}}{P_{\mathrm{off}}}.
\]

Report in linear units and dB.

### Pulse energy above pedestal

Define input pulse energy above the coherent pedestal:

\[
E_{\mathrm{pulse,in}}
=
\int_0^{T_{\mathrm{rep}}}
\left[
P_{\mathrm{coh,in}}(t)-P_{\mathrm{off}}
\right]dt.
\]

For the output, subtract the separately calculated CW-only output level:

\[
E_{\mathrm{pulse,out}}
=
\int_0^{T_{\mathrm{rep}}}
\left[
P_{\mathrm{out}}(t)-P_{\mathrm{CW,out}}
\right]dt.
\]

Also report a clipped version:

\[
E_{\mathrm{pulse,out}}^{+}
=
\int
\max\left[
P_{\mathrm{out}}(t)-P_{\mathrm{CW,out}},0
\right]dt,
\]

because interference may create local values below the CW-only reference.

Define pulse-energy transmission:

\[
T_{\mathrm{pulse}}
=
\frac{E_{\mathrm{pulse,out}}}{E_{\mathrm{pulse,in}}}.
\]

### Pulse-to-CW power ratio

Report at least:

1. Peak pulse to CW:
   \[
   R_{\mathrm{peak/CW}}
   =
   \frac{P_{\mathrm{peak,out}}}{P_{\mathrm{CW,out}}}.
   \]

2. Pulse-average-above-pedestal to CW:
   \[
   R_{\mathrm{avg/CW}}
   =
   \frac{f_{\mathrm{rep}}E_{\mathrm{pulse,out}}}{P_{\mathrm{CW,out}}}.
   \]

3. Contrast improvement:
   \[
   G_{\mathrm{contrast,dB}}
   =
   10\log_{10}
   \left(
   \frac{R_{\mathrm{out}}}{R_{\mathrm{in}}}
   \right).
   \]

Make the metric definition visible in a tooltip or expandable explanation.

### ASE metrics

When ASE mode is enabled, report:

- input ASE average power;
- output ASE average power;
- ASE transmission;
- ASE suppression in dB;
- output coherent pulse to ASE ratio;
- ensemble uncertainty.

### Other diagnostics

Report:

- inferred peak power;
- pulse energy;
- pedestal power;
- maximum nonlinear phase in each direction;
- maximum differential nonlinear phase;
- effective nonlinear length;
- transmitted pulse-energy fraction;
- reflected pulse-energy fraction;
- CW transmitted fraction;
- CW reflected fraction;
- energy-conservation residual where applicable.

---

## 19. Main UI layout

Build a clear one-page scientific interface.

Suggested layout:

### Header

- title: `NOLM Pulse and Background Filter Simulator`;
- one-sentence description;
- link to model assumptions;
- reset-to-default button;
- export configuration button.

### Left control panel

Sections:

1. Source
   - wavelength;
   - repetition rate;
   - total average power;
   - ASE fraction;
   - EOM extinction ratio.

2. Pulse
   - Gaussian or super-Gaussian;
   - temporal FWHM;
   - super-Gaussian order;
   - spectral FWHM;
   - field-construction mode;
   - optional chirp.

3. Coupler and VOA
   - coupler cross-coupling percentage;
   - displayed ratio;
   - VOA attenuation;
   - reverse VOA orientation.

4. Fibre
   - preset;
   - \(\gamma\);
   - length;
   - attenuation;
   - automatic length suggestion.

5. Numerical settings
   - deterministic or stochastic ASE;
   - sample count;
   - random seed;
   - number of ASE realisations.

### Main results area

Show:

- clean vector NOLM schematic;
- key metric cards;
- time-domain plot;
- spectral plot;
- nonlinear-phase plot;
- parameter sweep plot;
- model assumptions and warnings.

The layout must remain usable on a laptop screen.

Use responsive design, but optimise first for desktop use.

---

## 20. Interactive schematic

Create a clean vector schematic based on the supplied hand sketch.

Show:

- input port;
- transmitted output port;
- reflected/return port;
- 2×2 coupler;
- clockwise arrow;
- counter-clockwise arrow;
- VOA;
- nonlinear fibre;
- fibre length;
- coupler ratio;
- VOA attenuation;
- indication of which direction sees the VOA first.

Do not use the photograph itself as the primary visual.

The schematic must update labels when the VOA orientation is reversed.

---

## 21. Parameter sweeps

Implement at least one-dimensional sweeps for:

- fibre length;
- VOA attenuation;
- coupler ratio;
- average input power;
- ASE fraction.

Allow selection of an output metric, including:

- transmitted pulse-energy fraction;
- transmitted CW fraction;
- pulse-to-CW ratio;
- contrast improvement;
- ASE suppression;
- peak nonlinear-phase difference.

For fibre-length sweeps:

- provide linear and logarithmic options where useful;
- mark the current operating point;
- mark local maxima of the selected objective;
- show the automatically estimated target length.

Do not freeze the UI during large sweeps. Use a Web Worker where needed.

---

## 22. Model assumptions panel

Include an expandable panel stating:

- scalar PM-aligned envelope;
- perfect polarisation maintenance;
- ideal lossless coupler unless edited later;
- zero component insertion loss;
- instantaneous Kerr nonlinearity;
- no chromatic dispersion in Fast mode;
- no Raman response;
- no self-steepening;
- no nonlinear absorption;
- no SBS or SRS threshold model;
- no damage-threshold model;
- VOA treated as a lumped attenuator;
- one NOLM traversal;
- no resonator dynamics;
- ASE represented statistically when enabled;
- duration and spectral width do not uniquely specify a complex field.

Do not hide these assumptions.

---

## 23. Validation and unit tests

Create automated tests for the following.

### Coupler unitarity

For a lossless coupler, verify conservation of field energy:

\[
|E_1|^2+|E_2|^2
=
|E_3|^2+|E_4|^2.
\]

### Zero nonlinearity

For \(\gamma=0\), verify purely linear interferometric behaviour.

### Zero input

For zero field, all outputs must be zero and finite.

### No VOA attenuation

For \(A_{\mathrm{VOA}}=0\), both directions have the same lumped attenuation factor.

### Equal nonlinear phases

When both directions accumulate equal nonlinear phases, verify the expected low-power NOLM port state under the chosen port convention.

### 50:50 low-power CW behaviour

Verify that the low-power CW is directed predominantly to the reflected/return port and suppressed at the transmitted/through port.

This test determines and locks the port convention used in the UI.

### Lossless energy conservation

For:

- zero fibre attenuation;
- zero VOA attenuation;
- lossless coupler;

verify at every time sample:

\[
P_{\mathrm{through}}(t)+P_{\mathrm{return}}(t)
=
P_{\mathrm{in}}(t)
\]

within numerical tolerance.

### Peak-power inference

Verify the default estimate:

- 100 mW total average power;
- zero ASE;
- 300 MHz;
- 30 ps Gaussian intensity FWHM;
- 20 dB extinction ratio;

must give approximately \(5.13\ \mathrm{W}\).

### Pulse FWHM

Numerically verify the selected pulse shape has the requested intensity FWHM.

### FFT round trip

Verify that FFT followed by inverse FFT reproduces the field within tolerance.

### ASE normalisation

Verify that ensemble-average ASE power matches the requested ASE average power within statistical tolerance.

### Fibre-length estimate

Compare analytic and numerical estimates in the low-loss 50:50 limiting case.

---

## 24. Numerical safeguards

Implement warnings for:

- fewer than 20 samples across pulse FWHM;
- FFT aliasing;
- insufficient spectral window;
- non-finite values;
- invalid negative power;
- ASE fraction outside \([0,1)\);
- coupler ratio at exactly 0 or 1;
- impractically large nonlinear phase;
- fibre length beyond a reasonable numerical range;
- mismatch between requested spectral width and representable FFT bandwidth;
- too few stochastic realisations;
- results dominated by numerical floor.

Clamp only where mathematically justified.

Never silently replace invalid physical inputs.

---

## 25. Performance

The deterministic model should update interactively while sliders move.

Targets:

- ordinary deterministic update: under about 100 ms on a modern laptop;
- one-dimensional sweep: preferably under a few seconds;
- stochastic ASE calculation: run asynchronously with progress indication;
- cancel previous worker calculation when parameters change.

Debounce expensive updates.

Do not recompute unchanged quantities.

---

## 26. Configuration and export

Allow users to:

- reset defaults;
- export all parameters as JSON;
- import a JSON configuration;
- export plotted numerical data as CSV;
- export figures as PNG or SVG where supported;
- copy a compact text summary of the selected NOLM design.

The exported configuration must include a model-version identifier.

---

## 27. Documentation

Create:

- `README.md`;
- `MODEL.md`;
- `CONTRIBUTING.md`;
- inline documentation for all physical formulas;
- a short GitHub Pages deployment guide.

`README.md` must include:

- purpose;
- screenshot placeholder;
- local setup;
- build command;
- test command;
- deployment;
- high-level assumptions;
- disclaimer that the tool is an engineering estimator rather than a substitute for experimental verification.

`MODEL.md` must contain:

- topology;
- coupler convention;
- input-field definition;
- average-to-peak conversion;
- pulse shapes;
- VOA model;
- fibre model;
- NOLM field recombination;
- CW metric;
- pulse metric;
- ASE model;
- spectral calculation;
- limitations;
- planned NLSE extension.

---

## 28. GitHub Pages deployment

Configure deployment using GitHub Actions.

The Vite base path must work for a project repository, not only a user root page.

Document where the repository name must be inserted or determine it automatically where possible.

The production build must contain no server-dependent routes.

Test the production build locally using a static preview command before considering deployment complete.

---

## 29. Development workflow

Proceed in this order:

1. Initialise Vite React TypeScript project.
2. Implement units and physical types.
3. Implement complex-number utilities or use a small well-maintained dependency.
4. Implement coupler.
5. Implement pulse generation and average-to-peak conversion.
6. Implement VOA.
7. Implement dispersion-free Kerr fibre propagation.
8. Implement complete NOLM field calculation.
9. Add physics unit tests.
10. Verify low-power 50:50 CW routing and lock the port convention.
11. Build basic controls.
12. Add time-domain plots.
13. Add spectral plots.
14. Add metrics.
15. Add fibre-length estimator.
16. Add one-dimensional sweeps.
17. Add stochastic ASE mode in a worker.
18. Add export/import.
19. Add responsive styling.
20. Add documentation.
21. Configure GitHub Pages.
22. Run all tests and production build.
23. Provide a concise completion report listing implemented features, validation results and remaining limitations.

Do not start with visual polish before the physics tests pass.

---

## 30. Acceptance criteria

The project is acceptable when:

- it runs locally with `npm run dev`;
- it builds with `npm run build`;
- all tests pass;
- 50:50 low-power CW is suppressed at the selected transmitted port;
- the default average-power inputs produce approximately 5.13 W peak power;
- the user can vary fibre type, fibre length, coupler ratio and VOA attenuation;
- both output ports are shown;
- time and spectral outputs are plotted;
- CW transmission and pulse transmission are reported separately;
- pulse-to-CW ratio and contrast improvement are reported;
- the fibre-length estimate updates automatically;
- ASE fraction can be enabled and simulated statistically;
- calculations do not block the browser;
- the topology and assumptions are documented;
- the site can be deployed to GitHub Pages;
- no backend is required.

---

## 31. Important implementation prohibitions

Do not:

- omit complex coupler phase factors;
- call amplitude transmission and power transmission by the same variable;
- treat 20 dB extinction as an amplitude ratio;
- infer 10 W peak power directly from 100 mW average power without including the CW pedestal;
- force temporal and spectral widths to obey a transform-limited relation;
- claim that temporal width and spectral width uniquely define the field;
- model ASE as a deterministic CW level;
- propagate pulse and ASE independently through Kerr nonlinearity and then add powers;
- hard-code 100 m as the required fibre length;
- assume 50:50 is optimal without showing the simulated result;
- hide the second NOLM output port;
- implement the physics inside React rendering code;
- introduce a backend;
- add dispersion to the initial Fast mode;
- report a design as experimentally validated.

---

## 32. Future NLSE extension

Prepare interfaces for an optional split-step Fourier solver implementing:

\[
\frac{\partial A}{\partial z}
=
-\frac{\alpha}{2}A
-i\frac{\beta_2}{2}\frac{\partial^2 A}{\partial t^2}
+\frac{\beta_3}{6}\frac{\partial^3 A}{\partial t^3}
+i\gamma|A|^2A.
\]

The two counter-propagating fields must be propagated separately because the VOA is encountered at different positions.

Retain the analytic dispersion-free solver as Fast mode.

Do not implement this advanced solver until the deterministic dispersion-free model and tests are complete.

---

## 33. Final agent output

When the implementation is complete, report:

- files created;
- commands to run locally;
- test results;
- production build result;
- GitHub Pages deployment steps;
- physical validation cases passed;
- current limitations;
- recommended next development step.

Do not merely state that the app is complete. Demonstrate completion through passing tests and a successful production build.
