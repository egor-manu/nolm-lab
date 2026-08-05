# NOLM Lab physical model

## Topology and port convention

External port 1 injects the slowly varying complex envelope `E`, for which `P = |E|²`. The first coupler traversal launches clockwise and counter-clockwise loop fields. At the second traversal, the returned CW and CCW fields occupy the two coupler inputs in the same order. Recombination output A is called **through/transmitted** and output B **return/reflected**.

The lossless coupler matrix is

```text
[ E_A ]   [ sqrt(1-κ)   i sqrt(κ) ] [ E_1 ]
[ E_B ] = [ i sqrt(κ)   sqrt(1-κ) ] [ E_2 ]
```

With `κ = 0.5` and equal loop phase, two applications of this matrix make the through port dark and route the field to the return port. Tests lock this convention.

The VOA is adjacent to the coupler. By default the CW field experiences VOA → fibre; the CCW field experiences fibre → VOA. Reversing orientation exchanges these sequences. Both fields cross the VOA exactly once and therefore have the same final linear VOA attenuation, but different powers during nonlinear propagation.

## Input field and average-to-peak conversion

For normalised pulse intensity `g(t)`, pedestal ratio `q = 10^(-ER_dB/10)`, and coherent peak power `P_peak`,

```text
P_off = q P_peak
P_coh(t) = P_off + (P_peak - P_off) g(t)
P_avg,coh = (1 - r_ASE) P_avg,total
P_peak = P_avg,coh / [q + (1-q)<g>]
```

The mean is evaluated on the full one-period numerical grid. At 100 mW, 300 MHz, 30 ps Gaussian intensity FWHM, zero ASE, and 20 dB extinction, this gives approximately 5.13 W rather than the pedestal-free 10.44 W value.

Pulse energy above pedestal is `(P_peak-P_off)<g>/f_rep`.

## Pulse shapes and phase assumption

Gaussian intensity:

```text
g(t) = exp[-4 ln(2) (t/τ_FWHM)²]
```

Super-Gaussian intensity of order `m`:

```text
g(t) = exp[-ln(2) (2t/τ_FWHM)^(2m)]
```

Temporal-envelope mode applies an optional quadratic temporal phase. Imposed-bandwidth mode estimates a quadratic chirp from the requested bandwidth ratio. Duration and spectral width do not uniquely specify a complex field; this is only one plausible construction.

## VOA and fibre

For VOA power attenuation `A_V,dB`, power transmission is `η_V = 10^(-A_V,dB/10)` and field transmission is `a_V = sqrt(η_V)`.

Fibre attenuation in dB/m is converted to the natural power coefficient `α = attenuation_dB/m ln(10)/10`. The analytic fast solver uses

```text
L_eff = [1-exp(-αL)]/α              (L when α→0)
E(L,t) = E(0,t) exp(-αL/2) exp[i γ L_eff |E(0,t)|²]
```

`γ` is stored internally in W⁻¹ m⁻¹.

## NOLM recombination and length estimate

The code splits, attenuates, propagates, and recombines complex arrays directly; it does not use a memorised scalar transmission curve. CW and CCW nonlinear phases and their difference are retained as diagnostics.

For arbitrary `κ` in the default orientation, the lossless required effective length is calculated from

```text
Δφ = γ L_eff P_peak |(1-κ)η_V - κ|.
```

The reversed orientation uses `|(1-κ)-κη_V|`. Fibre attenuation is inverted analytically from the required effective length, with an unattainable warning when loss saturation prevents reaching the target. At `κ=0.5` this reduces to the specification's `2Δφ/[γP_peak(1-η_V)]` expression.

## Metrics

A separate pedestal-only field is propagated to obtain each port's CW transmission. Output pulse energy integrates output power minus this CW-only level. A clipped integral is also reported because interference can make the local result fall below the CW reference.

Pulse transmission is output pulse energy divided by input pulse energy above pedestal. Peak/CW and pulse-average/CW ratios use the separately propagated CW level. Contrast improvement is `10 log10(R_out/R_in)`.

## Spectrum and ASE

The spectrum is a radix-2 FFT of the complex envelope and is displayed against carrier-frequency detuning. One simulated repetition period represents a pulse train, so exact spectral lines are spaced by `f_rep`.

Stochastic ASE is generated as circular complex Gaussian frequency-domain noise with flat or Gaussian spectral weighting. Every realisation is normalised to requested average ASE power and added to the coherent field **before** nonlinear propagation. Ensemble ASE output is estimated by subtracting deterministic coherent output average power from each total-field output average. This estimator becomes noisy for few realisations and is reported with sample standard deviation.

## Limitations and planned NLSE extension

The initial model is scalar, PM-aligned, dispersion-free, and single-pass. It assumes an ideal coupler, lumped VOA, zero component insertion loss, instantaneous Kerr response, and no Raman response, self-steepening, nonlinear absorption, SBS/SRS threshold, damage threshold, or resonator dynamics. Fibre presets are generic, not manufacturer-certified.

The propagation interface keeps the two directions separate so a later split-step Fourier NLSE solver can add β₂, β₃, arbitrary VOA position, measured fields, and component losses without changing the coupler or UI port convention.
