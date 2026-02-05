/**
 * Workout Library Module
 * 
 * Contains all workout templates, set type definitions, stroke definitions,
 * interval patterns, and hardcoded workout examples.
 * 
 * This module exports static data/configuration used by the workout generator.
 */

// Drill names library - 16+ drill names for variety
const DRILL_NAMES = [
  "Fist", "Catch-up", "DPS", "Jazz Hands", "Long Dog", "Scull Front",
  "Finger Drag", "Single Arm", "Torpedo Glide", "Scull Rear", "3-3-3",
  "25 Drill / 25 Swim", "50 Drill / 50 Swim"
];

// Workout name pools based on distance
const WORKOUT_NAMES = {
  short: [
    "Quick Dip", "Fast Lane", "Starter Set", "Warm Welcome",
    "Pool Opener", "Light Laps", "Easy Does It", "Swim Snack"
  ],
  medium: [
    "Steady State", "Lane Lines", "Rhythm & Flow", "Cruise Control",
    "Smooth Sailing", "Pool Party", "Stroke & Glide", "Lap Stack"
  ],
  long: [
    "Distance Dash", "Long Haul", "Mile Maker", "Endurance Engine",
    "Big Swim", "Full Tank", "Deep Dive", "Marathon Mode"
  ]
};

// Focus-based workout names
const FOCUS_NAMES = {
  sprint: ["Speed Demon", "Fast Finish", "Sprint Session", "Power Push", "Quick Burst"],
  threshold: ["Threshold Test", "Pace Pusher", "T-Time", "Race Ready", "Tempo Tune"],
  endurance: ["Distance Day", "Steady Strong", "Long & Smooth", "Endurance Hour"],
  technique: ["Drill Time", "Form Focus", "Technique Tune", "Perfect Stroke"],
  allround: ["Mixed Bag", "Full Spectrum", "Variety Pack", "All-Rounder", "Balanced Swim"]
};

// Equipment-themed workout names
const EQUIPMENT_NAMES = {
  fins: ["Fin Frenzy", "Flipper Time", "Turbo Kick"],
  paddles: ["Power Paddles", "Arm Amplifier", "Pull Power"]
};

// Fallback workout names
const FALLBACK_NAMES = ["Swim Session", "Pool Workout", "Lap Time"];

// Section label normalization map
const SECTION_LABEL_MAP = {
  "warm-up": "Warm up",
  "warm up": "Warm up",
  "warmup": "Warm up",
  "build": "Build",
  "drill": "Drill",
  "kick": "Kick",
  "pull": "Pull",
  "main": "Main",
  "main 1": "Main 1",
  "main 2": "Main 2",
  "cooldown": "Cool down",
  "cool down": "Cool down"
};

// Section allocation profiles for workout distribution
const FREE_ALLOC_RANGES = {
  warmupPct: [0.10, 0.25],
  buildPct:  [0.00, 0.20],
  drillPct:  [0.00, 0.20],
  kickPct:   [0.00, 0.20],
  pullPct:   [0.00, 0.20],
  mainPct:   [0.15, 0.60],
  cooldownPct: [0.05, 0.15],
  warmupPlusBuildMaxPct: 0.30
};

// Coach-normal section totals for standard pools
const COACH_NORMAL_BUCKETS = {
  warmCool: new Set([100, 200, 300, 400, 500, 600, 800, 1000]),
  kick: new Set([200, 300, 400, 500, 600, 800])
};

// Main set effort descriptions by focus
const MAIN_EFFORT_DESCRIPTIONS = {
  sprint: ["sprint", "fast", "max effort", "all out"],
  threshold: ["threshold", "race pace", "strong", "fast"],
  endurance: ["steady", "smooth", "hold pace"],
  technique: ["perfect form", "focus DPS", "count strokes"],
  allround: ["hard", "strong", "descend 1-4", "odds easy evens fast", "sprint", "max effort"]
};

// Build effort descriptions
const BUILD_DESCRIPTIONS = ["build 1-4", "build to fast", "build speed", "negative split"];

// Kick effort levels
const KICK_EFFORTS = ["moderate", "steady", "strong"];

// Main effort levels
const MAIN_EFFORTS = ["strong", "hard", "threshold", "fast", "steady", "build"];

// Build effort levels
const BUILD_EFFORTS = ["moderate", "steady", "strong"];

// Normalize section label to standard format
function normalizeSectionLabel(raw) {
  const key = String(raw || "").toLowerCase().replace(/\s+/g, " ").trim();
  return SECTION_LABEL_MAP[key] || raw;
}

module.exports = {
  DRILL_NAMES,
  WORKOUT_NAMES,
  FOCUS_NAMES,
  EQUIPMENT_NAMES,
  FALLBACK_NAMES,
  SECTION_LABEL_MAP,
  FREE_ALLOC_RANGES,
  COACH_NORMAL_BUCKETS,
  MAIN_EFFORT_DESCRIPTIONS,
  BUILD_DESCRIPTIONS,
  KICK_EFFORTS,
  MAIN_EFFORTS,
  BUILD_EFFORTS,
  normalizeSectionLabel
};
