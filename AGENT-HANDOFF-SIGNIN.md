# Agent handoff: SwimSum sign-in fix (Feb 2026)

**Use this in a new Agent chat.** Tell the new agent: "Read project-state.md, .cursor/rules.md, and WORKING-METHOD-CURSOR.md. Then read AGENT-HANDOFF-SIGNIN.md and get sign-in working using the native AuthBridge. Do not abridge project-state.md."

---

## Project context

- **App:** SwimSum – swim workout generator (Capacitor Android + WebView).
- **Repo:** swimgen2. Branches: `cursor-transition` (stable/testing), `develop` (active work).
- **Sources of truth:** `project-state.md` (canonical state; NEVER abridge/truncate), `.cursor/rules.md`, `WORKING-METHOD-CURSOR.md`. UI standard: show distances as "Lengths" (e.g. "400m (16 Lengths)").

---

## What we're trying to do

**Get Google Sign-In (and eventually Email sign-in) working inside the app** so users can sign in and the app reliably knows they're signed in. Right now the flow is broken: the user is sent to a blank Firebase page and never returns to the app.

---

## Why it's broken

- The app is a **Capacitor WebView** loading `index.js` (and built assets in `www/`).
- We used the **Firebase Web SDK** in that WebView (`signInWithPopup` / `signInWithRedirect`). That flow opens an external browser/Firebase page and tries to redirect back to the WebView's origin (e.g. localhost), which **does not work** in this setup – user sees a blank Firebase page, "missing initial state," or "conflicting popup."
- So: **Web SDK auth inside the WebView is the wrong approach.** The fix is **native Firebase Auth on Android** with a small JS bridge so the WebView only asks "is user signed in?" and "start Google sign-in."

---

## What's already done

1. **Firebase Console:** Google provider enabled; SHA-1 (debug) added for Android app; **new `google-services.json`** downloaded and placed in `android/app/` (it now contains `oauth_client` entries including a web client for `requestIdToken`).
2. **Android app:**  
   - `android/app/build.gradle`: Firebase BOM, `firebase-auth`, and **`com.google.android.gms:play-services-auth:21.2.0`** are in the `dependencies` block.  
   - **`AuthBridge.java`** exists at `android/app/src/main/java/com/creativearts/swimsum/AuthBridge.java`. It's a Capacitor plugin (`@CapacitorPlugin(name = "AuthBridge")`) that:
     - Uses `FirebaseAuth` and `GoogleSignIn` (native).
     - Exposes `getCurrentUser()`, `signOut()`, `signInWithGoogle()` to the WebView.
     - In `load()` it builds `GoogleSignInOptions` with `requestIdToken(getContext().getString(R.string.default_web_client_id))` – so **`default_web_client_id` must be in `res/values/strings.xml`** (see below).
   - **MainActivity** is still just `extends BridgeActivity {}` – Capacitor 3+ auto-discovers `@CapacitorPlugin` classes, so AuthBridge may already be available; if not, MainActivity may need to register the plugin.
3. **Build:** `./gradlew assembleDebug` (or Run from Android Studio) **succeeds**; the app installs to the device.
4. **Auth gate in `index.js`:** Still uses **Firebase Web SDK** (`firebase.auth().signInWithPopup(provider)`). There is also a "DEV: Continue without sign-in" link so the user can bypass the gate for testing. The gate does **not** call the native AuthBridge yet.

---

## What the new agent must do (concrete)

1. **Add Web Client ID to Android strings**  
   In `android/app/src/main/res/values/strings.xml`, add:
   - `<string name="default_web_client_id">660683677456-hpnoj6kff9klsu4mfg0imui5bbcdug1j.apps.googleusercontent.com</string>`  
   (This is the web OAuth client from the current `google-services.json`; it's required for `requestIdToken` in AuthBridge.)

2. **Wire the auth gate in `index.js` to the native AuthBridge**  
   - On startup (where we currently use `authReadyPromise` / `onAuthStateChanged`): if `window.Capacitor` and `Capacitor.Plugins.AuthBridge` exist, call `AuthBridge.getCurrentUser()` and use the result: if `user` is non-null, treat as signed in (show coach mark); else show auth gate.  
   - When the user taps "Continue with Google": if native bridge is available, call `Capacitor.Plugins.AuthBridge.signInWithGoogle()` and on success dismiss the gate and run `showCoachMark()`; on error show a short message. If native bridge is not available, keep current fallback (e.g. DEV skip or a message).  
   - Do **not** call `firebase.auth().signInWithPopup` or `signInWithRedirect` when running inside Capacitor with AuthBridge available.

3. **Keep DEV bypass**  
   Leave the "DEV: Continue without sign-in (testing only)" link so the user is never locked out during testing.

4. **Rebuild and sync**  
   Run `npm run build` and `npx cap sync android`, then the user can hit Run in Android Studio to install and test on the phone.

5. **Email sign-in**  
   Can be added later (native or Web); for this handoff the priority is **Google Sign-In via AuthBridge** only.

---

## Files to touch (summary)

- `android/app/src/main/res/values/strings.xml` – add `default_web_client_id`.
- `index.js` – auth bootstrap and "Continue with Google" button handler: use `Capacitor.Plugins.AuthBridge` when present; otherwise keep existing fallback.
- Optionally `MainActivity.java` – only if the plugin is not auto-registered (test first).

---

## Important constraints

- **Do not abridge or truncate `project-state.md`.** Append/update only.
- Follow **.cursor/rules.md** and **WORKING-METHOD-CURSOR.md** (e.g. "Lengths" for UI, mantra: never blanket-overwrite).
- Build and run from project root: `npm run build`, `npx cap sync android`; then user runs the app from Android Studio (Run → Run 'app') with phone connected (e.g. `npm run connect-phone -- 192.168.137.77:34787` if needed).

---

## One-line summary for the new agent

**Switch the auth gate in index.js to use the existing native AuthBridge plugin (getCurrentUser + signInWithGoogle) when running in Capacitor; add default_web_client_id to strings.xml; rebuild and sync so Google Sign-In works on device.**
