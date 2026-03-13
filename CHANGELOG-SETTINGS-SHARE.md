# Changelog: Settings wheel + Share (feature/settings-wheel-and-share)

**Branch:** `feature/settings-wheel-and-share`  
**Revert:** `git checkout cursor-transition` or `git revert` the merge commit.

## Summary

- **Top row (generator):** Unchanged. Colour picker, background, help stay as-is.
- **Workout title row:** Lock + dolphin kept; colour picker and background buttons removed and replaced with Settings + Share. Settings opens a panel with Colour picker, Background, and Help. Share opens menu: Share to socials (screenshot + link) and Print (workout + website link).
- **Capture region:** `#workoutCaptureRegion` wraps the workout area (title bar through footer) for screenshot/print.
- **Dependencies:** html2canvas bundled from npm (copied to www/html2canvas.min.js in build) so capture works in Capacitor/WebView.
- **Share menu (updated):** Share icon is a conventional share symbol (SVG: connected nodes with arrow). Menu: "Save as image (JPG)" and "Share (email, print, socials)". Helper text explains save/share/print.
- **Full workout capture:** Before capture, `#resultWrap` and `#workout-list-scroll-area` are temporarily set to `overflow:visible`, `height:auto`, `maxHeight:none` so the full workout (all cards) is laid out and captured, not just the visible viewport. Restored after capture. Ad banner is never included (capture region is only `#workoutCaptureRegion`; `ignoreElements` also excludes `#adBanner` and `.ad-container`).
- **Lock behaviour:** When the workout is locked, tapping Settings or Share shows "Screen locked. Hold the lock to unlock." and does nothing. Only scrolling the workout remains allowed.

## File changes

### index.js

1. **WORKOUT CONTAINER ID (HOME_HTML, ~line 1458)**  
   - Add `id="workoutCaptureRegion"` to the div that wraps `#resultWrap` and `#sticky-footer-panel`.

2. **WORKOUT TITLE ROW (HOME_HTML, ~lines 1464–1476)**  
   - Keep: `#lockBtn`, `#regenBtn2` (dolphin), `#workoutNameText`.
   - Remove: the colour `<input>` div and `#bgCycleBtn2`.
   - Add: `#settingsBtn` (gear), `#shareBtn` (share icon).

3. **SETTINGS PANEL HTML (HOME_HTML, after workout container ~line 1489)**  
   - New modal `#settingsPanel` with overlay, containing: Colour picker (`<input type="color">`), Background (cycle button + same behaviour), Help (“How to use SwimSum” button). Close button and overlay click close the panel.

4. **fullHtml HEAD (~line 4778)**  
   - Add script: html2canvas from CDN (e.g. `https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js`).

5. **PRINT STYLES**  
   - Add `@media print` block (in HOME_HTML `<style>` or fullHtml): hide app shell except `#workoutCaptureRegion` and a footer line with “Generated with SwimSum – https://swimsum.com”.

6. **HOME_JS_EVENTS (~4054–4056)**  
   - Remove: `document.getElementById("bgCycleBtn2")?.addEventListener(...)`.
   - Add: `#settingsBtn` click → open settings panel; `#shareBtn` click → show share menu (Share image | Print).
   - Add: Settings panel open/close (overlay + close button); panel Help button calls `runOnboardingSequence({ force: true })` and closes panel; panel Colour and Background wire to existing `setBgColor` / `cycleBackgroundManually`.
   - Add: Share image → html2canvas(`#workoutCaptureRegion`), then `navigator.share({ files, text, url })` (url = swimsum.com or store link on Capacitor). Print → optional “Include background?”, add print footer with link, `window.print()`.

### project-state.md

- Append subsection under Version and release (or UI/Features): describe top row unchanged; workout row = lock + dolphin + settings + share; settings panel = colour, background, help; share = screenshot to socials + print with website link; technical notes (`#workoutCaptureRegion`, html2canvas, print CSS).

---

*Generated before implementing. Edits applied per plan.*
