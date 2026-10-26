# Fix Android Auto Queue scroll resetting during playback

## Summary
Stop Android Auto's Queue screen from refreshing and jumping back to the first row every few seconds while music is playing.

## Reproduction (before)
1. Connect YMusic to Android Auto and start a playlist with enough items to scroll.
2. Open the player Queue.
3. Scroll several pages down, away from the first item, without changing tracks.
4. Observe the Queue jump back to the top repeatedly while playback continues. This makes browsing or selecting later entries impractical.

## Root cause / related issue
The Media3 session periodically publishes playback-position updates to connected controllers. Some Android Auto hosts incorrectly rebuild/reset the queue surface upon these periodic notifications, even though the queue and its ordering have not changed. This matches the independently reported AndroidX Media issue [#2192](https://github.com/androidx/media/issues/2192).

## Implementation (one behavioral change)
In `androidApp/src/main/kotlin/io/ymusic/android/PlaybackService.kt`, add `.setPeriodicPositionUpdateEnabled(false)` to the existing `MediaLibrarySession.Builder`, with a comment and upstream issue link.

This suppresses the *session's periodic position notifications*; it does **not** stop the actual player clock, seek operations, queue updates, track transitions, progress tracking, or Media3's player state handling. It avoids modifying `Media3PlayerAdapter` or altering playlist construction and keeps the change independent of the playlist-context fix.

Potential trade-off: connected controllers that depend on periodic position callbacks rather than extrapolating playback progress could display position less frequently. Verify the car's progress display as part of regression testing.

## Verification (after)
1. Start a long playlist in Android Auto; open Queue.
2. Scroll several pages down and leave it there for at least 60 seconds while playback continues.
3. Confirm the list remains at the chosen scroll position and can still be scrolled.
4. Use Next/Previous, seek, pause/resume and choose a queue item; confirm playback and selected-item highlighting update normally.
5. Confirm playback-progress display remains usable on the car and phone.
6. Repeat after reconnecting Android Auto and with a playlist that adds more items dynamically.

## Testing performed
The separate YM2 test APK incorporating this change was tested in a real car, and the previous repeated Queue resetting was reported fixed. The full regression checklist above has not been independently automated.

## Scope
Only one functional line and explanatory comments in `PlaybackService.kt`. No package-name, launcher icon, build workflow, or playlist-context changes. The fix can be reviewed and merged independently of the separate playlist-context PR.
