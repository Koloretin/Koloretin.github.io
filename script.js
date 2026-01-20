// Estado del armado
const state = {
  flowers: [], // array de nombres
  paper: { type: null, color: null },
  adorn: { type: null, extra: null } // extra = color, leaf choice, pelucheName, cardText
};

// Paleta (usada en los botones de color)
const palette = [
  { name: 'Rosa pastel', hex: '#e1aab0' },
  { name: 'Blanco', hex: '#ffffff' },
  { name: 'Lila suave', hex: '#d7c3e6' },
  { name: 'Durazno', hex: '#ffd1bf' },
  { name: 'Negro', hex: '#111111' },
  { name: 'Verde', hex: '#275c42' },
  { name: 'Beige', hex: '#f0e1c8' },
  { name: 'Negro con dorado', hex: '#111111' }, // visual similar, could add gold border in UI
  { name: 'Azul marino', hex: '#0b2340' },
  { name: 'Azul turquesa', hex: '#2bb6b6' },
  { name: 'Amarillo naranja brillante', hex: '#ff9a00' },
  { name: 'Fucsia', hex: '#ff2d95' }
];

// Helpers DOM
const qs = sel => document.querySelector(sel);
const qsa = sel => Array.from(document.querySelectorAll(sel));

// Steps
const steps = ['step-intro','step-flowers','step-paper','step-adornments','step-summary'];
let currentStep = 0;

function showStep(idx){
  currentStep = idx;
  qsa('.step').forEach(s => s.classList.remove('active'));
  const id = steps[idx];
  qs(`#${id}`).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(id === 'step-summary') renderSummary();
}

// Start button
qs('#startBtn').addEventListener('click', ()=> showStep(1));

// Flowers selection
const flowerCards = qsa('#flowersGrid .card.selectable');
flowerCards.forEach(card => {
  card.addEventListener('click', () => toggleFlower(card));
});
function toggleFlower(card){
  const name = card.dataset.name;
  const idx = state.flowers.indexOf(name);
  if(idx === -1){
    // add
    if(state.flowers.length >= 5){
      alert('Máximo 5 flores diferentes por ramo.');
      return;
    }
    state.flowers.push(name);
    card.classList.add('selected');
    card.querySelector('.card-check').textContent = '✓';
  } else {
    // remove
    state.flowers.splice(idx,1);
    card.classList.remove('selected');
    card.querySelector('.card-check').textContent = '+';
  }
}

// Flowers next/back
qs('#flowersNext').addEventListener('click', ()=>{
  if(state.flowers.length < 1){
    alert('Selecciona al menos 1 flor para continuar.');
    return;
  }
  showStep(2);
});
qsa('[data-action="back"]').forEach(btn => btn.addEventListener('click', ()=>{
  // if in intro back returns nothing special
  if(currentStep === 1){
    showStep(0);
  } else if(currentStep > 0){
    showStep(currentStep - 1);
  }
}));

