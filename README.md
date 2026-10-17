# WaveSense AI — Interactive Feasibility Website

**Wi-Fi CSI-Based Motion Detection** · *Sense the Invisible.* · «استشعر ما لا تراه.»

Designed & Developed by **GARHI**.

A static, bilingual (Arabic RTL default / English LTR) project portal presenting the feasibility study and
implementation blueprint for a Wi-Fi CSI motion-detection prototype built on compatible ESP32 hardware.

> **Important:** the dashboard on this site runs on **simulated data** (seeded pseudo-random generator, sliding-window
> variance vs. a threshold). It is a visualization placeholder, not a validated CSI detector. No measured accuracy
> results are included anywhere. The website itself needs no ESP32 hardware or backend.

## Files

| File | Purpose |
|---|---|
| `index.html` | Homepage and all sections (bilingual markup via `.ar` / `.en` classes) |
| `styles.css` | Design system, light/dark themes, RTL/LTR, responsive layout, print styles, GARHI watermark |
| `script.js` | All behavior: language/theme, explainer, architecture, BOM, budget, team, demo, roadmap, testing, export |
| `assets/favicon.svg` | Local favicon |

## Run locally

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Chart.js, Lucide icons and Google Fonts load from CDNs. If a CDN is blocked, the site still works:
charts show a notice (status card and event log keep working), icons are decorative, and system fonts are used.

## Publish on GitHub Pages

1. Create a repository and push these files to the repository root (keep `index.html` at the top level).
2. In the repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Choose branch `main` and folder `/ (root)`, then Save.
4. After a minute the site is available at `https://<user>.github.io/<repo>/`. All paths are relative, so the
   subpath works.

## Features

- Arabic default with RTL, working Arabic/English toggle (content, labels, tables, charts), dark/light theme; both persisted in `localStorage` with graceful fallback.
- GARHI branding: header mark, diagonal background watermark (inline SVG), per-card corner marks, dashboard tile watermark, footer credit, print brand line.
- Interactive CSI explainer, architecture diagram (click components), glossary, risk registers with persisted status.
- Editable BOM (quantities, unit prices, "already available", add/remove rows, low/high totals, CSV export, print).
- Budget scenarios with contingency, equipment deduction, one-time vs. recurring costs (recurring is zero unless entered).
- Team cards (12 members, no invented names), task checklists, responsibility matrix, copy-to-clipboard.
- Simulated live dashboard: Start / Pause / Reset, room preset, threshold slider, manual motion override, two Chart.js charts, event log, CSV export.
- Six-week Gantt with task status (to do / in progress / done / blocked), persisted.
- Test checklist and a metrics calculator that computes only from numbers you enter.
- Commercial assumptions calculator (empty by default; no market data invented).
- Repository tree, source list, Markdown documentation download, print / "Save as PDF" through the browser print dialog.

## Honest limitations

- Simulated data cannot establish real-world detection accuracy.
- Prices are provisional planning estimates dated 2026-10-17, not vendor quotations.
- The repository tree is a proposal; inspect the real repository before claiming those folders exist.
- Board-specific flashing instructions are intentionally absent: consult the official ESP-CSI repository and your
  exact board first.
- "Save as PDF" relies on the browser's print dialog; the site does not generate a PDF itself.
- External links were written from the project brief's official URLs; open them to confirm the details you rely on.

## Credits

Illustrations are locally generated SVG. No third-party photographs are used. Icons: [Lucide](https://lucide.dev/) (open source).
Charts: [Chart.js](https://www.chartjs.org/). No trademark registration or third-party asset ownership is claimed.
