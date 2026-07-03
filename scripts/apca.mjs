// APCA (Advanced Perceptual Contrast Algorithm) Lc computation, for a dev-time
// perceptual readout only. WCAG 2.1 remains the conformance gate everywhere in
// this package; APCA is reported alongside it because WCAG 2 is known to
// misestimate perceived contrast, most visibly in dark themes, and APCA tracks
// perception better.
//
// License note. The APCA-W3 reference package is licensed specifically to the
// W3C and AGWG with limitations, and its own documentation warns against using
// it to claim WCAG conformance (https://github.com/Myndex/apca-w3). To keep this
// MIT package clean, nothing here is copied from that package: this is a fresh
// implementation from the published APCA-W3 constants, and it lives only in the
// dev-time verification script, not in the shipped runtime (derive.js, theme.css,
// tuner.js). Algorithm by Andrew Somers (Myndex Research). Lc is a perceptual
// readout, not a conformance metric.

const MAIN_TRC = 2.4;
const SRGB_CO = [0.2126729, 0.7151522, 0.0721750];
const BLK_THRS = 0.022;
const BLK_CLMP = 1.414;
const NORM_BG = 0.56;
const NORM_TXT = 0.57;
const REV_TXT = 0.62;
const REV_BG = 0.65;
const SCALE_BOW = 1.14;
const SCALE_WOB = 1.14;
const LO_BOW_OFFSET = 0.027;
const LO_WOB_OFFSET = 0.027;
const DELTA_Y_MIN = 0.0005;
const LO_CLIP = 0.1;

function rgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function screenLuminance([r, g, b]) {
  const f = (c) => Math.pow(c / 255, MAIN_TRC);
  return SRGB_CO[0] * f(r) + SRGB_CO[1] * f(g) + SRGB_CO[2] * f(b);
}

function softClampBlack(y) {
  return y >= BLK_THRS ? y : y + Math.pow(BLK_THRS - y, BLK_CLMP);
}

// Signed APCA Lc for text on background. Positive is dark-text-on-light,
// negative is light-text-on-dark. Callers usually use the magnitude.
export function apcaLc(textHex, bgHex) {
  const yText = softClampBlack(screenLuminance(rgb(textHex)));
  const yBg = softClampBlack(screenLuminance(rgb(bgHex)));
  if (Math.abs(yBg - yText) < DELTA_Y_MIN) return 0;

  let sapc;
  let out;
  if (yBg > yText) {
    sapc = (Math.pow(yBg, NORM_BG) - Math.pow(yText, NORM_TXT)) * SCALE_BOW;
    out = sapc < LO_CLIP ? 0 : sapc - LO_BOW_OFFSET;
  } else {
    sapc = (Math.pow(yBg, REV_BG) - Math.pow(yText, REV_TXT)) * SCALE_WOB;
    out = sapc > -LO_CLIP ? 0 : sapc + LO_WOB_OFFSET;
  }
  return out * 100;
}

export function apcaLcAbs(textHex, bgHex) {
  return Math.abs(apcaLc(textHex, bgHex));
}
