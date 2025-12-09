const $ = sel => document.querySelector(sel);

const testSelect = $('#testSelect');
const benedictsControls = $('#benedictsControls');
const biuretControls = $('#biuretControls');

// Inputs
const sugar = $('#sugar'); const sugarVal = $('#sugarVal');
const temp = $('#temp'); const tempVal = $('#tempVal');
const peptide = $('#peptide'); const peptideVal = $('#peptideVal');
const ph = $('#ph'); const phVal = $('#phVal');

const startBtn = $('#startBtn');
const resetBtn = $('#resetBtn');

const sampleArea = $('.sample-area');
const solution = $('#solution');
const photonCanvas = $('#photons');
let pCtx = photonCanvas && photonCanvas.getContext ? photonCanvas.getContext('2d') : null;
const photonToggle = $('#photonToggle');
const photonDensity = $('#photonDensity'); const photonDensityVal = $('#photonDensityVal');
const photonSpeed = $('#photonSpeed'); const photonSpeedVal = $('#photonSpeedVal');
const resultTitle = $('#resultTitle');
const resultText = $('#resultText');
const wavelengthEl = $('#wavelength');
const absorbanceEl = $('#absorbance');
const spectrumCanvas = $('#spectrum');
const sCtx = spectrumCanvas && spectrumCanvas.getContext ? spectrumCanvas.getContext('2d') : null;
const ligandSelect = $('#ligandSelect');
const ligandSvgContainer = $('#ligandSvg');

function loadLigand(name){
  // fetch svg file and insert inline so we can animate/style it
  const path = `svgs/${name}.svg`;
  fetch(path).then(r=>{
    if(!r.ok) throw new Error('SVG not loaded');
    return r.text();
  }).then(txt=>{
    ligandSvgContainer.innerHTML = txt;
    // add simple pulsing on click
    const ligElems = ligandSvgContainer.querySelectorAll('.ligand');
    ligElems.forEach(el=>{ el.classList.remove('pulse'); el.addEventListener('click', ()=>{ el.classList.add('pulse'); setTimeout(()=>el.classList.remove('pulse'),400); }); });
    // assign ligand nodes spectral bands (may be updated after spectrum drawn)
    assignLigandNodes(name);
  }).catch(err=>{
    ligandSvgContainer.innerHTML = '<div style="color:#f88;font-size:12px">Unable to load diagram</div>';
    console.warn(err);
  });
}

ligandSelect && ligandSelect.addEventListener('change', ()=> loadLigand(ligandSelect.value));

// load default ligand
setTimeout(()=>{ if(ligandSelect) loadLigand(ligandSelect.value || 'aquo'); }, 60);

// photon control UI wiring
if(photonDensity){ photonDensity.addEventListener('input', e=> photonDensityVal.value = parseFloat(e.target.value).toFixed(2)); }
if(photonSpeed){ photonSpeed.addEventListener('input', e=> photonSpeedVal.value = parseFloat(e.target.value).toFixed(2) + '×'); }
if(photonToggle){ photonToggle.addEventListener('change', ()=> { if(!photonToggle.checked) photons = []; }); }

// ligand spectral profiles (illustrative)
const LIGAND_PROFILES = {
  aquo: { peakShift: 60, ampMult: 0.7, widthMult: 1.2 },
  ammonia: { peakShift: -40, ampMult: 1.0, widthMult: 0.9 },
  biuret: { peakShift: -90, ampMult: 1.2, widthMult: 0.7 },
  edta: { peakShift: -150, ampMult: 1.4, widthMult: 0.6 }
};

