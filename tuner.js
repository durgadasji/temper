// tuner.js - a vanilla, zero-dependency theme tuner for TEMPER.
//
// It is an optional enhancement layer. theme.css remains the static, no-JS
// baseline: without this file a site still gets the five hand-tuned palettes
// through the data-theme attribute. Load this file (as a module) to add live
// tuning across the two primitives: the mode-and-notch axis (contrast) and the
// color family axis (color). It solves a full palette with derive.js and writes
// the result as CSS custom properties on the document root, which override the
// stylesheet values in place.
//
// Usage in a page:
//   <link rel="stylesheet" href="./theme.css" />
//   <script type="module">
//     import { initTuner } from './tuner.js';
//     initTuner();
//   </script>

import { CONFIG, deriveByKey, resolveSystem, CVD_MATRICES } from './derive.js';

const STORE_KEY = 'temper-tuning';
const DEFAULT = { mode: 'system', notch: 1, family: 'iron', vision: 'default' };
const NOTCH_LABELS = ['Brighter', 'Middle', 'Deeper'];

// The dichromacy simulate overlay is a testing aid: it applies an SVG filter so
// a full-color viewer can preview what a deficiency sees. It is ephemeral (not
// persisted), unlike the Vision setting, which changes the palette itself.
const SIMULATIONS = [
  { key: 'none', label: 'N', title: 'No simulation' },
  { key: 'deut', label: 'De', title: 'Simulate deuteranopia (red-green)' },
  { key: 'prot', label: 'Pr', title: 'Simulate protanopia (red-green)' },
  { key: 'trit', label: 'Tr', title: 'Simulate tritanopia (blue-yellow)' },
];

function readState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT };
}

function writeState(state) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
}

// Write derived custom properties onto the root, and set data-theme (so
// color-scheme and native controls follow) and data-vision (so theme.css turns
// on the redundant text encoding: link underlines and status letter marks).
export function applyTuning(state, osDark, root = document.documentElement, opts = {}) {
  const resolved = state.mode === 'system' ? resolveSystem(osDark) : state.mode;
  const vision = state.vision || 'default';
  // opts.family lets the tuner pass a resolved family object (including a brand
  // family that is not in CONFIG.families); otherwise the state key is used.
  const family = opts.family || state.family;
  const tokens = deriveByKey(resolved, state.notch, family, vision, { highContrast: !!opts.highContrast });
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-vision', vision);
  for (const name of CONFIG.cssOrder) root.style.setProperty(name, tokens[name]);
}

// Remove the derived properties, returning the page to the static theme.css
// baseline. Used when a separate static control takes over.
export function clearDerived(root = document.documentElement) {
  for (const name of CONFIG.cssOrder) root.style.removeProperty(name);
}

function injectStyles() {
  if (document.getElementById('temper-tuner-style')) return;
  const style = document.createElement('style');
  style.id = 'temper-tuner-style';
  // The widget styles itself from the same tokens it sets, so it always matches
  // the active palette. Fallback values keep it legible if tokens are absent.
  style.textContent = `
  .ts-tuner {
    position: fixed; right: 16px; bottom: 16px; z-index: 9999;
    font-family: var(--font-sans, system-ui, sans-serif);
    background: var(--color-surface, #fff);
    color: var(--color-text-primary, #111);
    border: 1px solid var(--color-border, #ddd);
    border-radius: var(--radius-lg, 14px);
    box-shadow: var(--shadow-md, 0 6px 20px rgba(0,0,0,0.2));
    width: max-content; max-width: calc(100vw - 32px);
  }
  .ts-tuner__toggle {
    appearance: none; border: 0; background: transparent; font: inherit;
    color: var(--color-text-secondary, #555); cursor: pointer;
    padding: 10px 14px; width: 100%; text-align: left; border-radius: var(--radius-lg, 14px);
  }
  .ts-tuner__toggle:hover { color: var(--color-text-primary, #111); }
  .ts-tuner__panel {
    display: none; gap: 18px; padding: 4px 14px 14px;
    border-top: 1px solid var(--color-border, #ddd);
  }
  .ts-tuner[data-open="true"] .ts-tuner__panel { display: flex; }
  .ts-tuner__col { display: flex; flex-direction: column; gap: 6px; }
  .ts-tuner__legend {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--color-text-tertiary, #999); margin: 2px 0 4px;
  }
  .ts-tuner__opt {
    appearance: none; font: inherit; font-size: 13px; text-align: left;
    padding: 5px 10px; border-radius: var(--radius-sm, 6px);
    border: 1px solid transparent; background: transparent;
    color: var(--color-text-secondary, #555); cursor: pointer;
  }
  .ts-tuner__opt:hover { color: var(--color-text-primary, #111); }
  .ts-tuner__opt[aria-pressed="true"] {
    background: var(--color-accent-subtle, #eef); color: var(--color-accent, #2a5);
    border-color: var(--color-accent, #2a5);
  }
  .ts-tuner__notch {
    width: 34px; height: 30px; font-size: 12px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: var(--radius-sm, 6px); cursor: pointer;
    border: 1px solid var(--color-border-strong, #bbb);
    background: transparent; color: var(--color-text-secondary, #555);
  }
  .ts-tuner__notch[aria-pressed="true"] {
    background: var(--color-accent-solid, #36c); color: var(--color-text-on-accent, #fff);
    border-color: var(--color-accent-solid, #36c);
  }
  .ts-tuner__swatch {
    width: 34px; height: 26px; border-radius: var(--radius-sm, 6px);
    cursor: pointer; border: 2px solid var(--color-border, #ddd);
  }
  .ts-tuner__swatch[aria-pressed="true"] { border-color: var(--color-text-primary, #111); }
  .ts-tuner__sq {
    min-width: 34px; height: 30px; padding: 0 6px; font-size: 12px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: var(--radius-sm, 6px); cursor: pointer;
    border: 1px solid var(--color-border-strong, #bbb);
    background: transparent; color: var(--color-text-secondary, #555);
  }
  .ts-tuner__sq[aria-pressed="true"] {
    background: var(--color-accent-solid, #36c); color: var(--color-text-on-accent, #fff);
    border-color: var(--color-accent-solid, #36c);
  }
  .ts-tuner :focus-visible {
    outline: var(--ring-width, 3px) solid var(--color-focus-ring, #48d);
    outline-offset: 2px;
  }
  `;
  document.head.appendChild(style);
}

