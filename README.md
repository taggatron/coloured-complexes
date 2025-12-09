# Copper Ligand Colour Simulator

Simple interactive web app demonstrating colour changes for copper complexes in Benedict's and Biuret tests.

Files:
- `index.html` — main page
- `styles.css` — styling
- `app.js` — simulation logic

How to run:
1. Open `index.html` in a modern browser (double-click or `Open With...`).
2. Choose a test, adjust sliders and press **Run Reaction**.

Notes:
- This is a pedagogical, simplified simulation — it uses colour interpolation rather than full spectral simulation.
 - This is a pedagogical, simplified simulation — it uses colour interpolation rather than full spectral simulation.
- A small simulated absorbance spectrum has been added to visualise approximate peak wavelengths and spectral shifts.
- SVG diagrams for a few representative copper ligand sets have been added (aqua, ammonia, biuret-style, EDTA). Use the "Ligand / Complex" selector to view and interact with them. Note: when opening `index.html` directly via the `file://` protocol some browsers block `fetch()` for local files — use the recommended local server to ensure diagrams load: `python3 -m http.server 8000`.
 - SVG diagrams for a few representative copper ligand sets have been added (aqua, ammonia, biuret-style, EDTA). Use the "Ligand / Complex" selector to view and interact with them. Note: when opening `index.html` directly via the `file://` protocol some browsers block `fetch()` for local files — use the recommended local server to ensure diagrams load: `python3 -m http.server 8000`.
 - The red precipitate graphic has been removed. A photon animation overlay now visualises wavelength-coloured photons moving through the solution — wavelengths that match the ligand's absorbance are progressively dimmed to illustrate selective absorption.
- The red precipitate graphic has been removed. A photon animation overlay now visualises wavelength-coloured photons moving across the ligand diagram and solution — wavelengths that match ligand-node spectral bands are absorbed by specific ligand groups, which briefly vibrate when they absorb light.
- New controls: toggle the photon animation (`Show photons`), adjust `Photon density`, and `Photon speed multiplier`.
- If you want a live server for development, from this directory run: `python3 -m http.server 8000` and open `http://localhost:8000`.

Want improvements?
- Add spectrum plot, more chemistry detail, or data export. Tell me what you want next.
