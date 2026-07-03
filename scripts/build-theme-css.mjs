// Generates theme.css: the static baseline is the deriver's output at the middle
// notch, Iron family, default vision, one block per mode. This makes the static
// layer and the parametric layer one source of truth, so "Soft Light" means the
// same band of the ladder in both. Run: node scripts/build-theme-css.mjs
//
// The non-color tokens, the System resolution model, the vision text-encoding
// rules, and the forced-colors block are structural and are written here as
// templates; only the palette values come from the deriver.
import { writeFileSync } from 'node:fs';
import { CONFIG, deriveByKey } from '../derive.js';

const MIDDLE = 1;
const FAMILY = 'iron';

function palette(modeKey, indent) {
  const t = deriveByKey(modeKey, MIDDLE, FAMILY, 'default');
  return CONFIG.cssOrder.map((k) => `${indent}${k}: ${t[k]};`).join('\n');
}

const header = `/*
 * TEMPER - a five-mode semantic color system (a well-tempered palette)
 * License: MIT
 *
 * GENERATED FILE. The four palettes below are emitted from derive.js at the
 * middle notch, Iron family, default vision, by scripts/build-theme-css.mjs, so
 * the static baseline and the parametric deriver share one source of truth. Edit
 * the deriver's CONFIG and regenerate rather than editing values here by hand.
 *
 * Modes: System, Light, Soft Light, Soft Dark, Dark.
 * Every visible color comes from a semantic custom property. Components read
 * roles (surface, border, text) and never hard-code a hex value, so a single
 * mode switch restyles the whole page.
 *
 * Selection model:
 *   :root                      -> non-color tokens plus the Light palette as
 *                                 the default, so a page renders correctly
 *                                 before JavaScript runs.
 *   [data-theme="system"]      -> follows the OS via prefers-color-scheme.
 *                                 Light OS resolves to the Light palette
 *                                 (inherited from :root); dark OS resolves to
 *                                 Dark, the deep low-light palette. To prefer the
 *                                 gentler Soft Dark, swap the Dark values in the
 *                                 media block below for the Soft Dark palette.
 *   [data-theme="light"]       -> Light
 *   [data-theme="soft-light"]  -> Soft Light
 *   [data-theme="soft-dark"]   -> Soft Dark
 *   [data-theme="dark"]        -> Dark
 *
 * color-scheme is set per mode so native form controls, scrollbars, and
 * caret colors follow the active palette.
 */

:root {
  /* Non-color design tokens (shared, mode-independent) */
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  --ring-width: 3px;
  --border-width: 1px;

  /* Default palette: Light. Also serves System in a light-preference OS. */
  color-scheme: light;

${palette('light', '  ')}
}

/*
 * System mode in a dark-preference OS resolves to Dark (the deep palette). This
 * is the least surprising default: an OS set to Dark Mode gets the deep Dark
 * palette. For the gentler Soft Dark as the System-dark target, swap these
 * values for the Soft Dark palette, or drive the theme from the tuner with
 * resolveSystem's systemDark option set to 'soft-dark'.
 */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]),
  [data-theme="system"] {
    color-scheme: dark;

${palette('dark', '    ')}
  }
}

/* Explicit Light. Re-declared so it holds even in a dark-preference OS. */
[data-theme="light"] {
  color-scheme: light;

${palette('light', '  ')}
}

/* Soft Light: warmer and gentler than Light, for long-form reading. */
[data-theme="soft-light"] {
  color-scheme: light;

${palette('soft-light', '  ')}
}

/* Soft Dark: the primary dark working environment. Dark gray, not black. */
[data-theme="soft-dark"] {
  color-scheme: dark;

${palette('soft-dark', '  ')}
}

/* Dark: deeper low-light mode. Still readable, borders still visible. */
[data-theme="dark"] {
  color-scheme: dark;

${palette('dark', '  ')}
}
`;

const tail = `
/* A shared selection color for the whole document. */
::selection {
  background: var(--color-selection);
}

/*
 * Vision: redundant text encoding (the primary color-vision guard).
 *
 * Meaning is never carried by color alone. Set data-vision on the root to any
 * non-default value ("rg", "by", or "mono") and this block makes the redundant
 * channel visible: links gain an underline, and status dots reveal a text mark.
 * The palette also shifts to confusion-safe status hues with staggered
 * luminance, but that is the secondary guard; this is the primary one, because
 * text survives every deficiency, monochrome output, and a screen reader.
 *
 * Component contract: any meaning a component encodes in color it must also
 * expose as text or a glyph. For a status indicator, give the element the
 * "status-dot" class and a "data-letter" attribute (for example data-letter="S"
 * for success). The rule below renders that letter beside the dot under any
 * non-default vision. This works with zero JavaScript: set data-vision in your
 * HTML and the encoding is on.
 */
[data-vision]:not([data-vision="default"]) a {
  text-decoration: underline;
}

[data-vision]:not([data-vision="default"]) .status-dot {
  position: relative;
}
[data-vision]:not([data-vision="default"]) .status-dot::after {
  content: attr(data-letter);
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-left: 4px;
  font-family: var(--font-mono);
  font-size: 0.7em;
  line-height: 1;
  color: var(--color-text-secondary);
}

/*
 * forced-colors (Windows High Contrast and similar): step aside.
 *
 * When the user has imposed a limited system palette, the correct behavior for a
 * theming package is to yield, not to fight it with custom colors. Under
 * forced-colors the browser already substitutes system colors for most
 * properties; this block makes the deference explicit and keeps the redundant
 * text encoding on, since forced-colors does not restore color as a carrier of
 * meaning. The status dot border ensures the indicator stays visible when its
 * background is overridden.
 */
@media (forced-colors: active) {
  :root { color-scheme: light dark; }
  a { text-decoration: underline; }
  .status-dot {
    border: 1px solid CanvasText;
  }
  .status-dot::after {
    content: attr(data-letter);
    color: CanvasText;
  }
}
`;

writeFileSync(new URL('../theme.css', import.meta.url), header + tail);
console.log('Wrote theme.css from derive.js (middle notch, Iron family). Soft Light base:',
  deriveByKey('soft-light', MIDDLE, FAMILY, 'default')['--color-bg-base']);
