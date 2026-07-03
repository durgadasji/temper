# Branding with TEMPER

The first question a design lead asks of any theming system is whether it will eat the brand. The honest answer here is that it will not, but only because the system draws a firm line between the parts of a brand that are identity and the parts that are chrome, and treats them differently on purpose. This document explains that line and how to configure it.

The background worth naming is the failure mode this design reacts against. Wallpaper-seeded system theming, where the whole UI is recolored from a photo the user picked, can dissolve a brand into whatever the device happens to be showing. A brand that adopts a parametric system reasonably fears the same dissolution. The answer in this package is that a brand controls its hue and its pinned assets outright, and delegates only lightness and the surrounding neutrals to the solver, which is exactly the part a brand should not be hand-managing across five modes anyway.

## Move one: the brand is the hue, the lightness belongs to the reader

A brand color is really a hue and a chroma. Its lightness is not a fixed property of the brand; it is whatever makes the color legible against the surface it sits on. On a white page a brand blue must be dark enough to read; on a near-black page the same brand blue must be light enough to read. These are different lightnesses of the same color, and a brand that pins a single hex value is really pinning one lightness and then discovering it fails on three of the five backgrounds.

The solver treats the brand hue as constant and solves the lightness per background. `brandToFamily` takes one or two canonical brand hexes, reads the OKLCH hue and chroma from the primary one, and returns a family whose accent carries that hue at full chroma. From then on the accent's hue is held at every background while its lightness is solved to clear the contrast floor. The hue is what a viewer recognizes as the brand; holding it constant while moving lightness is what keeps the brand itself legible everywhere.

```js
import { brandToFamily, deriveByKey } from './derive.js';

const family = brandToFamily('#B5122E', null, { key: 'acme', label: 'Acme' });
const tokens = deriveByKey('dark', 1, family, 'default');
```

Two limits are worth stating plainly. Where a brand color is very saturated, the sRGB gamut cannot hold its full chroma at every lightness, so the solver reduces chroma toward the neutral axis at the extremes, never shifting the hue. The fidelity report (`brandFidelity`, shown in the verification output) tells a brand exactly where this happens: the hue stays put, and the chroma retained drops below one hundred percent only at the backgrounds where sRGB runs out. And a solved accent is not the brand's exact hex on most backgrounds, by design, because it has been moved in lightness to stay readable; the OKLab distance the report shows is dominated by that intended lightness change, not by drift in the brand's identity.

## Move two: identity versus chrome

Not everything colored is UI. A logo, a wordmark, and the colors inside an illustration or a product photograph are pinned content. They are the brand's identity, and the system never recolors them. The UI around them, the backgrounds and text and borders and buttons, is chrome, and that is what the solver derives.

The rule that keeps pinned identity working across modes is the backdrop rule. A pinned asset is guaranteed a compliant plate to sit on: a surface, drawn from the derived tokens, whose color is chosen so the asset reads correctly in every mode. A logo built for a light background gets a light plate even in Dark mode, rather than being dropped onto a near-black page where it disappears or, worse, being recolored to fit. In practice this is a small container using `--color-surface` or a fixed light or dark plate token behind the mark, sized to the mark, present in all modes. The asset never changes; the plate under it is what the system guarantees.

The division of labor is therefore clean. Identity is pinned and never touched. Chrome is derived and always compliant. The backdrop rule is the seam between them, and it is the brand's job to mark which elements are pinned identity so the system knows to give them a plate rather than treat them as chrome.

## Move three: range as policy

A brand does not have to expose every primitive to every reader. The branded preset lets a brand decide the range of control it offers, and that decision is a brand policy, not a technical limit.

A brand can fix the family, so every reader sees the brand color and only the brand color. It can instead offer a curated set of families, for example the brand color plus one or two sanctioned alternates, and no others. And it can restrict the notch range, which matters where brand fidelity fails at an extreme: if the fidelity report shows the brand's chroma cannot be held at the brightest or deepest notch, the brand can simply not offer that notch, so readers only ever see the tones where the brand holds.

```js
import { initTuner, brandToFamily } from './tuner.js';

initTuner({
  brand: {
    family: brandToFamily('#B5122E', null, { key: 'acme', label: 'Acme' }),
    notchRange: [1, 2], // omit the brightest notch if fidelity fails there
  },
});
```

There is one exception, and it is not negotiable in this system: vision settings are never restrictable. A brand can own its hue, its family list, and its tone range, but it cannot take away a reader's ability to perceive the page. The vision primitive stays fully available under every branded configuration, and the tuner enforces this in code rather than trusting documentation: any attempt to restrict vision through the brand configuration is ignored. The reasoning is simple. A brand's control is over how the page looks; a reader's control over vision is about whether the page can be read at all, and the second is not the brand's to spend.
