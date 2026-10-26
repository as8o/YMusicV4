# Android Auto: preserve playlist playback context when selecting a track

> **PR summary:** Keep YouTube playlists navigable in Android Auto, but when a user selects a video *inside* a playlist, play it in the context of that playlist rather than starting a video-based recommendation radio.
>
> This document describes the feature-only change. The separate YM2 test APK's name, blue icon, application ID, and CI workflow are **not** part of this PR.

## Problem

In the phone app, opening a YouTube playlist and tapping a track starts that track **with the playlist as the playback queue**. The following tracks are therefore the subsequent items from that playlist.

Previously in Android Auto, the same interaction started the chosen track using `PlaybackCoordinator.playNow(video)`. That API intentionally attaches `NextQueueSource.radio(...)`, which loads YouTube's radio/watch-next recommendations rather than the chosen playlist. The first song can appear correct, but pressing Next or allowing autoplay may continue with unrelated tracks.

This is a context-loss bug, not a problem with playlist extraction or audio playback.

### Reproduce on the original Android Auto implementation

Prerequisite: sign in to a YouTube account with an accessible playlist containing at least three distinct tracks, and connect YMusic to Android Auto.

1. In Android Auto, open YMusic and navigate to the signed-in **Discover / account library** area where YouTube playlists are shown. (The top-level **Library > Playlists** in this codebase is the *local* media-store library; it is a different source.)
2. Open a YouTube playlist.
3. Tap the **second** track, not the first.
4. Confirm that the second track starts.
5. Inspect the next entries in the playback queue, press Next, or let the track finish.

**Before:** Android Auto calls `playNow(video)`, creating a recommendation-radio queue. The remaining playlist order is not preserved.

**Expected:** The selected track plays now, while the queue remains the playlist in its original order. Next moves to the next playlist track, with additional playlist pages loaded as necessary.

## Why it happened

The Android Auto browse tree originally identifies an online track only by `yt:<videoId>`, regardless of where it appeared. A Media3 controller sends that media ID to `PlaybackService` when a row is selected. By then, `PlaybackService` has no reliable indication that the row came from a specific playlist and routes all `yt:` rows to `coordinator.playNow(video)`.

The mobile playlist screen has the missing context: `DetailScreens.kt` invokes the existing `coordinator.playAll(videos, startIndex = …, source = ready.queueSource(...))`. This PR gives Android Auto enough context to use that same queueing behavior, without changing the phone screen.

## Implementation

The functional diff is limited to **three existing Kotlin files**.

### 1. `androidApp/.../MediaBrowseTree.kt`: carry playlist identity across the controller boundary

- When serving children of a `ytlist:` node, pass its URL to `feedChildren(..., playlistUrl = url)`.
- For videos specifically emitted within such a list, use a distinct `ytcontext:` media ID containing the playlist URL and video ID, separated by `|`. Other videos keep their original `yt:` media IDs.
- Allow `item(mediaId)` to reconstruct a controller-requested contextual video, preserving its contextual ID, and allow `toPlayableItem(...)` to resolve the same video when needed.
- Keep playlist entries **browsable only** (`isBrowsable=true`, `isPlayable=false`). Setting both flags to true was tried separately and in Android Auto caused tapping the playlist to play it rather than open its tracks. That behavior is intentionally *not* included here.
- Reuse the original feed conversion and media metadata paths; do not change local-library behavior, unrelated feeds, or the standalone video path.

**Reason:** Android Auto's selection round trip otherwise strips the only information needed to distinguish “play this video's radio” from “play this video within this playlist.”

### 2. `androidApp/.../PlaybackService.kt`: route contextual track selections

Add one branch before the existing `YT_SONG_PREFIX` branch in `applyBrowseItems(...)`. The new branch decodes the `ytcontext:` media ID and calls `coordinator.playAutoPlaylist(playlistUrl, selectedVideoId)` from the existing service coroutine scope.

The old `yt:` branch is unchanged and still calls `playNow(video)` for standalone videos.

**Reason:** A contextual selection needs playlist playback; normal search, home feed, and standalone song selections must retain their previous recommendation-radio behavior.

### 3. `commonUi/.../PlaybackCoordinator.kt`: reuse the existing playlist queue machinery

The small `suspend fun playAutoPlaylist(url, selectedVideoId)` adapter:

1. Loads the appropriate page through the existing `extractMusicBrowse` or `extractPlaylistDetail` engine method.
2. Filters the page's items to videos in the same way as the existing playlist screen.
3. Finds the selected video's index within those videos.
4. Calls **existing** `playAll(songs, startIndex, source = NextQueueSource.playlist(...))`.

`playAll` populates the queue, and `NextQueueSource.playlist` performs lazy continuation beyond the loaded page. No second queue implementation, no additional playlist cache, and no modification of `DetailScreens.kt` are needed. The adapter intentionally leaves the user's shuffle mode alone, consistent with the mobile call.

**Safety behavior:** If the selected video is absent from the newly retrieved initial page, the helper logs a warning and returns rather than silently playing track zero. This can occur if the playlist changed between browsing and tapping; the PR does not attempt to search all subsequent pages for a stale entry.

## Verify the fix

Use a YouTube account containing at least one playlist with several unmistakably different videos:

1. **Browse:** In Android Auto, navigate to a YouTube playlist and tap its title. The playlist should **open** as a list of videos rather than play immediately.
2. **Start at a non-first track:** Tap track 2 (or track 3). Verify that exact track starts, not track 1.
3. **Queue:** Confirm that the playing queue corresponds to that playlist, in playlist order, including the tracks before the selected entry as part of the queue where the player exposes them.
4. **Next:** Press the car's Next/steering-wheel control. Verify playback advances to the next entry in the chosen playlist, **not** a video recommendation.
5. **Continuation:** In a long playlist, play across the initially fetched page boundary and confirm that further playlist tracks load.
6. **Regression—standalone video:** Play a video directly from a non-playlist YouTube feed or search. Its original `playNow`/radio behavior should remain.
7. **Regression—local music:** Verify that the local **Library > Playlists** navigation and song playback still work.
8. **Regression—navigation:** Verify Back returns from playlist contents normally; no implicit Play all action or new playlist menu appears.

**Observed in testing:** The YM2 test variant was tested in a car and its playlist-context playback was reported working. The checklists above describe how others can reproduce and verify; they are not claims that every edge case has been tested automatically.

## Scope and non-goals

- **Included:** Android Auto playlist-aware selection and queue continuation, while keeping folders navigable.
- **Not included:** New Play all rows, dual browsable/playable playlist folders, changing the phone UI, changing standalone radio playback, local playlist alterations, new artwork, or branding/package IDs.
- **Known limitation:** A track absent from a refetched initial page is not resolved through further pages; the helper declines to select a different track. This can be addressed separately if reproducible.

## Review notes

- Three Kotlin files only; no new dependencies.
- The existing player and queue-source APIs are used as-is.
- Context is encoded only for video rows that belong to a playlist, avoiding global behavior changes.
- The test-app-specific code is held on a separate YM2 branch and is deliberately excluded from the upstream PR.
