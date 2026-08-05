# Contributing

Keep numerical physics in `src/physics` and independent of React. Use SI units internally and add laboratory-unit conversions only at input/output boundaries. Every change to a physical convention or formula should include a focused Vitest case.

Before opening a pull request:

```bash
npm install
npm test
npm run build
```

Document any new assumption in `MODEL.md` and in the visible assumptions panel. Do not change the coupler port order without updating the convention documentation and low-power routing tests.
