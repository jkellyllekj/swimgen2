# Swim Workout Generator (SwimGen2)

## Overview

**Repository:** https://github.com/jkellyllekj/SwimGen2  
**Status:** Active Development - Template-Based Rebuild

The Swim Workout Generator is a web application designed to create structured swim workouts. It is currently built as a Node.js + Express web app, serving both the API and a simple HTML frontend. The primary target is iOS App Store, with plans for cross-platform expansion.

**Current Phase:** Template-Based Rebuild Foundation
- Replacing algorithmic generator with real-world template library
- Goal: Thousands of validated swim sets from real coaching sources
- Core principle: No algorithmic set invention - only real-world templates

The long-term vision includes iOS App Store deployment, with monetization from day one using a subscription-based model (Free/Premium/Pro tiers).

## User Preferences

Preferred communication style: Simple, everyday language.

Additional project-specific preferences:
- Work in small, focused changes (one goal per change, minimal files touched)
- At session start, state current phase, next task, and expected file changes before editing
- Keep PROJECT_STATE.md current as the source of truth
- No em dashes in UI copy
- Distances must snap to pool length multiples

## System Architecture

### Migration Status
The application is undergoing a template-based rebuild. The current UI/gesture layer is preserved while the generator is being replaced with a real-world template library.

**Legacy (current):** Monolithic index.js with algorithmic generation  
**Target (SwimGen2):** Template-based engine with thousands of validated swim sets

### Application Structure
Currently a single-file architecture (`index.js`) with Express server, routes, and inline frontend. The template-based rebuild will modularize into:
- `src/generator-v2.js` - Template-based engine
- `src/template-library/` - Real-world sets (thousands)
- `ui/` - Preserved gesture and animation layer

### Frontend
The frontend features an inline HTML interface with preserved UI during migration. Users can select pool type (25m, 50m, 25yd, Custom) and target distance via a slider (500-10000m, snapping to 100). Workouts are displayed as chips with zone-based colored backgrounds (Easy blue, Moderate green, Strong yellow, Hard orange, Full Gas red).

Key UI elements include workout name generator, drill name library, emoji intensity strip, and spinning dolphin animation. The design uses controlsGrid layout with pool buttons and Generate button. Individual sets can be rerolled using a dolphin button.

### Routes
- `/`: Main workout generator page.
- `/generate-workout`: POST endpoint for workout generation.
- `/reroll-set`: POST endpoint for rerolling individual sets.

### Backend
Express 5.x server on port 5000. Currently uses algorithmic generation (being replaced with template-based engine).

### Data Flow
User selects workout parameters, sent to `/generate-workout`. The backend (currently algorithmic, migrating to template-based) allocates distances to workout sections and generates each set. Frontend displays workout as colored chips.

### Key Design Decisions
- **Template-based rebuild**: Generator uses only real-world templates from coaching practice.
- **No algorithmic invention**: All sets come from validated template library.
- **Coach plausibility**: Workouts must feel human-written and realistic.
- **UI preservation**: Current gesture/animation layer maintained during migration.
- **Zone-based colors**: Five intensity levels for clear visual representation.
- **Wall-safe sets**: All distances divisible by 2x pool length.
- **Continuous growth**: Template library expands over time from coaching sources.

## External Dependencies

### Runtime Dependencies
- **Express 5.x**: Used as the web server framework.
- **OpenAI SDK**: Installed but not currently utilized for basic workout generation.

### Environment Configuration
- `OPENAI_API_KEY`: Replit Secret, present but not used by the current generation logic.
- `PORT`: Optional, defaults to 5000.

### No Database
The application is currently stateless and does not use any persistent storage.