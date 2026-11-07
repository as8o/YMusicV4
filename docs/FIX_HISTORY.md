# YM Fix History and Active Deltas

This document tracks the current YM patch set and links to historical *immutable* diffs. These are not instructions to cherry-pick old code over updated upstream files. The current upstream baseline is YMusic **4.0.17**, commit [`8761846`](https://github.com/ymusic-io/YMusicV4/commit/8761846af6f2896a2e205b7e714fb150e12fafab).

## Active in `ym/main`

| Fix | Purpose | Current upstream-relative branch |
| --- | --- | --- |
| Android Auto Queue stability | Disable periodic MediaSession position notifications that can reset scroll position in the car queue; Media3 timeline/queue retains other behavior. | [`fix/aa-queue-scroll`](https://github.com/as8o/YMusicV4/compare/master...fix/aa-queue-scroll) |
| Android Auto steering and seeking | On Toyota RAV4: short Next/Previous = ±10s, two separate clicks = ±20s, long press = skip track; expose 10s and track controls to AA host while preserving original headset and playback controls. No low-level Fermata-style key state machine. | [`fix/aa-steering-seek`](https://github.com/as8o/YMusicV4/compare/master...fix/aa-steering-seek) |
| Android Auto account playlists | Show a full signed-in saved-playlist feed, including playlists owned by others, and allow navigation through continuation pages. The upstream account-library overview only contains preview shelves. | [`fix/aa-account-playlists`](https://github.com/as8o/YMusicV4/compare/master...fix/aa-account-playlists) |
| YM branding/compatibility | Blue launcher, Android display name YM, `io.ymusic.android.ym`, original YM signing credentials, increasing version code; Windows/macOS/Linux packaging from upstream. | [Daily-use delta](https://github.com/as8o/YMusicV4/compare/master...ym/main) |

## Historic custom implementations (superseded upstream)

All of these were implemented against earlier upstream code; old approaches are retained for comparison and **should not be ported if upstream's result is equivalent**.

1. **Android Auto playlist context** — original custom implementation used `YT_CONTEXT_PREFIX` and `playAutoPlaylist`. Upstream 4.0.17 instead implements `YT_LIST_SONG_PREFIX`, `ytListContext`, and `playPlaylist` with built-in queue paging. Status: *upstream-equivalent*. [Original immutable diff](https://github.com/as8o/YMusicV4/compare/d0147e0826abdc991c61841513eaee7de57a0948...b6987fe623611428cba2ce27a285100a4c3a01bc); archived branch `archive/android-auto-playlist-context-clean-before-upstream-2026-11`.
2. **Video Details** — original parser fallback for missing dates and statistics, factoid width, and narrow-screen channel/share layout. Upstream 4.0.17 uses its own recent-video factoid/date and layout parsing/presentation. Status: *upstream-equivalent; verify real samples*. [Original immutable diff](https://github.com/as8o/YMusicV4/compare/d0147e0826abdc991c61841513eaee7de57a0948...5cd6317626cd156c61240b693ca552544f1689c6); archived branch `archive/video-details-display-date-clean-before-upstream-2026-11`.
3. **Queue scroll** — [Original isolated diff](https://github.com/as8o/YMusicV4/compare/d0147e0826abdc991c61841513eaee7de57a0948...39924b858e87e5da9098209b6757aaa916b1ce09); archived branch `archive/android-auto-queue-scroll-fix-before-upstream-2026-11`. Status: active, reimplemented against new upstream.
4. **Steering-wheel behavior** — [Original isolated v4.0.15 diff](https://github.com/as8o/YMusicV4/compare/429315de65f3660dc9414dcc787418a20897a7d0...f766286b95195db67c3ca1cfe7f594a9e004bfae). Status: active, reimplemented against new upstream.

## Permanent rollback checkpoint

- Dated source tag: [`ym-checkpoint-v4.0.15-2026-11-07`](https://github.com/as8o/YMusicV4/releases/tag/ym-checkpoint-v4.0.15-2026-11-07).
- Original upstream: YMusic 4.0.15 `429315de`.
- Archived YM source: `a6a0ab2`.
- Last successful signed full-platform packages: build source `9483f09`, [CI run](https://github.com/as8o/YMusicV4/actions/runs/41778273330).
- Source checkpoint differs from the successful build only in CI workflow trigger configuration.
- Signed APKs, desktop packages and SHA256SUMS are attached to the Release.
- Branch `archive/ym-v4.0.15-checkpoint-2026-11-07` is preserved.

## Validation before promoting a new YM release

- Compare `master...ym/main`: no `MediaBrowseTree`, `PlaybackCoordinator`, `VideoDetailsDialog` or YouTube extraction patch unless new upstream behavior demonstrably fails.
- Android all supported ABIs; macOS x64/arm64; Windows x64/arm64; Linux x64/arm64.
- Signed APK `apksigner verify` matches checkpoint APK certificate SHA-256 digest.
- Version code must be strictly greater than the installed checkpoint APK.
- Android Auto playlist context, queue-scroll persistence, short/double/long steering presses, on-screen rewind 10s and next track, pause/resume and headset buttons.
- Recent YouTube video publish date/statistics and S25 dialog layout.
- Actual device validation must be reported separately from CI compilation; CI alone does not prove Toyota RAV4 behavior.
