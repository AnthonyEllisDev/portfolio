# Verification suite

Automated checks for `demos/galaxy.html`, run against the shipped single-file build in
headless Chromium.

```sh
npm install
npx playwright install chromium
npm run verify
```

Seventeen checks across six groups:

| Group | What it proves |
|---|---|
| boot | The page loads with no console errors and exposes the generator API. |
| determinism | The same seed produces a **bit-identical** position and colour buffer across runs, and a different seed doesn't. |
| worker | The Web Worker path and the main-thread path produce **identical buffers**, and the worker bundle really is assembled at runtime. |
| morphologies | All five galaxy types generate, are distinct from each other under the same seed, and contain no NaN positions. |
| render | The galaxy view isn't silently black — pixels are read back off the canvas and checked for mean luminance and lit fraction. |
| deep links | A URL hash restores the seed, morphology and star count it encodes. |

Exit code is non-zero if anything fails, so this can gate a deploy.

The determinism and worker-parity checks are the interesting ones. Determinism is the
property the whole architecture rests on: nothing is stored, so if generation weren't
reproducible the URL couldn't act as a save file and the LOD cache couldn't safely evict.
Worker parity matters because the worker bundle is assembled at runtime from the same
function objects the main thread uses — this test is what proves the two paths haven't
drifted.
