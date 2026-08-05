# NOLM Lab

NOLM Lab is a static, browser-based engineering simulator for a nonlinear optical loop mirror used to separate optical pulses from coherent CW pedestal and estimate ASE rejection. It uses the full complex 2×2 coupler matrix, direction-dependent VOA ordering, and analytic dispersion-free Kerr propagation.

> Screenshot placeholder: add a current application screenshot at `docs/nolm-lab.png` after deployment.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Vite prints the local URL (normally `http://localhost:5173`).

## Validate and build

```bash
npm test
npm run build
npm run preview
```

The production files are emitted to `dist/`. No backend or database is used.

## What is modelled

- Gaussian and super-Gaussian coherent pulse trains inferred from total average power, ASE fraction, repetition rate, duration, pulse shape, and EOM extinction ratio.
- A lossless complex-amplitude coupler with arbitrary power cross-coupling `κ`.
- A coupler-adjacent lumped VOA encountered before fibre in one direction and after fibre in the other.
- Dispersion-free Kerr propagation with optional fibre attenuation.
- Both external ports, time and spectral results, CW-only routing, pulse transmission, contrast, phase diagnostics, one- and two-parameter sweeps, and optional stochastic complex ASE ensembles.
- Generic editable SMF28-like and HNLF-like engineering presets.

The application default EOM extinction ratio is 30 dB. The documented 5.13 W validation case remains available by setting the extinction ratio to 20 dB.

The temporal FWHM and reference spectral FWHM are deliberately independent. The imposed-bandwidth mode constructs one assumed quadratic phase; it does not claim a unique field.

See [MODEL.md](MODEL.md) for equations, conventions, and limitations.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds and publishes `dist/`. In the GitHub repository, open **Settings → Pages**, set **Source** to **GitHub Actions**, then push to `main`. The Vite base path is derived from `GITHUB_REPOSITORY`, so a project repository named `nolm-lab` deploys below `/nolm-lab/` automatically.

## Disclaimer

NOLM Lab is an engineering estimator, not a substitute for experimental verification. The initial fast model omits dispersion, Raman response, self-steepening, nonlinear scattering thresholds, component limits, and polarisation dynamics.
