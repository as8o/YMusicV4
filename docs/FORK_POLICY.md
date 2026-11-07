# YM Fork Policy

## Branch ownership

- `master` is an **exact, commit-for-commit mirror** of `ymusic-io/YMusicV4:master`. Do not commit YM code, docs, workflows, or metadata into it. Sync by fast-forward whenever possible; if the fork has historical unrelated commits, archive the old head and reset once with an expected-SHA lease.
- `ym/main` is the **only daily-use YM product branch**. Start upstream updates from the current upstream source, and add only necessary active fixes and YM identity/build changes.
- `fix/*` is for isolated upstream-compatible patches, created from the exact upstream commit being fixed. Keep branding and diagnostics out of an upstream submission.
- `archive/*` retains old implementations/history permanently; do not rewrite.
- `ym-checkpoint-* ` annotated tags and Releases identify durable recovery points. Tag names include the upstream version and checkpoint date. Do not move checkpoint tags. Keep signed package artifacts, checksums, baseline SHA, build SHA, signing identity evidence, original diff links, validation findings, and which fixes were later superseded.

## Update workflow

1. Verify the latest upstream `master` SHA, inspect relevant implementations and maintainer alternatives **before** porting an old patch. Accept equivalent upstream code; remove superseded YM code instead of maintaining duplicates.
2. Preserve the current working `ym/main` as a checkpoint with its upstream baseline and original patch comparison URLs before risky updates.
3. Sync `master` exactly to upstream. Create `fix/*` only for changes still needed. Build `ym/main` from upstream changes with minimal, context-aware diffs; never replace entire newer upstream source files with old fork files.
4. Keep Android app display name **YM**, blue launcher icon, stable package ID `io.ymusic.android.ym`, existing release signing identity and Android upgrade compatibility. Preserve all original upstream build architectures unless there is an explicit exception. Never put signing material in Git.
5. Run CI and compare `master...ym/main`; check Android Auto playlist context, queue scrolling, media/steering keys, Video Details, login, playback, and APK signing/update certificate. Promote/tag only after compilation and requested device tests.
6. Preserve the historical per-fix diffs as fixed SHA-to-SHA compare URLs, with original upstream version and expected replacement state. Repo source is authoritative over conversation memories.

## Reproducibility and evidence

- Distinguish **source checkpoint SHA** from **last known-good built SHA**; do not label a build successful for commits that were not built.
- Github Actions artifacts can expire; retain durable copies as Release assets with SHA256SUMS.
- A release tag points at the recorded source checkpoint, even if the last known-good signed artifacts were built from a slightly different commit; document any delta explicitly.
- Avoid automatic `push` + `pull_request` duplication for the same branch, and do not place YM-specific workflows on upstream-mirror `master`.

## Original YM recovery baseline

- Upstream: YMusic 4.0.15, commit `429315de65f3660dc9414dcc787418a20897a7d0`.
- Checkpoint date: 2026-11-07.
- YM source: `a6a0ab2be1992f3bac03b571621ed115506ec625`.
- Last successful cross-platform build source: `9483f09d52fc1ee50528ceb9209aa5b666652fa0`.
- Release/tag: `ym-checkpoint-v4.0.15-2026-11-07`.
- Historical fixes and build artifacts: https://github.com/as8o/YMusicV4/releases/tag/ym-checkpoint-v4.0.15-2026-11-07