function makeButton(cls, label, title) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  if (label != null) b.textContent = label;
  if (title) b.title = title;
  b.setAttribute('aria-pressed', 'false');
  return b;
}

// Build the widget, wire persistence and matchMedia, and apply on load.
export function initTuner(options = {}) {
  const root = options.root || document.documentElement;
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const contrastMql = window.matchMedia('(prefers-contrast: more)');
  let osDark = mql.matches;
  let highContrast = contrastMql.matches;
  let state = readState();

  // Branded preset. A brand may fix or curate the color family and restrict the
  // notch range, but it can never restrict vision: a brand can own its hue, not
  // a reader's ability to perceive the page. So Vision is always the full set,
  // and any vision restriction passed in options.brand is ignored by design.
  const brand = options.brand || {};
  const resolveFamily = (f) => (typeof f === 'object' ? f : CONFIG.families.find((x) => x.key === f));
  let familyList;
  if (Array.isArray(brand.families) && brand.families.length) familyList = brand.families.map(resolveFamily);
  else if (brand.family) familyList = [resolveFamily(brand.family)];
  else familyList = CONFIG.families;
  familyList = familyList.filter(Boolean);
  const familyByKey = Object.fromEntries(familyList.map((f) => [f.key, f]));

  const nr = Array.isArray(brand.notchRange) ? brand.notchRange : [0, 2];
  const allowedNotches = [0, 1, 2].filter((n) => n >= nr[0] && n <= nr[1]);

  // Force persisted state inside the brand's allowed set.
  if (!familyByKey[state.family]) state.family = familyList[0].key;
  if (!allowedNotches.includes(state.notch)) state.notch = allowedNotches[Math.floor(allowedNotches.length / 2)] ?? 1;

  injectStyles();

  const el = document.createElement('div');
  el.className = 'ts-tuner';
  el.setAttribute('data-open', options.open ? 'true' : 'false');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'ts-tuner__toggle';

  const panel = document.createElement('div');
  panel.className = 'ts-tuner__panel';

  // Column 1: Mode (System plus the four modes).
  const modeCol = document.createElement('div');
  modeCol.className = 'ts-tuner__col';
  const modeLegend = document.createElement('p');
  modeLegend.className = 'ts-tuner__legend';
  modeLegend.textContent = 'Mode';
  modeCol.appendChild(modeLegend);
  const modeOptions = [{ key: 'system', label: 'System' }, ...CONFIG.modes.map((m) => ({ key: m.key, label: m.label }))];
  const modeButtons = modeOptions.map((m) => {
    const b = makeButton('ts-tuner__opt', m.label);
    b.addEventListener('click', () => update({ mode: m.key }));
    modeCol.appendChild(b);
    return { key: m.key, b };
  });

  // Column 2: Tone (the three notches).
  const toneCol = document.createElement('div');
  toneCol.className = 'ts-tuner__col';
  const toneLegend = document.createElement('p');
  toneLegend.className = 'ts-tuner__legend';
  toneLegend.textContent = 'Tone';
  toneCol.appendChild(toneLegend);
  const notchButtons = allowedNotches.map((n) => {
    const b = makeButton('ts-tuner__notch', String(n + 1), NOTCH_LABELS[n]);
    b.addEventListener('click', () => update({ notch: n }));
    toneCol.appendChild(b);
    return { n, b };
  });

  // Column 3: Color (the six families).
  const colorCol = document.createElement('div');
  colorCol.className = 'ts-tuner__col';
  const colorLegend = document.createElement('p');
  colorLegend.className = 'ts-tuner__legend';
  colorLegend.textContent = 'Color';
  colorCol.appendChild(colorLegend);
  const familyButtons = familyList.map((f) => {
    const b = makeButton('ts-tuner__swatch', null, f.label);
    b.style.backgroundColor = f.swatch;
    b.setAttribute('aria-label', f.label);
    b.addEventListener('click', () => update({ family: f.key }));
    colorCol.appendChild(b);
    return { key: f.key, b };
  });

  // Column 4: Vision (the third primitive). Persisted; changes the palette and
  // sets data-vision so theme.css turns on the redundant text encoding.
  const visionCol = document.createElement('div');
  visionCol.className = 'ts-tuner__col';
  const visionLegend = document.createElement('p');
  visionLegend.className = 'ts-tuner__legend';
  visionLegend.textContent = 'Vision';
  visionCol.appendChild(visionLegend);
  const visionButtons = CONFIG.visions.map((v) => {
    const b = makeButton('ts-tuner__sq', v.label, v.title);
    b.addEventListener('click', () => update({ vision: v.key }));
    visionCol.appendChild(b);
    return { key: v.key, b };
  });

  // Column 5: Simulate. An ephemeral SVG-filter overlay so a full-color viewer
  // can preview a deficiency. Not persisted; independent of the Vision setting.
  const simCol = document.createElement('div');
  simCol.className = 'ts-tuner__col';
  const simLegend = document.createElement('p');
  simLegend.className = 'ts-tuner__legend';
  simLegend.textContent = 'Simulate';
  simCol.appendChild(simLegend);
  let sim = 'none';
  const simButtons = SIMULATIONS.map((s) => {
    const b = makeButton('ts-tuner__sq', s.label, s.title);
    b.addEventListener('click', () => applySim(s.key));
    simCol.appendChild(b);
    return { key: s.key, b };
  });

  // SVG filters for the simulate overlay, built from the shared matrices in
  // linear light (matching the verifier and feColorMatrix's default).
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  const defs = document.createElementNS(svgNS, 'defs');
  for (const [key, m] of Object.entries(CVD_MATRICES)) {
    const filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', `ts-cvd-${key}`);
    filter.setAttribute('color-interpolation-filters', 'linearRGB');
    const fe = document.createElementNS(svgNS, 'feColorMatrix');
    fe.setAttribute('type', 'matrix');
    const values = `${m[0][0]} ${m[0][1]} ${m[0][2]} 0 0  ${m[1][0]} ${m[1][1]} ${m[1][2]} 0 0  ${m[2][0]} ${m[2][1]} ${m[2][2]} 0 0  0 0 0 1 0`;
    fe.setAttribute('values', values);
    filter.appendChild(fe);
    defs.appendChild(filter);
  }
  svg.appendChild(defs);

  function applySim(key) {
    sim = key;
    document.body.style.filter = key === 'none' ? '' : `url(#ts-cvd-${key})`;
    for (const { key: k, b } of simButtons) b.setAttribute('aria-pressed', String(k === sim));
  }

  panel.append(modeCol, toneCol, colorCol, visionCol, simCol);
  el.append(toggle, panel);
  const mount = options.mount || document.body;
  mount.appendChild(el);
  mount.appendChild(svg);

  toggle.addEventListener('click', () => {
    el.setAttribute('data-open', el.getAttribute('data-open') === 'true' ? 'false' : 'true');
  });

  // Apply the current state, resolving the (possibly brand) family object and
  // the prefers-contrast preference.
  function apply() {
    applyTuning(state, osDark, root, { family: familyByKey[state.family], highContrast });
  }

  function reflect() {
    const resolvedLabel = state.mode === 'system'
      ? `System (${osDark ? 'Dark' : 'Light'})`
      : CONFIG.modes.find((m) => m.key === state.mode).label;
    const familyLabel = familyByKey[state.family].label;
    const visionLabel = CONFIG.visions.find((v) => v.key === (state.vision || 'default')).label;
    const hcLabel = highContrast ? ' . more contrast' : '';
    toggle.textContent = `Theme: ${resolvedLabel} . ${NOTCH_LABELS[state.notch]} . ${familyLabel} . ${visionLabel}${hcLabel}`;
    for (const { key, b } of modeButtons) b.setAttribute('aria-pressed', String(key === state.mode));
    for (const { n, b } of notchButtons) b.setAttribute('aria-pressed', String(n === state.notch));
    for (const { key, b } of familyButtons) b.setAttribute('aria-pressed', String(key === state.family));
    for (const { key, b } of visionButtons) b.setAttribute('aria-pressed', String(key === (state.vision || 'default')));
  }

  function update(partial) {
    state = { ...state, ...partial };
    writeState(state);
    apply();
    reflect();
  }

  mql.addEventListener('change', (e) => {
    osDark = e.matches;
    if (state.mode === 'system') apply();
    reflect();
  });

  // prefers-contrast: more raises the solver's text floors. It never lowers a
  // floor, so the result stays WCAG AA.
  contrastMql.addEventListener('change', (e) => {
    highContrast = e.matches;
    apply();
    reflect();
  });

  apply();
  reflect();

  return {
    getState: () => ({ ...state }),
    set: update,
    clear: () => clearDerived(root),
  };
}
