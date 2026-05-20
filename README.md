# VEX IQ Level Up Match Toolkit

A local, no-API match-day tool for a VEX IQ Level Up team.

## What It Does

- Score calculator for Floor, L1, L2, L3, and L4 goals
- Bean Bag count warning
- One-minute match clock with 30-second driver switch cue
- Pre-match checklist
- Match plan and post-match notes saved in the browser
- Print-friendly match sheet
- Rule quick reference extracted from the game manual
- Game manual changelog extracted from the Prefix Changelog
- Official game page and manual links

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Rebuild Rule Reference

When the manual PDF changes, replace `data/manual.pdf`, then run:

```bash
npm run build:rules
```

This regenerates `public/rules.json` for the Rule Reference and Changelog tabs.

## Repository

Recommended repository:

```text
VectorMotionX1/level-up-toolkit
```

This repo is source code for the toolkit. The main website lives in:

```text
VectorMotionX1/vectormotionx1.github.io
```

GitHub Pages publishes this repo as:

```text
https://vectormotionx1.github.io/level-up-toolkit/
```

## Automatic Manual Updates

The `Update Manual Data` GitHub Action runs daily and can also be triggered manually.

It:

1. Downloads the official VEX IQ Level Up manual PDF.
2. Rebuilds `public/rules.json`.
3. Commits changes only if the Quick Reference Guide or changelog changed.
4. Lets the Pages deploy workflow publish the updated site.

## Notes

This is not a manual replacement. Confirm close calls in the official game manual:

- `https://www.vexrobotics.com/iq/competition/viqc-current-game`
- `https://link.vex.com/docs/26-27/viqrc/game-manual`
