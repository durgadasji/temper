// WCAG 2.1 contrast checker for the static baseline. The baseline is the
// deriver's output at the middle notch, Iron family, default vision, so this
// checks the same values theme.css and tokens.json now carry. It prints the
// required pairs and flags anything under AA (4.5:1 body text, 3:1 large/UI).
// Run: node scripts/contrast.mjs
import { deriveByKey } from '../derive.js';

function srgbToLinear(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function ratio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const modes = ['light', 'soft-light', 'soft-dark', 'dark'];
const palettes = Object.fromEntries(modes.map((m) => [m, deriveByKey(m, 1, 'iron', 'default')]));

// Pairs the spec requires, plus a few load-bearing UI ones. Values are read from
// the derived token set by CSS custom property name.
function pairsFor(p) {
  return [
    ['text/primary on background/base', p['--color-text-primary'], p['--color-bg-base'], 4.5],
    ['text/secondary on background/base', p['--color-text-secondary'], p['--color-bg-base'], 4.5],
    ['text/tertiary on background/base', p['--color-text-tertiary'], p['--color-bg-base'], 3.0],
    ['text/primary on surface/default', p['--color-text-primary'], p['--color-surface'], 4.5],
    ['text/primary on code/background', p['--color-text-primary'], p['--color-code-bg'], 4.5],
    ['accent/default on background/base', p['--color-accent'], p['--color-bg-base'], 4.5],
    ['accent/on-solid on accent/solid', p['--color-text-on-accent'], p['--color-accent-solid'], 4.5],
    ['success/default on background/base', p['--color-success'], p['--color-bg-base'], 3.0],
    ['warning/default on background/base', p['--color-warning'], p['--color-bg-base'], 3.0],
    ['danger/default on background/base', p['--color-danger'], p['--color-bg-base'], 4.5],
  ];
}

let failures = 0;
for (const [mode, p] of Object.entries(palettes)) {
  console.log(`\n=== ${mode} ===`);
  for (const [label, fg, bg, min] of pairsFor(p)) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) failures++;
    const mark = ok ? 'PASS' : 'FAIL';
    console.log(
      `${mark}  ${r.toFixed(2).padStart(5)}:1  (min ${min.toFixed(1)})  ${label}  ${fg} on ${bg}`
    );
  }
}

console.log(`\n${failures === 0 ? 'All pairs meet their threshold.' : failures + ' pair(s) below threshold.'}`);
process.exit(failures === 0 ? 0 : 1);
