// Verifies the deriver across all 4 modes x 3 notches x 6 families x 4 vision
// settings (288 positions) on three fronts:
//   1. Legibility on the base background (the accessibility floors).
//   2. Legibility on every other background a text token can land on (subtle
//      wells, floated surfaces, hover states, code blocks, table stripes, and
//      the tinted status fills). A token solved against one background must not
//      fail when used on another.
//   3. Color-vision distinguishability: under each non-default vision, the three
//      status colors, simulated under the deficiency that vision serves, must
//      separate by luminance above a stated threshold.
// Run: node scripts/verify-derive.mjs   (add --samples for sample palettes)
import { CONFIG, derive, contrast, simulatedContrast, brandFidelity, brandToFamily, _internal } from '../derive.js';
import { apcaLcAbs } from './apca.mjs';

function lumHex(hex) {
  const h = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return _internal.relLum(rgb);
}
function ratio(fgHex, bgHex) { return contrast(lumHex(fgHex), lumHex(bgHex)); }

// Legibility pairs on the base background.
const ON_BASE = [
  ['text/primary on bg', '--color-text-primary', '--color-bg-base', 4.5],
  ['text/secondary on bg', '--color-text-secondary', '--color-bg-base', 4.5],
  ['text/tertiary on bg', '--color-text-tertiary', '--color-bg-base', 3.0],
  ['accent on bg', '--color-accent', '--color-bg-base', 4.5],
  ['on-accent on solid', '--color-text-on-accent', '--color-accent-solid', 4.5],
  ['danger on bg', '--color-danger', '--color-bg-base', 4.5],
  ['success on bg', '--color-success', '--color-bg-base', 3.0],
  ['warning on bg', '--color-warning', '--color-bg-base', 3.0],
];

// The same text roles land on these other backgrounds. Every one is checked,
// because a token solved against base is used on all of them.
const TEXT_BACKGROUNDS = [
  '--color-bg-subtle', '--color-surface', '--color-surface-hover',
  '--color-surface-active', '--color-code-bg', '--color-table-stripe',
];
function onSurfacePairs(t) {
  const pairs = [];
  for (const bg of TEXT_BACKGROUNDS) {
    pairs.push([`text/primary on ${bg}`, '--color-text-primary', bg, 4.5]);
    pairs.push([`text/secondary on ${bg}`, '--color-text-secondary', bg, 4.5]);
    pairs.push([`text/tertiary on ${bg}`, '--color-text-tertiary', bg, 3.0]);
  }
  // Neutral text on each tinted fill: this is the real pairing (a callout uses
  // a status-subtle background with body text and a title on it). Same-hue
  // status-color-on-its-own-subtle is deliberately not asserted; it is the weak
  // pairing the component contract steers away from, and under a vision setting
  // the dot letter carries the meaning instead.
  for (const fill of ['--color-success-subtle', '--color-warning-subtle', '--color-danger-subtle', '--color-accent-subtle']) {
    pairs.push([`text/primary on ${fill}`, '--color-text-primary', fill, 4.5]);
    pairs.push([`text/secondary on ${fill}`, '--color-text-secondary', fill, 4.5]);
  }
  return pairs;
}

const STRUCTURE = [
  ['border on bg', '--color-border', '--color-bg-base', 1.18],
  ['border-strong on bg', '--color-border-strong', '--color-bg-base', 1.5],
];

// Which dichromacy simulation each vision must survive, and the distinguish
// threshold (simulated contrast between two status colors). Above this, the two
// are separable by luminance even with hue compromised.
const CVD_THRESHOLD = 1.25;
const VISION_SIMS = { rg: ['deut', 'prot'], by: ['trit'], mono: ['mono'] };

// APCA perceptual readout (dev-time). WCAG is the gate; these Lc values report
// how the same pairs read perceptually, especially across dark modes. Tracked
// per mode as the lowest magnitude seen, for the default vision.
const APCA_PAIRS = [
  ['text/primary on bg', '--color-text-primary', '--color-bg-base'],
  ['text/secondary on bg', '--color-text-secondary', '--color-bg-base'],
  ['accent on bg', '--color-accent', '--color-bg-base'],
  ['on-accent on solid', '--color-text-on-accent', '--color-accent-solid'],
];
const apcaByMode = {}; // mode -> { pairLabel -> minLc }

