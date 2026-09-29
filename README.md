# BYTEART // ARCHIVE

Generative art archive hosted at [byteart.dev](https://byteart.dev) — a GitHub Pages site styled as a fictional operating system. Twelve canvas experiments covering physics, math, and biology simulations, all vanilla JavaScript with zero dependencies.

## Experiments

| ID | Name | Topic |
|------|---------------|----------------------------------------------|
| EXP_01 | MAURER | Parametric rose curves (Maurer) |
| EXP_02 | WAVEFORM | Procedural audio synthesis, EM interference |
| EXP_03 | RULE 30 | Wolfram class 3 (chaotic) elementary cellular automaton |
| EXP_04 | PHYLLOTAXIS | Golden angle / Fibonacci spiral seeding |
| EXP_05 | SINGULARITY | Relativistic accretion disk, Doppler beaming |
| EXP_06 | LORENZ | Strange attractor (chaos theory) |
| EXP_07 | MORPHOGENESIS | Gray-Scott reaction-diffusion |
| EXP_08 | FLUID | Real-time Navier-Stokes (Stable Fluids, Jos Stam) |
| EXP_09 | GRADIENT | Vector field visualization |
| EXP_10 | RELATIVITY | E=mc² critical mass simulation |
| EXP_11 | QUANTUM | Superposition and wave function collapse |
| EXP_12 | BOIDS | Reynolds flocking: emergence from three rules |

A hidden screensaver (`animations/dream.html`, hex "rain") starts after 30 seconds of inactivity.

## Interface

- Terminal-styled source viewer: hover a card and click `[SRC]` to read the experiment's JavaScript inline, no navigation needed.
- ABOUT block in the sidebar opens a project manifesto in the same terminal window.
- Interface sound effects (WebAudio) can be muted from the AUDIO block in the sidebar; the preference is persisted in `localStorage`.
- `prefers-reduced-motion` is respected: the boot sequence, glitch scramble, hover delays, and screensaver are disabled when the OS requests reduced motion.
- Fonts are self-hosted (`assets/fonts/`), so the site makes no third-party requests: it stores no cookies and keeps no logs.
- Cards, the source viewer, and the audio toggle are fully keyboard accessible (Tab, Enter/Space, Escape, focus trap in the modal).

## Structure

```
.
├── index.html            # Archive grid, the only page
├── assets/
│   ├── style.css         # Interface styles
│   └── main.js           # Clock, audio, glitch, modal, boot, screensaver
├── animations/           # One self-contained HTML file per experiment
├── favicon.png
└── CNAME                 # byteart.dev
```

Each experiment in `animations/` is deliberately a single self-contained HTML file (inline script), so the source viewer can display it and each page works standalone.

## Development

Open the site through any static server (required for the source viewer, which fetches files over HTTP):

```sh
python3 -m http.server
```

## License

See [LICENSE](LICENSE).