function assignLigandNodes(ligandName){
  const profile = LIGAND_PROFILES[ligandName] || { peakShift:0, ampMult:1, widthMult:1 };
  const ligElems = ligandSvgContainer.querySelectorAll('.ligand');
  const rectArea = sampleArea ? sampleArea.getBoundingClientRect() : {left:0,top:0};
  // find current spectrum peak wavelength (if available)
  let basePeak = window._solutionWavelength || 520;
  if(window._lastSpectrum){
    const { absorb, leftW, rightW, cw } = window._lastSpectrum;
    let maxIdx = 0; let m = 0; for(let i=0;i<absorb.length;i++){ if(absorb[i]>m){ m=absorb[i]; maxIdx = i; } }
    basePeak = Math.round(leftW + (maxIdx/(cw-1))*(rightW-leftW));
  }
  window._ligandNodes = [];
  ligElems.forEach((el, i)=>{
    const b = el.getBoundingClientRect();
    const x = (b.left - rectArea.left) + b.width/2;
    const y = (b.top - rectArea.top) + b.height/2;
    const jitter = (Math.random()*2-1) * 18; // +/- 18 nm
    const centerW = Math.round(basePeak + profile.peakShift + jitter);
    const widthW = Math.round(30 * profile.widthMult);
    el.dataset.center = centerW; el.dataset.width = widthW;
    window._ligandNodes.push({ el, x, y, centerW, widthW });
  });
}

