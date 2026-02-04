# Swim Workout Generator

## Overview

The Swim Workout Generator is a web application designed to create structured swim workouts. It is currently built as a Node.js + Express web app, serving both the API and a simple HTML frontend. The primary target is the Android Play Store, with plans for cross-platform expansion to iOS and web using React Native (Expo). The application focuses on generating coach-quality workouts with a deterministic algorithm.

The long-term vision includes migrating to React Native with Expo for mobile app stores, while the web app serves as a development preview. Future plans involve moving the workout algorithm to a server-side component for IP protection.

## User Preferences

Preferred communication style: Simple, everyday language.

Additional project-specific preferences:
- Work in small, focused changes (one goal per change, minimal files touched)
- At session start, state current phase, next task, and expected file changes before editing
- Keep PROJECT_STATE.md current as the source of truth
- No em dashes in UI copy
- Distances must snap to pool length multiples

## System Architecture

### Application Structure
The application uses a single-file architecture where `index.js` contains the Express server, routes, and inline HTML, CSS, and JavaScript. It utilizes block-tagged code for structured editing. There is no build step, relying on plain Node.js and Express.

### Frontend
The frontend features an inline HTML interface. Users can select pool type (25m, 50m, 25yd, Custom) and target distance via a slider (500-10000m, snapping to 100). Workouts are displayed as chips with zone-based colored backgrounds (CardGym-style: Easy blue, Moderate green, Strong yellow, Hard orange, Full Gas red). Readability is ensured with white text on dark backgrounds. Vertical gradients are used for multi-zone sets like builds and descends.

Key UI elements include a snazzy workout name generator, a 16-drill name library, an emoji intensity strip, and a spinning dolphin animation during workout generation. The design uses a controlsGrid layout (grid-template-columns: 1fr auto) that stays 2-column on all screen sizes, with pool buttons on the left and the Generate button on the right. The Generate button contains both the label and dolphin inside as a vertical flex box with cyan glow-ring when active. UI chips use the readChip class (78% white opacity) for readable text on the Swim Gen title, background button, and distance pill. The Advanced options toggle uses a white chip with cyan glow when expanded. The design incorporates a premium outdoor pool photo background, drop shadows for depth, and ~8-10px rounded corners. Individual sets can be rerolled using a dolphin button.

### Routes
- `/`: Main workout generator page.
- `/viewport-lab`: Temporary page for responsive design testing (to be removed before production).
- `/generate-workout`: POST endpoint for workout generation.
- `/reroll-set`: POST endpoint for rerolling individual sets.

### Backend
The backend uses an Express 5.x server, running on port 5000 (or `PORT` environment variable). It provides JSON API endpoints for workout generation. The workout generation logic is entirely local and deterministic.

### Data Flow
The user selects workout parameters, which are sent to the `/generate-workout` endpoint. The backend allocates distances to workout sections (warm-up, drill, kick, pull, main, cool-down) and generates each set deterministically. The frontend then displays the workout as colored chips.

### Key Design Decisions
- **Clean rebuild**: The project opted for a fresh start rather than refactoring a legacy prototype.
- **Coach plausibility**: Workouts are designed to feel human-written.
- **Custom pool caution**: LLM arithmetic for custom pool lengths is validated.
- **Zone-based colors**: Five intensity levels are used for clear visual representation.
- **Zone striation logic**: Cards display gradients/stripes based on set content.
- **Rest/interval display**: Rest is shown only when a threshold pace is entered.
- **Descend pattern variety**: Includes diverse descending patterns beyond simple 1-4.
- **Freestyle default**: Warm-up and cool-down favor freestyle.
- **No "easy" in drill/kick/pull**: Color indicates intensity; "relaxed" is used instead of "easy".
- **Multi-part sets**: Approximately 20% probability for main sets 400m+ with distance validation.
- **Drill variety**: Provides drill choices for 6+ rep sets.

## External Dependencies

### Runtime Dependencies
- **Express 5.x**: Used as the web server framework.
- **OpenAI SDK**: Installed but not currently utilized for basic workout generation.

### Environment Configuration
- `OPENAI_API_KEY`: Replit Secret, present but not used by the current generation logic.
- `PORT`: Optional, defaults to 5000.

### No Database
The application is currently stateless and does not use any persistent storage.