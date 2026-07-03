// Emits tokens.json from the deriver, so the token values match theme.css and
// the parametric layer with no separately maintained source object to drift.
// Values come from derive.js at the middle notch, Iron family, default vision,
// per mode. Run: node scripts/build-tokens.mjs
import { writeFileSync } from 'node:fs';
import { CONFIG, deriveByKey } from '../derive.js';

const tokenMeta = {
  'background/base': ['color', 'Page background behind everything.'],
  'background/subtle': ['color', 'Recessed background for wells and sidebars, one step below base.'],
  'surface/default': ['color', 'Raised surface for cards, panels, and menus.'],
  'surface/hover': ['color', 'Surface under a hovered interactive element.'],
  'surface/active': ['color', 'Surface under a pressed or selected element.'],
  'border/default': ['color', 'Standard hairline separator and control border.'],
  'border/strong': ['color', 'Higher-contrast border for emphasis and dividers.'],
  'text/primary': ['color', 'Body and heading text. Meets WCAG AA on base and surface.'],
  'text/secondary': ['color', 'Supporting text and labels. Meets AA on base.'],
  'text/tertiary': ['color', 'Muted metadata and placeholders. Large or non-essential text.'],
  'text/on-accent': ['color', 'Foreground on a solid accent fill.'],
  'accent/default': ['color', 'Interactive accent for links, icons, and active state. Meets AA on base.'],
  'accent/hover': ['color', 'Accent under hover.'],
  'accent/subtle': ['color', 'Tinted accent background for selected rows and quiet emphasis.'],
  'accent/solid': ['color', 'Fill for primary buttons. Pairs with text/on-accent at AA.'],
  'success/default': ['color', 'Positive status foreground.'],
  'success/subtle': ['color', 'Positive status background.'],
  'warning/default': ['color', 'Caution status foreground.'],
  'warning/subtle': ['color', 'Caution status background.'],
  'danger/default': ['color', 'Error and destructive status foreground. Meets AA on base.'],
  'danger/subtle': ['color', 'Error status background.'],
  'focus/ring': ['color', 'Keyboard focus ring.'],
  'selection/background': ['color', 'Text selection highlight.'],
  'code/background': ['color', 'Background for inline and block code.'],
  'code/text': ['color', 'Code foreground. Meets AA on code/background.'],
  'table/stripe': ['color', 'Zebra-stripe background for alternate table rows.'],
  'overlay': ['color', 'Scrim behind modals and drawers.'],
};

const modes = ['light', 'soft-light', 'soft-dark', 'dark'];

// The token paths above line up, in order, with the first entries of
// CONFIG.cssOrder (the two trailing shadow tokens are not color tokens and are
// omitted from the JSON export). Values are read from the deriver per mode.
const metaKeys = Object.keys(tokenMeta);
const derived = Object.fromEntries(modes.map((m) => [m, deriveByKey(m, 1, 'iron', 'default')]));

const tokens = {};
metaKeys.forEach((name, i) => {
  const cssVar = CONFIG.cssOrder[i];
  const [type, description] = tokenMeta[name];
  tokens[name] = {
    $type: type,
    $description: description,
    values: Object.fromEntries(modes.map((m) => [m, derived[m][cssVar]])),
  };
});

const doc = {
  $schema: 'https://design-tokens.github.io/community-group/format/',
  name: 'temper-color',
  version: '1.0.0',
  description:
    'Five-mode semantic color system. One shared token schema; each token carries a value per mode. Values are generated from the deriver (derive.js) at the middle notch, Iron family, default vision, the same source as theme.css. System is not a value set: it resolves at runtime to light or dark via prefers-color-scheme, per systemMapping.',
  modes,
  systemMapping: { light: 'light', dark: 'dark' },
  cssVariablePattern: 'token path with slashes becomes --color-<segments joined by dash>, e.g. background/base -> --color-bg-base (bg is the documented abbreviation for background).',
  tokens,
};

writeFileSync(new URL('../tokens.json', import.meta.url), JSON.stringify(doc, null, 2) + '\n');
console.log('Wrote tokens.json with', Object.keys(tokens).length, 'tokens across', modes.length, 'modes.');
