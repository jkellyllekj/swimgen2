# Firebase Web Auth Migration Plan (Option A)

This document describes how SwimSum will migrate from localStorage-based auth placeholders to **real Firebase Authentication using the Web SDK**, without changing runtime behavior until we are ready to wire the code.

The goals:
- Keep the existing **splash → auth gate → coach mark** UX.
- Implement real **Google** and **Email Link (passwordless)** sign-in using Firebase Auth (Web SDK).
- Avoid unnecessary Android resubmits by keeping most behavior in the **web layer**.

---

## 1. Current Auth Behavior in `index.js`

Auth today is cosmetic only. The app uses a `localStorage` flag to decide whether to show an auth-looking gate or skip directly to the coach mark.

Key behavior:

```4256:4263:c:\Users\jesse\StudioProjects\swimgen2\index.js
splash.style.opacity = '0';
setTimeout(function() {
  splash.remove();
  if (localStorage.getItem('swimsum_auth_skipped') !== 'true') {
    showAuthGate();
  } else {
    showCoachMark();
  }
}, 750);
```

- After the splash animation, the app:
  - Shows the **auth gate** if `swimsum_auth_skipped` is not `"true"`.
  - Otherwise skips directly to `showCoachMark()`.

The auth gate itself:

```4270:4303:c:\Users\jesse\StudioProjects\swimgen2\index.js
function showAuthGate() {
  var gate = document.createElement('div');
  gate.id = 'auth-gate';
  gate.style.cssText = 'position:fixed; inset:0; z-index:99998; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.4s ease;';
  var card = document.createElement('div');
  card.style.cssText = 'background:#ffffff; border-radius:16px; padding:36px 28px; max-width:340px; width:90%; text-align:center; box-shadow:0 8px 40px rgba(0,0,0,0.35); font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;';
  card.innerHTML =
    '<h2 style="margin:0 0 6px 0; font-size:24px; font-weight:800; color:#800000; text-transform:uppercase; letter-spacing:1px;">Workout Generator</h2>' +
    '<p style="margin:0 0 24px 0; font-size:13px; color:#666;">Enter your email to sign in or create a free account.</p>' +
    '<button id="auth-google-btn" type="button" ...>Continue with Google</button>' +
    '<button id="auth-email-btn" type="button" ...>Continue with Email</button>' +
    '<a id="auth-skip-btn" href="#" ...>Skip for now</a>';
  gate.appendChild(card);
  document.body.appendChild(gate);
  void gate.offsetWidth;
  gate.style.opacity = '1';
  document.getElementById('auth-skip-btn').addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.setItem('swimsum_auth_skipped', 'true');
    gate.style.opacity = '0';
    setTimeout(function() { gate.remove(); showCoachMark(); }, 400);
  });
  document.getElementById('auth-google-btn').addEventListener('click', function() {
    localStorage.setItem('swimsum_auth_skipped', 'true');
    gate.style.opacity = '0';
    setTimeout(function() { gate.remove(); showCoachMark(); }, 400);
  });
  document.getElementById('auth-email-btn').addEventListener('click', function() {
    localStorage.setItem('swimsum_auth_skipped', 'true');
    gate.style.opacity = '0';
    setTimeout(function() { gate.remove(); showCoachMark(); }, 400);
  });
}
```

And there is a DEV reset helper:

```1443:1447:c:\Users\jesse\StudioProjects\swimgen2\index.js
<li><strong>Feedback:</strong> <a href="#" style="color:#007bff;">Leave a comment here.</a></li>
<li style="margin-top:6px;"><a href="#" onclick="localStorage.removeItem('swimsum_auth_skipped'); location.reload(); return false;" style="color:#999; font-size:10px; text-decoration:none;">DEV: Reset New User State</a></li>
```

Summary:
- **No real identity**: there is no user object, no tokens, no backend verification.
- Buttons labeled “Google” and “Email” **only set `swimsum_auth_skipped` to `"true"`** and proceed.
- `auth-skip-btn` exists for testers to bypass the gate completely.

---

## 2. Target Behavior with Firebase Web SDK (no code changes yet)

We will adopt **Firebase Authentication (Web SDK)** and keep almost the same UI flow:

