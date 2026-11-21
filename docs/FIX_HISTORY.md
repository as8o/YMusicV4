# YM Fix History and Active Deltas

This document tracks the current YM patch set and links to historical *immutable* diffs. These are not instructions to cherry-pick old code over updated upstream files. The current upstream baseline is YMusic **4.0.27**, commit [`0ed260bbf`](https://github.com/ymusic-io/YMusicV4/commit/0ed260bbfc86b285ce77d0b7a3890f39826b463f).

## Active in `ym/main`

| Fix | Purpose | Current upstream-relative branch |
| --- | --- | --- |
| Android Auto Queue stability | Disable periodic MediaSession position notifications that can reset scroll position in the car queue; Media3 timeline/queue retains other behavior. | [`fix/aa-queue-scroll`](https://github.com/as8o/YMusicV4/compare/master...fix/aa-queue-scroll) |
| Android Auto steering and seeking | On Toyota RAV4: short Next/Previous = ±10s, two separate clicks = ±20s, long press = skip track; place 10s seeks in overflow slots so native Previous/Next remain visible while preserving original headset and playback controls. No low-level Fermata-style key state machine. | [`fix/aa-steering-seek`](https://github.com/as8o/YMusicV4/compare/master...fix/aa-steering-seek) |
| Android Auto account playlists | Show a full signed-in saved-playlist feed, including playlists owned by others, and allow navigation through continuation pages. The upstream account-library overview only contains preview shelves. | [`fix/aa-account-playlists`](https://github.com/as8o/YMusicV4/compare/master...fix/aa-account-playlists) |
| Android Auto Home recommendations | Signed-in Home suggestions and Google-client Home-only browse behavior. Retained from the latest test build. The user confirmed the Home feed in For You works on 2026-11-21. Retain its Google-client behavior. Ordinary Discover order follows upstream. | [`fix/aa-home-recommendations`](https://github.com/as8o/YMusicV4/compare/master...fix/aa-home-recommendations) |
| YM branding/compatibility | Blue launcher, Android display name YM, `io.ymusic.android.ym`, original YM signing credentials, increasing version code; Windows/macOS/Linux packaging from upstream. | [Daily-use delta](https://github.com/as8o/YMusicV4/compare/master...ym/main) |

## Upgrade on 2026-11-21

- Active fixes apply to upstream 4.0.27. Upstream still provides playlist-context playback and Video Details.
- YM branding, signing, build workflow and browse tracing are excluded from all active fix branches. Browse tracing is included in the main YM build.
- Daily source before the upgrade was 9b22ec2896db328dec7aa06f0a2e58e99ab25a9d, successful build 43648015830.
- The latest Home-only diagnostic source was 4fcb4a375bc868cb90b15caf518f3174b2ee0d47, successful build 43830159730. Its functional Home-only change is retained. Its Downloads trace is now included in the main YM build.
- Packaging conflicts were resolved by retaining upstream appVersionCode() as YM's fallback and upstream Windows development-instance isolation with the stable YM release identity.
- The experimental missing-video-titles patch remains archived and excluded from the active build.

## Historic custom implementations (superseded upstream)

All of these were implemented against earlier upstream code; old approaches are retained for comparison and **should not be ported if upstream's result is equivalent**.

1. **Android Auto playlist context** — original custom implementation used `YT_CONTEXT_PREFIX` and `playAutoPlaylist`. Upstream 4.0.17 instead implements `YT_LIST_SONG_PREFIX`, `ytListContext`, and `playPlaylist` with built-in queue paging. Status: *upstream-equivalent*. [Original immutable diff](https://github.com/as8o/YMusicV4/compare/d0147e0826abdc991c61841513eaee7de57a0948...b6987fe623611428cba2ce27a285100a4c3a01bc); archived branch `archive/android-auto-playlist-context-clean-before-upstream-2026-11`.
2. **Video Details** — original parser fallback for missing dates and statistics, factoid width, and narrow-screen channel/share layout. Upstream 4.0.17 uses its own recent-video factoid/date and layout parsing/presentation. Status: *upstream-equivalent; verify real samples*. [Original immutable diff](https://github.com/as8o/YMusicV4/compare/d0147e0826abdc991c61841513eaee7de57a0948...5cd6317626cd156c61240b693ca552544f1689c6); archived branch `archive/video-details-display-date-clean-before-upstream-2026-11`.
3. **Queue scroll** — [Original isolated diff](https://github.com/as8o/YMusicV4/compare/d0147e0826abdc991c61841513eaee7de57a0948...39924b858e87e5da9098209b6757aaa916b1ce09); archived branch `archive/android-auto-queue-scroll-fix-before-upstream-2026-11`. Status: active, reimplemented against new upstream.
4. **Steering-wheel behavior** — [Original isolated v4.0.15 diff](https://github.com/as8o/YMusicV4/compare/429315de65f3660dc9414dcc787418a20897a7d0...f766286b95195db67c3ca1cfe7f594a9e004bfae). Status: active, reimplemented against new upstream.

## 4.0.17 rollback checkpoint

- Upstream baseline: [`8761846`](https://github.com/ymusic-io/YMusicV4/commit/8761846af6f2896a2e205b7e714fb150e12fafab).
- YM source: [`afa468b8`](https://github.com/as8o/YMusicV4/commit/afa468b8ad9f351f8cebbf5b45aec88d68e02cdd), preserved on [`archive/ym-v4.0.17-checkpoint-2026-11-14`](https://github.com/as8o/YMusicV4/tree/archive/ym-v4.0.17-checkpoint-2026-11-14).
- Signed Android build: [Actions run 42382109071](https://github.com/as8o/YMusicV4/actions/runs/42382109071).
- Original patches: [entire YM delta](https://github.com/as8o/YMusicV4/compare/8761846...afa468b8), [queue scroll](https://github.com/as8o/YMusicV4/compare/8761846...8e271d04), [steering](https://github.com/as8o/YMusicV4/compare/8761846...2c54b287), and [saved playlists](https://github.com/as8o/YMusicV4/compare/8761846...3e798c03).

## Permanent 4.0.15 rollback checkpoint

- Dated source tag: [`ym-checkpoint-v4.0.15-2026-11-07`](https://github.com/as8o/YMusicV4/releases/tag/ym-checkpoint-v4.0.15-2026-11-07).
- Original upstream: YMusic 4.0.15 `429315de`.
- Archived YM source: `a6a0ab2`.
- Last successful signed full-platform packages: build source `9483f09`, [CI run](https://github.com/as8o/YMusicV4/actions/runs/41778273330).
- Source checkpoint differs from the successful build only in CI workflow trigger configuration.
- Signed APKs, desktop packages and SHA256SUMS are attached to the Release.
- Branch `archive/ym-v4.0.15-checkpoint-2026-11-07` is preserved.

## Validation before promoting a new YM release

- Compare `master...ym/main`: the only `MediaBrowseTree` change should be the saved-playlist entry and pagination. Use upstream playlist playback, Video Details and YouTube extraction.
- Android all four supported ABIs. Desktop packages are opt-in.
- Signed APK `apksigner verify` matches checkpoint APK certificate SHA-256 digest.
- Version code must be strictly greater than the existing YM APKs, including the 4.0.17 Android Auto diagnostic builds.
- Android Auto playlist context, queue-scroll persistence, short/double/long steering presses, on-screen rewind 10s and next track, pause/resume and headset buttons.
- Recent YouTube video publish date/statistics and S25 dialog layout.
- Actual device validation must be reported separately from CI compilation; CI alone does not prove Toyota RAV4 behavior.