// Paper selection setup
const paperCards = qsa('#paperGrid .card.paper.selectable');
function buildColorDots(container, forName){
  // vacía si ya hay
  container.innerHTML = '';
  palette.forEach((c, i) => {
    const dot = document.createElement('button');
    dot.className = 'color-dot';
    dot.title = c.name;
    dot.style.background = c.hex;
    dot.dataset.color = c.hex;
    dot.addEventListener('click', (e)=>{
      // prevent card click propagation
      e.stopPropagation();
      // set selection
      state.paper.type = forName;
      state.paper.color = c.hex;
      // update UI: mark selected dot and select card
      qsa('#paperGrid .card.paper').forEach(cd => cd.classList.toggle('selected', cd.dataset.paper === forName));
      qsa('#paperGrid .color-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
    });
    container.appendChild(dot);
  });
}
// Add colors to those papers that allow color (not kraft)
qsa('#paperGrid .card.paper').forEach(card => {
  const forName = card.dataset.paper;
  const row = card.querySelector('.colors-row');
  if(row && !row.classList.contains('disabled')) buildColorDots(row, forName);
  // click on card (choose paper type)
  card.addEventListener('click', ()=> {
    const type = card.dataset.paper;
    state.paper.type = type;
    // if kraft -> set color null
    if(type === 'Papel Kraft'){
      state.paper.color = null;
      // mark selected card
      qsa('#paperGrid .card.paper').forEach(c => c.classList.toggle('selected', c.dataset.paper === type));
      // remove dots selection
      qsa('#paperGrid .color-dot').forEach(d => d.classList.remove('selected'));
    } else {
      // if already had color for that paper, keep; else preselect first color
      if(!state.paper.color || state.paper.type !== type){
        // preselect first palette color
        state.paper.color = palette[0].hex;
        // highlight corresponding dot
        const dots = card.querySelectorAll('.color-dot');
        if(dots && dots[0]) {
          qsa('#paperGrid .card.paper').forEach(c => c.classList.toggle('selected', c.dataset.paper === type));
          qsa('#paperGrid .color-dot').forEach(d => d.classList.remove('selected'));
          dots[0].classList.add('selected');
        }
      }
      state.paper.type = type;
    }
  });
});

// Paper navigation
qs('#paperNext').addEventListener('click', ()=>{
  if(!state.paper.type){
    alert('Selecciona un tipo de papel para continuar.');
    return;
  }
  // kraft allowed without color; others require color
  if(state.paper.type !== 'Papel Kraft' && !state.paper.color){
    alert('Selecciona un color para el papel.');
    return;
  }
  showStep(3);
});

// Adornments logic
const adornCards = qsa('#adornGrid .card.adorn.selectable');
adornCards.forEach(card => {
  card.addEventListener('click', (ev)=>{
    const type = card.dataset.adorn;
    // toggle selection (only one adorn at a time assumed)
    const already = state.adorn.type === type;
    if(already){
      // deselect
      state.adorn.type = null;
      state.adorn.extra = null;
      card.classList.remove('selected');
      // hide inner controls
      toggleAdornSub(card, false);
    } else {
      // deselect other cards and hide their subs
      qsa('#adornGrid .card.adorn').forEach(c => {
        c.classList.toggle('selected', c === card);
        if(c !== card) toggleAdornSub(c, false);
      });
      state.adorn.type = type;
      state.adorn.extra = null;
      // show proper sub-controls for this card
      toggleAdornSub(card, true);
      // if Listones, prebuild color dots
      if(type === 'Listones') buildAdornColors(card);
    }
  });
});

function toggleAdornSub(card, show){
  const leaf = card.querySelector('.leaf-options');
  const tiny = card.querySelector('.tiny-form');
  if(leaf) leaf.classList.toggle('hidden', !show);
  if(tiny) tiny.classList.toggle('hidden', !show);
}

// Build color dots for listones (ribbons) inside the card
function buildAdornColors(card){
  let row = card.querySelector('.colors-row');
  if(!row){
    row = document.createElement('div');
    row.className = 'colors-row small';
    card.appendChild(row);
  }
  if(row.dataset.built) return;
  palette.forEach(c=>{
    const dot = document.createElement('button');
    dot.className = 'color-dot';
    dot.title = c.name;
    dot.style.background = c.hex;
    dot.dataset.color = c.hex;
    dot.addEventListener('click', (e)=>{
      e.stopPropagation();
      state.adorn.type = 'Listones';
      state.adorn.extra = { color: c.hex, name: c.name };
      // mark selected dot
      qsa('#adornGrid .color-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
    });
    row.appendChild(dot);
  });
  row.dataset.built = 'true';
}

// Leaf radio selection
qsa('.leaf-options input[type="radio"]').forEach(radio => {
  radio.addEventListener('change', ()=> {
    const card = radio.closest('.card');
    state.adorn.type = 'Follage natural decorativo';
    state.adorn.extra = radio.value;
  });
});

// Peluche and tarjeta small forms
qsa('.tiny-form input[name="pelucheName"]').forEach(input => {
  input.addEventListener('input', (e) => {
    const card = input.closest('.card');
    state.adorn.type = 'Peluche pequeño';
    state.adorn.extra = input.value;
  });
});
qsa('.tiny-form textarea[name="cardText"]').forEach(input => {
  input.addEventListener('input', (e) => {
    const card = input.closest('.card');
    state.adorn.type = 'Tarjeta';
    state.adorn.extra = input.value;
  });
});

// Navigation from adornments
qs('#adornNext').addEventListener('click', ()=>{
  // adorn is optional; allow none as valid
  // if selected adorn requires extra validation (e.g., peluche -> name required)
  if(state.adorn.type === 'Peluche pequeño' && (!state.adorn.extra || !state.adorn.extra.trim())){
    alert('Por favor indica qué peluche quieres.');
    return;
  }
  if(state.adorn.type === 'Tarjeta' && (!state.adorn.extra || !state.adorn.extra.trim())){
    alert('Por favor escribe el mensaje de la tarjeta.');
    return;
  }
  // Continue
  showStep(4);
});

// Render summary
function renderSummary(){
  const container = qs('#summaryContent');
  container.innerHTML = '';

  // Flores
  const fBox = document.createElement('div');
  fBox.innerHTML = `<strong>Flores:</strong> ${state.flowers.join(', ') || '—'}`;
  container.appendChild(fBox);

  // Papel
  const pBox = document.createElement('div');
  let pText = state.paper.type ? state.paper.type : '—';
  if(state.paper.color){
    pText += ` — color: ${state.paper.color}`;
    const colorSw = document.createElement('span');
    colorSw.style.display = 'inline-block';
    colorSw.style.width = '18px';
    colorSw.style.height = '18px';
    colorSw.style.marginLeft = '8px';
    colorSw.style.verticalAlign = 'middle';
    colorSw.style.borderRadius = '999px';
    colorSw.style.background = state.paper.color;
    pBox.appendChild(document.createTextNode('Papel: ' + state.paper.type + ' — color: '));
    pBox.appendChild(colorSw);
  } else {
    pBox.innerHTML = `<strong>Papel:</strong> ${pText}`;
  }
  container.appendChild(pBox);

  // Adorno
  const aBox = document.createElement('div');
  if(!state.adorn.type){
    aBox.innerHTML = `<strong>Adorno:</strong> Ninguno`;
  } else {
    let txt = `<strong>Adorno:</strong> ${state.adorn.type}`;
    if(state.adorn.type === 'Listones' && state.adorn.extra && state.adorn.extra.color){
      txt += ` — color: ${state.adorn.extra.color}`;
    } else if(state.adorn.type === 'Follage natural decorativo' && state.adorn.extra){
      txt += ` — ${state.adorn.extra}`;
    } else if(state.adorn.type === 'Peluche pequeño' && state.adorn.extra){
      txt += ` — ${state.adorn.extra}`;
    } else if(state.adorn.type === 'Tarjeta' && state.adorn.extra){
      txt += ` — mensaje: "${state.adorn.extra}"`;
    }
    aBox.innerHTML = txt;
  }
  container.appendChild(aBox);

  // Small preview (simple)
  const preview = document.createElement('div');
  preview.style.marginTop = '10px';
  preview.style.padding = '10px';
  preview.style.borderRadius = '12px';
  preview.style.background = 'linear-gradient(90deg, rgba(210,238,223,0.6), rgba(251,239,245,0.4))';
  preview.innerHTML = `<em>Vista rápida:</em> <div style="margin-top:8px;">${state.flowers.map(f=>`<span style="display:inline-block;margin-right:6px;padding:6px 8px;border-radius:999px;background:#fff;border:1px solid rgba(0,0,0,0.03)">${f}</span>`).join('')}<div style="margin-top:8px;">Papel: ${state.paper.type || '—'} ${state.paper.color ? `<span style="display:inline-block;width:14px;height:14px;background:${state.paper.color};border-radius:999px;margin-left:6px;vertical-align:middle;"></span>` : ''}</div></div>`;
  container.appendChild(preview);
}

// Start over
qs('#startOver').addEventListener('click', ()=>{
  // reset state and UI
  state.flowers = [];
  state.paper = { type: null, color: null };
  state.adorn = { type: null, extra: null };
  // reset selections
  qsa('.card.selected').forEach(c => c.classList.remove('selected'));
  qsa('.card .card-check').forEach(ch => ch.textContent = '+');
  qsa('.color-dot').forEach(d => d.classList.remove('selected'));
  // clear tiny forms
  qsa('.tiny-form input, .tiny-form textarea').forEach(i => i.value = '');
  // hide all subs
  qsa('.leaf-options, .tiny-form').forEach(el => el.classList.add('hidden'));
  showStep(0);
});

// Init: show intro
showStep(0);