1. Splash runs as before.
2. On splash completion:
   - If a Firebase user is already signed in → **skip auth gate** → show coach mark.
   - Else if `swimsum_auth_skipped === "true"` (tester bypass) → skip gate → show coach mark.
   - Else → show auth gate.
3. In the auth gate:
   - **Google button**: performs a real Firebase **Google sign-in**.
   - **Email button**: starts a Firebase **Email Link** (passwordless) flow.
   - **Skip button**: remains as an optional, DEV-focused bypass that does not create a Firebase user.

Conceptually, this replaces `swimsum_auth_skipped` as the *primary* gate with a **Firebase Auth state check**, while still allowing a localStorage tester bypass.

Planned high-level logic (pseudo-code):

```js
// Called after splash hides
onAuthStateChanged(auth, (user) => {
  const skipFlag = localStorage.getItem('swimsum_auth_skipped') === 'true';
  if (user) {
    showCoachMark();
  } else if (skipFlag) {
    showCoachMark(); // tester bypass, unauthenticated
  } else {
    showAuthGate();
  }
});
```

---

## 3. Firebase Console Setup

All of this is done in the Firebase Console; no code changes are required to complete this step.

### 3.1 Create / configure the project and Web app

1. In the Firebase Console, create (or select) a project for SwimSum, e.g. **`swimsum-prod`**.
2. In **Project Settings → General → Your apps**, add a **Web app** (\"</>\" icon):
   - Name it something like `swimsum-web`.
   - Enable or leave enabled the \"Also set up Firebase Hosting\" toggle only if you intend to use Hosting (not required for auth).
3. Copy the generated **Firebase config** (the `firebaseConfig` object with `apiKey`, `authDomain`, etc.) – this will be used later in the client bootstrap.

### 3.2 Enable Authentication providers

Navigate to **Build → Authentication → Sign-in method**.

- **Google sign-in**:
  - Enable the **Google** provider.
  - Set a valid **Project support email**.
  - Ensure the **Authorized domains** list includes:
    - Your production domain (e.g. `swimsum.app`).
    - Any staging or preview domains you use.
    - `localhost` for local development.

- **Email Link (passwordless) sign-in**:
  - Enable **Email/Password**.
  - Within its settings, **check \"Email link (passwordless sign-in)\"**.
  - Configure the **action URL**, e.g.:
    - `https://swimsum.app/auth-complete` (or your main app URL if you want to handle the link there).
  - Ensure **\"Handle code in app\"** (or equivalent) is enabled so the Web SDK can complete the sign-in on your page.

At this stage:
- You have a Firebase project.
- A Web app is registered with a config object.
- Google and Email Link providers are enabled.

---

## 4. Local Project Setup (npm / npx)

Current `package.json` (excerpt):

```1:19:c:\Users\jesse\StudioProjects\swimgen2\package.json
{
  "name": "nodejs",
  "version": "1.0.3",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "build": "node scripts/build-www.js",
    "cap:sync": "npx cap sync android",
    "cap:build": "npm run build && npx cap sync android"
  },
  "dependencies": {
    "@capacitor/android": "^8.1.0",
    "@capacitor/cli": "^7.5.0",
    "@capacitor/core": "^8.1.0",
    "@capacitor/splash-screen": "^8.0.1",
    "@types/node": "^22.19.5",
    "express": "^5.2.1",
    "node-fetch": "^3.3.2",
    "openai": "^6.16.0",
    "typescript": "^5.9.3"
  }
}
```

We will install Firebase as a dependency so the web build can bundle the Web SDK into `www/`.

### 4.1 Install Firebase Web SDK

Run in the project root:

- `npm install firebase`

This adds the modular v9+ Firebase Web SDK to your dependencies.

### 4.2 (Optional) Firebase CLI for hosting/emulators

Only if you later decide to use Firebase Hosting or local emulators:

- `npm install --save-dev firebase-tools`
- Typical CLI usage (not required just for Auth):
  - `npx firebase login`
  - `npx firebase use --add`
  - `npx firebase emulators:start`

---

## 5. Code Integration Outline (to be implemented later)

This section describes how the Web SDK will be integrated into the existing app structure. **Do not implement these changes yet.**

### 5.1 Firebase bootstrap module

Create a small client-side module (for example `public/auth.js` or a bundled `auth.mjs`) that:

1. Imports Firebase Auth functions:
   - `initializeApp`
   - `getAuth`
   - `setPersistence`, `browserLocalPersistence`
   - `onAuthStateChanged`
   - `GoogleAuthProvider`, `signInWithPopup` (or `signInWithRedirect` for WebView safety)
   - `sendSignInLinkToEmail`, `isSignInWithEmailLink`, `signInWithEmailLink`
2. Initializes Firebase with the `firebaseConfig` from the console.
3. Sets persistence:

```js
setPersistence(auth, browserLocalPersistence);
```

4. Exposes minimal helpers on `window`, for example:
   - `window.swimsumAuth.initAuthGate(onAuthed, onGuest)` – runs `onAuthStateChanged` and decides whether to show the auth gate.
   - `window.swimsumAuth.signInWithGoogle()`
   - `window.swimsumAuth.startEmailLinkFlow(email)`
   - `window.swimsumAuth.handleEmailLinkOnLoad()`

These helpers can be called from the existing inline scripts in `index.js` without rewriting everything into modules immediately.

### 5.2 Auth gate decision flow

Replace the direct `swimsum_auth_skipped` check with a Firebase Auth state–driven flow:

```js
// Pseudocode to be wired after splash
onAuthStateChanged(auth, (user) => {
  const skipFlag = localStorage.getItem('swimsum_auth_skipped') === 'true';
  if (user) {
    showCoachMark();
  } else if (skipFlag) {
    showCoachMark(); // tester bypass, still unauthenticated
  } else {
    showAuthGate();
  }
});
```

### 5.3 Google button handler

Bind the Google button to a real sign-in call:

```js
// Pseudocode for #auth-google-btn click
async function handleGoogleClick() {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
    // user is now authenticated; skip local skip flag unless you need it for dev
    gate.style.opacity = '0';
    setTimeout(() => { gate.remove(); showCoachMark(); }, 400);
  } catch (err) {
    // Render a small error message inside the auth card, do not break the app
  }
}
```

If popups cause trouble inside WebView, switch to `signInWithRedirect` and handle the completion inside `handleEmailLinkOnLoad`-style startup code.

### 5.4 Email Link handler

For the Email button, we will use **Email Link (passwordless)**:

1. When `#auth-email-btn` is clicked:
   - Reveal an email input + \"Send link\" button in the same card.
   - On \"Send link\", call:

```js
await sendSignInLinkToEmail(auth, email, {
  url: 'https://swimsum.app/auth-complete', // or your chosen action URL
  handleCodeInApp: true
});
localStorage.setItem('swimsum_pending_email', email);
```

2. On every page load (before deciding gate vs coach mark):
   - Call `isSignInWithEmailLink(auth, window.location.href)`.
   - If true:

```js
const email = localStorage.getItem('swimsum_pending_email') || prompt('Confirm your email');
await signInWithEmailLink(auth, email, window.location.href);
localStorage.removeItem('swimsum_pending_email');
// Clean up URL if needed
```

3. After successful sign-in, proceed exactly as with Google: hide gate, show coach mark.

### 5.5 Tester bypass semantics

We will keep a **DEV-friendly bypass**:

- `auth-skip-btn` continues to:
  - Set `localStorage.setItem('swimsum_auth_skipped', 'true')`.
  - Close the gate and call `showCoachMark()`.
- This does **not** create a Firebase user; the app remains in a \"guest\" state.
- For production:
  - You can hide this button with a build flag or CSS, or leave it as an explicit \"Continue as guest\" path depending on product decisions.

---

## 6. Future Backend Integration (not in scope for this pass)

Once Firebase Auth is wired on the client:

- `index.js` (Express server) can later:
  - Accept Firebase ID tokens from the browser (e.g. via `Authorization: Bearer <idToken>`).
  - Verify tokens using either:
    - Firebase Admin SDK, or
    - Google public keys and JWT verification.
  - Use decoded token claims (uid, email, custom claims) to enforce tiers (Free/Premium/Pro) and protect any future persistence APIs.

This step is intentionally deferred; the current migration focuses on getting **real sign-in** into the WebView without disturbing the generator or layout.

