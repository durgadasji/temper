// Builds tuner.bundle.js, a classic (non-module) script for the demo.
//
// derive.js and tuner.js are ES modules, which is right for real sites served
// over http. But browsers block ES module loading over file://, so a page
// opened by double-click could not import them. This concatenates the two
// modules, strips the import/export keywords, and wraps them in an IIFE that
// exposes window.Temper, so demo.html works with a plain <script> and no
// network access. Run: node scripts/build-demo-bundle.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, here), 'utf8');

function stripModuleSyntax(src) {
  return src
    .split('\n')
    .filter((line) => !/^\s*import\s.*from\s+['"].*['"];?\s*$/.test(line))
    .map((line) => line.replace(/^(\s*)export\s+(function|const|let|class)\s/, '$1$2 '))
    .join('\n');
}

const derive = stripModuleSyntax(read('../derive.js'));
const tuner = stripModuleSyntax(read('../tuner.js'));

const banner =
  '// GENERATED FILE. Do not edit. Built from derive.js and tuner.js by\n' +
  '// scripts/build-demo-bundle.mjs for local-file (file://) use in demo.html.\n' +
  '// Real sites should import the ES modules derive.js and tuner.js directly.\n';

const out =
  banner +
  'window.Temper = (function () {\n' +
  derive +
  '\n' +
  tuner +
  '\n' +
  'return { CONFIG, derive, deriveByKey, resolveSystem, contrast, CVD_MATRICES,\n' +
  '  simulatedLuminance, simulatedContrast, hexToOklch, deltaEOk, brandToFamily,\n' +
  '  brandFidelity, applyTuning, clearDerived, initTuner };\n' +
  '})();\n';

writeFileSync(new URL('../tuner.bundle.js', here), out);
console.log('Wrote tuner.bundle.js (' + out.length + ' bytes).');