const notchLabels = ['brighter', 'middle', 'deeper'];
let failures = 0;
const worst = {
  base: { r: Infinity, label: '', pos: '', floor: 0 },
  baseMargin: { r: Infinity, label: '', pos: '', floor: 0 },
  surface: { r: Infinity, label: '', pos: '', floor: 0 },
  surfaceMargin: { r: Infinity, label: '', pos: '', floor: 0 },
  structure: { r: Infinity, label: '', pos: '', floor: 0 },
};
const cvdWorst = {};

function record(bucket, rec) {
  if (rec.r < bucket.r) Object.assign(bucket, rec);
}
function recordMargin(bucket, rec) {
  if (rec.r - rec.floor < bucket.r - bucket.floor) Object.assign(bucket, rec);
}

function assertPairs(pairs, t, ctx, onBucket, marginBucket) {
  for (const [label, fg, bg, floor] of pairs) {
    const r = ratio(t[fg], t[bg]);
    const rec = { label, r, floor, pos: ctx.pos };
    if (r < floor) { failures++; console.log(`FAIL ${ctx.pos}  ${label}  ${r.toFixed(2)} < ${floor}`); }
    if (onBucket) record(onBucket, rec);
    if (marginBucket) recordMargin(marginBucket, rec);
  }
}

for (const mode of CONFIG.modes) {
  for (let notch = 0; notch < 3; notch++) {
    for (const family of CONFIG.families) {
      for (const vision of CONFIG.visions) {
        const t = derive(mode, notch, family, vision.key);
        const ctx = { pos: `${mode.key}/${notchLabels[notch]}/${family.key}/${vision.key}` };

        assertPairs(ON_BASE, t, ctx, worst.base, worst.baseMargin);
        assertPairs(onSurfacePairs(t), t, ctx, worst.surface, worst.surfaceMargin);
        assertPairs(STRUCTURE, t, ctx, worst.structure, null);

        if (vision.key === 'default') {
          const bucket = (apcaByMode[mode.key] = apcaByMode[mode.key] || {});
          for (const [label, fg, bg] of APCA_PAIRS) {
            const lc = apcaLcAbs(t[fg], t[bg]);
            if (bucket[label] === undefined || lc < bucket[label]) bucket[label] = lc;
          }
        }

        const sims = VISION_SIMS[vision.key];
        if (sims) {
          const statuses = [
            ['success', t['--color-success']],
            ['warning', t['--color-warning']],
            ['danger', t['--color-danger']],
          ];
          for (const sim of sims) {
            for (let i = 0; i < statuses.length; i++) {
              for (let j = i + 1; j < statuses.length; j++) {
                const sc = simulatedContrast(statuses[i][1], statuses[j][1], sim);
                if (sc < CVD_THRESHOLD) {
                  failures++;
                  console.log(`FAIL ${ctx.pos}  ${statuses[i][0]}/${statuses[j][0]} under ${sim}  ${sc.toFixed(2)} < ${CVD_THRESHOLD}`);
                }
                if (!cvdWorst[sim] || sc < cvdWorst[sim].sc) {
                  cvdWorst[sim] = { sc, pair: `${statuses[i][0]}/${statuses[j][0]}`, pos: ctx.pos };
                }
              }
            }
          }
        }
      }
    }
  }
}

const positions = CONFIG.modes.length * 3 * CONFIG.families.length * CONFIG.visions.length;
console.log(`Swept ${positions} positions (4 modes x 3 notches x 6 families x 4 visions).\n`);