function hexToRgb(hex){
  const m = hex.replace('#','');
  return [parseInt(m.substring(0,2),16),parseInt(m.substring(2,4),16),parseInt(m.substring(4,6),16)];
}
function rgbToHex(r,g,b){
  return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function lerp(a,b,t){return a+(b-a)*t}
function mixHex(a,b,t){
  const ra = hexToRgb(a), rb = hexToRgb(b);
  return rgbToHex(lerp(ra[0],rb[0],t), lerp(ra[1],rb[1],t), lerp(ra[2],rb[2],t));
}

function multiGradient(stops, t){
  if(t<=0) return stops[0];
  if(t>=1) return stops[stops.length-1];
  const n = stops.length-1; const pos = t * n; const i = Math.floor(pos); const local = pos - i;
  return mixHex(stops[i], stops[i+1], local);
}

// Event wiring for outputs
[['sugar', sugar, sugarVal, v => parseFloat(v).toFixed(2)],[ 'temp', temp, tempVal, v => v+"°C" ], ['peptide', peptide, peptideVal, v => parseFloat(v).toFixed(2)], ['ph', ph, phVal, v => parseFloat(v).toFixed(1)]].forEach(([id, el, out, fmt])=>{
  el.addEventListener('input', e=>{ out.value = fmt(e.target.value); });
});

testSelect.addEventListener('change', ()=>{
  const t = testSelect.value;
  if(t === 'benedicts'){ benedictsControls.classList.remove('hidden'); biuretControls.classList.add('hidden'); }
  else { benedictsControls.classList.add('hidden'); biuretControls.classList.remove('hidden'); }
  resetView();
});

function resetView(){
  solution.style.background = 'linear-gradient(180deg,#0d2b4a,#06324a)';
  resultTitle.textContent = 'Result';
  resultText.innerHTML = "Choose a test and press <strong>Run Reaction</strong> to simulate colour changes.";
  wavelengthEl.textContent = '—'; absorbanceEl.textContent = '—';
}

resetBtn.addEventListener('click', ()=>{ resetView(); });

function simulateBenedicts(){
  const s = parseFloat(sugar.value); // 0..1
  const t = (parseInt(temp.value)-20)/80; // 0..1 mapping of 20..100°C
  const reaction = Math.max(0, Math.min(1, s * t));

  // gradient stops from blue -> green -> yellow -> red
  const stops = ['#2b7fc3','#2ecc71','#f1c40f','#c0392b'];
  const colour = multiGradient(stops, reaction);

  solution.style.background = `linear-gradient(180deg, ${colour}, rgba(0,0,0,0.35))`;

  // precipitate: more reaction => bigger red precipitate (Cu2O)
  const pct = reaction; const size = Math.round(8 + 180 * pct);
  // precipitate removed from display — visual kept as solution colour only

  resultTitle.textContent = "Benedict's Test";
  let text = '';
  if(reaction < 0.05) text = 'No visible reduction — solution remains blue (Cu2+).';
  else if(reaction < 0.35) text = 'Green to yellowish mixture — partial reduction and formation of some Cu2O.';
  else if(reaction < 0.75) text = 'Yellow to orange — significant reduction and precipitation.';
  else text = 'Brick-red precipitate visible — strong reducing sugar present (Cu2O formed).';
  resultText.textContent = text;

  // approximate dominant wavelength (very rough mapping)
  const approxWavelength = Math.round(450 + (reaction*200));
  wavelengthEl.textContent = approxWavelength + ' nm';
  absorbanceEl.textContent = (0.2 + reaction*1.6).toFixed(2) + ' (arb.)';

  // expose current solution dominant wavelength for photon logic
  window._solutionWavelength = approxWavelength;

  // Draw spectrum: Benedict's absorbance peak shifts with reaction
  // Simple model: peak moves from ~600nm (low reaction) to ~450nm (high reaction)
  const peak = Math.round(600 - reaction * 150);
  const amplitude = 0.15 + reaction * 1.2;
  const width = 40 + (1 - reaction) * 60; // broader when weak
  drawSpectrum(peak, amplitude, width);
}

function simulateBiuret(){
  const p = parseFloat(peptide.value); const curpH = parseFloat(ph.value);
  // Biuret requires alkaline conditions — below pH ~9 the violet complex is weak
  const alkFactor = Math.max(0, Math.min(1, (curpH - 8) / 6));
  const reaction = Math.max(0, Math.min(1, p * alkFactor));

  const cuBlue = '#4aa3df';
  const violet = '#7b3fa3';
  const colour = mixHex(cuBlue, violet, reaction);
  solution.style.background = `linear-gradient(180deg, ${colour}, rgba(0,0,0,0.25))`;

  // no solid precipitate in normal biuret — we show no precipitate; small turbidity if extreme
  // precipitate removed — visual kept as solution colour only

  resultTitle.textContent = 'Biuret Test';
  let text = '';
  if(curpH < 8.5) text = 'Solution is not alkaline enough — Biuret complex is weak or absent.';
  else if(reaction < 0.2) text = 'Very pale violet — low peptide concentration.';
  else if(reaction < 0.6) text = 'Pale to moderate violet — peptides present.';
  else text = 'Deep violet — strong presence of peptide bonds.';
  resultText.textContent = text;

  const approxWavelength = Math.round(550 - reaction*80); // violet region shorter than green
  wavelengthEl.textContent = approxWavelength + ' nm';
  absorbanceEl.textContent = (0.1 + reaction*1.2).toFixed(2) + ' (arb.)';

  // expose current solution dominant wavelength for photon logic
  window._solutionWavelength = approxWavelength;

  // Draw spectrum: Biuret absorbance peak shifts modestly from ~560nm down towards ~480nm
  const peak = Math.round(560 - reaction * 80);
  const amplitude = 0.08 + reaction * 1.0;
  const width = 36;
  drawSpectrum(peak, amplitude, width);
}

// ---------------- Spectrum drawing utilities ----------------
function wavelengthToRgb(w){
  // Approximate conversion of wavelength (380..780) to RGB
  let R=0,G=0,B=0;
  if(w >= 380 && w < 440){ R = -(w - 440) / (440 - 380); G = 0; B = 1; }
  else if(w >= 440 && w < 490){ R = 0; G = (w - 440) / (490 - 440); B = 1; }
  else if(w >= 490 && w < 510){ R = 0; G = 1; B = -(w - 510) / (510 - 490); }
  else if(w >= 510 && w < 580){ R = (w - 510) / (580 - 510); G = 1; B = 0; }
  else if(w >= 580 && w < 645){ R = 1; G = -(w - 645) / (645 - 580); B = 0; }
  else if(w >= 645 && w <= 780){ R = 1; G = 0; B = 0; }
  // intensity factor near vision edges
  let factor = 1.0;
  if(w < 420) factor = 0.3 + 0.7 * (w - 380) / (420 - 380);
  if(w > 700) factor = 0.3 + 0.7 * (780 - w) / (780 - 700);
  R = Math.round(255 * Math.pow(R * factor, 0.8));
  G = Math.round(255 * Math.pow(G * factor, 0.8));
  B = Math.round(255 * Math.pow(B * factor, 0.8));
  return `rgb(${R},${G},${B})`;
}

function drawSpectrum(peak, amplitude, width){
  if(!sCtx) return;
  const ctx = sCtx; const cw = spectrumCanvas.width; const ch = spectrumCanvas.height;
  // clear
  ctx.clearRect(0,0,cw,ch);

  // draw visible background
  const leftW = 380; const rightW = 780;
  for(let x=0;x<cw;x++){
    const w = leftW + (x / cw) * (rightW - leftW);
    ctx.fillStyle = wavelengthToRgb(w);
    ctx.fillRect(x,0,1,ch);
  }

  // apply ligand profile adjustments if any
  const ligandProfile = LIGAND_PROFILES[ligandSelect ? ligandSelect.value : 'aquo'] || { peakShift:0, ampMult:1, widthMult:1 };
  const adjPeak = Math.round(peak + (ligandProfile.peakShift || 0));
  const adjAmp = amplitude * (ligandProfile.ampMult || 1);
  const adjWidth = width * (ligandProfile.widthMult || 1);

  // compute absorbance values (Gaussian) with ligand-adjusted parameters
  const absorb = new Float32Array(cw);
  let maxA = 0;
  for(let x=0;x<cw;x++){
    const w = leftW + (x / cw) * (rightW - leftW);
    const a = adjAmp * Math.exp(-0.5 * Math.pow((w - adjPeak)/adjWidth,2));
    absorb[x] = a; if(a>maxA) maxA = a;
  }

  // store last absorb array for photon animation (normalized 0..1)
  window._lastSpectrum = { leftW, rightW, absorb, maxA, cw, ch, peak: adjPeak };

  // update ligand node bands now that spectrum changed
  assignLigandNodes(ligandSelect ? ligandSelect.value : 'aquo');

  // normalize and draw absorbance curve as a translucent black/white overlay
  ctx.beginPath();
  for(let x=0;x<cw;x++){
    const a = absorb[x] / (maxA || 1);
    const y = ch - (a * (ch * 0.78) + ch * 0.08);
    if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.lineTo(cw, ch); ctx.lineTo(0,ch); ctx.closePath();
  ctx.fillStyle = 'rgba(12,12,12,0.55)'; ctx.fill();

  // highlight peak
  const peakX = Math.round(((peak - leftW)/(rightW-leftW)) * cw);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(peakX,8); ctx.lineTo(peakX,ch-8); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign='center';
  ctx.fillText(peak + ' nm', peakX, 16);
}

// ---------------- Photon animation over solution ----------------
let photons = [];
let lastTime = 0;
function resizePhotonCanvas(){
  if(!photonCanvas || !pCtx || !sampleArea) return;
  const rect = sampleArea.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  photonCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
  photonCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
  photonCanvas.style.width = rect.width + 'px';
  photonCanvas.style.height = rect.height + 'px';
  pCtx.setTransform(dpr,0,0,dpr,0,0);
}

function spawnPhoton(){
  if(!window._lastSpectrum || !photonCanvas) return;
  const { leftW, rightW } = window._lastSpectrum;
  const w = leftW + Math.random() * (rightW - leftW);
  // spawn at left edge (x near 0) so wavelengths travel across the ligand svg into the solution
  const canvasW = photonCanvas.width / (window.devicePixelRatio||1);
  const canvasH = photonCanvas.height / (window.devicePixelRatio||1);
  const x = -8 + Math.random() * 28; // start slightly off-canvas to the left
  const y = 20 + Math.random() * Math.max(1, canvasH - 40);
  const color = wavelengthToRgb(w);
  // sine-wave photon properties: amplitude, frequency, phase
  const amp = 3 + Math.random()*5;
  const freq = 0.12 + Math.random()*0.18;
  const phase = Math.random()*Math.PI*2;
  const speedMult = photonSpeed ? parseFloat(photonSpeed.value) : 1;
  photons.push({ x, y, w, color, alpha: 1, speed: (60 + Math.random()*120) * speedMult, amp, freq, phase });
  if(photons.length > 160) photons.shift();
}

function getAbsorbForWavelength(w){
  const s = window._lastSpectrum; if(!s) return 0;
  const { leftW, rightW, absorb, maxA, cw } = s;
  const pos = (w - leftW) / (rightW - leftW);
  const ix = Math.round(pos * (cw - 1));
  if(ix < 0 || ix >= absorb.length) return 0;
  return absorb[ix] / (maxA || 1);
}

function animatePhotons(ts){
  if(!pCtx || !photonCanvas) return;
  if(!lastTime) lastTime = ts; const dt = Math.min(50, ts - lastTime) / 1000; lastTime = ts;
  // spawn based on photon density control and toggle
  const density = photonDensity ? parseFloat(photonDensity.value) : 0.9;
  if(photonToggle && !photonToggle.checked) {
    // skip spawning when disabled
  } else {
    if(Math.random() < density) spawnPhoton();
  }
  const ctx = pCtx; const w = photonCanvas.width / (window.devicePixelRatio||1); const h = photonCanvas.height / (window.devicePixelRatio||1);
  ctx.clearRect(0,0,w,h);

  for(let i=0;i<photons.length;i++){
    const p = photons[i];
    // photons travel from left to right across the sample area
    p.x += p.speed * dt;

    // draw a small horizontal sine wave centered at (p.x, p.y)
    const seg = 18; const dx = 3;
    ctx.lineWidth = 2;
    ctx.strokeStyle = p.color.replace('rgb', 'rgba').replace(')', `,${Math.max(0.06, p.alpha)})`);
    ctx.beginPath();
    for(let s=-seg;s<=seg;s++){
      const xx = p.x + s*dx*0.25;
      const yy = p.y + Math.sin((s*0.5 + p.phase) * p.freq * 6) * p.amp;
      if(s===-seg) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();

    // spatial absorption: test nearest ligand node (if any)
    if(window._ligandNodes && window._ligandNodes.length){
      // convert photon's position to sampleArea coords
      const areaRect = sampleArea.getBoundingClientRect();
      const px = p.x; const py = p.y;
      // find nearest ligand node within threshold
      let nearest = null; let ndist = 1e9;
      for(const node of window._ligandNodes){
        const dx = px - node.x; const dy = py - node.y; const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist < ndist){ ndist = dist; nearest = node; }
      }
      const absorbThresholdPx = 36; // proximity threshold
      if(nearest && ndist < absorbThresholdPx){
        // check spectral match: if photon's wavelength is NOT the solution colour, it should be absorbed
        const solW = window._solutionWavelength || 0;
        const diffSol = Math.abs(p.w - solW);
        const tolerance = 12;
        // node-specific band
        const nodeCenter = nearest.centerW; const nodeWidth = nearest.widthW;
        const nodeDiff = Math.abs(p.w - nodeCenter);
        if(diffSol > tolerance && nodeDiff < nodeWidth/2){
          // strong absorption by this node
          const abs = getAbsorbForWavelength(p.w);
          p.alpha = Math.max(0, p.alpha - (0.9 * abs + 0.3) * dt * 6);
          // vibrate just this node
          if(!nearest._vib){ nearest._vib = true; nearest.el.classList.add('vibrate'); setTimeout(()=>{ nearest.el.classList.remove('vibrate'); nearest._vib = false; }, 420); }
        } else if(diffSol <= tolerance){
          // solution-matching wavelength: pass through
          p.alpha = Math.max(0, p.alpha - 0.01 * dt);
        } else {
          // not matching node band -> moderate absorption
          const abs = getAbsorbForWavelength(p.w);
          p.alpha = Math.max(0, p.alpha - (0.4 * abs + 0.15) * dt * 4);
        }
      }
    }
  }

  // keep only visible photons (within canvas width)
  photons = photons.filter(p=> p.x < w + 40 && p.alpha > 0.02);
  requestAnimationFrame(animatePhotons);
}

window.addEventListener('resize', ()=>{ if(photonCanvas) resizePhotonCanvas(); });
setTimeout(()=>{ if(photonCanvas) resizePhotonCanvas(); requestAnimationFrame(animatePhotons); }, 80);

startBtn.addEventListener('click', ()=>{
  if(testSelect.value === 'benedicts') simulateBenedicts(); else simulateBiuret();
});

// initial setup
resetView();
