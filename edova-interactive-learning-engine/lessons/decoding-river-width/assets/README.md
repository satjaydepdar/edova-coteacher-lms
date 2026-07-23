# Assets — Decoding River Width

This folder holds every binary/static asset the lesson references. All
paths here are referenced relative to this lesson folder in
`lesson.json` → `media`.

## Current Contents

| Path | Type | Status | Referenced By |
|---|---|---|---|
| `explainer-video- decoding-river_width.mp4` | Video (mp4), 8:00 | Present | `lesson.json` → `media.video.assetPath`; every scene in `storyboard.md` |
| `diagrams/` | Directory | Empty — pending production | Scenes 5, 6, 9, 11 (`storyboard.md`); `lesson.json` → `media.diagrams` |
| `images/` | Directory | Empty — pending production | Scenes 1, 3, 13 (`storyboard.md`); `lesson.json` → `media.images` |

## Required Assets Checklist

### Video

- [x] `explainer-video- decoding-river_width.mp4` — primary narrated
  explainer. Runtime and internal cut points must match the timestamps in
  `../storyboard.md` and `../lesson.json` (`timeline.scenes`) exactly.

### Diagrams (`diagrams/`)

- [ ] `triangle-abc-unlabelled.svg` — blank right-triangle outline used as
  the base for Scene 6's drag-and-drop interaction (`int2` / `q2`).
- [ ] `triangle-abc-labelled.svg` — fully labelled version (A, B, C,
  baseline AB, right angle at A, angle B) matching Scene 5.
- [ ] `triangle-abc-tangent-overlay.svg` — Scene 7/9 variant with the
  `tan(B) = AC / AB` formula and the worked numeric substitution overlaid.
- [ ] `triangle-adc-verification.svg` — Scene 11 variant showing the second
  triangle (point D, baseline AD, angle ADC) overlapping triangle ABC and
  sharing side AC.

### Images (`images/`)

- [ ] `river-hero-shot.jpg` — wide valley/river shot for Scene 1's hook.
- [ ] `clinometer-closeup.jpg` — hand holding a clinometer, sighting across
  water, for Scene 3.
- [ ] `recap-panel-1-river.jpg`, `recap-panel-2-baseline.jpg`,
  `recap-panel-3-formula.jpg`, `recap-panel-4-verification.jpg` — four
  still panels for the Scene 13 recap montage.
- [ ] `outro-tower-on-hill.jpg` — teaser image for the next lesson, used at
  the very end of Scene 14.

## Naming Convention

- All filenames use `kebab-case`, no spaces (the existing video filename
  is a legacy exception and should not be used as a template for new
  assets).
- Prefix diagram files with `triangle-` and scene-recap files with
  `recap-panel-<n>-`.
- Vector diagrams should be delivered as `.svg`; photographic/rendered
  stills as `.jpg` or `.webp`.

## Adding a New Asset

1. Place the file in the correct subfolder (`diagrams/` or `images/`), or
   at the top level for video/audio.
2. Reference it from the relevant scene(s) in `../storyboard.md`.
3. Add or update the corresponding entry under `../lesson.json` →
   `media`.
4. Update the checklist above and mark the item complete.
5. Bump the lesson's version per the Versioning section in `../README.md`
   (a new/changed asset is at minimum a **minor** version bump).