function line(label, b) {
  console.log(`  ${label.padEnd(24)} ${b.label.padEnd(36)} ${b.r.toFixed(2)}:1 (floor ${b.floor})  ${b.pos}`);
}
console.log('Worst legibility pair by lowest ratio:');
line('on base:', worst.base);
line('on other surfaces:', worst.surface);
console.log('\nTightest legibility pair against its own floor:');
console.log(`  on base:     ${worst.baseMargin.label} = ${worst.baseMargin.r.toFixed(2)}:1 (floor ${worst.baseMargin.floor}, margin +${(worst.baseMargin.r - worst.baseMargin.floor).toFixed(2)})  ${worst.baseMargin.pos}`);
console.log(`  on surfaces: ${worst.surfaceMargin.label} = ${worst.surfaceMargin.r.toFixed(2)}:1 (floor ${worst.surfaceMargin.floor}, margin +${(worst.surfaceMargin.r - worst.surfaceMargin.floor).toFixed(2)})  ${worst.surfaceMargin.pos}`);

console.log('\nColor-vision distinguishability, worst status pair (simulated, threshold ' + CVD_THRESHOLD + '):');
for (const [sim, w] of Object.entries(cvdWorst)) {
  console.log(`  ${sim.padEnd(6)} ${w.sc.toFixed(2)}:1  ${w.pair.padEnd(16)} ${w.pos}`);
}

console.log(`\nLowest border separation: ${worst.structure.label} = ${worst.structure.r.toFixed(2)}:1 (floor ${worst.structure.floor})  ${worst.structure.pos}`);

// APCA perceptual readout: lowest Lc magnitude per mode (default vision, across
// notches and families). WCAG is the gate; this shows perceived contrast is even
// across modes, including the dark ones where WCAG 2 misestimates.
console.log('\nAPCA perceptual readout, lowest Lc per mode (default vision). WCAG is the gate; APCA is a readout:');
console.log('  mode'.padEnd(14), 'primary', 'secondary', 'accent', 'on-solid');
for (const mode of CONFIG.modes) {
  const b = apcaByMode[mode.key];
  console.log(
    '  ' + mode.key.padEnd(12),
    String(Math.round(b['text/primary on bg'])).padStart(6),
    String(Math.round(b['text/secondary on bg'])).padStart(8),
    String(Math.round(b['accent on bg'])).padStart(6),
    String(Math.round(b['on-accent on solid'])).padStart(8)
  );
}

// Brand fidelity demonstration: treat each default family's swatch as a brand
// hex, build a family from it with brandToFamily, and report how much of the
// brand's chroma the solver keeps at the worst background and how far the hue
// drifts. Hue is held by construction, so drift is near zero; chroma drops only
// where the sRGB gamut cannot hold the brand color at the required lightness.
console.log('\nBrand fidelity (brandToFamily on each swatch): worst chroma kept and hue drift across all mode-notch positions:');
console.log('  brand hex'.padEnd(14), 'worst chroma kept', 'max hue drift', 'max deltaE');
for (const family of CONFIG.families) {
  const brand = brandToFamily(family.swatch, null, { key: family.key });
  const rows = brandFidelity(brand);
  const worstChroma = Math.min(...rows.map((r) => r.chromaRetained));
  const maxHue = Math.max(...rows.map((r) => r.hueDrift));
  const maxDE = Math.max(...rows.map((r) => r.deltaE));
  console.log(
    '  ' + family.swatch.padEnd(12),
    `${Math.round(worstChroma * 100)}%`.padStart(16),
    `${maxHue.toFixed(1)} deg`.padStart(13),
    maxDE.toFixed(3).padStart(11)
  );
}

console.log(`\n${failures === 0 ? 'All ' + positions + ' positions pass every floor and distinguishability threshold.' : failures + ' assertion(s) failed.'}`);

if (process.argv.includes('--samples')) {
  console.log('\nIron family, middle notch, Dark mode, per vision (statuses and accent):');
  for (const vision of CONFIG.visions) {
    const t = derive(CONFIG.modes.find((m) => m.key === 'dark'), 1, CONFIG.families[0], vision.key);
    console.log(`  ${vision.key.padEnd(8)} success ${t['--color-success']} warning ${t['--color-warning']} danger ${t['--color-danger']} accent ${t['--color-accent']}`);
  }
}

process.exit(failures === 0 ? 0 : 1);
