# SwimSum - Swim Workout Generator

## Overview
SwimSum is a swim workout generator application primarily targeting Android, with future plans for iOS and web platforms. The core purpose is to generate high-quality, coach-like swim workouts using a deterministic algorithm. The Android application is self-contained and operates offline, with all workout generation occurring client-side within a WebView, eliminating server dependencies for the packaged app. The project aims to provide users with structured and personalized swim training experiences.

## User Preferences
- Preferred communication style: Simple, everyday language.
- Work in small, focused changes (one goal per change, minimal files touched).
- At session start, state current phase, next task, and expected file changes before editing.
- Keep PROJECT_STATE.md current as the source of truth.
- No em dashes in UI copy.
- Distances must snap to pool length multiples.

## System Architecture

### Application Structure
The application is built using Node.js and Express, serving an inline HTML/CSS/JavaScript frontend. Key logic is modularized into several JavaScript files within `src/modules/` to promote organization and reusability, including modules for drag-and-drop functionality, mathematical calculations (`setMath.js`), static workout data (`workoutLibrary.js`), and the core workout generation logic (`workoutGenerator.js`). The offline workout generation engine (~1855 lines) has been extracted to `public/offline-engine.js` and is loaded via `<script src>` instead of inline. The system leverages a template-only generation approach, using pre-defined workout templates that are scaled to match user-specified distances, ensuring coach-plausible workouts. Critical deterministic functions for randomization and calculation are immutable to maintain workout consistency.

### Frontend
The user interface allows selection of pool type (25m, 50m, 25yd, Custom) and target workout distance via a slider. Workouts are displayed as visually distinct chips, using a zone-based color scheme (e.g., Easy blue, Moderate green, Hard orange) for intensity, with white text on dark backgrounds for readability. UI elements include a workout name generator, a drill library, and an emoji intensity strip. The design emphasizes a clean layout, rounded corners, drop shadows, and a premium background image, creating a polished user experience. Individual sets can be re-rolled by the user.

### Routes
- `/`: Main workout generation page.
- `/generate-workout`: POST endpoint for workout generation.
- `/reroll-set`: POST endpoint for rerolling individual sets.

### Backend
The backend is an Express 5.x server, primarily used as a development preview and for serving the web application. For the offline Android app, the workout generation logic typically handled by the backend is moved to the client-side.

### Data Flow
User-selected workout parameters are processed, leading to the deterministic generation of workout sections (warm-up, drill, kick, pull, main, cool-down). The generated workout is then displayed to the user as colored chips, providing a visual breakdown of the session.

### Key Design Decisions
- **Clean Rebuild**: Started fresh to avoid legacy code issues.
- **Coach Plausibility**: Workouts are designed to mimic human-written plans.
- **Custom Pool Validation**: Ensures LLM arithmetic for custom pool lengths is accurate.
- **Zone-Based Colors**: Utilizes five intensity levels for clear visual feedback.
- **Zone Striation Logic**: Displays gradients/stripes for multi-zone sets.
- **Template-Only Mode**: All workouts are generated from and scaled from a set of high-quality templates, removing algorithmic fallbacks.
- **Deterministic Functions**: Critical functions for workout generation and randomization are designed to be entirely deterministic and stable.

## External Dependencies

### Runtime Dependencies
- **Express 5.x**: Web server framework.
- **OpenAI SDK**: Installed but not actively used for the current workout generation logic.

### Environment Configuration
- `OPENAI_API_KEY`: Replit Secret, not utilized by current generation logic.
- `GOOGLE_CLIENT_ID`: Placeholder for future Google Sign-In integration.
- `ADMOB_BANNER_ID`: Placeholder for future AdMob ad banner integration.
- `PORT`: Optional, defaults to 5000.

### No Database
The application is stateless and does not use persistent storage.

### Capacitor (Android Packaging)
- **Capacitor**: Used to package the web application into an Android APK/AAB for Play Store distribution.
- **Offline Capability**: The packaged app is fully offline, with all workout generation logic embedded client-side.
- **Build Process**: A script (`scripts/build-www.js`) captures rendered HTML, CSS, and assets into the `www/` directory, which Capacitor then uses.
- **Splash Screen**: Configured with a custom splash overlay that includes animation.

### CSS Geometry Locks (2026-02-22, device-tested on S24+)
- Side Gutters: 15px fixed for all panels.
- Card Gaps: 12px vertical spacing between sets.
- Scroll Offset: 24px margin-top on `#workoutNameDisplay`.
- Scroll Margin: `calc(env(safe-area-inset-top, 0px) + 14px)` on `#workoutNameDisplay` and `#cards`.
- Safe Area Spacer: `env(safe-area-inset-top, 0px)` -- 0px fallback (Android WebView handles its own inset).
- ResultWrap Top Margin: 4px.
- Splash text uses vw units (not px) to prevent Android font-scaling overflow.
- Effort labels use fixed point-size constraints to prevent accessibility scaling breaks.