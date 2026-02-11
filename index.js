/**
 * Swim Workout Generator v1
 * Node + Express single-file app
 *
 * Block-tagged. Edit by replacing whole blocks only.
 *
 * Notes:
 * - No em dashes in UI copy.
 * - Distances snap to pool multiples.
 * - Always generates a human-style workout structure.
 * - Optional threshold pace enables time estimates.
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const { DRAG_DROP_JS } = require("./src/modules/dragDropManager");
const setMath = require("./src/modules/setMath");
const workoutLibrary = require("./src/modules/workoutLibrary");
const workoutGenerator = require("./src/modules/workoutGenerator");
const workoutTemplates = require("./src/data/workoutTemplates");

// ============================================================================
// RELEASE CONFIGURATION
// ============================================================================
const IS_LITE_MODE = true; // Set to true for App Store "SwimGen2 Lite" release

// Aliases for backward compatibility - these functions are now in modules
const { 
  fnv1a32, shuffleWithSeed, mulberry32,
  snapToPoolMultiple, snapRepDist,
  parsePaceToSecondsPer100, fmtMmSs, paceMultiplierForLabel,
  parseNxD, computeSetDistanceFromBody, computeRestSecondsFromBody,
  endsAtHomeEnd, pickEvenRepScheme, isAllowedRepCount, fingerprintWorkoutText, nowSeed,
  calculateSensibleCoolDown
} = setMath;

// Backward-compat aliases for removed wrappers
const snapToPoolMultipleShared = snapToPoolMultiple;
const snapRepDistToPool = snapRepDist;

const {
  DRILL_NAMES, WORKOUT_NAMES, FOCUS_NAMES, EQUIPMENT_NAMES, FALLBACK_NAMES,
  SECTION_LABEL_MAP, FREE_ALLOC_RANGES, COACH_NORMAL_BUCKETS,
  MAIN_EFFORT_DESCRIPTIONS, BUILD_DESCRIPTIONS, KICK_EFFORTS, MAIN_EFFORTS, BUILD_EFFORTS,
  normalizeSectionLabel
} = workoutLibrary;

const {
  isFullGasBody, injectOneFullGas, generateWorkoutName, validateWorkout,
  normalizeOptions, generateDrillSetDynamic, estimateWorkoutTotalSeconds,
  parseWorkoutTextToSections, inferZoneFromText, inferIsStriatedFromText
} = workoutGenerator;

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static("public"));

app.get("/styles.css", (req, res) => {
  const cssPath = path.join(__dirname, "styles.css");
  try {
    const css = fs.readFileSync(cssPath, "utf8");
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    res.send(css);
  } catch (e) {
    res.status(404).send("/* styles.css not found */");
  }
});

// ============================================================================
// SECTION_TARGET_RESOLVER_R020
// Shared resolver for coach-normal section target distances.
// ============================================================================

const SECTION_TARGET_BUCKETS = {
  warmup:   [200, 300, 400, 500, 600, 700, 800],
  build:    [200, 300, 400, 500],
  kick:     [200, 300, 400, 500],
  drill:    [200, 300, 400],
  main:     [400, 600, 800, 1000, 1200, 1600],
  cooldown: [100, 150, 200, 300, 400, 500],
};

function resolveSectionTarget({ sectionLabel, desiredDistance, poolLen, seed }) {
  const key = String(sectionLabel).toLowerCase();
  const buckets =
    key.includes("warm") ? SECTION_TARGET_BUCKETS.warmup :
    key.includes("build") ? SECTION_TARGET_BUCKETS.build :
    key.includes("kick") ? SECTION_TARGET_BUCKETS.kick :
    key.includes("drill") ? SECTION_TARGET_BUCKETS.drill :
    key.includes("cool") ? SECTION_TARGET_BUCKETS.cooldown :
    SECTION_TARGET_BUCKETS.main;

  const snapped = buckets
    .map(d => snapToPoolMultiple(d, poolLen))
    .filter(d => d > 0);

  if (!snapped.length) {
    return snapToPoolMultiple(desiredDistance, poolLen);
  }

  let best = snapped[0];
  let bestDelta = Math.abs(best - desiredDistance);

  for (const d of snapped) {
    const delta = Math.abs(d - desiredDistance);
    if (delta < bestDelta) {
      best = d;
      bestDelta = delta;
    }
  }

  return best;
}

// ============================================================================
// END SECTION_TARGET_RESOLVER_R020
// ============================================================================

// ============================================================================
// VALIDATION HELPERS - Free-tier realism guards
// ============================================================================

// Validate warm-up/cool-down line: no hard efforts allowed
function isValidWarmupCoolLine(text) {
  const t = String(text || "").toLowerCase();
  const forbidden = ["hard", "threshold", "sprint", "max", "full gas", "fullgas", "fast", "race pace", "all out"];
  for (const word of forbidden) {
    if (t.includes(word)) return false;
  }
  return true;
}

// Validate drill line: no odd/random rep counts
function isValidDrillLine(repCount) {
  const r = Number(repCount);
  // Drills should use clean rep counts: 2,3,4,5,6,8,10,12
  // Reject odd random numbers like 7, 9, 11, 13
  const forbidden = [7, 9, 11, 13, 14, 15, 17, 18, 19];
  return !forbidden.includes(r);
}

// Validate kick line: no "relaxed" or "easy" with short reps
function isValidKickLine(text, repDistance) {
  const t = String(text || "").toLowerCase();
  const d = Number(repDistance);
  // Short kick reps (25-50) should not be "relaxed" or "easy" - too short to be meaningful
  if (d <= 50 && (t.includes("relaxed") || t.includes("easy"))) {
    return false;
  }
  return true;
}

// Validate a set body: all lines must parse, total must match target
function validateSetBody(body, targetDistance, poolLen, sectionLabel) {
  const lines = String(body || "").split("\n").filter(l => l.trim());
  if (lines.length === 0) return { valid: false, reason: "empty body" };
  
  let totalParsed = 0;

  const label = String(sectionLabel || "").toLowerCase();

  // Coach-normal section totals for 25m and 25yd pools
  // These are not the only possible totals in the world, but they prevent constant weirdness.
  const isStandardPool = Number(poolLen) === 25 || Number(poolLen) === 50;

  const bucketWarmCool = new Set([100, 200, 300, 400, 500, 600, 800, 1000]);
  const bucketKick = new Set([200, 300, 400, 500, 600, 800]);

  if (isStandardPool && (label.includes("warm") || label.includes("cool"))) {
    if (!bucketWarmCool.has(Number(targetDistance))) {
      return { valid: false, reason: "section distance not coach-normal: " + targetDistance };
    }
  }

  if (isStandardPool && label.includes("kick")) {
    if (!bucketKick.has(Number(targetDistance))) {
      return { valid: false, reason: "kick distance not coach-normal: " + targetDistance };
    }
  }
  for (const line of lines) {
    const parsed = parseNxD(line);
    if (!parsed) {
      // Check for single distance format (e.g., "200 easy")
      const singleMatch = line.match(/^(\d+)\s+(.+)$/);
      if (singleMatch) {
        const distOnly = Number(singleMatch[1]);
        const tail = String(singleMatch[2] || "").toLowerCase();

        // Ban single distance sprint style lines outright
        // Nobody writes "2100 sprint" as a single effort.
        if (tail.includes("sprint") || tail.includes("all out") || tail.includes("full gas") || tail.includes("max effort")) {
          return { valid: false, reason: "single distance cannot be sprint: " + line };
        }

        totalParsed += distOnly;
        continue;
      }
      // Skip numbered drill list lines (e.g., "1. Fist", "2. Catch-up")
      if (line.match(/^\d+\.\s+\w/)) {
        continue;
      }
      return { valid: false, reason: "unparseable line: " + line };
    }
    if (!isAllowedRepCount(parsed.reps, parsed.dist)) {
      return { valid: false, reason: "rep count not allowed: " + parsed.reps + "x" + parsed.dist };
    }
    const lineLower = String(line).toLowerCase();
    const lineDist = parsed.reps * parsed.dist;

    // Sprint volume cap per line
    if (lineLower.includes("sprint") && lineDist > 600) {
      return { valid: false, reason: "sprint volume too large: " + line };
    }
    totalParsed += parsed.reps * parsed.dist;
  }
  
  if (totalParsed !== targetDistance) {
    return { valid: false, reason: "distance mismatch: got " + totalParsed + ", expected " + targetDistance };
  }
  
  // Check even lengths
  if (!endsAtHomeEnd(totalParsed, poolLen)) {
    return { valid: false, reason: "odd number of lengths" };
  }
  
  return { valid: true };
}

// Section templates for coach-plausible workout blocks
// ============================================================================
// V1_BASE_SET_CATALOGUE_R010
// v1 base catalogue of coach-normal set shapes.
// This starts as data + helpers. We will wire one section at a time.
// ============================================================================

const V1_BASE_SET_CATALOGUE = {
  "Warm-up": [
    {
      id: "WU_CONTINUOUS_SWIM",
      kind: "continuous",
      // returns a single-line body like: "400 easy swim (choice)"
      make: (ctx) => {
        const dist = clampToBucket(ctx.targetDist, [200, 300, 400, 500, 600], ctx.poolLen);
        return `${dist} easy swim (choice)`;
      },
    },
    {
      id: "WU_SWIM_KICK_SWIM",
      kind: "block3",
      make: (ctx) => {
        const unit = clampToBucket(ctx.targetDist, [300, 400, 500, 600], ctx.poolLen);
        // split roughly 1/2 swim, 1/4 kick, 1/4 swim
        const a = snapToWallSafe(Math.round(unit * 0.5), ctx.poolLen);
        const b = snapToWallSafe(Math.round(unit * 0.25), ctx.poolLen);
        const c = snapToWallSafe(unit - a - b, ctx.poolLen);
        return `${a} easy swim\n${b} kick easy\n${c} easy swim`;
      },
    },
    {
      id: "WU_6_10x50_BUILD",
      kind: "repeats",
      make: (ctx) => {
        const rep = snapToWallSafe(50, ctx.poolLen);
        const n = pickFrom([6, 8, 10], ctx.seed);
        const dist = rep * n;
        // if target is smaller, reduce n; if bigger, we still keep the shape coach-normal
        const n2 = fitRepeatsToTarget(n, rep, ctx.targetDist);
        return `${n2}x${rep} build (smooth to strong)`;
      },
    },
    {
      id: "WU_8_12x25_BUILD",
      kind: "repeats",
      make: (ctx) => {
        const rep = snapToWallSafe(25, ctx.poolLen);
        const n = pickFrom([8, 10, 12], ctx.seed);
        const n2 = fitRepeatsToTarget(n, rep, ctx.targetDist);
        return `${n2}x${rep} build (easy to fast)`;
      },
    },
  ],

  "Build": [
    {
      id: "BLD_6_10x50_PROGRESS",
      kind: "repeats",
      make: (ctx) => {
        const rep = snapToWallSafe(50, ctx.poolLen);
        const n = pickFrom([6, 8, 10], ctx.seed);
        const n2 = fitRepeatsToTarget(n, rep, ctx.targetDist);
        return `${n2}x${rep} build 1 to ${Math.min(4, Math.max(2, Math.floor(n2 / 2)))} (last strong)`;
      },
    },
    {
      id: "BLD_4_6x100_PROGRESS",
      kind: "repeats",
      make: (ctx) => {
        const rep = snapToWallSafe(100, ctx.poolLen);
        const n = pickFrom([4, 5, 6], ctx.seed);
        const n2 = fitRepeatsToTarget(n, rep, ctx.targetDist);
        return `${n2}x${rep} descend (hold form)`;
      },
    },
  ],

  "Kick": [
    {
      id: "K_8_12x50_KICK",
      kind: "repeats",
      make: (ctx) => {
        const rep = snapToWallSafe(50, ctx.poolLen);
        const n = pickFrom([8, 10, 12], ctx.seed);
        const n2 = fitRepeatsToTarget(n, rep, ctx.targetDist);
        return `${n2}x${rep} kick (odds easy, evens strong)`;
      },
    },
    {
      id: "K_8_16x25_KICK",
      kind: "repeats",
      make: (ctx) => {
        const rep = snapToWallSafe(25, ctx.poolLen);
        const n = pickFrom([8, 12, 16], ctx.seed);
        const n2 = fitRepeatsToTarget(n, rep, ctx.targetDist);
        return `${n2}x${rep} kick (25 smooth, 25 strong pattern if pool allows)`;
      },
    },
  ],

  "Drill": [
    {
      id: "D_6_10x50_DRILL_SWIM",
      kind: "repeats",
      make: (ctx) => {
        const rep = snapToWallSafe(50, ctx.poolLen);
        const n = pickFrom([6, 8, 10], ctx.seed);
        const n2 = fitRepeatsToTarget(n, rep, ctx.targetDist);
        return `${n2}x${rep} drill to swim (25 drill, 25 swim)`;
      },
    },
    {
      id: "D_8_12x25_DRILL",
      kind: "repeats",
      make: (ctx) => {
        const rep = snapToWallSafe(25, ctx.poolLen);
        const n = pickFrom([8, 10, 12], ctx.seed);
        const n2 = fitRepeatsToTarget(n, rep, ctx.targetDist);
        return `${n2}x${rep} drill (choice)`;
      },
    },
  ],

  "Main": [
    {
      id: "M_10x100_HOLD",
      kind: "repeats",
      make: (ctx) => {
        const rep = snapToWallSafe(100, ctx.poolLen);
        const n = 10;
        const n2 = fitRepeatsToTarget(n, rep, ctx.targetDist);
        return `${n2}x${rep} hold strong (steady effort)`;
      },
    },
    {
      id: "M_5x200_STEADY",
      kind: "repeats",
      make: (ctx) => {
        const rep = snapToWallSafe(200, ctx.poolLen);
        const n = pickFrom([3, 4, 5], ctx.seed);
        const n2 = fitRepeatsToTarget(n, rep, ctx.targetDist);
        return `${n2}x${rep} steady to strong`;
      },
    },
    {
      id: "M_16x50_ODD_EVEN",
      kind: "repeats",
      make: (ctx) => {
        const rep = snapToWallSafe(50, ctx.poolLen);
        const n = pickFrom([12, 16, 20], ctx.seed);
        const n2 = fitRepeatsToTarget(n, rep, ctx.targetDist);
        return `${n2}x${rep} odds easy, evens fast`;
      },
    },
  ],

  "Cool-down": [
    {
      id: "CD_200_400_EASY",
      kind: "continuous",
      make: (ctx) => {
        const dist = clampToBucket(ctx.targetDist, [100, 200, 300, 400, 500], ctx.poolLen);
        return `${dist} easy swim`;
      },
    },
    {
      id: "CD_4x50_EASY",
      kind: "repeats",
      make: (ctx) => {
        const rep = snapToWallSafe(50, ctx.poolLen);
        const n = pickFrom([4, 6, 8], ctx.seed);
        const n2 = fitRepeatsToTarget(n, rep, ctx.targetDist);
        return `${n2}x${rep} very easy`;
      },
    },
  ],
};

function pickV1CatalogueBody(sectionLabel, targetDist, poolLen, seed) {
  const list = V1_BASE_SET_CATALOGUE[sectionLabel];
  if (!list || list.length === 0) return null;
  const idx = seededIndex(seed, list.length);
  const pick = list[idx];

  const ctx = { sectionLabel, targetDist, poolLen, seed };
  const body = pick.make(ctx);

  return {
    ok: true,
    id: pick.id,
    body,
  };
}

// Helpers for v1 catalogue.
// These do not change existing engine logic.
// They are used only when we wire a section to the catalogue.

function pickFrom(arr, seed) {
  return arr[seededIndex(seed, arr.length)];
}

function seededIndex(seed, n) {
  // seed may be float or int, keep stable
  const x = Math.abs(Math.floor(seed * 9973)) || 1;
  return x % n;
}

function clampToBucket(targetDist, buckets, poolLen) {
  // pick closest bucket then snap wall-safe
  let best = buckets[0];
  let bestDelta = Math.abs(targetDist - best);
  for (const b of buckets) {
    const d = Math.abs(targetDist - b);
    if (d < bestDelta) {
      best = b;
      bestDelta = d;
    }
  }
  return snapToWallSafe(best, poolLen);
}

function snapToWallSafe(dist, poolLen) {
  // enforce divisible by (2 * poolLen)
  const unit = 2 * poolLen;
  if (unit <= 0) return dist;
  const snapped = Math.round(dist / unit) * unit;
  return Math.max(unit, snapped);
}

function fitRepeatsToTarget(n, rep, targetDist) {
  // Keep coach-normal repeat counts, but avoid blowing up smaller targets.
  // Never returns 1 for these sections, because single repeats look weird.
  if (rep <= 0) return n;
  const maxN = Math.floor(targetDist / rep);
  const n2 = Math.min(n, maxN);
  return Math.max(2, n2);
}

// ============================================================================
// END V1_BASE_SET_CATALOGUE_R010
// ============================================================================


const SECTION_TEMPLATES = {
  warmup: [
    { body: "300 easy", dist: 300 },
    { body: "400 easy", dist: 400 },
    { body: "4x100 easy", dist: 400 },
    { body: "8x50 easy", dist: 400 },
    { body: "200 easy\n4x50 easy choice", dist: 400 },
    { body: "6x50 easy choice", dist: 300 },
    { body: "4x75 easy", dist: 300 },
    { body: "200 easy\n2x100 moderate", dist: 400 },
    { body: "500 easy", dist: 500 },
    { body: "2x200 easy", dist: 400 },
    { body: "10x50 easy", dist: 500 },
    { body: "600 easy", dist: 600 },
    { body: "6x100 easy", dist: 600 },
    { body: "3x200 easy", dist: 600 },
    { body: "12x50 easy", dist: 600 },
    { body: "800 easy", dist: 800 },
    { body: "8x100 easy", dist: 800 },
    { body: "4x200 easy", dist: 800 },
    { body: "500 easy\n6x50 easy choice", dist: 800 }
  ],
  build: [
    { body: "4x50 build", dist: 200 },
    { body: "6x50 build", dist: 300 },
    { body: "2x100 negative split", dist: 200 },
    { body: "4x100 build", dist: 400 },
    { body: "8x50 build", dist: 400 },
    { body: "3x100 descend", dist: 300 },
    { body: "2x150 build", dist: 300 },
    { body: "6x50 descend 1-3 twice", dist: 300 }
  ],
  drill: [
    // Structured numbered drill sets (coach-style)
    { body: "6x50 Drill FC\n1. Fist\n2. Catch-up\n3. DPS\n4. Jazz Hands\n5. Long Dog\n6. Scull Front", dist: 300 },
    { body: "8x25 Drill FC\n1. Scull Front\n2. Scull Rear\n3. Torpedo Glide\n4. Fist\n5. Finger Drag\n6. Catch-up\n7. DPS\n8. Single Arm", dist: 200 },
    { body: "4x50 Drill FC\n1. Catch-up\n2. DPS\n3. Fist\n4. 25 Drill / 25 Swim", dist: 200 },
    { body: "6x50 Drill FC\n1. Finger Drag\n2. Long Dog\n3. 3-3-3\n4. Catch-up\n5. Single Arm\n6. DPS", dist: 300 },
    { body: "8x50 Drill FC\n1. Fist\n2. Catch-up\n3. DPS\n4. Jazz Hands\n5. Long Dog\n6. Scull Front\n7. Finger Drag\n8. Torpedo Glide", dist: 400 },
    { body: "4x50 Drill FC\n1. Single Arm\n2. Torpedo Glide\n3. 3-3-3\n4. Scull Rear", dist: 200 },
    { body: "6x50 Drill FC\n1. Torpedo Glide\n2. Scull Front\n3. Scull Rear\n4. Fist\n5. DPS\n6. Catch-up", dist: 300 },
    { body: "8x25 Drill FC\n1. Fist\n2. Catch-up\n3. DPS\n4. Jazz Hands\n5. Long Dog\n6. Scull Front\n7. Finger Drag\n8. Single Arm", dist: 200 },
    { body: "4x100 Drill FC\n1. 50 Drill / 50 Swim\n2. Catch-up\n3. DPS\n4. Fist", dist: 400 },
    { body: "6x50 Drill FC\n1. Jazz Hands\n2. 3-3-3\n3. Single Arm\n4. Finger Drag\n5. Torpedo Glide\n6. Long Dog", dist: 300 },
    { body: "4x50 Drill FC\n1. Fist\n2. DPS\n3. Catch-up\n4. Scull Front", dist: 200 },
    { body: "4x50 Drill FC\n1. Long Dog\n2. Finger Drag\n3. 3-3-3\n4. Jazz Hands", dist: 200 },
    { body: "6x50 Drill FC\n1. Single Arm\n2. Fist\n3. Catch-up\n4. DPS\n5. Scull Front\n6. Torpedo Glide", dist: 300 },
    { body: "4x75 Drill FC\n1. Catch-up\n2. Fist\n3. DPS\n4. 25 Drill / 25 Swim", dist: 300 },
    { body: "6x50 Drill FC\n1. Jazz Hands\n2. Long Dog\n3. 3-3-3\n4. Finger Drag\n5. Single Arm\n6. Fist", dist: 300 },
    { body: "6x50 Drill FC\n1. DPS\n2. Fist\n3. Catch-up\n4. Single Arm\n5. Finger Drag\n6. Scull Rear", dist: 300 },
    { body: "10x50 Drill FC\n1. Fist\n2. Catch-up\n3. DPS\n4. Jazz Hands\n5. Long Dog\n6. Scull Front\n7. Finger Drag\n8. Single Arm\n9. Torpedo Glide\n10. Scull Rear", dist: 500 },
    { body: "6x100 Drill FC\n1. 50 Drill / 50 Swim\n2. Catch-up\n3. DPS\n4. Fist\n5. Single Arm\n6. Long Dog", dist: 600 },
    { body: "12x50 Drill FC\n1. Fist\n2. Catch-up\n3. DPS\n4. Jazz Hands\n5. Long Dog\n6. Scull Front\n7. Finger Drag\n8. Single Arm\n9. Torpedo Glide\n10. Scull Rear\n11. 3-3-3\n12. 25 Drill / 25 Swim", dist: 600 },
    { body: "6x100 Drill FC\n1. 50 Drill / 50 Swim\n2. Catch-up\n3. DPS\n4. Fist\n5. Single Arm\n6. Long Dog", dist: 600 },
    { body: "8x100 Drill FC\n1. 50 Drill / 50 Swim\n2. Catch-up\n3. DPS\n4. Fist\n5. Single Arm\n6. Long Dog\n7. Torpedo Glide\n8. Scull Front", dist: 800 },
    { body: "14x50 Drill FC\n1. Fist\n2. Catch-up\n3. DPS\n4. Jazz Hands\n5. Long Dog\n6. Scull Front\n7. Finger Drag\n8. Single Arm\n9. Torpedo Glide\n10. Scull Rear\n11. 3-3-3\n12. 25 Drill / 25 Swim\n13. Fist\n14. Catch-up", dist: 700 }
  ],
  kick: [
    // Simple flat effort sets (majority for cleaner variety)
    { body: "4x100 kick steady", dist: 400 },
    { body: "6x50 kick moderate", dist: 300 },
    { body: "4x50 kick moderate", dist: 200 },
    { body: "8x25 kick fast", dist: 200 },
    { body: "8x50 kick steady", dist: 400 },
    { body: "6x50 kick steady", dist: 300 },
    { body: "300 kick steady", dist: 300 },
    { body: "200 kick moderate", dist: 200 },
    { body: "6x50 kick strong", dist: 300 },
    { body: "4x50 kick strong", dist: 200 },
    // Progression sets (multi-line builds)
    { body: "200 kick moderate\n4x50 kick strong", dist: 400 },
    { body: "6x50 kick descend 1-3 twice", dist: 300 },
    { body: "4x100 kick build", dist: 400 },
    { body: "4x100 kick descend 1-4", dist: 400 },
    // Alternating effort sets
    { body: "6x50 kick (25 easy / 25 fast)", dist: 300 },
    { body: "8x50 kick (25 moderate / 25 fast)", dist: 400 },
    { body: "4x100 kick (50 steady / 50 fast)", dist: 400 },
    { body: "6x50 kick (25 easy / 25 fast)", dist: 300 },
    { body: "10x50 kick steady", dist: 500 },
    { body: "6x100 kick moderate", dist: 600 },
    { body: "12x50 kick steady", dist: 600 },
    { body: "4x100 kick moderate\n4x50 kick strong", dist: 600 }
  ],
  cooldown: [
    { body: "200 easy", dist: 200 },
    { body: "300 easy", dist: 300 },
    { body: "4x100 loosen", dist: 400 },
    { body: "4x50 easy", dist: 200 },
    { body: "5x50 easy", dist: 250 },
    { body: "6x50 easy", dist: 300 },
    { body: "300 easy choice", dist: 300 },
    { body: "2x150 easy", dist: 300 },
    { body: "400 easy", dist: 400 },
    { body: "8x50 easy", dist: 400 },
    { body: "500 easy", dist: 500 },
    { body: "10x50 easy", dist: 500 },
    { body: "5x100 easy", dist: 500 },
    { body: "3x100 easy\n4x50 loosen", dist: 500 }
  ],
  main: [
    // Flat effort sets (variety of colors)
    { body: "4x100 hard", dist: 400 },
    { body: "8x50 fast", dist: 400 },
    { body: "5x100 hard", dist: 500 },
    { body: "10x50 fast", dist: 500 },
    { body: "6x100 strong", dist: 600 },
    { body: "6x100 threshold", dist: 600 },
    { body: "12x50 steady", dist: 600 },
    { body: "8x75 strong", dist: 600 },
    { body: "3x200 build", dist: 600 },
    { body: "4x150 build", dist: 600 },
    { body: "8x100 moderate", dist: 800 },
    { body: "4x200 strong", dist: 800 },
    { body: "8x100 negative split", dist: 800 },
    { body: "6x150 strong", dist: 900 },
    { body: "10x100 steady", dist: 1000 },
    { body: "5x200 moderate", dist: 1000 },
    { body: "20x50 strong", dist: 1000 },
    { body: "8x150 moderate", dist: 1200 },
    { body: "12x100 steady", dist: 1200 },
    { body: "6x200 strong", dist: 1200 },
    { body: "14x100 steady", dist: 1400 },
    { body: "7x200 moderate", dist: 1400 },
    { body: "15x100 threshold", dist: 1500 },
    { body: "10x150 moderate", dist: 1500 },
    { body: "16x100 moderate", dist: 1600 },
    { body: "8x200 strong", dist: 1600 },
    { body: "18x100 steady", dist: 1800 },
    { body: "9x200 moderate", dist: 1800 },
    { body: "20x100 moderate", dist: 2000 },
    { body: "10x200 steady", dist: 2000 },
    // Progression/build sets
    { body: "5x100 descend 1-5", dist: 500 },
    { body: "6x100 descend 1-3 twice", dist: 600 },
    { body: "8x100 descend 1-4 twice", dist: 800 },
    { body: "10x100 descend 1-5 twice", dist: 1000 },
    // Multi-part sets (dist = sum of both parts)
    { body: "8x50 fast\n4x100 moderate", dist: 800 },
    { body: "400 strong\n4x100 descend 1-4", dist: 800 },
    { body: "4x150 build\n4x50 fast", dist: 800 },
    { body: "6x100 steady\n6x50 fast", dist: 900 },
    { body: "300 easy\n6x100 hard", dist: 900 },
    { body: "5x100 strong\n5x100 threshold", dist: 1000 },
    { body: "6x100 steady\n8x50 fast", dist: 1000 },
    { body: "8x100 moderate\n4x100 hard", dist: 1200 },
    { body: "10x100 steady\n4x50 fast", dist: 1200 },
    { body: "6x150 moderate\n6x50 fast", dist: 1200 },
    { body: "10x100 moderate\n8x50 fast", dist: 1400 },
    { body: "8x150 steady\n4x50 fast", dist: 1400 },
    { body: "10x100 threshold\n10x50 fast", dist: 1500 },
    { body: "12x100 steady\n6x50 fast", dist: 1500 },
    { body: "10x100 strong\n12x50 fast", dist: 1600 },
    { body: "8x200 moderate", dist: 1600 },
    { body: "12x100 moderate\n8x50 fast", dist: 1600 },
    { body: "10x150 moderate\n6x50 fast", dist: 1800 },
    { body: "12x100 strong\n12x50 fast", dist: 1800 },
    { body: "15x100 steady\n10x50 fast", dist: 2000 },
    { body: "12x100 moderate\n16x50 fast", dist: 2000 }
  ]
};

function pickTemplate(section, targetDistance, seed, poolLen) {
  const list = SECTION_TEMPLATES[section];
  if (!list) return null;
  
  // EXACT MATCH ONLY - no tolerance, no fallbacks
  // This prevents distance drift on regeneration
  const exactFits = list.filter(t => {
    if (t.dist !== targetDistance) return false;
    if (poolLen === 25 || poolLen === 50) {
      if (!endsAtHomeEnd(t.dist, poolLen)) return false;
    }
    return true;
  });
  
  if (exactFits.length) {
    const sectionHash = fnv1a32(section);
    const shuffled = shuffleWithSeed(exactFits, (seed ^ sectionHash) >>> 0);
    const idx = ((seed * 7919) >>> 0) % shuffled.length;
    return shuffled[idx];
  }
  
  // No inexact matches allowed - return null to trigger dynamic generation
  return null;
}

function normalizeSectionKey(label) {
  const l = String(label).toLowerCase();
  if (l.includes("warm")) return "warmup";
  if (l.includes("build")) return "build";
  if (l.includes("drill")) return "drill";
  if (l.includes("kick")) return "kick";
  if (l.includes("cool")) return "cooldown";
  if (l.includes("main")) return "main";
  return null;
}

const SECTION_MIN_DIST = {
  warmup: 300,
  build: 200,
  drill: 200,
  kick: 200,
  cooldown: 200
};

// Snap distance to nearest pool multiple with even lengths (ends at home end)
function snapSection(dist, poolLen) {
  if (dist <= 0) return 0;
  const lengths = Math.round(dist / poolLen);
  const evenLengths = lengths % 2 === 0 ? lengths : lengths + 1;
  return Math.max(evenLengths * poolLen, poolLen * 2);
}

// Apply minimum distances to non-main sections, shift excess to main
function applySectionMinimums(sets, total, poolLen) {
  let adjustment = 0;
  
  for (const s of sets) {
    const key = normalizeSectionKey(s.label);
    const minDist = SECTION_MIN_DIST[key] || 0;
    
    // Skip main sets
    if (String(s.label).toLowerCase().includes("main")) continue;
    
    // Snap to even lengths
    let snapped = snapSection(s.dist, poolLen);
    
    // Apply minimum
    if (minDist > 0 && snapped < minDist) {
      const needed = snapSection(minDist, poolLen);
      adjustment += needed - snapped;
      snapped = needed;
    }
    
    s.dist = snapped;
  }
  
  // Subtract adjustment from main set(s) and always snap main sets
  const mainSets = sets.filter(s => String(s.label).toLowerCase().includes("main"));
  if (mainSets.length > 0) {
    if (adjustment > 0) {
      // Distribute adjustment across main sets proportionally
      const mainTotal = mainSets.reduce((sum, s) => sum + s.dist, 0);
      for (const m of mainSets) {
        const share = Math.round((m.dist / mainTotal) * adjustment);
        m.dist = snapSection(m.dist - share, poolLen);
      }
    } else {
      // Even without adjustment, snap all main sets to home-end multiples
      for (const m of mainSets) {
        m.dist = snapSection(m.dist, poolLen);
      }
    }
  }
  
  return sets;
}

// Helper: pick pattern index with cooldown to avoid repeating last N patterns
function pickIndexWithCooldown(len, seed, rerollCount, cooldownN) {
  if (len <= 1) return 0;
  const rc = Number(rerollCount) || 0;
  const idx = (((rc * 7) + (seed % 9973)) >>> 0) % len;
  const prevs = [];
  for (let i = 1; i <= cooldownN; i++) {
    if (rc - i >= 0) {
      prevs.push(((((rc - i) * 7) + (seed % 9973)) >>> 0) % len);
    }
  }
  for (let step = 0; step < len; step++) {
    const cand = (idx + step) % len;
    if (!prevs.includes(cand)) return cand;
  }
  return idx;
}

// ENHANCED SET BUILDER - Coach-like sets with variety + ~20% multi-part
function buildOneSetBodyShared({ label, targetDistance, poolLen, unitsShort, opts, seed, rerollCount }) {
  const base = poolLen;
  const target = snapToPoolMultipleShared(targetDistance, base);
  if (target <= 0) return null;
  if (typeof remaining === 'undefined') remaining = 0;
  const isNonStandardPool = ![25, 50].includes(base);
  const hasThresholdPace = opts.thresholdPace && String(opts.thresholdPace).trim().length > 0;
  
  // Use different seed bits for different decisions
  const seedA = seed >>> 0;
  const seedB = ((seed * 7919) >>> 0);
  const seedC = ((seed * 104729) >>> 0);
  const seedD = ((seed * 224737) >>> 0);
  
  // Reroll count for cycling through effort levels
  // If rerollCount is provided (>0), use it to deliberately cycle effort levels
  // If not provided or 0, use seeded random for natural initial variety
  const hasRerollCount = typeof rerollCount === 'number' && rerollCount > 0;
  const rerollNum = hasRerollCount ? rerollCount : seedA;

  // TEMPLATE SELECTION - runs first, before any section-specific logic
  // If a template fits, return it immediately
  // Use real targetDistance only (allocator now ensures clean distances)
  const sectionKey = normalizeSectionKey(label);
  if (sectionKey) {
    const template = pickTemplate(sectionKey, target, seedA, base);
    if (template) {
      return template.body;
    }
  }

  const makeLine = (reps, dist, text, restSec) => {
    let suffix = "";
    if (hasThresholdPace && Number.isFinite(restSec) && restSec > 0) {
      suffix = " rest " + String(restSec) + "s";
    }
    let lengthInfo = "";
    if (isNonStandardPool && dist > 0 && base > 0 && dist % base === 0 && dist / base > 1) {
      lengthInfo = " (" + (dist / base) + " lengths)";
    }
    return String(reps) + "x" + String(dist) + lengthInfo + " " + (text || "").trim() + suffix;
  };

  const pickStroke = () => {
    const allowed = [];
    if (opts.strokes && opts.strokes.freestyle) allowed.push("freestyle");
    if (opts.strokes && opts.strokes.backstroke) allowed.push("backstroke");
    if (opts.strokes && opts.strokes.breaststroke) allowed.push("breaststroke");
    if (opts.strokes && opts.strokes.butterfly) allowed.push("butterfly");
    if (!allowed.length) return "freestyle";
    const k = String(label || "").toLowerCase();
    if ((k.includes("warm") || k.includes("cool")) && allowed.includes("freestyle")) return "freestyle";
    return allowed[seedB % allowed.length];
  };

  const restFor = (repDist, intensity) => {
    const k = String(label || "").toLowerCase();
    let r = 15;
    if (k.includes("warm") || k.includes("cool")) r = 0;
    else if (k.includes("drill")) r = 20;
    else if (k.includes("kick") || k.includes("pull")) r = 15;
    else if (k.includes("main")) r = 20;
    if (repDist >= 200) r = Math.max(10, r - 5);
    if (intensity === "hard" || intensity === "fast") r = r + 5;
    if (opts.restPref === "short") r = Math.max(0, r - 5);
    if (opts.restPref === "more") r = r + 10;
    // Add some variation based on seed
    r = r + (seedD % 3) - 1;
    return Math.max(0, r);
  };

  // Find best rep distance - MUST return exact target distance
  // No floor division allowed - distance must match exactly
  // ===== RESEARCH-BASED CONSTRAINTS =====
  // Real coaches rarely program >20 repeats of same set
  // Long distance + high repeats is unrealistic
  // Very short repeats in large quantities are unrealistic
  const MAX_REALISTIC_REPS = 20;
  const MIN_DISTANCE_FOR_HIGH_REPS = 50;
  
  const findBestFit = (preferredDists, useSeed) => {
    const dists = useSeed ? shuffleWithSeed(preferredDists, seedC) : preferredDists;
    
    // First pass: exact fit (reps x dist = target exactly) with research constraints
    for (const d of dists) {
      if (d > 0 && target % d === 0) {
        const reps = target / d;
        // CONSTRAINT 1: No unrealistic repeat counts (research-based max 20)
        // CONSTRAINT 3: Very short repeats (<50) in large quantities (>8) are unrealistic
        const minReps = (d < MIN_DISTANCE_FOR_HIGH_REPS) ? 2 : 2;
        const maxReps = (d < MIN_DISTANCE_FOR_HIGH_REPS) ? 8 : MAX_REALISTIC_REPS;
        if (reps >= minReps && reps <= maxReps) {
          return { reps, dist: d };
        }
      }
    }
    
    // Second pass: try pool length itself (still cap at realistic max)
    if (base > 0 && target % base === 0) {
      const reps = target / base;
      const maxReps = (base < MIN_DISTANCE_FOR_HIGH_REPS) ? 8 : MAX_REALISTIC_REPS;
      if (reps >= 2 && reps <= maxReps) {
        return { reps, dist: base };
      }
    }
    
    // Third pass: try 2xbase (always at least 50m for standard pools)
    const base2 = base * 2;
    if (base2 > 0 && target % base2 === 0) {
      const reps = target / base2;
      if (reps >= 2 && reps <= MAX_REALISTIC_REPS) {
        return { reps, dist: base2 };
      }
    }
    
    return null;
  };
  // ===== END RESEARCH-BASED CONSTRAINTS =====

  const stroke = pickStroke();
  const k = String(label || "").toLowerCase();
  const hasFins = !!opts.fins;
  const hasPaddles = !!opts.paddles;

  // Named drills - expanded list
  const drills = [
    "Catch-up", "Fist drill", "Fingertip drag", "DPS", "Shark fin", "Zipper", 
    "Scull", "Corkscrew", "Single arm", "Long dog", "Tarzan", "Head up",
    "Hip rotation", "6-3-6", "Kickboard balance", "Paddle scull"
  ];
  const drill = drills[seedA % drills.length];
  const drill2 = drills[(seedA + 7) % drills.length];

  // Build descriptions - expanded with varied effort levels
  const buildDescs = [
    // Strong (yellow) - building effort
    "build", "descend 1-3", "descend 1-4", "descend 1-5", "negative split", 
    "smooth to strong", "build to fast", "odds easy evens strong",
    "every 3rd fast", "last 2 fast",
    // Hard (orange) - more intense builds
    "descend to hard", "build to threshold", "odds steady evens fast",
    // Fullgas touches
    "last one sprint", "build to max", "descend with final sprint"
  ];
  const buildDesc = buildDescs[seedA % buildDescs.length];

  // Preferred rep distances - use single pool length multiples (not 2×poolLen)
  const d25 = base <= 25 ? base : (base <= 50 ? base : Math.round(25 / base) * base);
  const d50 = base <= 50 ? (Math.round(50 / base) * base) : base;
  const d75 = base <= 75 ? (Math.round(75 / base) * base) : base;
  const d100 = base <= 100 ? (Math.round(100 / base) * base) : (base * 2);
  const d200 = base <= 200 ? (Math.round(200 / base) * base) : (base * 4);

  // ~20% chance of multi-part set for main sets (seed % 5 === 0)
  const wantMultiPart = (seedA % 5) === 0 && target >= 400 && k.includes("main");

  // WARM-UP: Simple easy swim with variety
  // Guard: warm-up must not contain hard effort keywords
  if (k.includes("warm")) {
    // Attempt v1 base catalogue for Warm-up
    const catPick = pickV1CatalogueBody("Warm-up", remaining, base, seed);
    if (catPick && catPick.ok && typeof catPick.body === "string") {
      return catPick.body;
    }

    const warmDescs = [stroke + " easy", stroke + " relaxed", "easy swim", "choice easy", stroke + " loosen up"];
    const warmDesc = warmDescs[seedA % warmDescs.length];
    if (!isValidWarmupCoolLine(warmDesc)) {
      return makeLine(4, d100 > 0 ? d100 : d50, stroke + " easy", 0);
    }
    const fit = findBestFit([d100, d50, d200, d75, d25].filter(x => x > 0), true);
    if (!fit) return makeLine(1, target, warmDesc, 0);
    const line = makeLine(fit.reps, fit.dist, warmDesc, 0);
    if (!endsAtHomeEnd(fit.reps * fit.dist, base)) {
      const evenReps = fit.reps % 2 === 0 ? fit.reps : fit.reps + 1;
      return makeLine(evenReps, fit.dist, warmDesc, 0);
    }
    return line;
  }

  // BUILD: Build set with variety - clear progression keywords for gradient
  if (k.includes("build")) {
    const buildSetDescs = [
      stroke + " build to strong", stroke + " descend 1-4", stroke + " build to fast",
      stroke + " negative split", stroke + " descend to hard", stroke + " build with last one sprint"
    ];
    const buildSetDesc = buildSetDescs[seedA % buildSetDescs.length];
    const fit = findBestFit([d50, d100, d75, d25].filter(x => x > 0), true);
    if (!fit) return makeLine(1, target, stroke + " build", 0);
    return makeLine(fit.reps, fit.dist, buildSetDesc, restFor(fit.dist, "moderate"));
  }

  // DRILL: Structured numbered drill list (coach-style)
  // EVEN REPS ONLY: Enforces even rep counts (no 7x50, 9x50, 17x50)
  // CRITICAL: Must match target distance exactly
  if (k.includes("drill")) {
    const drillPool = [
      "Fist", "Catch-up", "DPS", "Jazz Hands", "Long Dog",
      "Scull Front", "Scull Rear", "Torpedo Glide", "Single Arm",
      "3-3-3", "Finger Drag", "25 Drill / 25 Swim"
    ];
    
    // Use even rep scheme picker to enforce even reps only
    const evenScheme = pickEvenRepScheme(target, base, "drill");
    
    if (!evenScheme) {
      // Last resort: single line format (rare edge case)
      return target + " drill easy";
    }
    
    const fit = { reps: evenScheme.reps, dist: evenScheme.repDist };
    
    // Build numbered drill list
    const shuffledDrills = shuffleWithSeed([...drillPool], seedA);
    const drillLines = [];
    for (let i = 0; i < fit.reps; i++) {
      drillLines.push((i + 1) + ". " + shuffledDrills[i % shuffledDrills.length]);
    }
    
    const heading = fit.reps + "x" + fit.dist + " Drill FC";
    return heading + "\n" + drillLines.join("\n");
  }

  // KICK: Kick set with variety across effort levels
  // EVEN REPS ONLY: Enforces even rep counts (no 7x50, 9x50, 17x50)
  // Guard: no "relaxed" or "easy" with short reps (25-50)
  if (k.includes("kick")) {
    const finNote = hasFins ? " with fins" : "";
    const kickByEffort = {
      moderate: ["kick steady" + finNote, "kick on side" + finNote, "streamline kick" + finNote, "flutter kick" + finNote],
      strong: ["kick build" + finNote, "kick descend" + finNote, "kick descend 1-4" + finNote],
      hard: ["kick strong" + finNote, "kick fast" + finNote, "kick hard" + finNote],
      fullgas: ["kick sprint" + finNote, "kick max effort" + finNote]
    };
    const effortLevels = ["moderate", "strong", "hard", "fullgas"];
    const effortIdx = rerollNum % effortLevels.length;
    const effort = effortLevels[effortIdx];
    const descs = kickByEffort[effort];
    let kickDesc = descs[seedA % descs.length];
    
    // Use even rep scheme picker to enforce even reps only
    const evenScheme = pickEvenRepScheme(target, base, "kick");
    if (!evenScheme) return makeLine(1, target, "kick" + finNote, 0);
    
    const fit = { reps: evenScheme.reps, dist: evenScheme.repDist };
    
    if (!isValidKickLine(kickDesc, fit.dist)) {
      kickDesc = "kick steady" + finNote;
    }
    return makeLine(fit.reps, fit.dist, kickDesc, restFor(fit.dist, effort));
  }

  // PULL: Pull set with variety across effort levels
  // Use rerollNum to CYCLE through effort levels deliberately
  if (k.includes("pull")) {
    const padNote = hasPaddles ? " with paddles" : "";
    // Organized by effort level for deliberate cycling
    const pullByEffort = {
      moderate: ["pull steady" + padNote, "pull smooth" + padNote, "pull focus DPS" + padNote, "pull relaxed" + padNote, "pull technique" + padNote],
      strong: ["pull build" + padNote, "pull descend" + padNote, "pull descend 1-4" + padNote],
      hard: ["pull strong" + padNote, "pull hard" + padNote, "pull hold pace" + padNote],
      fullgas: ["pull fast" + padNote, "pull sprint" + padNote]
    };
    const effortLevels = ["moderate", "strong", "hard", "fullgas"];
    // Cycle through effort levels based on rerollNum
    const effortIdx = rerollNum % effortLevels.length;
    const effort = effortLevels[effortIdx];
    const descs = pullByEffort[effort];
    const pullDesc = descs[seedA % descs.length];
    const fit = findBestFit([d100, d50, d200, d75].filter(x => x > 0), true);
    if (!fit) return makeLine(1, target, "pull" + padNote, 0);
    return makeLine(fit.reps, fit.dist, pullDesc, restFor(fit.dist, effort));
  }

  // COOL-DOWN: Easy swim with variety
  // Guard: cool-down must not contain hard effort keywords
  if (k.includes("cool")) {
    const coolDescs = ["easy choice", stroke + " easy", "easy swim", "choice loosen up", "relaxed swim"];
    const coolDesc = coolDescs[seedA % coolDescs.length];
    if (!isValidWarmupCoolLine(coolDesc)) {
      return makeLine(4, d100 > 0 ? d100 : d50, stroke + " easy", 0);
    }
    const fit = findBestFit([d100, d200, d50].filter(x => x > 0), true);
    if (!fit) return makeLine(1, target, coolDesc, 0);
    const line = makeLine(fit.reps, fit.dist, coolDesc, 0);
    if (!endsAtHomeEnd(fit.reps * fit.dist, base)) {
      const evenReps = fit.reps % 2 === 0 ? fit.reps : fit.reps + 1;
      return makeLine(evenReps, fit.dist, coolDesc, 0);
    }
    return line;
  }

  // MAIN SET: Coach-quality variety with optional multi-part
  const focus = String(opts.focus || "allround");
  
  // Multi-part set patterns (~20% of the time for main sets 400m+)
  // CRITICAL: Total must equal target exactly - try all patterns until one works
  if (wantMultiPart) {
    const multiPatterns = [
      // Two-part: build + fast (50/50 split)
      () => {
        const repDist = d100 > 0 ? d100 : d50;
        if (repDist <= 0) return null;
        const totalReps = target / repDist;
        if (!Number.isInteger(totalReps) || totalReps < 4) return null;
        const r1 = Math.floor(totalReps / 2);
        const r2 = totalReps - r1;
        if (r1 >= 2 && r2 >= 2 && r1 * repDist + r2 * repDist === target) {
          return makeLine(r1, repDist, stroke + " build", restFor(repDist, "moderate")) + "\n" +
                 makeLine(r2, repDist, stroke + " fast", restFor(repDist, "hard"));
        }
        return null;
      },
      // Three-part ladder: steady + strong + fast (equal thirds)
      () => {
        const repDist = d100 > 0 ? d100 : d50;
        if (repDist <= 0) return null;
        const totalReps = target / repDist;
        if (!Number.isInteger(totalReps) || totalReps < 6 || totalReps % 3 !== 0) return null;
        const r = totalReps / 3;
        if (r >= 2 && r * repDist * 3 === target) {
          return makeLine(r, repDist, stroke + " steady", restFor(repDist, "easy")) + "\n" +
                 makeLine(r, repDist, stroke + " strong", restFor(repDist, "moderate")) + "\n" +
                 makeLine(r, repDist, stroke + " fast", restFor(repDist, "hard"));
        }
        return null;
      },
      // Mixed distance: 50s + 100s (requires exact math)
      () => {
        if (d50 <= 0 || d100 <= 0) return null;
        // Try: r1 x 50 + r2 x 100 = target where r1,r2 >= 2
        // Iterate to find valid combo
        for (let r2 = 2; r2 <= 10; r2++) {
          const remaining = target - r2 * d100;
          if (remaining > 0 && remaining % d50 === 0) {
            const r1 = remaining / d50;
            if (r1 >= 2 && r1 <= 12 && r1 * d50 + r2 * d100 === target) {
              return makeLine(r1, d50, stroke + " build", restFor(d50, "moderate")) + "\n" +
                     makeLine(r2, d100, stroke + " strong", restFor(d100, "hard"));
            }
          }
        }
        return null;
      }
    ];
    
    // Try preferred pattern first, then try others
    const startIdx = seedB % multiPatterns.length;
    for (let i = 0; i < multiPatterns.length; i++) {
      const idx = (startIdx + i) % multiPatterns.length;
      const result = multiPatterns[idx]();
      if (result) return result;
    }
  }

  // Simple single-line main set (default) - with varied effort levels
  // Use rerollNum to CYCLE through effort levels for allround focus
  // Descriptions designed to trigger proper effort gradients in parseEffortTimeline
  const mainDescs = {
    sprint: [
      stroke + " fast", stroke + " build to sprint", stroke + " max effort", 
      stroke + " race pace", stroke + " all out", stroke + " descend with final sprint"
    ],
    threshold: [
      stroke + " maintain strong pace", stroke + " threshold hold", stroke + " threshold pace", 
      stroke + " controlled fast", stroke + " tempo hold"
    ],
    endurance: [
      stroke + " steady", stroke + " smooth", stroke + " hold pace", 
      stroke + " aerobic", stroke + " consistent"
    ],
    technique: [
      stroke + " perfect form", stroke + " focus DPS", stroke + " count strokes", 
      stroke + " smooth technique", stroke + " efficient"
    ],
    allround: null // Handled specially with effort cycling below
  };
  
  // For allround focus: cycle through all 5 effort levels for variety
  const allroundByEffort = {
    easy: [stroke + " easy", stroke + " recovery", stroke + " relaxed pace", stroke + " loosen up"],
    moderate: [stroke + " steady", stroke + " smooth", stroke + " aerobic", stroke + " hold pace"],
    strong: [stroke + " build", stroke + " descend 1-4", stroke + " negative split", stroke + " build to strong"],
    hard: [stroke + " hard", stroke + " strong hold", stroke + " threshold", stroke + " fast hold", stroke + " descend to hard"],
    fullgas: [stroke + " sprint", stroke + " max effort", stroke + " race pace", stroke + " all out", stroke + " build to sprint"]
  };
  
  let mainDesc;
  let effortForRest = "hard";
  if (focus === "allround" || !mainDescs[focus]) {
    // Cycle through 5 effort levels for main sets: easy → moderate → strong → hard → fullgas
    const mainEfforts = ["moderate", "strong", "hard", "fullgas", "easy"];
    const effortIdx = rerollNum % mainEfforts.length;
    const effort = mainEfforts[effortIdx];
    const descs = allroundByEffort[effort];
    mainDesc = descs[seedA % descs.length];
    effortForRest = effort === "easy" ? "easy" : (effort === "moderate" ? "moderate" : "hard");
  } else {
    const descs = mainDescs[focus];
    mainDesc = descs[seedA % descs.length];
  }

  // Shuffle distance preferences for variety
  const fit = findBestFit([d100, d50, d200, d75].filter(x => x > 0), true);
  if (!fit) return makeLine(1, target, stroke + " swim", 0);
  return makeLine(fit.reps, fit.dist, mainDesc, restFor(fit.dist, effortForRest));
}
app.get("/", (req, res) => {
  const HOME_HTML = `
    <link rel="stylesheet" href="/styles.css">
    <div id="adBanner" style="position:fixed; top:0; left:0; width:100vw; height:75px; background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color:#ffffff; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:0 60px; box-sizing:border-box; z-index:9999; border-bottom:1px solid rgba(255,255,255,0.1); box-shadow:0 4px 15px rgba(0,0,0,0.4);">
      <div style="display:flex; flex-direction:column; gap:2px;">
        <div id="fakeAdContent" style="font-weight:800; color:#60a5fa; text-transform:uppercase; letter-spacing:1px; font-size:12px; animation: pulse 2s infinite;">Get SwimGen Pro: No Ads and Custom Pools</div>
        <div style="font-size:10px; color:#94a3b8; font-weight:500;">Limited Time Offer -- Click to Upgrade</div>
      </div>
      <button type="button" style="position:absolute; bottom:8px; right:15px; background:rgba(255,255,255,0.9); color:#1e3a8a; border:none; border-radius:4px; padding:4px 10px; font-size:9px; font-weight:900; cursor:pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">REMOVE ADS</button>
    </div>
    <style>
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
      body { padding-top: 85px !important; }
    </style>

    <div style="max-width:520px;">
      <form id="genForm" class="glassPanel" style="position:relative; max-width:520px; padding:16px;">
        <div class="form-row">
          <div class="form-col">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
              <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                <h3 style="margin:0; font-size:20px; font-weight:700; font-variant:small-caps; letter-spacing:0.5px;">
                  <span class="glassChip readChip">Swim Gen</span>
                </h3>
              </div>

              <div style="flex:1; display:flex; justify-content:center;">
                <div style="display:flex; align-items:center; gap:12px; margin-left:8px;">
  <div style="position:relative; width:26px; height:26px; display:flex; align-items:center; justify-content:center;">
    <input type="color" id="solidColorPicker" oninput="setBgColor(this.value)" value="#40c9e0" title="Choose background color" style="position:absolute; width:100%; height:100%; opacity:0.01; cursor:pointer; z-index:2;">
    <span style="font-size:22px; z-index:1; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">&#128167;</span>
  </div>
  <button id="bgCycleBtn" type="button" aria-label="Change background" class="icon-silhouette" style="font-size:22px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">&#128444;&#65039;</button>
</div>
              </div>

              <span class="glassChip readChip" style="white-space:nowrap; border-radius:8px; padding:6px 12px;">
                <strong id="distanceLabel">2000</strong>
              </span>
            </div>

            <div style="display:flex; align-items:center;">
              <input
                id="distanceSlider"
                type="range"
                min="500"
                max="10000"
                step="100"
                value="2000"
                class="distance-slider"
                style="flex:1;"
              />
            </div>

            <input type="hidden" name="distance" id="distanceHidden" value="2000" />
          </div>

          <div class="form-col">
            <input type="hidden" name="poolLength" id="poolLengthHidden" value="25m" />

            <div id="controlsGrid">
              <div id="leftControls">
                <div id="poolButtons" class="poolRow">
                  <button type="button" data-pool="25m" class="active" style="padding:6px 14px; border-radius:5px; cursor:pointer;">25m</button>
                  <button type="button" data-pool="50m" style="padding:6px 14px; border-radius:5px; cursor:pointer;">50m</button>
                  <button type="button" data-pool="25yd" style="padding:6px 14px; border-radius:5px; cursor:pointer;">25yd</button>
                </div>

                <div id="premiumTeaserRow" style="display:flex; align-items:center; justify-content:flex-start; gap:10px; margin-top:10px; position:relative;">
                  <button type="button" id="showPremiumInfo" onclick="window.location.href='/premium'" style="background:transparent; border:none; text-align:left; font-size:14px; opacity:0.85; display:flex; align-items:center; gap:8px; cursor:pointer; padding:0; font-weight:600; color:#0055aa;">
                    <span class="whiteChip">✨ Premium Options (Coming Soon)</span>
                  </button>
                </div>
              </div>

              <div id="generateStack">
                <button id="generateBtn" type="submit" class="generateBox">
                  <div class="genLabel">Generate</div>
                  <div id="dolphinLoader" class="genDolphin"><img class="dolphinIcon dolphinIcon--generate" src="/assets/dolphins/dolphin-base.png" alt=""></div>
                </button>
              </div>
            </div>

            <div id="advancedWrap" style="display:none; margin-top:10px; padding:14px;">
              <div style="margin-bottom:14px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">
                  Custom pool length
                </label>
                <div style="display:flex; gap:8px; align-items:center;">
                  <input
                    name="customPoolLength"
                    id="customPoolLength"
                    type="number"
                    min="10"
                    max="400"
                    placeholder="e.g. 30"
                    style="width: 90px; padding:6px 8px; border-radius:8px; border:1px solid #ccc;"
                  />
                  <select name="poolLengthUnit" id="poolLengthUnit" style="padding:6px 8px; border-radius:8px; border:1px solid #ccc;">
                    <option value="meters">meters</option>
                    <option value="yards">yards</option>
                  </select>
                </div>
                <div style="margin-top:4px; font-size:11px; color:#888;">Select Custom pool button to enable</div>
              </div>

              <div style="margin-bottom:14px;">
                <label style="display:block; font-weight:600; margin-bottom:4px;">
                  Threshold pace (per 100, optional)
                </label>
                <input
                  name="thresholdPace"
                  id="thresholdPace"
                  type="text"
                  placeholder="e.g. 1:30"
                  style="width: 120px; padding:6px 8px; border-radius:8px; border:1px solid #ccc;"
                />
                <div style="margin-top:4px; font-size:11px; color:#888;">
                  Estimates times per set and total
                </div>
              </div>

              <div class="advanced-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                <div>
                  <div style="font-weight:700; margin-bottom:8px; color:#222;">Strokes</div>
                  <label style="display:block; margin:6px 0;">
                    <input type="checkbox" name="stroke_freestyle" checked />
                    Freestyle
                  </label>
                  <label style="display:block; margin:6px 0;">
                    <input type="checkbox" name="stroke_backstroke" />
                    Backstroke
                  </label>
                  <label style="display:block; margin:6px 0;">
                    <input type="checkbox" name="stroke_breaststroke" />
                    Breaststroke
                  </label>
                  <label style="display:block; margin:6px 0;">
                    <input type="checkbox" name="stroke_butterfly" />
                    Butterfly
                  </label>
                </div>
                <div>
                  <div style="font-weight:700; margin-bottom:8px; color:#222;">Equipment</div>
                  <label style="display:block; margin:6px 0;">
                    <input type="checkbox" name="equip_fins" />
                    Fins
                  </label>
                  <label style="display:block; margin:6px 0;">
                    <input type="checkbox" name="equip_paddles" />
                    Paddles
                  </label>
                  <div style="height:14px;"></div>
                  <div style="font-weight:700; margin-bottom:6px; color:#222;">Include sets</div>
                  <label style="display:block; margin:6px 0;">
                    <input type="checkbox" name="includeKick" checked />
                    Kick
                  </label>
                  <label style="display:block; margin:6px 0;">
                    <input type="checkbox" name="includePull" />
                    Pull
                  </label>
                </div>
              </div>

              <div style="margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                <div>
                  <div style="font-weight:700; margin-bottom:6px; color:#222;">Focus area</div>
                  <select name="focus" id="focus" style="padding:8px 10px; border-radius:8px; border:1px solid #bbb; width:100%; font-size:14px;">
                    <option value="allround">All round</option>
                    <option value="endurance">Endurance</option>
                    <option value="threshold">Threshold</option>
                    <option value="sprint">Sprint</option>
                    <option value="technique">Technique</option>
                  </select>
                </div>
                <div>
                  <div style="font-weight:700; margin-bottom:6px; color:#222;">Rest preference</div>
                  <select name="restPref" id="restPref" style="padding:8px 10px; border-radius:8px; border:1px solid #bbb; width:100%; font-size:14px;">
                    <option value="balanced">Balanced</option>
                    <option value="short">Short rest</option>
                    <option value="moderate">Moderate rest</option>
                    <option value="more">More rest</option>
                  </select>
                </div>
              </div>

              <div style="margin-top:14px;">
                <div style="font-weight:700; margin-bottom:6px; color:#222;">Notes (optional)</div>
                <textarea
                  name="notes"
                  id="notes"
                  rows="3"
                  placeholder="e.g. I cannot do breaststroke kick, I want to work on freestyle sprinting, shoulder is sore"
                  style="width:100%; box-sizing:border-box; padding:8px 10px; border:1px solid #bbb; border-radius:8px; resize:vertical; font-size:14px;"
                ></textarea>
              </div>

              <div style="margin-top:8px;">
                <button id="generateBtn2" type="button"
                  style="width:100%; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.45); background:rgba(255,255,255,0.22); color:#111; cursor:pointer;">
                  <span style="font-weight:700; font-size:15px;">Generate</span>
                  <span class="genDolphin" style="display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:8px; background:rgba(255,255,255,0.35); border:1px solid rgba(0,0,0,0.08);">
                    <img class="dolphinIcon dolphinIcon--generate" src="/assets/dolphins/dolphin-strong.png" alt="" style="width:24px; height:24px;">
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style="margin-top:14px; display:flex; align-items:flex-end; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <button id="copyBtn" type="button" style="display:none; padding:8px 12px; border-radius:8px; border:1px solid #777; background:#fff; color:#111; cursor:pointer;" disabled>
              Copy
            </button>
            <span id="statusPill" style="font-size:13px; color:#555;"></span>
          </div>
        </div>
      </form>
    </div>

    <div style="max-width:520px; box-sizing:border-box; padding:0;">

      <div id="resultWrap" style="margin-top:16px; min-height:400px; padding:0; background:transparent; border-radius:0; border:none; box-shadow:none;">
        <div id="errorBox" style="display:none; margin-bottom:10px; padding:10px; background:#fff; border:1px solid #e7e7e7; border-radius:8px;"></div>

        <div id="workoutNameDisplay" style="display:none; margin-bottom:8px; margin-top:20px;">
          <div class="workoutTitleRow" style="display:flex; align-items:center; justify-content:space-between; width:100%; max-width:520px; height:44px;">
            <button id="lockBtn" class="icon-silhouette" title="Lock Interactions" style="color:#ffd700; font-size:28px; margin-right:8px; filter: contrast(1.2) saturate(1.1) drop-shadow(0 2px 3px rgba(0,0,0,0.4)); transition: all 0.3s ease;">&#128275;</button>
            <div style="display:flex; align-items:center; gap:10px;">
              <button id="regenBtn2" class="icon-silhouette" aria-label="Regenerate">
                <img class="dolphinIcon" src="/assets/dolphins/dolphin-base.png" style="width:40px; height:40px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
              </button>
              <div style="position:relative; width:26px; height:26px; display:flex; align-items:center; justify-content:center;">
                <input type="color" oninput="setBgColor(this.value)" style="position:absolute; width:100%; height:100%; opacity:0.01; cursor:pointer; z-index:2;">
                <span style="font-size:22px; z-index:1; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">&#128167;</span>
              </div>
              <button id="bgCycleBtn2" class="icon-silhouette" style="font-size:22px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">&#128444;&#65039;</button>
            </div>
            <span id="workoutNameText" style="font-weight:700; font-size:14px; font-variant:small-caps; color:#111; background:#ffff00; padding:6px 14px; border-radius:4px; border:1px solid #111; box-shadow: var(--boulder-shadow);"></span>
          </div>
        </div>
        <div id="cards" style="display:none;"></div>

        <div id="totalBox" style="display:none; text-align:right; margin-top:8px;"><span id="totalText" style="display:inline-block; font-weight:700; font-size:15px; font-variant:small-caps; color:#111; background:#ffff00; padding:6px 14px; border-radius:4px; border:1px solid #111; box-shadow:0 2px 6px rgba(0,0,0,0.25);"></span></div>
        <div id="footerBox" class="glassSummary" style="display:none; margin-top:8px; padding:12px;"></div>

        <pre id="raw" style="display:none; margin-top:12px; padding:12px; background:#fff; border-radius:8px; border:1px solid #e7e7e7; white-space:pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size:13px; line-height:1.35;"></pre>
      </div>
    </div>

    <div id="howToUseCard" class="glassPanel" style="max-width:520px; margin-top:24px; padding:12px; font-size:13px; border-left:4px solid #f1c40f; background:rgba(255,255,255,0.4);">
      <h4 style="margin:0 0 8px 0; font-size:14px; font-weight:700;">How to use SwimGen</h4>
      <p style="margin:0 0 8px 0; font-size:12px;">1. Choose your distance and pool size.<br>2. Click <strong>Generate</strong> and voila!</p>
      <ul style="margin:0; padding-left:18px; line-height:1.4; color:#333; font-size:12px;">
        <li><strong>Top Dolphin:</strong> New full workout.</li>
        <li><strong>Set Dolphin:</strong> Reroll just that set.</li>
        <li><strong>Long Press (300ms):</strong> Drag and drop sets.</li>
        <li><strong>Swipe Right:</strong> Remove a set.</li>
        <li><strong>Swipe Left:</strong> Send set to bottom.</li>
        <li><strong>Eyedropper/Frame Icons:</strong> Custom colors or image backgrounds.</li>
        <li><strong>Feedback:</strong> <a href="mailto:feedback@swimgen.com" target="_blank" style="color:#0055aa;">Leave a comment here.</a></li>
      </ul>
    </div>

    <!-- GESTURE EDIT MODAL START -->
    <div id="gestureEditModal" class="gesture-modal-overlay">
      <div class="gesture-modal-content">
        <div class="gesture-modal-header">
          <h3>Edit Swim Set</h3>
          <button id="closeGestureModal" class="gesture-modal-close">×</button>
        </div>
        <div class="gesture-form-group">
          <label>Distance (meters)</label>
          <input type="number" id="modalDistance" class="gesture-form-input" value="100" min="25" step="25">
        </div>
        <div class="gesture-form-group">
          <label>Repetitions</label>
          <input type="number" id="modalReps" class="gesture-form-input" value="4" min="1" max="20">
        </div>
        <div class="gesture-form-group">
          <label>Stroke / Type</label>
          <select id="modalStroke" class="gesture-form-select">
            <option value="Free">Freestyle</option>
            <option value="Back">Backstroke</option>
            <option value="Breast">Breaststroke</option>
            <option value="Fly">Butterfly</option>
            <option value="IM">IM</option>
            <option value="Kick">Kick</option>
            <option value="Drill">Drill</option>
            <option value="Pull">Pull</option>
          </select>
        </div>
        <div class="gesture-form-group">
          <label>Effort Level</label>
          <div class="gesture-effort-buttons">
            <button data-effort="easy" class="gesture-effort-btn" style="background:#b9f0fd;color:#000;">Easy</button>
            <button data-effort="moderate" class="gesture-effort-btn active" style="background:#cfffc0;color:#000;">Moderate</button>
            <button data-effort="strong" class="gesture-effort-btn" style="background:#fcf3d5;color:#000;">Strong</button>
            <button data-effort="hard" class="gesture-effort-btn" style="background:#ffc374;color:#000;">Hard</button>
            <button data-effort="fullgas" class="gesture-effort-btn" style="background:#fe0000;color:#fff;">Full Gas</button>
          </div>
          <label style="margin-top:8px;">Patterns</label>
          <div class="gesture-effort-buttons">
            <button data-effort="build" class="gesture-effort-btn gesture-pattern-btn" style="background:linear-gradient(to right,#b9f0fd,#cfffc0,#fcf3d5,#ffc374);color:#000;">Build</button>
            <button data-effort="descend" class="gesture-effort-btn gesture-pattern-btn" style="background:linear-gradient(to right,#ffc374,#fcf3d5,#cfffc0,#b9f0fd);color:#000;">Descend</button>
            <button data-effort="alternate" class="gesture-effort-btn gesture-pattern-btn" style="background:repeating-linear-gradient(to right,#b9f0fd 0px,#b9f0fd 15px,#ffc374 15px,#ffc374 30px);color:#000;">Alternate</button>
          </div>
        </div>
        <div class="gesture-modal-actions">
          <button id="modalDeleteBtn" class="gesture-delete-btn">Delete Set</button>
          <button id="modalSaveBtn" class="gesture-save-btn">Save Changes</button>
        </div>
      </div>
    </div>
    <!-- GESTURE EDIT MODAL END -->

    <div id="toastContainer" style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:white; padding:10px 20px; border-radius:20px; font-size:13px; opacity:0; transition:opacity 0.3s ease; pointer-events:none; z-index:10000; white-space:nowrap;"></div>
  `;
  const HOME_JS_OPEN = `
    <script>
  `;
  const HOME_JS_DOM = `
      const IS_LITE_MODE = true; 
      const form = document.getElementById("genForm");
      const errorBox = document.getElementById("errorBox");
      const statusPill = document.getElementById("statusPill");
      const dolphinLoader = document.getElementById("dolphinLoader");

      const cards = document.getElementById("cards");
      const totalBox = document.getElementById("totalBox");
      const totalText = document.getElementById("totalText");
      const footerBox = document.getElementById("footerBox");
      const raw = document.getElementById("raw");

      const copyBtn = document.getElementById("copyBtn");

      const distanceSlider = document.getElementById("distanceSlider");
      const distanceHidden = document.getElementById("distanceHidden");
      const distanceLabel = document.getElementById("distanceLabel");

      const poolButtons = document.getElementById("poolButtons");
      const poolHidden = document.getElementById("poolLengthHidden");
      const customLen = document.getElementById("customPoolLength");
      const customUnit = document.getElementById("poolLengthUnit");

      const thresholdPace = document.getElementById("thresholdPace");

      const toggleAdvanced = document.getElementById("toggleAdvanced");
      const advancedWrap = document.getElementById("advancedWrap");
      const generateBtn = document.getElementById("generateBtn");
      const advancedChip = document.getElementById("advancedChip");
  `;
  const HOME_JS_HELPERS = `
      function snap100(n) {
        const x = Number(n);
        if (!Number.isFinite(x)) return 1000;
        return Math.round(x / 100) * 100;
      }

      function snapToStandardDistance(value) {
        const x = Number(value);
        if (!Number.isFinite(x)) return 1000;
        if (x < 2000) return Math.round(x / 100) * 100;
        return Math.round(x / 200) * 200;
      }

      function setDistance(val, skipSave) {
        const snapped = snapToStandardDistance(val);
        distanceSlider.value = String(snapped);
        distanceHidden.value = String(snapped);
        distanceLabel.textContent = String(snapped);
        if (!skipSave) saveUserSettings();
      }

      // ===== localStorage Settings System =====
      function migrateSettings(savedSettings) {
        if (!savedSettings.version) {
          return {
            version: '1.0',
            isPremium: savedSettings.isPremium || false,
            core: {
              distance: savedSettings.distance || 2000,
              poolLength: savedSettings.poolLength || '25m',
            },
            strokes: {
              freestyleBias: savedSettings.freestyleBias || 70,
              backstrokeBias: savedSettings.backstrokeBias || 10,
              breaststrokeBias: savedSettings.breaststrokeBias || 10,
              butterflyBias: savedSettings.butterflyBias || 10,
            },
            equipment: {
              pullBuoy: savedSettings.pullBuoy || false,
              fins: savedSettings.fins || false,
              paddles: savedSettings.paddles || false,
              snorkel: savedSettings.snorkel || false,
            },
            pace: {
              cssTime: '',
              intervalStyle: '',
              restPeriod: 0,
            },
            preferences: {
              showTimeEstimates: true,
              autoCalculateIntervals: true,
            }
          };
        }
        return savedSettings;
      }

      function loadUserSettings() {
        const saved = localStorage.getItem('swimWorkoutSettings');
        if (!saved) return null;
        try {
          const parsed = JSON.parse(saved);
          return migrateSettings(parsed);
        } catch (e) {
          console.error('Failed to parse saved settings:', e);
          return null;
        }
      }

      function saveUserSettings() {
        const settings = {
          version: '1.0',
          core: {
            distance: distanceSlider.value,
            poolLength: poolHidden.value,
          },
          strokes: {
            freestyleBias: 70,
            backstrokeBias: 10,
            breaststrokeBias: 10,
            butterflyBias: 10,
          },
          equipment: {
            pullBuoy: false,
            fins: false,
            paddles: false,
            snorkel: false,
          },
          pace: {
            cssTime: '',
            intervalStyle: '',
            restPeriod: 0,
          },
          preferences: {
            showTimeEstimates: true,
            autoCalculateIntervals: true,
          }
        };
        localStorage.setItem('swimWorkoutSettings', JSON.stringify(settings));
      }

      function updateSetting(category, key, value) {
        const settings = loadUserSettings() || {
          version: '1.0',
          core: {}, strokes: {}, equipment: {}, pace: {}, preferences: {}
        };
        if (!settings[category]) settings[category] = {};
        settings[category][key] = value;
        localStorage.setItem('swimWorkoutSettings', JSON.stringify(settings));
      }
      // ===== End localStorage Settings System =====

      function safeHtml(s) {
        return String(s)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");
      }

      function parsePaceToSecondsPer100(s) {
        const t = String(s || "").trim();
        if (!t) return null;

        // Accept 1:30 or 90
        if (/^\\d{1,2}:\\d{2}$/.test(t)) {
          const parts = t.split(":");
          const mm = Number(parts[0]);
          const ss = Number(parts[1]);
          if (!Number.isFinite(mm) || !Number.isFinite(ss)) return null;
          return (mm * 60) + ss;
        }

        if (/^\\d{2,3}$/.test(t)) {
          const v = Number(t);
          if (!Number.isFinite(v) || v <= 0) return null;
          return v;
        }

        return null;
      }

      function fmtMmSs(totalSeconds) {
        const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
        const mm = Math.floor(s / 60);
        const ss = s % 60;
        return String(mm) + ":" + String(ss).padStart(2, "0");
      }

      function unitShortFromPayload(payload) {
        if (payload.poolLength === "custom") {
          return payload.poolLengthUnit === "yards" ? "yd" : "m";
        }
        return payload.poolLength === "25yd" ? "yd" : "m";
      }

      function poolLabelFromPayload(payload) {
        if (payload.poolLength !== "custom") return payload.poolLength;
        const u = payload.poolLengthUnit === "yards" ? "yd" : "m";
        return String(payload.customPoolLength) + u + " custom";
      }

      function fnv1a(str) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
          h ^= str.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      }

      function loadLastWorkoutFingerprint() {
        try {
          return localStorage.getItem("swg_v1_last_fp") || "";
        } catch {
          return "";
        }
      }

      function saveLastWorkoutFingerprint(fp) {
        try {
          localStorage.setItem("swg_v1_last_fp", String(fp || ""));
        } catch {
        }
      }

      function fingerprintWorkoutText(text) {
        return String(fnv1a(String(text || "")));
      }

      // Background cycling with two-layer crossfade
      const backgroundImages = [
        "/backgrounds/Page-002 (Large)_result.webp",
        "/backgrounds/Page-004 (Large)_result.webp",
        "/backgrounds/Page-006 (Large)_result.webp",
        "/backgrounds/Page-008 (Large)_result.webp",
        "/backgrounds/Page-010 (Large)_result.webp",
        "/backgrounds/Page-012 (Large)_result.webp",
        "/backgrounds/Page-014 (Large)_result.webp",
        "/backgrounds/Page-016 (Large)_result.webp",
        "/backgrounds/Page-018 (Large)_result.webp",
        "/backgrounds/Page-020 (Large)_result.webp",
        "/backgrounds/Page-022 (Large)_result.webp",
        "/backgrounds/Page-022(1) (Large)_result.webp",
        "/backgrounds/Page-024 (Large)_result.webp"
      ];

      // Determine initial background index from bgA layer or body
      let bgIndex = (function() {
        const bgA = document.getElementById("bgA");
        const style = (bgA && bgA.style.backgroundImage) || document.body.style.backgroundImage || "";
        for (let i = 0; i < backgroundImages.length; i++) {
          if (style.includes(backgroundImages[i])) return i;
        }
        return 0;
      })();

      let activeBgLayer = "A";

      function setLayerImage(layerEl, url) {
        layerEl.style.backgroundImage = 'url("' + url + '")';
      }

      function preloadImage(url) {
        return new Promise(function(resolve, reject) {
          const img = new Image();
          img.onload = function() { resolve(true); };
          img.onerror = function() { reject(new Error("bg preload failed")); };
          img.src = url;
        });
      }

      function initBackgroundLayers() {
        const bgA = document.getElementById("bgA");
        const bgB = document.getElementById("bgB");
        if (!bgA || !bgB) return;

        const url = backgroundImages[bgIndex];
        setLayerImage(bgA, url);
        bgA.classList.add("isActive");
        bgB.classList.remove("isActive");
        activeBgLayer = "A";
      }

      const bgModes = [
        ...backgroundImages,
        'COLOR:#ffffff', // White
        'COLOR:#121212', // Dark/Black
        'COLOR:#e3f2fd', // Light Blue Pastel
        'COLOR:#f1f8e9'  // Light Green Pastel
      ];
      let bgModeIndex = 0;

      async function cycleBackgroundManually() {
        const bgA = document.getElementById("bgA");
        const bgB = document.getElementById("bgB");
        if (!bgA) return;

        bgModeIndex = (bgModeIndex + 1) % bgModes.length;
        const currentMode = bgModes[bgModeIndex];

        if (currentMode.startsWith('COLOR:')) {
          const color = currentMode.split(':')[1];
          bgA.style.backgroundImage = 'none';
          document.body.style.background = color;
          bgA.style.backgroundColor = color;
        } else if (bgB) {
          const activeBg = bgA.style.opacity === '1' ? bgA : bgB;
          const inactiveBg = activeBg === bgA ? bgB : bgA;

          const img = new Image();
          img.onload = () => {
            inactiveBg.style.backgroundImage = 'url("' + currentMode + '")';
            inactiveBg.style.backgroundColor = 'transparent';
            activeBg.style.opacity = '0';
            inactiveBg.style.opacity = '1';
            setTimeout(() => {
              document.body.style.background = '#121212';
            }, 500);
          };
          img.src = currentMode;
        } else {
          bgA.style.backgroundImage = 'url("' + currentMode + '")';
          document.body.style.background = 'linear-gradient(180deg, #40c9e0 0%, #2db8d4 100%)';
        }
      }

      function wireBackgroundCycleButton() {
        const btn = document.getElementById("bgCycleBtn");
        if (!btn) return;
        btn.addEventListener("click", cycleBackgroundManually);
      }

      window.setBgColor = function(color) {
        const bgA = document.getElementById("bgA");
        const bgB = document.getElementById("bgB");
        if (!bgA || !bgB) return;
        
        bgA.style.backgroundImage = 'none';
        bgB.style.backgroundImage = 'none';
        
        document.body.style.background = color;
        bgA.style.backgroundColor = color;
        bgB.style.backgroundColor = color;
        
        const r = parseInt(color.slice(1,3), 16);
        const g = parseInt(color.slice(3,5), 16);
        const b = parseInt(color.slice(5,7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        document.body.style.color = brightness < 128 ? '#ffffff' : '#111111';
      };

      initBackgroundLayers();
      wireBackgroundCycleButton();
  `;
  const HOME_JS_PARSERS = `
      function splitWorkout(workoutText) {
        const lines = String(workoutText || "").split(/\\r?\\n/);

        const setLines = [];
        const footerLines = [];

        const isFooterLine = (line) => {
          const t = String(line || "").trim();
          if (!t) return false;
          return (
            /^Total\\s+\\d+/.test(t) ||
            t.startsWith("Total lengths:") ||
            t.startsWith("Ends at start end:") ||
            t.startsWith("Requested:") ||
            t.startsWith("Total distance:") ||
            t.startsWith("Est total time:")
          );
        };

        for (const line of lines) {
          if (isFooterLine(line)) footerLines.push(String(line || "").trim());
          else if (String(line || "").trim()) setLines.push(String(line || ""));
        }

        return { setLines: setLines, footerLines: footerLines };
      }

      function parseSetLine(line) {
        const trimmed = String(line || "").trim();
        const m = trimmed.match(/^([^:]{2,30}):\\s*(.+)$/);
        if (m) {
          const label = m[1].trim();
          const body = m[2].trim();
          return { label: label, body: body };
        }
        return { label: null, body: trimmed };
      }
  `;
  const HOME_JS_RENDER_CORE = `
      function clearUI() {
        errorBox.style.display = "none";
        errorBox.innerHTML = "";

        cards.style.display = "none";
        cards.innerHTML = "";

        totalBox.style.display = "none";
        totalBox.classList.remove("workout-fade-in");
        
        footerBox.style.display = "none";
        footerBox.innerHTML = "";
        footerBox.classList.remove("workout-fade-in");

        raw.style.display = "none";
        raw.textContent = "";

        statusPill.innerHTML = "";
        copyBtn.disabled = true;
        copyBtn.dataset.copyText = "";

        window.__swgSummary = null;
        
        const nameDisplay = document.getElementById("workoutNameDisplay");
        if (nameDisplay) nameDisplay.style.display = "none";
      }

      function renderError(title, details) {
        const lines = [];
        lines.push("<div style=\\"font-weight:700; color:#b00020; margin-bottom:6px;\\">" + safeHtml(title) + "</div>");

        if (Array.isArray(details) && details.length) {
          lines.push("<ul style=\\"margin:0; padding-left:18px;\\">");
          for (const d of details) {
            lines.push("<li style=\\"margin:4px 0;\\">" + safeHtml(String(d)) + "</li>");
          }
          lines.push("</ul>");
        }

        errorBox.innerHTML = lines.join("");
        errorBox.style.display = "block";
      }

      function canonicalizeLabel(labelRaw) {
        const raw = String(labelRaw || "").trim();
        if (!raw) return null;

        const key = raw.toLowerCase().replace(/\\s+/g, " ").trim();

        const map = {
          "warm-up": "Warm up",
          "warm up": "Warm up",
          "warmup": "Warm up",
          "build": "Build",
          "drill": "Drill",
          "drills": "Drill",
          "kick": "Kick",
          "pull": "Pull",
          "main": "Main",
          "main 1": "Main 1",
          "main 2": "Main 2",
          "cooldown": "Cool down",
          "cool down": "Cool down"
        };

        if (map[key]) return map[key];
        return raw;
      }

      function getEffortLevel(label, body) {
        const text = (String(label || "") + " " + String(body || "")).toLowerCase();
        const labelOnly = String(label || "").toLowerCase();
        
        // Zone names: easy (green), moderate (blue), strong (yellow), hard (orange), fullgas (red)
        
        // Warm-up and cool-down are always easy (green - Zone 1)
        if (text.includes("warm") || text.includes("cool")) return "easy";
        
        // Full Gas keywords (red - Zone 5) - max intensity
        const fullgasWords = ["sprint", "all out", "max effort", "race pace", "100%", "full gas", "max"];
        for (const w of fullgasWords) if (text.includes(w)) return "fullgas";
        
        // Hard keywords (orange - Zone 4) - sustained hard
        const hardWords = ["fast", "strong", "best average", "race", "threshold", "hard"];
        for (const w of hardWords) if (text.includes(w)) return "hard";
        
        // Main sets are NEVER easy/green - at minimum strong (yellow), default hard (orange)
        if (labelOnly.includes("main")) {
          // Check if it has strong keywords, otherwise default to hard
          const strongWords = ["descend", "build", "negative split", "push", "steady", "smooth"];
          for (const w of strongWords) if (text.includes(w)) return "strong";
          return "hard";
        }
        
        // Strong keywords (yellow - Zone 3) - building effort
        const strongWords = ["descend", "build", "negative split", "push"];
        for (const w of strongWords) if (text.includes(w)) return "strong";
        
        // Moderate keywords (blue - Zone 2) - technique work
        const moderateWords = ["steady", "smooth", "drill", "technique", "focus", "form", "choice"];
        for (const w of moderateWords) if (text.includes(w)) return "moderate";
        
        // Easy keywords (green - Zone 1)
        const easyWords = ["easy", "relaxed", "recovery", "loosen"];
        for (const w of easyWords) if (text.includes(w)) return "easy";
        
        // Default: moderate for technique sets
        return "moderate";
      }

      // Zone order for filling gaps (never skip levels)
      const ZONE_ORDER = ["easy", "moderate", "strong", "hard", "fullgas"];
      
      // Parse a single line or clause to detect its zone
      function detectLineZone(line) {
        const t = String(line || "").toLowerCase();
        
        // Fullgas (red) - maximum intensity
        if (t.includes("sprint") || t.includes("all out") || t.includes("max effort") || 
            t.includes("race pace") || t.includes("full gas") || t.includes("100%")) {
          return "fullgas";
        }
        
        // Hard (orange) - sustained hard
        if (t.includes("fast") || t.includes("strong") || t.includes("hard") || 
            t.includes("threshold") || t.includes("best average")) {
          return "hard";
        }
        
        // Strong (yellow) - building effort, moderate-hard
        if (t.includes("push") || t.includes("moderate")) {
          return "strong";
        }
        
        // Moderate (green) - steady, technique
        if (t.includes("steady") || t.includes("smooth") || t.includes("drill") || 
            t.includes("technique") || t.includes("focus") || t.includes("form") || 
            t.includes("choice") || t.includes("relaxed")) {
          return "moderate";
        }
        
        // Easy (blue)
        if (t.includes("easy") || t.includes("recovery") || t.includes("loosen") || 
            t.includes("warm") || t.includes("cool")) {
          return "easy";
        }
        
        return null; // Unknown
      }
      
      // Fill gaps between two zones so we never skip levels
      function fillZoneGap(fromZone, toZone) {
        const fromIdx = ZONE_ORDER.indexOf(fromZone);
        const toIdx = ZONE_ORDER.indexOf(toZone);
        if (fromIdx < 0 || toIdx < 0) return [fromZone, toZone];
        
        const result = [];
        if (fromIdx <= toIdx) {
          for (let i = fromIdx; i <= toIdx; i++) result.push(ZONE_ORDER[i]);
        } else {
          for (let i = fromIdx; i >= toIdx; i--) result.push(ZONE_ORDER[i]);
        }
        return result;
      }
      
      // Parse body text into effort segments with weights
      // Returns { zones: [...], isStriped: bool, isProgressive: bool }
      // Optional variantSeed adds randomness for gradient probability
      function parseEffortTimeline(label, body, variantSeed) {
        const labelOnly = String(label || "").toLowerCase();
        const bodyText = String(body || "").toLowerCase();
        const lines = String(body || "").split("\\n").filter(l => l.trim());
        
        // LCG-based seeded random generator - advances with each call
        let lcgState = variantSeed || (body ? body.length * 7 + 42 : 42);
        function nextRandom() {
          lcgState = (lcgState * 9301 + 49297) % 233280;
          return lcgState / 233280;
        }
        
        // Detect progression keywords - these create smooth gradients
        const hasProgression = /build|descend|negative split|pyramid|disappearing/i.test(bodyText);
        const hasFinalSprint = /final.*(sprint|fast|hard)|last.*(sprint|fast|hard)|with final|last \\d+ sprint/i.test(bodyText);
        const hasAlternating = /odds.*(easy|fast)|evens.*(easy|fast)|alternate/i.test(bodyText);
        
        // Warm-up: 80% solid blue, 20% easy→moderate gradient
        if (labelOnly.includes("warm")) {
          if (nextRandom() < 0.8) {
            return { zones: ["easy"], isStriped: false, isProgressive: false };
          }
          return { zones: ["easy", "moderate"], isStriped: false, isProgressive: true };
        }
        
        // Cool-down: 80% solid blue, 20% moderate→easy gradient
        if (labelOnly.includes("cool")) {
          if (nextRandom() < 0.8) {
            return { zones: ["easy"], isStriped: false, isProgressive: false };
          }
          return { zones: ["moderate", "easy"], isStriped: false, isProgressive: true };
        }
        
        // Drill: Always solid green or yellow (technique focus, no gradients)
        if (labelOnly.includes("drill")) {
          const zone = nextRandom() < 0.7 ? "moderate" : "strong";
          return { zones: [zone], isStriped: false, isProgressive: false };
        }
        
        // Alternating pattern: odds easy evens fast -> stripes with actual zones
        if (hasAlternating) {
          // Parse exact zones from alternating pattern
          let zone1 = "moderate";
          let zone2 = "hard";
          
          // Detect first zone (odds X or evens X where X is first mentioned)
          if (/odds\\s+easy/i.test(bodyText)) zone1 = "easy";
          else if (/odds\\s+steady|odds\\s+relaxed/i.test(bodyText)) zone1 = "moderate";
          else if (/odds\\s+strong|odds\\s+push/i.test(bodyText)) zone1 = "strong";
          else if (/odds\\s+fast|odds\\s+hard/i.test(bodyText)) zone1 = "hard";
          else if (/odds\\s+sprint/i.test(bodyText)) zone1 = "fullgas";
          
          // Detect second zone (evens X or vice versa)
          if (/evens\\s+easy/i.test(bodyText)) zone2 = "easy";
          else if (/evens\\s+steady|evens\\s+relaxed/i.test(bodyText)) zone2 = "moderate";
          else if (/evens\\s+strong|evens\\s+push/i.test(bodyText)) zone2 = "strong";
          else if (/evens\\s+fast|evens\\s+hard/i.test(bodyText)) zone2 = "hard";
          else if (/evens\\s+sprint/i.test(bodyText)) zone2 = "fullgas";
          
          // Only stripe if zones are different
          if (zone1 !== zone2) {
            return { zones: [zone1, zone2, zone1, zone2], isStriped: true, isProgressive: false };
          }
          // Same zone = solid color
          return { zones: [zone1], isStriped: false, isProgressive: false };
        }
        
        // Steady/hold sets: only solid if explicit "maintain" or "same pace" - not just "hold" 
        // Skip this if progression keywords are present (build then hold is still progressive)
        const hasPureSteady = /maintain.*pace|same pace|consistent pace/i.test(bodyText) && !hasProgression;
        if (hasPureSteady) {
          // Detect the actual zone level
          if (/strong|threshold/i.test(bodyText)) return { zones: ["hard"], isStriped: false, isProgressive: false };
          if (/fast|hard/i.test(bodyText)) return { zones: ["hard"], isStriped: false, isProgressive: false };
          if (/easy|relaxed/i.test(bodyText)) return { zones: ["moderate"], isStriped: false, isProgressive: false };
          return { zones: ["strong"], isStriped: false, isProgressive: false };
        }
        
        // Progression sets: build, descend, etc
        if (hasProgression) {
          // Determine start and end zones based on context
          let startZone = "moderate"; // Default start
          let endZone = "hard"; // Default end
          
          // Check for explicit start zone mentions
          if (/from easy|start easy|start relaxed/i.test(bodyText)) startZone = "easy";
          else if (/from moderate|start steady|start smooth/i.test(bodyText)) startZone = "moderate";
          
          // Check for explicit end zone mentions  
          if (hasFinalSprint || /to sprint|to max|to race pace|to full/i.test(bodyText)) {
            endZone = "fullgas";
          } else if (/to strong|strong effort/i.test(bodyText)) {
            endZone = "hard";
          } else if (/to fast|to hard|to threshold/i.test(bodyText)) {
            endZone = "hard";
          }
          
          // For main sets with build, start higher
          if (labelOnly.includes("main") && startZone === "easy") {
            startZone = "moderate";
          }
          
          // Fill the progression
          const progressionZones = fillZoneGap(startZone, endZone);
          return { zones: progressionZones, isStriped: false, isProgressive: true };
        }
        
        // Multi-line sets: parse each line's zone
        if (lines.length >= 2) {
          const lineZones = [];
          for (const line of lines) {
            const zone = detectLineZone(line);
            if (zone) lineZones.push(zone);
          }
          
          if (lineZones.length >= 2) {
            // Check if it's alternating (A-B-A-B pattern)
            const isAlternatingPattern = lineZones.length >= 3 && lineZones.every((z, i) => 
              z === lineZones[i % 2 === 0 ? 0 : 1]
            ) && lineZones[0] !== lineZones[1];
            
            if (isAlternatingPattern) {
              return { zones: lineZones.slice(0, 6), isStriped: true, isProgressive: false };
            }
            
            // Progressive: fill gaps between first and last
            const firstZone = lineZones[0];
            const lastZone = lineZones[lineZones.length - 1];
            if (firstZone !== lastZone) {
              return { zones: fillZoneGap(firstZone, lastZone), isStriped: false, isProgressive: true };
            }
          }
        }
        
        // Single zone detection for solid colors
        const singleZone = detectLineZone(bodyText);
        if (singleZone) {
          // Check for final sprint modifier - cap gradient at most one level above base
          // unless explicitly fullgas set already
          if (hasFinalSprint && singleZone !== "fullgas") {
            // Determine reasonable end zone - one level up from base, max hard for non-main sets
            const baseIdx = ZONE_ORDER.indexOf(singleZone);
            let endIdx = Math.min(baseIdx + 1, ZONE_ORDER.length - 1);
            // Only go to fullgas if base is already hard, or if label is main
            if (baseIdx >= ZONE_ORDER.indexOf("hard") || labelOnly.includes("main")) {
              endIdx = ZONE_ORDER.length - 1; // fullgas
            }
            const endZone = ZONE_ORDER[endIdx];
            if (singleZone !== endZone) {
              const progressionZones = fillZoneGap(singleZone, endZone);
              return { zones: progressionZones, isStriped: false, isProgressive: true };
            }
          }
          return { zones: [singleZone], isStriped: false, isProgressive: false };
        }
        
        // Default by label type with probability-based variety
        
        // Kick/Pull: mostly moderate (70%), sometimes strong (20%), occasionally hard (10%)
        if (labelOnly.includes("kick") || labelOnly.includes("pull")) {
          const kickRoll = nextRandom();
          if (kickRoll < 0.7) return { zones: ["moderate"], isStriped: false, isProgressive: false };
          if (kickRoll < 0.9) return { zones: ["strong"], isStriped: false, isProgressive: false };
          return { zones: ["hard"], isStriped: false, isProgressive: false };
        }
        
        // Build: 30% gradient (moderate→strong), 70% solid for cleaner visuals
        if (labelOnly.includes("build")) {
          const buildGradientRoll = nextRandom();
          if (buildGradientRoll < 0.3) {
            return { zones: ["moderate", "strong"], isStriped: false, isProgressive: true };
          }
          // Solid color - variety across blue/green/yellow
          const buildZoneRoll = nextRandom();
          if (buildZoneRoll < 0.25) return { zones: ["easy"], isStriped: false, isProgressive: false };
          if (buildZoneRoll < 0.65) return { zones: ["moderate"], isStriped: false, isProgressive: false };
          return { zones: ["strong"], isStriped: false, isProgressive: false };
        }
        
        // Main: 30% gradient, 70% solid for cleaner card appearance
        // Cover ALL effort levels: blue, green, yellow, orange, red
        if (labelOnly.includes("main")) {
          const mainGradientRoll = nextRandom();
          if (mainGradientRoll < 0.3) {
            // Gradient - varied progressions
            const mainEndRoll = nextRandom();
            const endZone = mainEndRoll < 0.2 ? "fullgas" : "hard";
            const startZone = mainEndRoll < 0.5 ? "moderate" : "strong";
            return { zones: fillZoneGap(startZone, endZone), isStriped: false, isProgressive: true };
          }
          // Solid - even distribution across all 5 zones for variety
          const mainSolidRoll = nextRandom();
          if (mainSolidRoll < 0.15) return { zones: ["easy"], isStriped: false, isProgressive: false };
          if (mainSolidRoll < 0.35) return { zones: ["moderate"], isStriped: false, isProgressive: false };
          if (mainSolidRoll < 0.55) return { zones: ["strong"], isStriped: false, isProgressive: false };
          if (mainSolidRoll < 0.85) return { zones: ["hard"], isStriped: false, isProgressive: false };
          return { zones: ["fullgas"], isStriped: false, isProgressive: false };
        }
        
        return { zones: ["moderate"], isStriped: false, isProgressive: false };
      }

      function getZoneSpan(label, body, variantSeed) {
        const timeline = parseEffortTimeline(label, body, variantSeed);
        
        // Single zone = solid color, no gradient needed
        if (timeline.zones.length <= 1) return null;
        
        // Return zones for gradient/stripe rendering
        return timeline.zones;
      }
      
      // Check if zones should be rendered as stripes vs gradient
      function isZoneStriped(label, body, variantSeed) {
        const timeline = parseEffortTimeline(label, body, variantSeed);
        return timeline.isStriped;
      }

      function getZoneColors(zone) {
        const root = document.documentElement;
        const getVar = (name, fallback) => getComputedStyle(root).getPropertyValue(name).trim() || fallback;
        
        // Zone names: easy (blue), moderate (green), strong (yellow), hard (orange), fullgas (red)
        const zones = {
          easy: { bg: getVar('--zone-easy-bg', '#b9f0fd'), bar: getVar('--zone-easy-bar', '#7ac8db') },
          moderate: { bg: getVar('--zone-moderate-bg', '#cfffc0'), bar: getVar('--zone-moderate-bar', '#8fcc80') },
          strong: { bg: getVar('--zone-strong-bg', '#fcf3d5'), bar: getVar('--zone-strong-bar', '#d4c9a0') },
          hard: { bg: getVar('--zone-hard-bg', '#ffc374'), bar: getVar('--zone-hard-bar', '#cc9a4a') },
          fullgas: { bg: getVar('--zone-fullgas-bg', '#fe0000'), bar: getVar('--zone-fullgas-bar', '#cc0000') }
        };
        return zones[zone] || zones.moderate;
      }

      function gradientStyleForZones(zoneSpan, label, body, variantSeed) {
        if (!zoneSpan || zoneSpan.length < 2) return null;
        
        const colors = zoneSpan.map(z => getZoneColors(z));
        
        // Determine text color - white only if more than half is fullgas
        const fullgasCount = zoneSpan.filter(z => z === 'fullgas').length;
        const hardOrFullgasCount = zoneSpan.filter(z => z === 'fullgas' || z === 'hard').length;
        const textColor = (fullgasCount > zoneSpan.length / 2) ? '#fff' : '#111';
        
        // Check if this should be striped (alternating pattern) vs smooth gradient
        const shouldStripe = isZoneStriped(label, body, variantSeed);
        
        if (shouldStripe) {
          // Alternating patterns now use smooth blended gradients (not hard stripes)
          // This creates a wave-like transition between effort levels
          const bgStops = colors.map((c, i) => c.bg + ' ' + Math.round(i * 100 / (colors.length - 1)) + '%').join(', ');
          const bgGradient = 'linear-gradient(to bottom, ' + bgStops + ')';
          
          const barStops = colors.map((c, i) => c.bar + ' ' + Math.round(i * 100 / (colors.length - 1)) + '%').join(', ');
          const barGradient = 'linear-gradient(to bottom, ' + barStops + ')';
          
          return {
            background: bgGradient,
            barGradient: barGradient,
            borderColor: colors[0].bar,
            textColor: textColor
          };
        }
        
        // Smooth gradient for progressive builds
        const bgStops = colors.map((c, i) => c.bg + ' ' + Math.round(i * 100 / (colors.length - 1)) + '%').join(', ');
        const bgGradient = 'linear-gradient(to bottom, ' + bgStops + ')';
        
        const barStops = colors.map((c, i) => c.bar + ' ' + Math.round(i * 100 / (colors.length - 1)) + '%').join(', ');
        const barGradient = 'linear-gradient(to bottom, ' + barStops + ')';
        
        return {
          background: bgGradient,
          barGradient: barGradient,
          borderColor: colors[0].bar,
          textColor: textColor
        };
      }

      function colorStyleForEffort(effort, variantSeed) {
        // Zone-based colors using CSS variables for live color picker
        // Zone names: easy (blue), moderate (green), strong (yellow), hard (orange), fullgas (red)
        // variantSeed adds subtle gradient variety to prevent flat/boring cards
        const root = document.documentElement;
        const getVar = (name, fallback) => getComputedStyle(root).getPropertyValue(name).trim() || fallback;
        const variant = (variantSeed || 0) % 4; // 4 gradient variants per zone
        
        if (effort === "easy") {
          const bg = getVar('--zone-easy-bg', '#b9f0fd');
          const bgLight = '#d4f7ff';
          // Variants: solid, subtle top-down, subtle left-right, subtle diagonal
          if (variant === 1) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + ");";
          if (variant === 2) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bg + " 100%);";
          return "background:" + bg + ";";
        }
        if (effort === "moderate") {
          const bg = getVar('--zone-moderate-bg', '#cfffc0');
          const bgLight = '#e0ffe0';
          if (variant === 1) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + ");";
          if (variant === 2) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bg + " 100%);";
          return "background:" + bg + ";";
        }
        if (effort === "strong") {
          const bg = getVar('--zone-strong-bg', '#fcf3d5');
          const bgLight = '#fffaea';
          const bgDark = '#f5e6b8';
          if (variant === 1) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + ");";
          if (variant === 2) return "background:linear-gradient(to bottom, " + bg + ", " + bgDark + ");";
          if (variant === 3) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bgDark + " 100%);";
          return "background:" + bg + ";";
        }
        if (effort === "hard") {
          const bg = getVar('--zone-hard-bg', '#ffc374');
          const bgLight = '#ffd9a8';
          const bgDark = '#ff9933';
          // More dramatic gradients for hard sets - makes them pop
          if (variant === 0) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + ");";
          if (variant === 1) return "background:linear-gradient(to bottom, " + bg + ", " + bgDark + ");";
          if (variant === 2) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bgDark + " 100%);";
          if (variant === 3) return "background:linear-gradient(180deg, " + bgLight + " 0%, " + bg + " 50%, " + bgDark + " 100%);";
          return "background:" + bg + ";";
        }
        if (effort === "fullgas") {
          const bg = getVar('--zone-fullgas-bg', '#fe0000');
          const bgLight = '#ff4444';
          const bgDark = '#cc0000';
          // Dramatic gradients for max intensity - really stands out
          if (variant === 0) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + "); color:#fff;";
          if (variant === 1) return "background:linear-gradient(to bottom, " + bg + ", " + bgDark + "); color:#fff;";
          if (variant === 2) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bgDark + " 100%); color:#fff;";
          if (variant === 3) return "background:linear-gradient(180deg, " + bgLight + " 0%, " + bg + " 40%, " + bgDark + " 100%); color:#fff;";
          return "background:" + bg + "; color:#fff;";
        }
        return "background:#fff;";
      }

      // Keep old functions for compatibility but mark deprecated
      function labelColorKey(label) {
        const k = String(label || "").toLowerCase();
        if (k.includes("warm")) return "warm";
        if (k.includes("build")) return "build";
        if (k.includes("drill")) return "drill";
        if (k.includes("kick")) return "kick";
        if (k.includes("pull")) return "pull";
        if (k.includes("main")) return "main";
        if (k.includes("cool")) return "cool";
        return "neutral";
      }

      function colorStyleForKey(key) {
        const k = String(key || "");
        if (k === "warm") return "background:linear-gradient(to right, #22c55e 4px, #f0fdf4 4px); border:1px solid #bbf7d0; border-left:4px solid #22c55e;";
        if (k === "build") return "background:linear-gradient(to right, #3b82f6 4px, #eff6ff 4px); border:1px solid #bfdbfe; border-left:4px solid #3b82f6;";
        if (k === "drill") return "background:linear-gradient(to right, #8b5cf6 4px, #f5f3ff 4px); border:1px solid #ddd6fe; border-left:4px solid #8b5cf6;";
        if (k === "kick") return "background:linear-gradient(to right, #f59e0b 4px, #fffbeb 4px); border:1px solid #fde68a; border-left:4px solid #f59e0b;";
        if (k === "pull") return "background:linear-gradient(to right, #f97316 4px, #fff7ed 4px); border:1px solid #fed7aa; border-left:4px solid #f97316;";
        if (k === "main") return "background:linear-gradient(to right, #ef4444 4px, #fef2f2 4px); border:1px solid #fecaca; border-left:4px solid #ef4444;";
        if (k === "cool") return "background:linear-gradient(to right, #06b6d4 4px, #ecfeff 4px); border:1px solid #a5f3fc; border-left:4px solid #06b6d4;";
        return "background:#fff; border:1px solid #e7e7e7;";
      }

      function captureSummary(payload, workoutText) {
        const units = unitShortFromPayload(payload);
        const requested = Number(payload.distance);

        const poolText = poolLabelFromPayload(payload);

        const paceSec = parsePaceToSecondsPer100(payload.thresholdPace || "");
        window.__swgSummary = {
          units: units,
          requested: requested,
          poolText: poolText,
          paceSec: paceSec,
          workoutText: String(workoutText || "")
        };
      }

      function extractFooterInfo(footerLines) {
        const info = {
          totalLengthsLine: null,
          endsLine: null,
          requestedLine: null,
          totalDistanceLine: null,
          estTotalTimeLine: null
        };

        if (!Array.isArray(footerLines)) return info;

        for (const line of footerLines) {
          const t = String(line || "").trim();
          if (!t) continue;

          if (t.startsWith("Total lengths:")) info.totalLengthsLine = t;
          else if (t.startsWith("Ends at start end:")) info.endsLine = t;
          else if (t.startsWith("Requested:")) info.requestedLine = t;
          else if (t.startsWith("Total distance:")) info.totalDistanceLine = t;
          else if (t.startsWith("Est total time:")) info.estTotalTimeLine = t;
        }

        return info;
      }

      function renderFooterTotalsAndMeta(footerLines) {
        const s = window.__swgSummary || { units: "", requested: null, poolText: "", paceSec: null };
        const info = extractFooterInfo(footerLines);

        // Extract total distance for the yellow Total box
        let totalDistStr = "";
        if (info.totalDistanceLine) {
          const match = info.totalDistanceLine.match(/Total distance:\\s*(\\d+)/);
          if (match) totalDistStr = match[1] + (s.units || "m");
        } else if (Number.isFinite(s.requested)) {
          totalDistStr = String(s.requested) + (s.units || "m");
        }

        // Show yellow Total box (prepared for fade-in, triggered by main animation)
        if (totalDistStr) {
          totalText.textContent = "Total " + totalDistStr;
          totalBox.style.opacity = "0";
          totalBox.style.transform = "translateY(16px)";
          totalBox.style.transition = "none";
          totalBox.style.display = "block";
        } else {
          totalBox.style.display = "none";
        }

        // Build summary chips (without Total since it's in yellow box now)
        const chips = [];
        if (s.poolText) chips.push("Pool: " + s.poolText);
        if (info.totalLengthsLine) chips.push(info.totalLengthsLine);
        if (info.estTotalTimeLine) chips.push(info.estTotalTimeLine);

        const seen = new Set();
        const deduped = [];
        for (const c of chips) {
          const k = String(c);
          if (seen.has(k)) continue;
          seen.add(k);
          deduped.push(k);
        }

        if (!deduped.length) {
          footerBox.style.display = "none";
          footerBox.innerHTML = "";
          return;
        }

        const f = [];
        f.push("<div style=\\"display:flex; flex-wrap:wrap; gap:10px;\\">");

        for (const c of deduped) {
          f.push("<div class=\\"readChip\\" style=\\"padding:6px 10px; border-radius:8px; font-weight:700;\\">" + safeHtml(c) + "</div>");
        }

        f.push("</div>");
        
        // Add emoji intensity strip
        const intensityStrip = renderEmojiIntensityStrip();
        if (intensityStrip) {
          f.push(intensityStrip);
        }
        
        // Copyright notice
        f.push("<div style=\\"margin-top:12px; text-align:center; font-size:12px; opacity:0.7;\\">\\u00A9 Creative Arts Global LTD. All rights reserved.</div>");
        
        footerBox.innerHTML = f.join("");
        footerBox.style.opacity = "0";
        footerBox.style.transform = "translateY(16px)";
        footerBox.style.transition = "none";
        footerBox.style.display = "block";
      }
      
      // Emoji intensity strip - 5 faces with gradient background like CardGym
      function renderEmojiIntensityStrip() {
        // Calculate intensity from rendered cards
        const cards = document.querySelectorAll('[data-effort]');
        if (!cards.length) return null;
        
        let intensitySum = 0;
        let count = 0;
        
        cards.forEach(card => {
          const effort = card.getAttribute('data-effort');
          const effortValues = { easy: 1, steady: 2, moderate: 3, strong: 4, hard: 5, fullgas: 5 };
          if (effortValues[effort]) {
            intensitySum += effortValues[effort];
            count++;
          }
        });
        
        if (count === 0) return null;
        
        const avgIntensity = intensitySum / count;
        
        // Map average to 1-5 scale for display
        const level = Math.min(5, Math.max(1, Math.round(avgIntensity)));
        
        // 5 dolphin icons from easy to hard
        const dolphinIcons = [
          '/assets/dolphins/dolphin-easy.png',
          '/assets/dolphins/dolphin-moderate.png',
          '/assets/dolphins/dolphin-strong.png',
          '/assets/dolphins/dolphin-threshold.png',
          '/assets/dolphins/dolphin-fullgas.png'
        ];
        const iconAlts = ['Easy', 'Moderate', 'Strong', 'Threshold', 'Full Gas'];
        
        // Gradient background colors matching CardGym: blue -> green -> yellow -> orange -> red
        const bgColors = ['#b9f0fd', '#cfffc0', '#fcf3d5', '#ffc374', '#fe5050'];
        
        let strip = '<div style=\\"margin-top:6px;\\">';
        
        // Scroll wrapper. On big phones you should see all 5 without scrolling.
        // On smaller widths it can swipe.
        strip += '<div class=\\"effortScrollWrap\\">';
        
        // Inner strip: full width, but won't collapse below 360px.
        strip += '<div class=\\"effortStrip\\">';
        
        for (let i = 0; i < 5; i++) {
          strip += '<div class=\\"effortTile\\" style=\\"background:' + bgColors[i] + ';\\">';
          strip += '<img class=\\"effortIcon\\" src=\\"' + dolphinIcons[i] + '\\" alt=\\"' + iconAlts[i] + '\\">';
          strip += '</div>';
        }
        
        strip += '</div></div></div>';
        return strip;
      }
  `;
  const HOME_JS_RENDER_CARDS = `
      // Persistent Map to track reroll counts per set index (survives innerHTML replacement)
      const rerollCountMap = new Map();
      
      function computeSetDistanceFromBody(body) {
        const t = String(body || "");
        let sum = 0;

        // Split by newlines to handle multi-line set bodies
        const lines = t.split(/\\n/);
        
        for (const line of lines) {
          // Skip numbered drill list items (e.g., "1. 25 Drill / 25 Swim", "2. 3-3-3")
          if (/^\\d+\\.\\s+/.test(line.trim())) continue;
          
          // Skip blank lines
          if (!line.trim()) continue;
          
          // Support x and × for NxD format (8x50, 4×100, etc)
          const re = /(\\d+)\\s*[x×]\\s*(\\d+)\\s*(m|yd)?/gi;
          let m;
          while ((m = re.exec(line)) !== null) {
            const reps = Number(m[1]);
            const dist = Number(m[2]);
            if (Number.isFinite(reps) && Number.isFinite(dist)) sum += reps * dist;
          }
          
          // Also check for standalone distances like "200 easy" without NxD
          // Only if this line had no NxD matches
          if (!/(\\d+)\\s*[x×]\\s*(\\d+)/i.test(line)) {
            const standaloneMatch = line.match(/(^|\\s)(\\d{2,5})(\\s*(m|yd|meters|yards))?(\\s|$)/i);
            if (standaloneMatch) {
              const v = Number(standaloneMatch[2]);
              if (Number.isFinite(v) && v >= 25 && v <= 5000) sum += v;
            }
          }
        }

        return sum > 0 ? sum : null;
      }

      function computeRestSecondsFromBody(body) {
        // Sum an estimate of rest for repeats where "rest 15s" appears.
        const t = String(body || "");
        const reSeg = /(\\d+)\\s*[x×]\\s*(\\d+)[^\\n]*?rest\\s*(\\d+)\\s*s/gi;
        let sum = 0;
        let m;
        while ((m = reSeg.exec(t)) !== null) {
          const reps = Number(m[1]);
          const rest = Number(m[3]);
          if (Number.isFinite(reps) && reps >= 2 && Number.isFinite(rest) && rest >= 0) {
            sum += (reps - 1) * rest;
          }
        }
        return sum;
      }
      
      function extractRestDisplay(body) {
        // Free tier: never display rest seconds.
        // Rest UI will return later behind a paid-tier flag.
        return null;
      }
      
      function stripRestFromBody(body) {
        // Remove "rest XXs" from each line for cleaner display
        return String(body || "")
          .split("\\n")
          .map(line => line.replace(/\\s*rest\\s*\\d+\\s*s/gi, "").trim())
          .filter(line => line.length > 0)
          .join("\\n");
      }

      function cycleCardEffortFallback(bodyEl) {
        const card = bodyEl ? bodyEl.closest('[data-effort]') : null;
        if (!card) return;

        const order = ["easy", "steady", "moderate", "strong", "hard", "fullgas"];
        const cur = (card.getAttribute("data-effort") || "steady").toLowerCase();
        const idx = Math.max(0, order.indexOf(cur));
        const next = order[(idx + 1) % order.length];

        card.setAttribute("data-effort", next);
      }

      function estimateSwimSeconds(body, paceSecPer100, label) {
        if (!Number.isFinite(paceSecPer100) || paceSecPer100 <= 0) return null;

        const dist = computeSetDistanceFromBody(body);
        if (!Number.isFinite(dist) || dist <= 0) return null;

        const k = String(label || "").toLowerCase();

        // Multipliers relative to threshold pace
        // Warm up slower, drills slower, main around threshold, sprint slightly faster but more rest.
        let mult = 1.15;
        if (k.includes("warm")) mult = 1.25;
        else if (k.includes("build")) mult = 1.18;
        else if (k.includes("drill")) mult = 1.30;
        else if (k.includes("kick")) mult = 1.38;
        else if (k.includes("pull")) mult = 1.25;
        else if (k.includes("main")) mult = 1.05;
        else if (k.includes("cool")) mult = 1.35;

        const swim = (dist / 100) * paceSecPer100 * mult;

        const rest = computeRestSecondsFromBody(body);
        return swim + rest;
      }

      function renderCards(payload, workoutText) {
        // Expose globally for gesture editing system
        window.renderCards = renderCards;
        
        // Clear reroll counts for fresh workout generation
        rerollCountMap.clear();
        
        const parts = splitWorkout(workoutText);
        const setLines = parts.setLines || [];
        const footerLines = parts.footerLines || [];

        if (!setLines.length) {
          cards.style.display = "none";
          return false;
        }

        const sections = [];
        for (const line of setLines) {
          const parsed = parseSetLine(line);
          const labelCanon = canonicalizeLabel(parsed.label);

          if (labelCanon) {
            sections.push({ label: labelCanon, bodies: [parsed.body] });
          } else if (sections.length) {
            sections[sections.length - 1].bodies.push(parsed.body);
          } else {
            sections.push({ label: null, bodies: [parsed.body] });
          }
        }

        const paceSec = parsePaceToSecondsPer100(payload.thresholdPace || "");

        const html = [];
        html.push('<div style="display:flex; flex-direction:column; gap:10px;">');

        let idx = 0;

        for (const s of sections) {
          idx += 1;

          const label = s.label ? s.label : ("Set " + idx);
          const body = s.bodies.filter(Boolean).join("\\n");

          const setDist = computeSetDistanceFromBody(body);
          const restDisplay = extractRestDisplay(body);

          const estSec = estimateSwimSeconds(body, paceSec, label);
          
          // Get unit for display
          const unitShort = unitShortFromPayload(payload);

          const effortLevel = getEffortLevel(label, body);
          const variantSeed = idx * 7 + body.length;
          const zoneSpan = getZoneSpan(label, body, variantSeed);
          const gradientStyle = zoneSpan ? gradientStyleForZones(zoneSpan, label, body, variantSeed) : null;
          
          let boxStyle;
          let textColor = '#111';
          const dropShadow = "0 6px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.25)";
          
          if (gradientStyle) {
            // Gradient cards: full box color + drop shadow (no left bar)
            boxStyle = "background:" + gradientStyle.background + "; border:none; box-shadow:" + dropShadow + ";";
            textColor = gradientStyle.textColor || '#111';
          } else {
            // Solid color cards with drop shadow - use idx as variant seed for gradient variety
            boxStyle = colorStyleForEffort(effortLevel, idx) + " box-shadow:" + dropShadow + ";";
            // White text only on full red (fullgas)
            if (effortLevel === 'fullgas') {
              textColor = '#fff';
            }
          }
          
          html.push('<div data-effort="' + effortLevel + '" data-index="' + (idx - 1) + '" style="' + boxStyle + ' border-radius:12px; padding:12px;">');

          const subTextColor = textColor === '#fff' ? '#eee' : '#666';
          const distColor = textColor === '#fff' ? '#99ccff' : '#0055aa';
          const restColor = textColor === '#fff' ? '#ffcccc' : '#c41e3a';
          const bodyClean = stripRestFromBody(body);

          // Main layout: left column (title + detail) | right column (dolphin + metres)
          html.push('<div class="setHeaderRow">');
          
          // Left column: title and detail lines
          html.push('<div style="flex:1; min-width:0;">');
          html.push('<div style="font-weight:700; color:' + textColor + '; margin-bottom:6px;">' + safeHtml(label) + '</div>');
          html.push('<div data-set-body="' + safeHtml(String(idx)) + '" data-original-body="' + safeHtml(body) + '" style="white-space:pre-wrap; line-height:1.35; font-weight:600; color:' + textColor + ';">' + safeHtml(bodyClean) + "</div>");
          if (restDisplay) {
            html.push('<div style="color:' + restColor + '; font-weight:600; font-size:14px; margin-top:4px;">' + safeHtml(restDisplay) + "</div>");
          }
          if (Number.isFinite(estSec)) {
            html.push('<div style="font-size:12px; color:' + subTextColor + '; margin-top:4px;">Est: ' + fmtMmSs(estSec) + "</div>");
          }
          html.push("</div>");
          
          // Right column: dolphin aligned with title, metres aligned with detail
          html.push('<div class="setRightCol">');
          html.push(
            '<button type="button" data-reroll-set="' +
              safeHtml(String(idx)) +
              '" style="padding:0; border-radius:8px; border:none; background:transparent; cursor:pointer; line-height:1;" title="Reroll this set">' +
              '<span class="reroll-dolphin setDolphin"><img class="dolphinIcon setDolphinSpinTarget" src="/assets/dolphins/dolphin-base.png" alt=""></span>' +
            "</button>"
          );
          if (Number.isFinite(setDist)) {
            html.push('<div class="setMeters" style="font-size:14px; white-space:nowrap; color:' + distColor + ';">' + String(setDist) + unitShort + "</div>");
          }
          html.push("</div>");
          
          html.push("</div>");

          html.push("</div>");
        }

        html.push("</div>");

        cards.innerHTML = html.join("");
        cards.style.display = "block";

        // Setup gesture editing for the workout
        setupGestureEditing(sections);

        const rerollButtons = cards.querySelectorAll("button[data-reroll-set]");
        for (const btn of rerollButtons) {
          // Prevent pointer/mouse events from triggering card drag
          btn.addEventListener("pointerdown", (e) => e.stopPropagation());
          btn.addEventListener("mousedown", (e) => e.stopPropagation());
          btn.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });
          
          btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            e.preventDefault();
            const setIndex = Number(btn.getAttribute("data-reroll-set"));
            const bodyEl = cards.querySelector('[data-set-body="' + String(setIndex) + '"]');
            if (!bodyEl) return;

            // Use original body (with rest) for avoidText matching, display body for distance calc
            const originalBody = bodyEl.getAttribute("data-original-body") || "";
            const displayBody = bodyEl.textContent || "";
            const currentDist = computeSetDistanceFromBody(displayBody);

            if (!Number.isFinite(currentDist)) {
              renderError("Cannot reroll this set", ["Set distance could not be parsed. Ensure it contains NxD segments like 8x50, 4x100, or a single distance like 600."]);
              return;
            }

            // Increment reroll counter using persistent Map (survives innerHTML replacement)
            const prevCount = rerollCountMap.get(setIndex) || 0;
            const rerollCount = prevCount + 1;
            rerollCountMap.set(setIndex, rerollCount);

            if (btn.dataset.busy === "1") return;
            btn.dataset.busy = "1";
            btn.blur();
            const spinTarget = btn.querySelector('.setDolphinSpinTarget');
            if (spinTarget) {
              spinTarget.classList.add('spinning');
            }

            try {
              const res = await fetch("/reroll-set", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  poolLength: payload.poolLength,
                  poolLengthUnit: payload.poolLengthUnit,
                  customPoolLength: payload.customPoolLength,
                  thresholdPace: payload.thresholdPace || "",
                  focus: payload.focus || "allround",
                  restPref: payload.restPref || "balanced",
                  includeKick: !!payload.includeKick,
                  includePull: !!payload.includePull,
                  equip_fins: !!payload.equip_fins,
                  equip_paddles: !!payload.equip_paddles,
                  stroke_freestyle: !!payload.stroke_freestyle,
                  stroke_backstroke: !!payload.stroke_backstroke,
                  stroke_breaststroke: !!payload.stroke_breaststroke,
                  stroke_butterfly: !!payload.stroke_butterfly,
                  label: (sections[setIndex - 1] && sections[setIndex - 1].label) ? sections[setIndex - 1].label : null,
                  targetDistance: currentDist,
                  avoidText: originalBody,
                  rerollCount: rerollCount
                }),
              });

              const data = await res.json().catch(() => null);
              if (!res.ok || !data || data.ok !== true) {
                // Reroll must never show a scary failure box in v1.
                // Provide a guaranteed visible fallback: cycle the effort colour.
                console.warn("Reroll failed:", data && data.error ? data.error : ("HTTP " + res.status));
                cycleCardEffortFallback(bodyEl);
                return;
              }

              const nextBody = String(data.setBody || "").trim();
              if (!nextBody) {
                // Silent fallback for empty set
                console.warn("Reroll returned empty set");
                cycleCardEffortFallback(bodyEl);
                return;
              }

              // Strip rest from display and update rest column
              const nextBodyClean = stripRestFromBody(nextBody);
              const nextRest = extractRestDisplay(nextBody);
              bodyEl.textContent = nextBodyClean;
              bodyEl.setAttribute("data-original-body", nextBody);

              // Update card color based on new effort level
              const cardContainer = bodyEl.closest('[data-effort]');
              if (cardContainer) {
                const label = sections[setIndex - 1] && sections[setIndex - 1].label ? sections[setIndex - 1].label : "";
                const newEffort = getEffortLevel(label, nextBody);
                cardContainer.setAttribute('data-effort', newEffort);
                // Use Date.now() for true randomness - ensures different styling each reroll
                const nowMs = Date.now();
                const newVariantSeed = (nowMs ^ (rerollCount * 7919) ^ nextBody.length) >>> 0;
                const newZoneSpan = getZoneSpan(label, nextBody, newVariantSeed);
                const newGradientStyle = newZoneSpan ? gradientStyleForZones(newZoneSpan, label, nextBody, newVariantSeed) : null;
                let newStyle;
                let newTextColor = '#111';
                const dropShadow = "0 6px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.25)";
                
                if (newGradientStyle) {
                  newStyle = "background:" + newGradientStyle.background + "; border:none; box-shadow:" + dropShadow + ";";
                  newTextColor = newGradientStyle.textColor || '#111';
                } else {
                  // Use nowMs for true randomness on solid color variant
                  newStyle = colorStyleForEffort(newEffort, nowMs) + " box-shadow:" + dropShadow + ";";
                  // White text only on full red (fullgas)
                  if (newEffort === 'fullgas') {
                    newTextColor = '#fff';
                  }
                }
                cardContainer.style.cssText = newStyle + " border-radius:12px; padding:12px;";
                
                // Update text colors for body and other elements
                bodyEl.style.color = newTextColor;
                const labelEl = cardContainer.querySelector('div[style*="font-weight:700"]');
                if (labelEl) labelEl.style.color = newTextColor;
                
                // Update rest color
                const restEl = bodyEl.nextElementSibling;
                const restColor = newTextColor === '#fff' ? '#ffcccc' : '#c41e3a';
                if (restEl) {
                  restEl.style.color = restColor;
                  if (nextRest) {
                    restEl.textContent = nextRest;
                    restEl.style.display = "";
                  } else {
                    restEl.textContent = "";
                  }
                }
                
                // Update distance color - always blue (royal blue for light, light blue for dark)
                const distanceContainer = restEl ? restEl.nextElementSibling : null;
                if (distanceContainer) {
                  const distEl = distanceContainer.querySelector('div:first-child');
                  const estEl = distanceContainer.querySelector('div:last-child');
                  const distColor = newTextColor === '#fff' ? '#99ccff' : '#0055aa';
                  if (distEl) distEl.style.color = distColor;
                  if (estEl && estEl !== distEl) estEl.style.color = newTextColor === '#fff' ? '#eee' : '#666';
                }
              } else {
                // Fallback: just update rest column
                const restEl = bodyEl.nextElementSibling;
                if (restEl) {
                  if (nextRest) {
                    restEl.textContent = nextRest;
                    restEl.style.display = "";
                  } else {
                    restEl.textContent = "";
                  }
                }
              }
            } catch (e) {
              renderError("Reroll failed", [String(e && e.message ? e.message : e)]);
            } finally {
              // Wait for the full 1.25s spin animation to complete before removing class
              const spinTarget = btn.querySelector('.setDolphinSpinTarget');
              await new Promise(r => setTimeout(r, 1250));
              btn.dataset.busy = "0";
              if (spinTarget) {
                spinTarget.classList.remove('spinning');
              }
            }
          });
        }

        renderFooterTotalsAndMeta(footerLines);

        return true;
      }
  `;
  const HOME_JS_RENDER_GLUE = `
      // Dolphin animation stabilisation
      // - single helper path for all generator dolphins
      // - cancels overlapping timers
      // - forces CSS animation restart
      // - tokenises runs to prevent overlap
      let __dolphinAnimToken = 0;
      let __dolphinAnimTimers = [];

      function __clearDolphinAnimTimers() {
        for (const t of __dolphinAnimTimers) clearTimeout(t);
        __dolphinAnimTimers = [];
      }

      function __forceRestartSpin(el) {
        if (!el) return;
        el.classList.remove("dolphinSpin");
        // Force reflow so the CSS animation restarts reliably
        void el.offsetWidth;
        el.classList.add("dolphinSpin");
      }

      function dolphinAnimBegin(mainEl, extraEls, activeBtn) {
        __dolphinAnimToken += 1;
        const token = __dolphinAnimToken;

        __clearDolphinAnimTimers();

        const all = [mainEl].concat(Array.isArray(extraEls) ? extraEls : []).filter(Boolean);

        // Ensure baseline state
        for (const el of all) {
          if (!el.innerHTML || !String(el.innerHTML).trim()) el.innerHTML = '<img class="dolphinIcon" src="/assets/dolphins/dolphin-base.png" alt="">';
          el.dataset.spinStartedAt = String(Date.now());
          __forceRestartSpin(el);
        }

        if (activeBtn) activeBtn.classList.add("active");
        return token;
      }

      function dolphinAnimFinish(mainEl, extraEls, activeBtn, onSplashShown) {
        const token = __dolphinAnimToken;
        const all = [mainEl].concat(Array.isArray(extraEls) ? extraEls : []).filter(Boolean);

        const SPIN_MS = 800;           // one full loop (sped up from 1000)
        const FADE_MS = 200;           // cross-fade chunk
        const SPLASH_HOLD_MS = 1000;   // keep splash visible
        const IDLE_FADEIN_MS = 200;    // dolphin fade back in

        const started = Number(mainEl && mainEl.dataset ? (mainEl.dataset.spinStartedAt || "0") : "0");
        const elapsed = started ? (Date.now() - started) : SPIN_MS;
        const wait = Math.max(0, SPIN_MS - elapsed);

        __clearDolphinAnimTimers();

        __dolphinAnimTimers.push(setTimeout(() => {
          if (token !== __dolphinAnimToken) return;

          // Stop spinning
          for (const el of all) el.classList.remove("dolphinSpin");

          // Crossfade: dolphin fades out AND splash fades in simultaneously
          for (const el of all) {
            // Create splash element with fixed angle class
            const splashSpan = document.createElement("span");
            splashSpan.className = "splashFixed";
            splashSpan.textContent = "💦";
            splashSpan.style.position = "absolute";
            splashSpan.style.top = "50%";
            splashSpan.style.left = "50%";
            splashSpan.style.translate = "-50% -50%";
            splashSpan.style.fontSize = "inherit";
            splashSpan.style.opacity = "0";
            splashSpan.style.transition = "opacity " + FADE_MS + "ms ease";
            
            // Position container relatively if needed
            if (getComputedStyle(el).position === "static") {
              el.style.position = "relative";
            }
            
            // Start dolphin fade out
            const dolphinImg = el.querySelector("img");
            if (dolphinImg) {
              dolphinImg.style.transition = "opacity " + FADE_MS + "ms ease";
              dolphinImg.style.opacity = "0";
            }
            
            // Insert splash and fade in at same time
            el.appendChild(splashSpan);
            void splashSpan.offsetWidth;
            splashSpan.style.opacity = "1";
          }

          // Trigger scroll/reveal callback after splash is clearly visible (150ms delay)
          __dolphinAnimTimers.push(setTimeout(() => {
            if (typeof onSplashShown === "function") {
              try { onSplashShown(); } catch (e) { console.error("onSplashShown error:", e); }
            }
          }, FADE_MS + 150));

          // Hold splash, then fade out and reset to idle dolphin
          __dolphinAnimTimers.push(setTimeout(() => {
            if (token !== __dolphinAnimToken) return;

            // Fade out splash
            for (const el of all) {
              const splash = el.querySelector(".splashFixed");
              if (splash) {
                splash.style.transition = "opacity " + FADE_MS + "ms ease";
                splash.style.opacity = "0";
              }
            }

            __dolphinAnimTimers.push(setTimeout(() => {
              if (token !== __dolphinAnimToken) return;

              for (let i = 0; i < all.length; i++) {
                const el = all[i];
                const isMain = (i === 0);
                const imgClass = isMain ? "dolphinIcon dolphinIcon--generate" : "dolphinIcon";
                // Remove splash and restore dolphin
                const splash = el.querySelector(".splashFixed");
                if (splash) splash.remove();
                const oldImg = el.querySelector("img");
                if (oldImg) oldImg.remove();
                
                const newImg = document.createElement("img");
                newImg.className = imgClass;
                newImg.src = "/assets/dolphins/dolphin-base.png";
                newImg.alt = "";
                newImg.style.opacity = "0";
                newImg.style.transition = "opacity " + IDLE_FADEIN_MS + "ms ease";
                el.appendChild(newImg);
                void newImg.offsetWidth;
                newImg.style.opacity = "1";
              }

              // Explicit final reset after dolphin fade-in completes
              __dolphinAnimTimers.push(setTimeout(() => {
                if (token !== __dolphinAnimToken) return;
                for (const el of all) {
                  el.style.position = "";
                  el.style.display = "";
                  el.style.opacity = "1";
                  el.style.transform = "";
                  el.style.transition = "";
                  el.classList.remove("animating");
                }
                if (activeBtn) activeBtn.classList.remove("active");
              }, IDLE_FADEIN_MS));
            }, FADE_MS));
          }, SPLASH_HOLD_MS));
        }, wait));
      }

      function renderAll(payload, workoutText) {
        captureSummary(payload, workoutText);
        const ok = renderCards(payload, workoutText);
        return ok;
      }
  `;
  const HOME_JS_RENDER = HOME_JS_RENDER_CORE + HOME_JS_RENDER_CARDS + HOME_JS_RENDER_GLUE;
  const HOME_JS_EVENTS = `
      function showToast(msg) {
        const toast = document.getElementById("toastContainer");
        if (!toast) return;
        toast.textContent = msg;
        toast.style.opacity = "1";
        setTimeout(() => { toast.style.opacity = "0"; }, 2500);
      }

      let isUILocked = false;
      let lastUnlockTime = 0;
      const lockBtn = document.getElementById("lockBtn");
      let lockTimer;

      function handleUnlockStart(e) {
        if (!isUILocked) return;
        if (e.type === 'touchstart') e.preventDefault();
        
        showToast("Hold for 2 seconds to unlock...");
        lockBtn.style.transform = "scale(1.2)";

        lockTimer = setTimeout(() => {
          isUILocked = false;
          lastUnlockTime = Date.now();
          lockBtn.style.color = "#ffd700";
          lockBtn.textContent = "\\u{1F513}";
          lockBtn.style.transform = "scaleX(-1) scale(1)";
          showToast("Unlocked!");
          if (navigator.vibrate) navigator.vibrate(50);
        }, 2000);
      }

      function handleUnlockEnd(e) {
        clearTimeout(lockTimer);
        if (isUILocked && lockBtn) {
          lockBtn.style.transform = "scale(1)";
        }
      }

      lockBtn?.addEventListener("click", (e) => {
        if (Date.now() - lastUnlockTime < 500) return;

        if (!isUILocked) {
          isUILocked = true;
          lockBtn.style.color = "#bdc3c7";
          lockBtn.style.transform = "scale(1)";
          lockBtn.textContent = "\\u{1F512}";
          showToast("Screen Locked");
          if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
        }
      });

      lockBtn?.addEventListener("touchstart", handleUnlockStart, { passive: false });
      lockBtn?.addEventListener("touchend", handleUnlockEnd);
      lockBtn?.addEventListener("mousedown", handleUnlockStart);
      lockBtn?.addEventListener("mouseup", handleUnlockEnd);
      lockBtn?.addEventListener("mouseleave", handleUnlockEnd);

      function checkLock() { return isUILocked; }

      function setActivePool(poolValue, skipSave) {
        poolHidden.value = poolValue;

        const isCustom = poolValue === "custom";

        if (isCustom) {
          advancedWrap.style.display = "block";
          if (advancedChip) {
            advancedChip.innerHTML = "▼ Advanced options";
            advancedChip.classList.add("whiteChipActive");
          }
        } else {
          customLen.value = "";
          customUnit.value = "meters";
        }

        const btns = poolButtons.querySelectorAll("button[data-pool]");
        btns.forEach(btn => {
          if (btn.getAttribute("data-pool") === poolValue) {
            btn.classList.add("selected");
            btn.classList.add("active");
          } else {
            btn.classList.remove("selected");
            btn.classList.remove("active");
          }
        });
        if (!skipSave) saveUserSettings();
      }

      poolButtons.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-pool]");
        if (!btn) return;
        setActivePool(btn.getAttribute("data-pool"));
      });

      distanceSlider.addEventListener("input", (e) => {
        setDistance(e.target.value);
      });

      // Track last selected pool button for reversion
      let lastPoolBtn = "25m";

      // Custom pool length input: auto-select custom mode when user types a value
      customLen.addEventListener("input", () => {
        const val = customLen.value.trim();
        if (val && !isNaN(Number(val)) && Number(val) > 0) {
          // Valid number entered: switch to custom pool mode
          poolHidden.value = "custom";
          // Clear active class from tier buttons
          for (const btn of poolButtons.querySelectorAll("button[data-pool]")) {
            btn.classList.remove("active");
          }
          // Expand advanced options if not already open
          if (advancedWrap.style.display === "none") {
            advancedWrap.style.display = "block";
            if (advancedChip) {
              advancedChip.innerHTML = "▼ Advanced options";
              advancedChip.classList.add("whiteChipActive");
            }
          }
        } else {
          // Cleared or invalid: revert to last selected pool button
          // This restores both the hidden value and button active state
          setActivePool(lastPoolBtn);
        }
      });

      // Update lastPoolBtn when user clicks a pool button (capture phase to run before setActivePool)
      poolButtons.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-pool]");
        if (btn) {
          lastPoolBtn = btn.getAttribute("data-pool");
        }
      }, true);

      if (toggleAdvanced) {
        toggleAdvanced.addEventListener("click", () => {
          const open = advancedWrap.style.display !== "none";
          if (open) {
            advancedWrap.style.display = "none";
            if (advancedChip) {
              advancedChip.innerHTML = "▶ Advanced options";
              advancedChip.classList.remove("whiteChipActive");
            }
          } else {
            advancedWrap.style.display = "block";
            if (advancedChip) {
              advancedChip.innerHTML = "▼ Advanced options";
              advancedChip.classList.add("whiteChipActive");
            }
          }
        });
      }

      copyBtn.addEventListener("click", async () => {
        const text = copyBtn.dataset.copyText || "";
        if (!text) return;

        try {
          await navigator.clipboard.writeText(text);
          statusPill.textContent = "Copied.";
          setTimeout(() => {
            if (statusPill.textContent === "Copied.") statusPill.innerHTML = "";
          }, 1200);
        } catch {
          statusPill.textContent = "Copy failed.";
          setTimeout(() => {
            if (statusPill.textContent === "Copy failed.") statusPill.innerHTML = "";
          }, 1200);
        }
      });

      function formToPayload() {
        const fd = new FormData(form);
        const payload = Object.fromEntries(fd.entries());

        // Normalize checkboxes (present => "on")
        const boolNames = [
          "stroke_freestyle",
          "stroke_backstroke",
          "stroke_breaststroke",
          "stroke_butterfly",
          "includeKick",
          "includePull",
          "equip_fins",
          "equip_paddles"
        ];
        for (const n of boolNames) payload[n] = payload[n] === "on";

        return payload;
      }

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // STEP 0: Check if there's an existing workout to fade out
        const hasExistingWorkout = cards.innerHTML.trim().length > 0 && cards.style.display !== "none";
        const nameDisplay = document.getElementById("workoutNameDisplay");
        
        if (hasExistingWorkout) {
          // Store current height to prevent layout jump
          const currentHeight = cards.offsetHeight;
          cards.style.minHeight = currentHeight + "px";
          
          // Fade out existing workout and title
          cards.classList.add("workout-fade-out");
          if (nameDisplay && nameDisplay.style.display !== "none") {
            nameDisplay.classList.add("workout-fade-out");
          }
          
          // Wait for fade-out to complete (0.7s animation)
          await new Promise(r => setTimeout(r, 700));
          
          // Remove fade-out class and clear
          cards.classList.remove("workout-fade-out");
          if (nameDisplay) nameDisplay.classList.remove("workout-fade-out");
        }
        
        clearUI();
        
        // Reset min-height after clearing
        cards.style.minHeight = "";
        // Dolphin animation (stabilised)
        const regenDolphin = document.getElementById("regenDolphin");
        dolphinAnimBegin(dolphinLoader, [regenDolphin], generateBtn);
        statusPill.textContent = "";

        const payload = formToPayload();
        const isCustom = payload.poolLength === "custom";
        if (isCustom) {
          if (!payload.customPoolLength) {
            dolphinAnimFinish(dolphinLoader, [regenDolphin], generateBtn);
            statusPill.textContent = "";
            renderError("Error", ["Enter a custom pool length."]);
            return;
          }
          payload.customPoolLength = Number(payload.customPoolLength);
        } else {
          delete payload.customPoolLength;
          payload.poolLengthUnit = "meters";
        }

        try {
          const lastFp = loadLastWorkoutFingerprint();

          const res = await fetch("/generate-workout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, lastWorkoutFp: lastFp })
          });

          let data = null;
          try {
            data = await res.json();
          } catch {
          }

          if (!res.ok) {
            dolphinAnimFinish(dolphinLoader, [regenDolphin], generateBtn);
            statusPill.textContent = "";
            const msg = (data && (data.error || data.message)) ? (data.error || data.message) : ("HTTP " + res.status);
            renderError("Request failed", [msg].filter(Boolean));
            return;
          }

          if (!data || data.ok !== true) {
            dolphinAnimFinish(dolphinLoader, [regenDolphin], generateBtn);
            statusPill.textContent = "";
            const msg = data && data.error ? data.error : "Unknown error.";
            renderError("Generation failed", [msg].filter(Boolean));
            return;
          }

          const workoutText = String(data.workoutText || "").trim();
          const workoutName = String(data.workoutName || "").trim();

          if (!workoutText) {
            dolphinAnimFinish(dolphinLoader, [regenDolphin], generateBtn);
            statusPill.textContent = "";
            renderError("No workout returned", ["workoutText was empty."]);
            return;
          }
          statusPill.textContent = "";
          // STEP 1: Setup title and cards for fade-in (both invisible initially)
          const nameDisplayEl = document.getElementById("workoutNameDisplay");
          const nameText = document.getElementById("workoutNameText");
          
          // Prepare workout name (invisible initially)
          if (workoutName && nameDisplayEl && nameText) {
            nameText.textContent = workoutName;
            nameDisplayEl.style.opacity = "0";
            nameDisplayEl.style.transform = "translateY(16px)";
            nameDisplayEl.style.transition = "none";
            nameDisplayEl.style.display = "block";
          } else if (nameDisplayEl) {
            nameDisplayEl.style.display = "none";
          }

          // Prepare cards (invisible initially)
          cards.style.opacity = "0";
          cards.style.transform = "translateY(20px)";
          cards.style.transition = "none";

          const ok = renderAll(payload, workoutText);
          if (!ok) {
            raw.textContent = workoutText;
            raw.style.display = "block";
          }

          // Force reflow to reset animation state (critical for consistent behavior)
          void cards.offsetWidth;
          if (nameDisplayEl) void nameDisplayEl.offsetWidth;

          // Dolphin animation finish with callback when splash appears
          dolphinAnimFinish(dolphinLoader, [regenDolphin], generateBtn, () => {
            // STEP 2: Scroll to workout area when splash is visible
            const scrollTarget = nameDisplayEl && nameDisplayEl.style.display !== "none" ? nameDisplayEl : cards;
            if (scrollTarget) {
              const bannerHeight = 75;
              const elementPosition = scrollTarget.getBoundingClientRect().top + window.pageYOffset;
              const offsetPosition = elementPosition - bannerHeight - 20;

              window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
              });
            }

            // STEP 3: Fade in content after scroll starts
            setTimeout(() => {
              // Fade in title first (0.7s)
              if (nameDisplayEl && nameDisplayEl.style.display !== "none") {
                nameDisplayEl.style.transition = "opacity 0.7s ease-out, transform 0.7s ease-out";
                nameDisplayEl.style.opacity = "1";
                nameDisplayEl.style.transform = "translateY(0)";
              }
              
              // Fade in cards (0.7s)
              cards.style.transition = "opacity 0.7s ease-out, transform 0.7s ease-out";
              cards.style.opacity = "1";
              cards.style.transform = "translateY(0)";
              
              // Fade in Total and Summary at the same time
              if (totalBox.style.display !== "none") {
                void totalBox.offsetWidth;
                totalBox.style.transition = "opacity 0.7s ease-out, transform 0.7s ease-out";
                totalBox.style.opacity = "1";
                totalBox.style.transform = "translateY(0)";
              }
              if (footerBox.style.display !== "none") {
                void footerBox.offsetWidth;
                footerBox.style.transition = "opacity 0.7s ease-out, transform 0.7s ease-out";
                footerBox.style.opacity = "1";
                footerBox.style.transform = "translateY(0)";
              }
            }, 500);
          });

          const fp = fingerprintWorkoutText(workoutText);
          saveLastWorkoutFingerprint(fp);

          copyBtn.disabled = false;
          copyBtn.dataset.copyText = workoutText;
        } catch (err) {
            dolphinAnimFinish(dolphinLoader, [regenDolphin], generateBtn);
          statusPill.textContent = "";
          renderError("Network error", [String(err && err.message ? err.message : err)]);
        }
      });
      
      // Wire up regen button to trigger Generate
      const regenBtn = document.getElementById("regenBtn");
      if (regenBtn) {
        regenBtn.addEventListener("click", () => {
          const gen = document.getElementById("generateBtn");
          if (gen) gen.click();
        });
      }
      
      // Wire up workout title area regen and bg buttons
      document.getElementById("regenBtn2")?.addEventListener("click", () => {
        document.getElementById("generateBtn")?.click();
      });
      document.getElementById("generateBtn2")?.addEventListener("click", () => {
        document.getElementById("generateBtn")?.click();
      });
      document.getElementById("bgCycleBtn2")?.addEventListener("click", () => {
        document.getElementById("bgCycleBtn")?.click();
      });

      // Load saved settings on page load
      (function loadSavedSettings() {
        const savedSettings = loadUserSettings();
        if (savedSettings) {
          // Core parameters
          const distance = savedSettings.core?.distance || savedSettings.distance || 2000;
          const poolLength = savedSettings.core?.poolLength || savedSettings.poolLength || '25m';
          
          // Set distance (skipSave=true to avoid saving during load)
          setDistance(distance, true);
          
          // Set pool length (skipSave=true to avoid saving during load)
          setActivePool(poolLength, true);
        }
      })();

      // Initialize gesture editing system
      initGestureSystem();

      // Direct Navigation for Premium/Ads
      const adBanner = document.getElementById("adBanner");
      const removeAdsBtn = adBanner ? adBanner.querySelector("button") : null;

      if (removeAdsBtn) {
        removeAdsBtn.addEventListener("click", () => {
          window.location.href = '/premium';
        });
      }

      document.getElementById("showPremiumInfo")?.addEventListener("click", () => {
        window.location.href = '/premium';
      });

      const settings = loadUserSettings();
      const now = Date.now();
      if (settings && settings.premiumExpiry && settings.premiumExpiry > now) {
        if (adBanner) adBanner.style.display = "none";
      }
  `;

  const HOME_JS_GESTURES = `
      /* ===== 30/30 GESTURE EDITING FUNCTIONS - FIXED ===== */
      let currentGestureEditingIndex = -1;
      let currentWorkoutArray = [];

      function setupGestureEditing(workoutData) {
        // Store the workout data in the correct format
        currentWorkoutArray = workoutData.map((section, sectionIndex) => ({
          label: section.label || ('Set ' + (sectionIndex + 1)),
          bodies: section.bodies || [],
          bodyText: (section.bodies || []).join('\\n'),
          sectionIndex: sectionIndex
        }));
        
        // Attach gesture handlers after cards are rendered
        setTimeout(() => {
          const cards = document.querySelectorAll('[data-effort]');
          cards.forEach((card, index) => {
            // Make sure this card hasn't already been set up
            if (card.dataset.gestureSetup === 'true') return;
            
            // Add swipe hints if not already there
            if (!card.querySelector('.swipe-hint')) {
              const deleteHint = document.createElement('div');
              deleteHint.className = 'swipe-hint swipe-hint-delete';
              deleteHint.textContent = '🗑️';
              
              const deferHint = document.createElement('div');
              deferHint.className = 'swipe-hint swipe-hint-defer';
              deferHint.textContent = '↩️';
              
              card.appendChild(deleteHint);
              card.appendChild(deferHint);
            }
            
            setupCardGestures(card, index);
            card.dataset.gestureSetup = 'true';
          });
        }, 150);
      }
` + DRAG_DROP_JS + `
      function updateMathTotals() {
        // Calculate total distance from currentWorkoutArray
        let totalDistance = 0;
        
        if (!currentWorkoutArray || currentWorkoutArray.length === 0) {
          return;
        }
        
        currentWorkoutArray.forEach(section => {
          if (section.bodyText) {
            const firstLine = section.bodyText.split('\\n')[0];
            
            // Parse distance - handle formats like "200 easy" or "4x50 build"
            const setMatch = firstLine.match(/^(\\d+)x(\\d+)/); // "4x50"
            const singleMatch = firstLine.match(/^(\\d+)\\s/); // "200 easy"
            
            if (setMatch) {
              const reps = parseInt(setMatch[1]);
              const distance = parseInt(setMatch[2]);
              totalDistance += reps * distance;
            } else if (singleMatch) {
              totalDistance += parseInt(singleMatch[1]);
            }
          }
        });
        
        // Get pool info from stored summary
        const s = window.__swgSummary || { units: 'm', poolLen: 25 };
        const poolLen = s.poolLen || 25;
        const units = s.units || 'm';
        const totalLengths = Math.round(totalDistance / poolLen);
        
        // Update yellow Total box
        const totalText = document.getElementById('totalText');
        if (totalText) {
          totalText.textContent = 'Total ' + totalDistance + units;
        }
        
        // Update footer chips if they exist
        const footerBox = document.getElementById('footerBox');
        if (footerBox) {
          const chips = footerBox.querySelectorAll('.readChip');
          chips.forEach(chip => {
            const text = chip.textContent;
            if (text.startsWith('Total lengths:')) {
              chip.textContent = 'Total lengths: ' + totalLengths + ' lengths';
            }
          });
        }
      }

      function deleteWorkoutSet(index) {
        if (!currentWorkoutArray || !currentWorkoutArray[index]) return;
        
        console.log('Deleting set at index', index);
        
        // 1. Remove from array
        currentWorkoutArray.splice(index, 1);
        
        // 2. Remove from DOM directly (preserves footer)
        const cardsContainer = document.getElementById('cards');
        if (cardsContainer) {
          const setElements = Array.from(cardsContainer.querySelectorAll('[data-index]'));
          if (index < setElements.length) {
            setElements[index].remove();
            console.log('Removed set from DOM');
            
            // 3. Renumber remaining sets
            setElements.forEach((el, i) => {
              if (i > index) {
                el.setAttribute('data-index', i - 1);
              }
            });
          }
        }
        
        // 4. Update math totals
        updateMathTotals();
        
        // 5. Re-attach gesture listeners to remaining sets
        setTimeout(() => {
          if (typeof setupGestureEditing === 'function') {
            setupGestureEditing(currentWorkoutArray);
          }
        }, 50);
      }

      function moveSetToBottom(index) {
        if (!currentWorkoutArray || !currentWorkoutArray[index]) return;
        
        console.log('Moving set', index, 'to bottom');
        
        // 1. Get the set and move in array
        const [movedSet] = currentWorkoutArray.splice(index, 1);
        currentWorkoutArray.push(movedSet);
        
        // 2. Update DOM - remove from current position and append to container
        const cardsContainer = document.getElementById('cards');
        if (cardsContainer) {
          const setElements = Array.from(cardsContainer.querySelectorAll('[data-index]'));
          if (index < setElements.length) {
            const setToMove = setElements[index];
            // Find the wrapper container (first child with flex column)
            const wrapper = cardsContainer.querySelector('div[style*="flex-direction:column"]');
            if (wrapper) {
              wrapper.appendChild(setToMove);
            } else {
              cardsContainer.appendChild(setToMove);
            }
            console.log('Moved set in DOM');
            
            // 3. Renumber all sets to match new array order
            const newSetElements = cardsContainer.querySelectorAll('[data-index]');
            newSetElements.forEach((el, i) => {
              el.setAttribute('data-index', i);
            });
          }
        }
        
        // 4. Update math totals (total doesn't change but keeps consistency)
        updateMathTotals();
        
        // 5. Re-attach gesture listeners
        setTimeout(() => {
          if (typeof setupGestureEditing === 'function') {
            setupGestureEditing(currentWorkoutArray);
          }
        }, 50);
      }

      function rerenderWorkoutFromArray() {
        const container = document.getElementById('cards');
        if (!container) return;
        
        // Get all current cards
        const currentCards = Array.from(container.querySelectorAll('.workout-card'));
        
        // If we have the right number of cards already, just update them
        if (currentCards.length === currentWorkoutArray.length) {
          // Update existing cards instead of recreating them
          currentCards.forEach((card, index) => {
            const set = currentWorkoutArray[index];
            
            // Update data-index
            card.setAttribute('data-index', index);
            
            // Update content if needed (title, body, color)
            const titleEl = card.querySelector('.set-title');
            const bodyEl = card.querySelector('.set-body');
            
            if (titleEl && titleEl.textContent !== set.title) {
              titleEl.textContent = set.title;
            }
            
            if (bodyEl && bodyEl.textContent !== set.body) {
              bodyEl.textContent = set.body;
            }
            
            // Update color if needed
            const colorClass = set.color || 'blue';
            const currentColor = Array.from(card.classList).find(cls => cls.includes('-card'));
            if (currentColor && currentColor !== colorClass + '-card') {
              card.classList.remove(currentColor);
              card.classList.add(colorClass + '-card');
            }
          });
          
          // Just reorder the DOM elements to match the array order
          currentCards.sort((a, b) => {
            const indexA = parseInt(a.getAttribute('data-index'));
            const indexB = parseInt(b.getAttribute('data-index'));
            return indexA - indexB;
          });
          
          // Clear and re-append in correct order
          container.innerHTML = '';
          currentCards.forEach(card => {
            container.appendChild(card);
          });
          
        } else {
          // Different number of cards - need full re-render
          // 1. Convert currentWorkoutArray back to workout text
          let workoutTextLines = [];
          
          if (!currentWorkoutArray || currentWorkoutArray.length === 0) {
            console.error('No currentWorkoutArray to render');
            return;
          }
          
          currentWorkoutArray.forEach(section => {
            if (section.label && section.bodyText) {
              const bodyLines = section.bodyText.split('\\n');
              workoutTextLines.push(section.label + ': ' + bodyLines[0]);
              for (let i = 1; i < bodyLines.length; i++) {
                if (bodyLines[i].trim()) {
                  workoutTextLines.push(bodyLines[i]);
                }
              }
              workoutTextLines.push('');
            }
          });
          
          if (workoutTextLines[workoutTextLines.length - 1] === '') {
            workoutTextLines.pop();
          }
          
          // 2. Calculate TOTAL distance for footer
          let totalDistance = 0;
          currentWorkoutArray.forEach(section => {
            if (section.bodyText) {
              const firstLine = section.bodyText.split('\\n')[0];
              const setMatch = firstLine.match(/^(\\d+)x(\\d+)/);
              const singleMatch = firstLine.match(/^(\\d+)\\s/);
              
              if (setMatch) {
                const reps = parseInt(setMatch[1]);
                const distance = parseInt(setMatch[2]);
                totalDistance += reps * distance;
              } else if (singleMatch) {
                totalDistance += parseInt(singleMatch[1]);
              }
            }
          });
          
          // 3. Get pool info from stored summary
          const s = window.__swgSummary || { units: 'm', poolLen: 25, poolText: '25m' };
          const poolLen = s.poolLen || 25;
          const units = s.units || 'm';
          const totalLengths = Math.round(totalDistance / poolLen);
          
          // 4. Add PROPERLY FORMATTED footer lines that splitWorkout() recognizes
          workoutTextLines.push('');
          workoutTextLines.push('Total distance: ' + totalDistance + units);
          workoutTextLines.push('Total lengths: ' + totalLengths + ' lengths');
          
          const newWorkoutText = workoutTextLines.join('\\n');
          
          // 5. Get form state and trigger re-render
          const payload = window.formToPayload ? window.formToPayload() : {};
          
          // 6. Clear workout sets only
          container.innerHTML = '';
          
          // 7. Re-render with complete workout text
          if (window.renderCards) {
            window.renderCards(payload, newWorkoutText);
          }
        }
        
        // Update math totals
        updateMathTotals();
        
        // Re-attach gesture handlers
        setupGestureEditing();
      }

      function openGestureEditModal(index) {
        if (typeof IS_LITE_MODE !== 'undefined' && IS_LITE_MODE) return; 
        currentGestureEditingIndex = index;
        const set = currentWorkoutArray[index];
        
        if (!set) return;
        
        // Parse the set body to get current values
        const bodyText = set.bodyText || '';
        const label = set.label || '';
        
        // Try to extract distance and reps (e.g., "4x100 hard" -> 4 reps, 100 distance)
        const match = bodyText.match(/(\\d+)\\s*x\\s*(\\d+)/i);
        if (match) {
          document.getElementById('modalReps').value = parseInt(match[1]) || 4;
          document.getElementById('modalDistance').value = parseInt(match[2]) || 100;
        }
        
        // Preserve stroke/type from body text or label
        const strokeSelect = document.getElementById('modalStroke');
        if (strokeSelect) {
          // Check body text for stroke keywords
          const bodyLower = bodyText.toLowerCase();
          const labelLower = label.toLowerCase();
          
          if (bodyLower.includes('back') || labelLower.includes('back')) {
            strokeSelect.value = 'Back';
          } else if (bodyLower.includes('breast') || labelLower.includes('breast')) {
            strokeSelect.value = 'Breast';
          } else if (bodyLower.includes('fly') || bodyLower.includes('butter') || labelLower.includes('fly')) {
            strokeSelect.value = 'Fly';
          } else if (bodyLower.includes('kick') || labelLower.includes('kick')) {
            strokeSelect.value = 'Kick';
          } else if (bodyLower.includes('drill') || labelLower.includes('drill')) {
            strokeSelect.value = 'Drill';
          } else if (bodyLower.includes('pull') || labelLower.includes('pull')) {
            strokeSelect.value = 'Pull';
          } else if (bodyLower.includes('im') || bodyLower.includes('medley')) {
            strokeSelect.value = 'IM';
          } else {
            strokeSelect.value = 'Free';
          }
        }
        
        // Set effort button based on card color or label
        const card = document.querySelectorAll('[data-effort]')[index];
        if (card) {
          const effort = card.getAttribute('data-effort') || 'moderate';
          document.querySelectorAll('.gesture-effort-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.effort === effort);
          });
        }
        
        document.getElementById('gestureEditModal').classList.add('active');
      }

      function closeGestureEditModal() {
        document.getElementById('gestureEditModal').classList.remove('active');
        currentGestureEditingIndex = -1;
      }

      function saveGestureEdit() {
        if (currentGestureEditingIndex === -1) return;
        
        const distance = parseInt(document.getElementById('modalDistance').value) || 100;
        const reps = parseInt(document.getElementById('modalReps').value) || 4;
        const stroke = document.getElementById('modalStroke').value;
        const effortBtn = document.querySelector('.gesture-effort-btn.active');
        const effort = effortBtn ? effortBtn.dataset.effort : 'moderate';
        
        // Map effort to label for proper color rendering
        const effortToLabel = {
          'easy': 'Easy',
          'moderate': 'Moderate',
          'strong': 'Strong',
          'hard': 'Hard',
          'fullgas': 'Full Gas',
          'build': 'Build',
          'descend': 'Descend',
          'alternate': 'Main'
        };
        
        // Map effort to body text modifier for gradients/patterns
        const effortToBodyModifier = {
          'easy': 'easy',
          'moderate': '',
          'strong': 'strong',
          'hard': 'hard',
          'fullgas': 'sprint',
          'build': 'build to strong',
          'descend': 'descend 1-4',
          'alternate': 'odds easy, evens fast'
        };
        
        const modifier = effortToBodyModifier[effort] || '';
        const bodyText = reps + 'x' + distance + ' ' + stroke + (modifier ? ' ' + modifier : '');
        
        // Update the set in our array - both label and body
        currentWorkoutArray[currentGestureEditingIndex].label = effortToLabel[effort] || 'Moderate';
        currentWorkoutArray[currentGestureEditingIndex].bodyText = bodyText;
        
        console.log('Edit saved for set at index', currentGestureEditingIndex);
        
        // UPDATE THE SPECIFIC SET IN DOM (not full re-render)
        const cardsContainer = document.getElementById('cards');
        if (cardsContainer) {
          const setElement = cardsContainer.querySelector('[data-index="' + currentGestureEditingIndex + '"]');
          if (setElement) {
            
            // Update the main text (h4 element)
            const mainTextElement = setElement.querySelector('h4');
            if (mainTextElement) {
              mainTextElement.textContent = bodyText;
              console.log('Updated set text:', bodyText);
            }
            
            // Update the effort/color attribute and background
            setElement.dataset.effort = effort;
            
            // Update background color based on effort - use solid colors to match original generation
            const colorMap = {
              'easy': '#b9f0fd',
              'moderate': '#cfffc0',
              'strong': '#fcf3d5',
              'hard': '#ffc374',
              'fullgas': '#fe0000',
              'build': 'linear-gradient(to bottom, #b9f0fd 0%, #cfffc0 33%, #fcf3d5 66%, #ffc374 100%)',
              'descend': 'linear-gradient(to bottom, #ffc374 0%, #fcf3d5 33%, #cfffc0 66%, #b9f0fd 100%)',
              'alternate': 'repeating-linear-gradient(to bottom, #b9f0fd 0px, #b9f0fd 20px, #ffc374 20px, #ffc374 40px)'
            };
            setElement.style.background = colorMap[effort] || colorMap['moderate'];
            // Set text color for fullgas (white text on red)
            if (effort === 'fullgas') {
              setElement.style.color = '#fff';
            } else {
              setElement.style.color = '#000';
            }
          }
        }
        
        closeGestureEditModal();
        
        // Update math totals
        updateMathTotals();
        
        // Re-attach gesture listeners
        setTimeout(() => {
          if (typeof setupGestureEditing === 'function') {
            setupGestureEditing(currentWorkoutArray);
          }
        }, 50);
      }

      function initGestureSystem() {
        // Modal event listeners
        document.getElementById('closeGestureModal')?.addEventListener('click', closeGestureEditModal);
        document.getElementById('modalSaveBtn')?.addEventListener('click', saveGestureEdit);
        document.getElementById('modalDeleteBtn')?.addEventListener('click', function() {
          if (currentGestureEditingIndex !== -1) {
            deleteWorkoutSet(currentGestureEditingIndex);
            closeGestureEditModal();
          }
        });
        
        // Effort button selection
        document.querySelectorAll('.gesture-effort-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            document.querySelectorAll('.gesture-effort-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
          });
        });
        
        // Close modal on overlay click
        document.getElementById('gestureEditModal')?.addEventListener('click', function(e) {
          if (e.target === this) closeGestureEditModal();
        });
        
        // Expose formToPayload globally for rerenderWorkoutFromArray
        window.formToPayload = function() {
          const form = document.getElementById('genForm');
          if (!form) return {};
          const fd = new FormData(form);
          const payload = Object.fromEntries(fd.entries());
          
          // Normalize checkboxes
          const boolNames = [
            "stroke_freestyle",
            "stroke_backstroke",
            "stroke_breaststroke",
            "stroke_butterfly",
            "includeKick",
            "includePull",
            "equip_fins",
            "equip_paddles"
          ];
          for (const n of boolNames) payload[n] = payload[n] === "on";
          
          return payload;
        };
      }
      /* ===== END GESTURE FUNCTIONS ===== */
  `;

  const HOME_JS_CLOSE = `
    </script>
  `;
  const backgroundImages = [
    "/backgrounds/Page-002 (Large)_result.webp",
    "/backgrounds/Page-004 (Large)_result.webp",
    "/backgrounds/Page-006 (Large)_result.webp",
    "/backgrounds/Page-008 (Large)_result.webp",
    "/backgrounds/Page-010 (Large)_result.webp",
    "/backgrounds/Page-012 (Large)_result.webp",
    "/backgrounds/Page-014 (Large)_result.webp",
    "/backgrounds/Page-016 (Large)_result.webp",
    "/backgrounds/Page-018 (Large)_result.webp",
    "/backgrounds/Page-020 (Large)_result.webp",
    "/backgrounds/Page-022 (Large)_result.webp",
    "/backgrounds/Page-022(1) (Large)_result.webp",
    "/backgrounds/Page-024 (Large)_result.webp"
  ];

  const randomBg = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Swim Gen</title>
</head>
<body style="padding:5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(180deg, #40c9e0 0%, #2db8d4 100%); min-height:100vh;">
<div id="bgWrap">
  <div id="bgA" class="bgLayer" style="background-image: url('${randomBg}');"></div>
  <div id="bgB" class="bgLayer"></div>
</div>
${HOME_HTML}
${HOME_JS_OPEN}
${HOME_JS_DOM}
${HOME_JS_HELPERS}
${HOME_JS_PARSERS}
${HOME_JS_RENDER}
${HOME_JS_EVENTS}
${HOME_JS_GESTURES}
${HOME_JS_CLOSE}
</body>
</html>`;

  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.send(fullHtml);
  });

app.get("/viewport-lab", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).send("Not found");
  }
  const VIEWPORT_LAB_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Swim Workout Generator - Viewport Lab</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body id="viewportLab">
  <a class="back" href="/">Back to Generator</a>
  <h1>Viewport Lab</h1>
  
  <!-- COLOR PICKER BOX -->
  <div style="background:yellow; border:4px solid red; padding:20px; margin:20px 0; border-radius:10px;">
    <h3 style="margin:0 0 10px 0; color:black;">COLOR PICKER - Click a box then use eyedropper</h3>
    <div style="display:flex; gap:15px; flex-wrap:wrap;">
      <div style="display:flex; align-items:center; gap:8px; background:#b9f0fd; padding:8px 12px; border-radius:6px;">
        <strong>Easy:</strong>
        <input type="color" id="pickEasy" value="#b9f0fd" style="width:40px; height:30px; cursor:pointer;">
        <span id="hexEasy" style="font-family:monospace;">#b9f0fd</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px; background:#cfffc0; padding:8px 12px; border-radius:6px;">
        <strong>Moderate:</strong>
        <input type="color" id="pickModerate" value="#cfffc0" style="width:40px; height:30px; cursor:pointer;">
        <span id="hexModerate" style="font-family:monospace;">#cfffc0</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px; background:#fcf3d5; padding:8px 12px; border-radius:6px;">
        <strong>Strong:</strong>
        <input type="color" id="pickStrong" value="#fcf3d5" style="width:40px; height:30px; cursor:pointer;">
        <span id="hexStrong" style="font-family:monospace;">#fcf3d5</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px; background:#ffc374; padding:8px 12px; border-radius:6px;">
        <strong>Hard:</strong>
        <input type="color" id="pickHard" value="#ffc374" style="width:40px; height:30px; cursor:pointer;">
        <span id="hexHard" style="font-family:monospace;">#ffc374</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px; background:#fe0000; padding:8px 12px; border-radius:6px; color:white;">
        <strong>Full Gas:</strong>
        <input type="color" id="pickFullgas" value="#fe0000" style="width:40px; height:30px; cursor:pointer;">
        <span id="hexFullgas" style="font-family:monospace;">#fe0000</span>
      </div>
    </div>
  </div>
  <!-- END COLOR PICKER -->

  <p>Test the Swim Workout Generator across multiple screen sizes. Use sliders to adjust widths. Drag frames to reorder.</p>

  <div id="colorPicker" style="display:none;">
    <div class="picker-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-weight:700; font-size:12px;">
      <span>Zone Colors</span>
      <button type="button" id="togglePicker" style="border:none; background:transparent; cursor:pointer; font-size:12px;">-</button>
    </div>
    <div class="picker-content">
      <div class="zone-row" style="display:flex; align-items:center; gap:6px; margin-bottom:5px; padding:4px 6px; border-radius:5px; background:#b9f0fd; border-left:3px solid #7ac8db;">
        <span class="zone-label" style="width:60px; font-weight:600; font-size:11px;">Easy</span>
        <input type="color" id="colorEasyBg" value="#b9f0fd" title="Background" style="width:26px; height:20px; border:1px solid #ccc; border-radius:3px; cursor:pointer; padding:0;" />
        <span class="hex-display" id="hexEasyBg" style="font-family:monospace; font-size:9px; color:#666; width:50px;">#b9f0fd</span>
      </div>
      <div class="zone-row" style="display:flex; align-items:center; gap:6px; margin-bottom:5px; padding:4px 6px; border-radius:5px; background:#cfffc0; border-left:3px solid #8fcc80;">
        <span class="zone-label" style="width:60px; font-weight:600; font-size:11px;">Moderate</span>
        <input type="color" id="colorModerateBg" value="#cfffc0" title="Background" style="width:26px; height:20px; border:1px solid #ccc; border-radius:3px; cursor:pointer; padding:0;" />
        <span class="hex-display" id="hexModerateBg" style="font-family:monospace; font-size:9px; color:#666; width:50px;">#cfffc0</span>
      </div>
      <div class="zone-row" style="display:flex; align-items:center; gap:6px; margin-bottom:5px; padding:4px 6px; border-radius:5px; background:#fcf3d5; border-left:3px solid #d4c9a0;">
        <span class="zone-label" style="width:60px; font-weight:600; font-size:11px;">Strong</span>
        <input type="color" id="colorStrongBg" value="#fcf3d5" title="Background" style="width:26px; height:20px; border:1px solid #ccc; border-radius:3px; cursor:pointer; padding:0;" />
        <span class="hex-display" id="hexStrongBg" style="font-family:monospace; font-size:9px; color:#666; width:50px;">#fcf3d5</span>
      </div>
      <div class="zone-row" style="display:flex; align-items:center; gap:6px; margin-bottom:5px; padding:4px 6px; border-radius:5px; background:#ffc374; border-left:3px solid #cc9a4a;">
        <span class="zone-label" style="width:60px; font-weight:600; font-size:11px;">Hard</span>
        <input type="color" id="colorHardBg" value="#ffc374" title="Background" style="width:26px; height:20px; border:1px solid #ccc; border-radius:3px; cursor:pointer; padding:0;" />
        <span class="hex-display" id="hexHardBg" style="font-family:monospace; font-size:9px; color:#666; width:50px;">#ffc374</span>
      </div>
      <div class="zone-row" style="display:flex; align-items:center; gap:6px; margin-bottom:5px; padding:4px 6px; border-radius:5px; background:#fe0000; border-left:3px solid #cc0000;">
        <span class="zone-label" style="width:60px; font-weight:600; font-size:11px; color:#fff;">Full Gas</span>
        <input type="color" id="colorFullgasBg" value="#fe0000" title="Background" style="width:26px; height:20px; border:1px solid #ccc; border-radius:3px; cursor:pointer; padding:0;" />
        <span class="hex-display" id="hexFullgasBg" style="font-family:monospace; font-size:9px; color:#fff; width:50px;">#fe0000</span>
      </div>
      <div style="margin-top:6px; font-size:9px; color:#666; line-height:1.2;">
        Click a color box, then use eyedropper to pick from your image.
      </div>
    </div>
  </div>

  <h2>Mobile (3)</h2>
  <div class="row" data-row="mobile">
    <div class="frame" draggable="true" data-demo style="--w: 320px; --h: 700px;">
      <div class="bar">
        <div class="meta"><span class="name">Small phone</span><span class="tag">portrait</span></div>
        <div class="controls">
          <input type="range" min="280" max="420" step="1" value="320" data-width />
          <span class="num"><span data-wout>320</span>px</span>
        </div>
      </div>
      <iframe src="/"></iframe>
    </div>

    <div class="frame" draggable="true" data-demo style="--w: 390px; --h: 700px;">
      <div class="bar">
        <div class="meta"><span class="name">iPhone 14/15</span><span class="tag">portrait</span></div>
        <div class="controls">
          <input type="range" min="360" max="430" step="1" value="390" data-width />
          <span class="num"><span data-wout>390</span>px</span>
        </div>
      </div>
      <iframe src="/"></iframe>
    </div>

    <div class="frame" draggable="true" data-demo style="--w: 430px; --h: 700px;">
      <div class="bar">
        <div class="meta"><span class="name">iPhone Plus/Max</span><span class="tag">portrait</span></div>
        <div class="controls">
          <input type="range" min="400" max="500" step="1" value="430" data-width />
          <span class="num"><span data-wout>430</span>px</span>
        </div>
      </div>
      <iframe src="/"></iframe>
    </div>
  </div>

  <h2>Tablet (2)</h2>
  <div class="row-pair" data-row="tablet">
    <div class="frame" draggable="true" data-demo style="--w: 768px; --h: 800px;">
      <div class="bar">
        <div class="meta"><span class="name">iPad Mini</span><span class="tag">portrait</span></div>
        <div class="controls">
          <input type="range" min="640" max="900" step="1" value="768" data-width />
          <span class="num"><span data-wout>768</span>px</span>
        </div>
      </div>
      <iframe src="/"></iframe>
    </div>

    <div class="frame" draggable="true" data-demo style="--w: 1024px; --h: 800px;">
      <div class="bar">
        <div class="meta"><span class="name">iPad Pro</span><span class="tag">landscape</span></div>
        <div class="controls">
          <input type="range" min="900" max="1200" step="1" value="1024" data-width />
          <span class="num"><span data-wout>1024</span>px</span>
        </div>
      </div>
      <iframe src="/"></iframe>
    </div>
  </div>

  <h2>Desktop (1)</h2>
  <div class="row-wide">
    <div class="frame" data-demo style="--w: 1366px; --h: 800px;">
      <div class="bar">
        <div class="meta"><span class="name">Laptop</span><span class="tag">1366px</span></div>
        <div class="controls">
          <input type="range" min="1200" max="1600" step="1" value="1366" data-width />
          <span class="num"><span data-wout>1366</span>px</span>
        </div>
      </div>
      <iframe src="/"></iframe>
    </div>
  </div>

  <script>
    for (const frame of document.querySelectorAll('[data-demo]')) {
      const range = frame.querySelector('[data-width]');
      const wout = frame.querySelector('[data-wout]');
      if (!range || !wout) continue;

      const apply = (v) => {
        frame.style.setProperty('--w', v + 'px');
        wout.textContent = v;
      };

      apply(range.value);
      range.addEventListener('input', (e) => apply(e.target.value));
    }

    let dragging = null;

    document.addEventListener('dragstart', (e) => {
      const frame = e.target.closest('.frame');
      const row = e.target.closest('.row, .row-pair');
      if (!frame || !row) return;
      dragging = frame;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'drag');
    });

    document.addEventListener('dragover', (e) => {
      const row = e.target.closest('.row, .row-pair');
      if (!row || !dragging) return;
      if (dragging.parentElement !== row) return;
      e.preventDefault();

      const over = e.target.closest('.frame');
      if (!over || over === dragging) return;

      const r = over.getBoundingClientRect();
      const before = (e.clientX - r.left) < (r.width / 2);
      row.insertBefore(dragging, before ? over : over.nextSibling);
    });

    document.addEventListener('dragend', () => {
      dragging = null;
    });

    // Color picker toggle
    const colorPicker = document.getElementById('colorPicker');
    const togglePicker = document.getElementById('togglePicker');
    togglePicker.addEventListener('click', () => {
      colorPicker.classList.toggle('collapsed');
      togglePicker.textContent = colorPicker.classList.contains('collapsed') ? '+' : '-';
    });

    // Make color picker draggable
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    colorPicker.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      isDragging = true;
      dragOffsetX = e.clientX - colorPicker.offsetLeft;
      dragOffsetY = e.clientY - colorPicker.offsetTop;
      colorPicker.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      colorPicker.style.left = (e.clientX - dragOffsetX) + 'px';
      colorPicker.style.top = (e.clientY - dragOffsetY) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      colorPicker.style.cursor = 'move';
    });

    // Color picker functionality - updates CSS vars in all iframes
    function setupColorInput(inputId, hexDisplayId, cssVarName) {
      const input = document.getElementById(inputId);
      const hexDisplay = document.getElementById(hexDisplayId);
      if (!input || !hexDisplay) return;

      input.addEventListener('input', () => {
        const val = input.value;
        hexDisplay.textContent = val;
        
        // Update the zone row preview
        const zoneRow = input.closest('.zone-row');
        if (zoneRow) {
          if (cssVarName.includes('-bg')) {
            zoneRow.style.background = val;
          } else if (cssVarName.includes('-bar')) {
            zoneRow.style.borderLeftColor = val;
          }
        }
        
        // Push to all iframes
        document.querySelectorAll('iframe').forEach(iframe => {
          try {
            if (iframe.contentDocument) {
              iframe.contentDocument.documentElement.style.setProperty(cssVarName, val);
            }
          } catch (e) {}
        });
      });
    }

    // Setup all color inputs (Zone names: easy, moderate, strong, hard, fullgas)
    setupColorInput('colorEasyBg', 'hexEasyBg', '--zone-easy-bg');
    setupColorInput('colorEasyBar', 'hexEasyBar', '--zone-easy-bar');

    // Simple hex display updaters for new color pickers
    ['Easy', 'Moderate', 'Strong', 'Hard', 'Fullgas'].forEach(zone => {
      const input = document.getElementById('pick' + zone);
      const hex = document.getElementById('hex' + zone);
      if (input && hex) {
        input.addEventListener('input', () => { hex.textContent = input.value; });
      }
    });
    setupColorInput('colorModerateBg', 'hexModerateBg', '--zone-moderate-bg');
    setupColorInput('colorModerateBar', 'hexModerateBar', '--zone-moderate-bar');
    setupColorInput('colorStrongBg', 'hexStrongBg', '--zone-strong-bg');
    setupColorInput('colorStrongBar', 'hexStrongBar', '--zone-strong-bar');
    setupColorInput('colorHardBg', 'hexHardBg', '--zone-hard-bg');
    setupColorInput('colorHardBar', 'hexHardBar', '--zone-hard-bar');
    setupColorInput('colorFullgasBg', 'hexFullgasBg', '--zone-fullgas-bg');
    setupColorInput('colorFullgasBar', 'hexFullgasBar', '--zone-fullgas-bar');

    // Draggable color picker
    (function enableDraggableColorPicker() {
      const picker = document.getElementById("colorPicker");
      if (!picker) return;
      const header = picker.querySelector(".picker-header");
      if (!header) return;

      // Restore saved position
      try {
        const saved = JSON.parse(localStorage.getItem("swg_picker_pos") || "null");
        if (saved && typeof saved.x === "number" && typeof saved.y === "number") {
          picker.style.left = saved.x + "px";
          picker.style.top = saved.y + "px";
          picker.style.right = "auto";
        }
      } catch {}

      let dragging = false;
      let startX = 0;
      let startY = 0;
      let originLeft = 0;
      let originTop = 0;

      header.addEventListener("mousedown", (e) => {
        dragging = true;
        const rect = picker.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        originLeft = rect.left;
        originTop = rect.top;

        picker.style.left = originLeft + "px";
        picker.style.top = originTop + "px";
        picker.style.right = "auto";

        e.preventDefault();
      });

      window.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const x = Math.max(8, originLeft + dx);
        const y = Math.max(8, originTop + dy);
        picker.style.left = x + "px";
        picker.style.top = y + "px";
      });

      window.addEventListener("mouseup", () => {
        if (!dragging) return;
        dragging = false;
        try {
          const rect = picker.getBoundingClientRect();
          localStorage.setItem("swg_picker_pos", JSON.stringify({ x: rect.left, y: rect.top }));
        } catch {}
      });
    })();
  </script>
</body>
</html>`;

  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.send(VIEWPORT_LAB_HTML);
});

// Test version route - serves test.html with stripped client JS
app.get("/test", (req, res) => {
  res.sendFile(__dirname + '/public/test.html');
});

app.get("/premium", (req, res) => {
  res.sendFile(__dirname + '/public/premium.html');
});

app.post("/reroll-set", (req, res) => {
  try {
    const body = req.body || {};

    const poolLength = body.poolLength;
    const poolLengthUnit = body.poolLengthUnit;
    const customPoolLength = body.customPoolLength;

    const isCustomPool = poolLength === "custom";

    const unitsShort = isCustomPool
      ? (poolLengthUnit === "yards" ? "yd" : "m")
      : (poolLength === "25yd" ? "yd" : "m");

    const poolLen = isCustomPool
      ? Number(customPoolLength)
      : (poolLength === "25m" ? 25 : poolLength === "50m" ? 50 : poolLength === "25yd" ? 25 : null);

    if (!poolLen || !Number.isFinite(poolLen) || poolLen <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid pool length." });
    }

    const targetDistance = Number(body.targetDistance);
    if (!Number.isFinite(targetDistance) || targetDistance <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid targetDistance." });
    }

    const labelRaw = typeof body.label === "string" && body.label.trim() ? body.label.trim() : "Main";
    const label = canonicalLabelServer(labelRaw);

    const opts = normalizeOptionsServer(body);

    const avoidText = typeof body.avoidText === "string" ? body.avoidText.trim() : "";

    // Use rerollCount to generate deterministically different seeds each click
    const rerollCount = Number(body.rerollCount) || 1;
    
    // Generate a replacement body with the same label and distance
    // Use rerollCount to cycle through effort levels, plus seed for variety within each level
    for (let i = 0; i < 10; i++) {
      // Combine rerollCount with iteration to guarantee different seed each attempt
      const seed = ((rerollCount * 7919) + (i * 9973) + Date.now()) >>> 0;
      const next = buildOneSetBodyShared({
        label,
        targetDistance,
        poolLen,
        unitsShort,
        opts,
        seed,
        rerollCount: rerollCount  // Pass stable rerollCount for effort level cycling (i only varies seed)
      });

      if (!next) continue;
      if (avoidText && next.trim() === avoidText.trim()) continue;

      return res.json({ ok: true, setBody: next });
    }

    return res.status(500).json({ ok: false, error: "Reroll failed to produce a replacement set." });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }

  function canonicalLabelServer(labelRaw) {
    const raw = String(labelRaw || "").trim();
    const key = raw.toLowerCase().replace(/\s+/g, " ").trim();
    const map = {
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
    return map[key] || raw;
  }

  function normalizeOptionsServer(payload) {
    // These may come as booleans already (client does it) but keep robust.
    const b = (v) => v === true || v === "true" || v === "on" || v === 1;

    const strokes = {
      freestyle: b(payload.stroke_freestyle),
      backstroke: b(payload.stroke_backstroke),
      breaststroke: b(payload.stroke_breaststroke),
      butterfly: b(payload.stroke_butterfly)
    };

    // Always ensure at least freestyle is available
    if (!strokes.freestyle && !strokes.backstroke && !strokes.breaststroke && !strokes.butterfly) {
      strokes.freestyle = true;
    }

    return {
      focus: typeof payload.focus === "string" ? payload.focus : "allround",
      restPref: typeof payload.restPref === "string" ? payload.restPref : "balanced",
      thresholdPace: typeof payload.thresholdPace === "string" ? payload.thresholdPace : "",
      includeKick: b(payload.includeKick),
      includePull: b(payload.includePull),
      fins: b(payload.equip_fins),
      paddles: b(payload.equip_paddles),
      strokes
    };
  }

  function pickStrokeForSet(label, opts, seed) {
    const allowed = [];
    if (opts.strokes.freestyle) allowed.push("freestyle");
    if (opts.strokes.backstroke) allowed.push("backstroke");
    if (opts.strokes.breaststroke) allowed.push("breaststroke");
    if (opts.strokes.butterfly) allowed.push("butterfly");

    if (!allowed.length) return "freestyle";

    // Bias by label - warm-up, main, and build should default to freestyle
    const k = String(label || "").toLowerCase();
    if (k.includes("warm") || k.includes("main") || k.includes("build") || k.includes("cool")) {
      if (allowed.includes("freestyle")) return "freestyle";
    }

    const idx = (Number(seed >>> 0) % allowed.length);
    return allowed[idx];
  }

  function restSecondsFor(label, repDist, opts) {
    if (!opts || !opts.allowRest) return 0;

    const k = String(label || "").toLowerCase();
    let base = 15;

    if (k.includes("warm")) base = 0;
    else if (k.includes("drill")) base = 20;
    else if (k.includes("kick")) base = 15;
    else if (k.includes("pull")) base = 15;
    else if (k.includes("build")) base = 15;
    else if (k.includes("main")) base = 20;
    else if (k.includes("cool")) base = 0;

    // Rep distance tweak
    if (repDist >= 200) base = Math.max(10, base - 5);
    if (repDist <= 50 && k.includes("main")) base = base + 10;

    // Rest preference
    const r = String(opts.restPref || "balanced");
    if (r === "short") base = Math.max(0, base - 5);
    if (r === "moderate") base = base + 0;
    if (r === "more") base = base + 10;

    return base;
  }

  function buildOneSetBodyServer({ label, targetDistance, poolLen, unitsShort, opts, seed }) {
    const base = poolLen;

    // Use a small library per set type, but force total distance exact.
    // We build segments and then adjust with an easy filler that remains a pool multiple.
    const k = String(label || "").toLowerCase();

    const stroke = pickStrokeForSet(label, opts, seed);
    const hasFins = !!opts.fins;
    const hasPaddles = !!opts.paddles;

    const isNonStandardPool = ![25, 50].includes(base);
    
    // Check if user provided threshold pace (for interval display)
    const hasThresholdPace = opts.thresholdPace && String(opts.thresholdPace).trim().length > 0;
    
    const makeLine = (reps, dist, text, restSec) => {
      const r = Number(reps);
      const d = Number(dist);
      const rest = Number(restSec);

      // Only show rest when threshold pace is provided (interval mode)
      let suffix = "";
      if (hasThresholdPace && Number.isFinite(rest) && rest > 0) {
        suffix = " rest " + String(rest) + "s";
      }

      const strokeText = (text || "").trim();
      
      // Add lap count for non-standard pools to help swimmers
      let lengthInfo = "";
      if (isNonStandardPool && d > 0 && base > 0 && d % base === 0) {
        const lengths = d / base;
        if (lengths > 1) {
          lengthInfo = " (" + lengths + " lengths)";
        }
      }
      
      return String(r) + "x" + String(d) + lengthInfo + " " + strokeText + suffix;
    };

    const lines = [];
    let remaining = targetDistance;

    if (remaining <= 0) return null;

    // Helper to add a segment and reduce remaining
    const add = (reps, dist, note, rest) => {
      const seg = reps * dist;
      if (seg <= 0) return false;
      if (seg > remaining) return false;
      lines.push(makeLine(reps, dist, note, rest));
      remaining -= seg;
      return true;
    };

    // Choose patterns
    if (k.includes("warm")) {
      // Warm-up varies 1-3 segments for variety - NO DRILL in warm-up (drill belongs in Drill section)
      const options = [
        // 3 segments: swim + build + kick
        () => {
          const d200 = snapToPoolMultiple(200, base);
          if (d200 > 0) add(1, d200, stroke + " easy", 0);
          const d50 = snapRepDist(50, base);
          if (d50 > 0) add(4, d50, stroke + " build", restSecondsFor("build", d50, opts));
          const d25 = snapRepDist(25, base);
          if (d25 > 0) add(4, d25, "kick easy", restSecondsFor("kick", d25, opts));
        },
        // 2 segments: swim + build
        () => {
          const d300 = snapToPoolMultiple(300, base);
          if (d300 > 0) add(1, d300, stroke + " easy", 0);
          const d50 = snapRepDist(50, base);
          if (d50 > 0) add(6, d50, stroke + " build", restSecondsFor("build", d50, opts));
        },
        // 3 segments: swim + kick + easy swim
        () => {
          const d100 = snapRepDist(100, base);
          if (d100 > 0) add(2, d100, stroke + " easy", 0);
          const d50 = snapRepDist(50, base);
          if (d50 > 0) add(4, d50, "kick easy", restSecondsFor("kick", d50, opts));
          if (d50 > 0) add(4, d50, stroke + " easy", 0);
        },
        // 1 segment: simple long swim (for short warm-ups)
        () => {
          const d400 = snapToPoolMultiple(400, base);
          if (d400 > 0 && remaining >= d400) add(1, d400, stroke + " easy", 0);
        },
        // 2 segments: broken swim
        () => {
          const d100 = snapRepDist(100, base);
          if (d100 > 0 && remaining >= d100 * 4) add(4, d100, stroke + " easy", restSecondsFor("warm", d100, opts));
          const d50 = snapRepDist(50, base);
          if (d50 > 0 && remaining >= d50 * 4) add(4, d50, stroke + " build", restSecondsFor("build", d50, opts));
        }
      ];

      options[seed % options.length]();

      // Fallback: if pattern didn't add anything, add a simple swim
      if (lines.length === 0 && remaining > 0) {
        const d100 = snapRepDist(100, base);
        const d50 = snapRepDist(50, base);
        if (d100 > 0 && remaining >= d100) {
          const reps = Math.min(4, Math.floor(remaining / d100));
          if (reps > 0) add(reps, d100, stroke + " easy", 0);
        }
        if (d50 > 0 && remaining >= d50 && lines.length === 0) {
          const reps = Math.min(6, Math.floor(remaining / d50));
          if (reps > 0) add(reps, d50, stroke + " easy", 0);
        }
      }

      // Fill remaining with easy swim in 100s or 50s, not weird singles.
      if (fillEasy() === null) return null;
      return lines.join("\n");
    }

    if (k.includes("build")) {
      const d50 = snapToPoolMultiple(50, base);
      const d100 = snapToPoolMultiple(100, base);
      const d75 = snapToPoolMultiple(75, base);

      const buildDescriptions = [
        stroke + " build",
        stroke + " descend 1-3",
        stroke + " descend 1-4",
        stroke + " descend 1-5",
        stroke + " negative split",
        stroke + " build to fast",
        stroke + " smooth to strong",
        stroke + " odds easy evens fast",
        stroke + " every 3rd fast"
      ];
      const desc = buildDescriptions[seed % buildDescriptions.length];
      const desc2 = buildDescriptions[(seed + 1) % buildDescriptions.length];

      // Variety of patterns based on seed
      const patternChoice = seed % 4;
      if (patternChoice === 0) {
        if (d50 > 0 && remaining >= d50 * 6) add(6, d50, desc, restSecondsFor("build", d50, opts));
        if (d100 > 0 && remaining >= d100 * 4) add(4, d100, desc2, restSecondsFor("build", d100, opts));
      } else if (patternChoice === 1) {
        if (d100 > 0 && remaining >= d100 * 4) add(4, d100, desc, restSecondsFor("build", d100, opts));
        if (d50 > 0 && remaining >= d50 * 4) add(4, d50, desc2, restSecondsFor("build", d50, opts));
      } else if (patternChoice === 2) {
        if (d75 > 0 && remaining >= d75 * 4) add(4, d75, desc, restSecondsFor("build", d75, opts));
        if (d50 > 0 && remaining >= d50 * 6) add(6, d50, desc2, restSecondsFor("build", d50, opts));
      } else {
        if (d50 > 0 && remaining >= d50 * 8) add(8, d50, desc, restSecondsFor("build", d50, opts));
      }

      if (fillEasy("build") === null) return null;
      return lines.join("\n");
    }

    if (k.includes("drill")) {
      const d50 = snapToPoolMultiple(50, base);
      const d25 = snapToPoolMultiple(25, base);
      const d75 = snapToPoolMultiple(75, base);

      // Named drill library from CardGym cards - always use these
      const namedDrills = [
        "Catch-up", "Fist drill", "Fingertip drag", "DPS",
        "Shark fin", "Zipper", "Scull", "Corkscrew",
        "Single arm", "Long dog", "Tarzan", "Head up",
        "Hip rotation", "Paddle scull", "Kickboard balance", "6-3-6"
      ];
      
      // Primary drill: always use named drills
      const desc1 = namedDrills[seed % namedDrills.length];
      const desc2 = namedDrills[(seed + 7) % namedDrills.length];

      // EVEN REPS ONLY: Round down to nearest even number
      const toEven = (n) => n - (n % 2);
      
      // Try to fill with reasonable reps based on what fits
      if (d50 > 0 && remaining >= d50 * 2) {
        const reps = toEven(Math.min(8, Math.floor(remaining / d50)));
        if (reps >= 2) add(reps, d50, desc1, restSecondsFor("drill", d50, opts));
      }
      if (d25 > 0 && remaining >= d25 * 4) {
        const reps = toEven(Math.min(12, Math.floor(remaining / d25)));
        if (reps >= 4) add(reps, d25, desc2, restSecondsFor("drill", d25, opts));
      }

      if (fillEasy("drill") === null) return null;
      return lines.join("\n");
    }

    if (k.includes("kick")) {
      const d50 = snapToPoolMultiple(50, base);
      const d75 = snapToPoolMultiple(75, base);
      const d100 = snapToPoolMultiple(100, base);
      const finNote = hasFins ? " with fins" : "";

      const kickDescriptions = [
        "kick steady", "kick choice", "kick fast", "kick build", "kick strong", "kick relaxed"
      ];
      const desc = kickDescriptions[seed % kickDescriptions.length] + finNote;

      // EVEN REPS ONLY: Round down to nearest even number
      const toEven = (n) => n - (n % 2);
      
      // Try to fill with reasonable reps based on what fits
      if (d100 > 0 && remaining >= d100 * 2) {
        const reps = toEven(Math.min(6, Math.floor(remaining / d100)));
        if (reps >= 2) add(reps, d100, desc, restSecondsFor("kick", d100, opts));
      }
      if (d75 > 0 && remaining >= d75 * 2) {
        const reps = toEven(Math.min(4, Math.floor(remaining / d75)));
        if (reps >= 2) add(reps, d75, kickDescriptions[(seed + 1) % kickDescriptions.length] + finNote, restSecondsFor("kick", d75, opts));
      }
      if (d50 > 0 && remaining >= d50 * 2) {
        const reps = toEven(Math.min(8, Math.floor(remaining / d50)));
        if (reps >= 2) add(reps, d50, kickDescriptions[(seed + 2) % kickDescriptions.length] + finNote, restSecondsFor("kick", d50, opts));
      }

      if (fillEasy("kick") === null) return null;
      return lines.join("\n");
    }

    if (k.includes("pull")) {
      const d50 = snapToPoolMultiple(50, base);
      const d100 = snapToPoolMultiple(100, base);
      const d150 = snapToPoolMultiple(150, base);
      const padNote = hasPaddles ? " with paddles" : "";

      const pullDescriptions = [
        "pull steady", "pull strong", "pull build", "pull descend", "pull smooth", "pull relaxed"
      ];
      const desc = pullDescriptions[seed % pullDescriptions.length] + padNote;

      // Try to fill with reasonable reps based on what fits
      if (d100 > 0 && remaining >= d100 * 2) {
        const reps = Math.min(6, Math.floor(remaining / d100));
        if (reps >= 2) add(reps, d100, desc, restSecondsFor("pull", d100, opts));
      }
      if (d50 > 0 && remaining >= d50 * 2) {
        const reps = Math.min(8, Math.floor(remaining / d50));
        if (reps >= 2) add(reps, d50, pullDescriptions[(seed + 1) % pullDescriptions.length] + padNote, restSecondsFor("pull", d50, opts));
      }

      if (fillEasy("pull") === null) return null;
      return lines.join("\n");
    }

    if (k.includes("cool")) {
      // Cool down should be simple and clean
      const d200 = snapToPoolMultiple(200, base);
      const d100 = snapToPoolMultiple(100, base);
      if (d200 > 0 && remaining >= d200) add(1, d200, stroke + " easy", 0);
      if (d100 > 0 && remaining >= d100) add(1, d100, "easy mixed", 0);
      if (fillEasy("cool") === null) return null;
      return lines.join("\n");
    }

    // Main (and Main 1/2)
    {
      const focus = String(opts.focus || "allround");

      const d50 = snapToPoolMultiple(50, base);
      const d100 = snapToPoolMultiple(100, base);
      const d200 = snapToPoolMultiple(200, base);
      const d25 = snapToPoolMultiple(25, base);

      if (focus === "sprint") {
        // Sprint focus: include full gas efforts
        if (d50 > 0 && remaining >= d50 * 8) add(8, d50, stroke + " fast build", restSecondsFor("main", d50, opts) + 10);
        if (d25 > 0 && remaining >= d25 * 6) add(6, d25, stroke + " max sprint", restSecondsFor("sprint", d25, opts) + 20);
        if (d100 > 0 && remaining >= d100 * 4) add(4, d100, stroke + " hard", restSecondsFor("main", d100, opts));
      } else if (focus === "threshold") {
        if (d100 > 0 && remaining >= d100 * 10) add(10, d100, stroke + " best average", restSecondsFor("main", d100, opts));
        if (d200 > 0 && remaining >= d200 * 4) add(4, d200, stroke + " hard hold pace", restSecondsFor("main", d200, opts));
      } else if (focus === "endurance") {
        if (d200 > 0 && remaining >= d200 * 6) add(6, d200, stroke + " moderate", restSecondsFor("main", d200, opts));
        if (d100 > 0 && remaining >= d100 * 8) add(8, d100, stroke + " smooth", restSecondsFor("main", d100, opts));
      } else if (focus === "technique") {
        if (d100 > 0 && remaining >= d100 * 8) add(8, d100, stroke + " perfect form", restSecondsFor("main", d100, opts));
        if (d50 > 0 && remaining >= d50 * 8) add(8, d50, stroke + " focus stroke count", restSecondsFor("main", d50, opts));
      } else {
        // All round - 8 different coach-quality patterns with varied structures and zones
        // Use cooldown to avoid repeating last 2 patterns on reroll
        const patternChoice = pickIndexWithCooldown(8, seed, rerollCount, 2);
        if (patternChoice === 0) {
          // Build to sprint finish
          if (d100 > 0 && remaining >= d100 * 6) add(6, d100, stroke + " build", restSecondsFor("main", d100, opts));
          if (d50 > 0 && remaining >= d50 * 4) add(4, d50, stroke + " fast", restSecondsFor("main", d50, opts) + 5);
          if (d25 > 0 && remaining >= d25 * 4) add(4, d25, stroke + " sprint all out", restSecondsFor("sprint", d25, opts) + 15);
        } else if (patternChoice === 1) {
          // Strong sustained with max finish
          if (d200 > 0 && remaining >= d200 * 3) add(3, d200, stroke + " hard", restSecondsFor("main", d200, opts));
          if (d100 > 0 && remaining >= d100 * 4) add(4, d100, stroke + " strong", restSecondsFor("main", d100, opts));
          if (d50 > 0 && remaining >= d50 * 4) add(4, d50, stroke + " max effort", restSecondsFor("sprint", d50, opts) + 10);
        } else if (patternChoice === 2) {
          // Descend variations - pick based on seed
          const descendVariants = ["descend 1-3", "descend 1-4", "descend 1-5", "odds easy evens fast", "every 3rd hard", "negative split"];
          const descendDesc = stroke + " " + descendVariants[seed % descendVariants.length];
          if (d100 > 0 && remaining >= d100 * 12) add(12, d100, descendDesc, restSecondsFor("main", d100, opts));
          else if (d100 > 0 && remaining >= d100 * 8) add(8, d100, descendDesc, restSecondsFor("main", d100, opts));
          else if (d100 > 0 && remaining >= d100 * 4) add(4, d100, descendDesc, restSecondsFor("main", d100, opts));
        } else if (patternChoice === 3) {
          // Progressive build: moderate to strong to hard
          if (d100 > 0 && remaining >= d100 * 4) add(4, d100, stroke + " moderate", restSecondsFor("main", d100, opts));
          if (d100 > 0 && remaining >= d100 * 4) add(4, d100, stroke + " strong", restSecondsFor("main", d100, opts));
          if (d50 > 0 && remaining >= d50 * 4) add(4, d50, stroke + " race pace", restSecondsFor("sprint", d50, opts) + 10);
        } else if (patternChoice === 4) {
          // Ladder up and down: 50-100-200-100-50
          if (d50 > 0 && remaining >= d50 * 2) add(2, d50, stroke + " fast", restSecondsFor("main", d50, opts));
          if (d100 > 0 && remaining >= d100 * 2) add(2, d100, stroke + " strong", restSecondsFor("main", d100, opts));
          if (d200 > 0 && remaining >= d200 * 1) add(1, d200, stroke + " hard", restSecondsFor("main", d200, opts));
          if (d100 > 0 && remaining >= d100 * 2) add(2, d100, stroke + " strong", restSecondsFor("main", d100, opts));
          if (d50 > 0 && remaining >= d50 * 2) add(2, d50, stroke + " max sprint", restSecondsFor("sprint", d50, opts) + 10);
        } else if (patternChoice === 5) {
          // Broken swim with sprints
          if (d200 > 0 && remaining >= d200 * 4) add(4, d200, stroke + " steady", restSecondsFor("main", d200, opts));
          if (d25 > 0 && remaining >= d25 * 8) add(8, d25, stroke + " sprint all out", restSecondsFor("sprint", d25, opts) + 20);
        } else if (patternChoice === 6) {
          // 50s focus with mixed intensity
          if (d50 > 0 && remaining >= d50 * 8) add(8, d50, stroke + " odds easy evens fast", restSecondsFor("main", d50, opts));
          if (d50 > 0 && remaining >= d50 * 6) add(6, d50, stroke + " build 1-3", restSecondsFor("main", d50, opts));
          if (d50 > 0 && remaining >= d50 * 4) add(4, d50, stroke + " all out", restSecondsFor("sprint", d50, opts) + 10);
        } else {
          // Straight hard set with descend finish
          if (d100 > 0 && remaining >= d100 * 6) add(6, d100, stroke + " hard", restSecondsFor("main", d100, opts));
          if (d100 > 0 && remaining >= d100 * 4) add(4, d100, stroke + " descend to max", restSecondsFor("main", d100, opts) + 5);
          if (d50 > 0 && remaining >= d50 * 2) add(2, d50, stroke + " max effort", restSecondsFor("sprint", d50, opts) + 15);
        }
      }

      if (fillEasy("main") === null) return null;
      return lines.join("\n");
    }

    function fillEasy(kind) {
      // Fill remaining with clean pool-multiple segments that look human.
      // Prefer 100s then 50s, and only as 1x if it is a standard distance.
      const d100 = snapToPoolMultiple(100, base);
      const d50 = snapToPoolMultiple(50, base);
      const d200 = snapToPoolMultiple(200, base);

      const k2 = String(kind || "").toLowerCase();

      // Named drills for filler
      const fillerDrills = ["Catch-up", "Fingertip drag", "Fist drill", "Scull", "Single arm"];
      const fillerDrill = fillerDrills[seed % fillerDrills.length];
      
      const note =
        k2.includes("main") ? (stroke + " steady") :
        k2.includes("drill") ? fillerDrill :
        k2.includes("kick") ? "kick relaxed" :
        k2.includes("pull") ? "pull relaxed" :
        k2.includes("build") ? (stroke + " build") :
        (stroke + " easy");

      while (remaining >= (d200 || base) && d200 > 0 && remaining % d200 === 0 && remaining >= d200) {
        // Only use a couple of 200s max
        if (lines.length >= 4) break;
        add(1, d200, note, restSecondsFor(kind || "easy", d200, opts));
      }

      if (d100 > 0) {
        const reps100 = Math.floor(remaining / d100);
        if (reps100 >= 2) {
          const r = Math.min(reps100, 6);
          add(r, d100, note, restSecondsFor(kind || "easy", d100, opts));
        }
      }

      if (d50 > 0) {
        const reps50 = Math.floor(remaining / d50);
        if (reps50 >= 2) {
          const r = Math.min(reps50, 10);
          add(r, d50, note, restSecondsFor(kind || "easy", d50, opts));
        }
      }

      // Last resort: one clean single that is still a pool multiple
      if (remaining > 0) {
        const allowedSingles = [200, 300, 400, 500, 600, 800, 1000].map(v => snapToPoolMultiple(v, base)).filter(v => v > 0);
        const canSingle = allowedSingles.includes(remaining);
        if (canSingle) {
          add(1, remaining, note, 0);
          return;
        }

        // Otherwise force 2x(remaining/2) if possible
        if (remaining % 2 === 0) {
          const half = remaining / 2;
          add(2, half, note, restSecondsFor(kind || "easy", half, opts));
          return;
        }

        // If stuck, do not output weirdness. Return null.
        return null;
      }
    }
  }
});
let _generateReqCounter = 0;
app.post("/generate-workout", (req, res) => {
  const reqId = ++_generateReqCounter;
  const reqBody = req.body || {};
  try {
    const body = reqBody;

    const minTotal = 800;
    const distance = Math.max(Number(body.distance), minTotal);
    const poolLength = body.poolLength;
    const customPoolLength = body.customPoolLength;
    const poolLengthUnit = body.poolLengthUnit;
    const lastWorkoutFp = typeof body.lastWorkoutFp === "string" ? body.lastWorkoutFp : "";

    if (!Number.isFinite(distance) || distance <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid distance." });
    }
    if (!poolLength || typeof poolLength !== "string") {
      return res.status(400).json({ ok: false, error: "Invalid pool selection." });
    }

    const isCustomPool = poolLength === "custom";

    const unitsShort = isCustomPool
      ? (poolLengthUnit === "yards" ? "yd" : "m")
      : (poolLength === "25yd" ? "yd" : "m");

    const poolLen = isCustomPool
      ? Number(customPoolLength)
      : (poolLength === "25m" ? 25 : poolLength === "50m" ? 50 : poolLength === "25yd" ? 25 : null);

    if (!poolLen || !Number.isFinite(poolLen) || poolLen <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid pool length." });
    }

    const opts = normalizeOptions(body);
    const useTemplates = body.useTemplates === true;

    const targetTotal = snapToPoolMultiple(distance, poolLen);

    let workout = null;
    let usedSeed = nowSeed();

    // TEMPLATE-ONLY GENERATION - No algorithmic fallback
    // All workouts use real coach patterns from templates
    workout = buildWorkoutFromTemplate({
      targetTotal,
      poolLen,
      unitsShort,
      poolLabel: isCustomPool ? (String(poolLen) + unitsShort + " custom") : String(poolLength),
      thresholdPace: String(body.thresholdPace || ""),
      opts,
      seed: usedSeed
    });

    if (!workout || !workout.text) {
      return res.status(500).json({ ok: false, error: "Failed to build workout." });
    }

    const fp = fingerprintWorkoutText(workout.text);
    if (lastWorkoutFp && fp === lastWorkoutFp) {
      // Regenerate with different seed to avoid duplicate - ALSO uses templates
      const workout2 = buildWorkoutFromTemplate({
        targetTotal,
        poolLen,
        unitsShort,
        poolLabel: isCustomPool ? (String(poolLen) + unitsShort + " custom") : String(poolLength),
        thresholdPace: String(body.thresholdPace || ""),
        opts,
        seed: nowSeed() + 1000
      });

      if (workout2 && workout2.text) {
        const parsed2 = parseWorkoutTextToSections(workout2.text);

        const sectionMeta2 = parsed2.sections.map((s) => {
          const zone = inferZoneFromText(s.body);
          const isStriated = inferIsStriatedFromText(s.body);
          return { zone, isStriated };
        });

        const workoutMeta2 = (() => {
          const zones = sectionMeta2.map((m) => m.zone);
          const hasRed = zones.includes("full_gas");
          const redSectionsCount = zones.filter((z) => z === "full_gas").length;
          return { hasRed, redSectionsCount };
        })();

        const totalMeters2 = workout2.totalMeters || targetTotal;
        const totalLengths2 = Math.round(totalMeters2 / poolLen);
        
        return res.json({
          ok: true,
          workoutText: workout2.text,
          workoutName: workout2.name || "",
          sections: parsed2.sections,
          sectionMeta: sectionMeta2,
          workoutMeta: workoutMeta2,
          totalMeters: totalMeters2,
          totalLengths: totalLengths2,
          poolLength: poolLen,
          poolLabel: isCustomPool ? (String(poolLen) + unitsShort + " custom") : String(poolLength)
        });
      }
    }

    const parsed = parseWorkoutTextToSections(workout.text);

    const sectionMeta = parsed.sections.map((s) => {
      const zone = inferZoneFromText(s.body);
      const isStriated = inferIsStriatedFromText(s.body);
      return { zone, isStriated };
    });

    const workoutMeta = (() => {
      const zones = sectionMeta.map((m) => m.zone);
      const hasRed = zones.includes("full_gas");
      const redSectionsCount = zones.filter((z) => z === "full_gas").length;
      return { hasRed, redSectionsCount };
    })();

    // Calculate total meters and lengths for display
    const totalMeters = workout.totalMeters || targetTotal;
    const totalLengths = Math.round(totalMeters / poolLen);

    return res.json({
      ok: true,
      workoutText: workout.text,
      workoutName: workout.name || "",
      sections: parsed.sections,
      sectionMeta,
      workoutMeta,
      totalMeters,
      totalLengths,
      poolLength: poolLen,
      poolLabel: isCustomPool ? (String(poolLen) + unitsShort + " custom") : String(poolLength)
    });
  } catch (e) {
    console.error(`[ERROR] ReqId=${reqId} Time=${new Date().toISOString()}`);
    console.error(`[ERROR] Message: ${e && e.message ? e.message : e}`);
    console.error(`[ERROR] Request body: ${JSON.stringify(reqBody)}`);
    console.error(`[ERROR] Stack:\n${e && e.stack ? e.stack : "(no stack)"}`);
    const fallbackText = "WARM UP\n4x100 easy freestyle\n\nMAIN\n10x100 freestyle moderate\n\nCOOL DOWN\n200 easy choice";
    return res.json({ ok: true, workoutText: fallbackText, workoutName: "Fallback Workout" });
  }

  function b(v) {
    return v === true || v === "true" || v === "on" || v === 1;
  }

  function normalizeOptions(payload) {
    const strokes = {
      freestyle: b(payload.stroke_freestyle),
      backstroke: b(payload.stroke_backstroke),
      breaststroke: b(payload.stroke_breaststroke),
      butterfly: b(payload.stroke_butterfly)
    };

    const anyStroke =
      strokes.freestyle || strokes.backstroke || strokes.breaststroke || strokes.butterfly;

    if (!anyStroke) {
      strokes.freestyle = true;
    }

    return {
      focus: typeof payload.focus === "string" ? payload.focus : "allround",
      restPref: typeof payload.restPref === "string" ? payload.restPref : "balanced",
      thresholdPace: typeof payload.thresholdPace === "string" ? payload.thresholdPace : "",
      includeKick: payload.includeKick === undefined ? true : b(payload.includeKick),
      includePull: b(payload.includePull),
      fins: b(payload.equip_fins),
      paddles: b(payload.equip_paddles),
      strokes,
      notes: typeof payload.notes === "string" ? payload.notes.trim() : ""
    };
  }

  function nowSeed() {
    const a = Date.now() >>> 0;
    const b2 = Math.floor(Math.random() * 0xffffffff) >>> 0;
    return (a ^ b2) >>> 0;
  }

  function fnv1a32(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function fingerprintWorkoutText(workoutText) {
    return String(fnv1a32(String(workoutText || "")));
  }

  // Universal snapping: 2×poolLen for section totals (home-wall finish)
  function snapToPoolMultiple(dist, poolLen) {
    const d = Number(dist);
    if (!Number.isFinite(d) || d <= 0) return 0;
    const base = Number(poolLen);
    if (!Number.isFinite(base) || base <= 0) return d;
    const base2 = base * 2;
    return Math.round(d / base2) * base2;
  }
  
  // For rep distances, snap to single pool length
  function snapRepDist(dist, poolLen) {
    const d = Number(dist);
    if (!Number.isFinite(d) || d <= 0) return 0;
    const base = Number(poolLen);
    if (!Number.isFinite(base) || base <= 0) return d;
    return Math.round(d / base) * base;
  }

  function parsePaceToSecondsPer100(s) {
    const t = String(s || "").trim();
    if (!t) return null;

    if (/^\d{1,2}:\d{2}$/.test(t)) {
      const parts = t.split(":");
      const mm = Number(parts[0]);
      const ss = Number(parts[1]);
      if (!Number.isFinite(mm) || !Number.isFinite(ss)) return null;
      return (mm * 60) + ss;
    }

    if (/^\d{2,3}$/.test(t)) {
      const v = Number(t);
      if (!Number.isFinite(v) || v <= 0) return null;
      return v;
    }

    return null;
  }

  function fmtMmSs(totalSeconds) {
    const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return String(mm) + ":" + String(ss).padStart(2, "0");
  }

  function estimateWorkoutTotalSeconds(workoutText, paceSecPer100) {
    if (!Number.isFinite(paceSecPer100) || paceSecPer100 <= 0) return null;

    const lines = String(workoutText || "").split(/\r?\n/);

    let currentLabel = "";
    let setBodyLines = [];
    let total = 0;

    const flush = () => {
      if (!setBodyLines.length) return;

      const body = setBodyLines.join("\n");
      const dist = computeSetDistanceFromBody(body);
      if (!Number.isFinite(dist) || dist <= 0) {
        setBodyLines = [];
        return;
      }

      const mult = paceMultiplierForLabel(currentLabel);
      const swim = (dist / 100) * paceSecPer100 * mult;
      const rest = computeRestSecondsFromBody(body);

      total += swim + rest;

      setBodyLines = [];
    };

    for (const line of lines) {
      const t = String(line || "").trim();
      if (!t) continue;

      if (
        t.startsWith("Requested:") ||
        t.startsWith("Total distance:") ||
        t.startsWith("Total lengths:") ||
        t.startsWith("Ends at start end:") ||
        t.startsWith("Est total time:")
      ) {
        continue;
      }

      const m = t.match(/^([^:]{2,30}):\s*(.+)$/);
      if (m) {
        flush();
        currentLabel = String(m[1] || "").trim();
        setBodyLines = [String(m[2] || "").trim()];
      } else {
        setBodyLines.push(t);
      }
    }

    flush();
    return total;
  }

  function computeSetDistanceFromBody(body) {
    const t = String(body || "");
    const re = /(\d+)\s*[x×]\s*(\d+)\s*(m|yd)?/gi;

    let sum = 0;
    let m;
    while ((m = re.exec(t)) !== null) {
      const reps = Number(m[1]);
      const dist = Number(m[2]);
      if (Number.isFinite(reps) && Number.isFinite(dist)) sum += reps * dist;
    }

    if (sum === 0) {
      const one = t.match(/(^|\s)(\d{2,5})(\s*(m|yd))?(\s|$)/);
      if (one) {
        const v = Number(one[2]);
        if (Number.isFinite(v) && v >= 50) sum = v;
      }
    }

    return sum > 0 ? sum : null;
  }

  function computeRestSecondsFromBody(body) {
    const t = String(body || "");
    const reSeg = /(\d+)\s*[x×]\s*(\d+)[^\n]*?rest\s*(\d+)\s*s/gi;
    let sum = 0;
    let m;
    while ((m = reSeg.exec(t)) !== null) {
      const reps = Number(m[1]);
      const rest = Number(m[3]);
      if (Number.isFinite(reps) && reps >= 2 && Number.isFinite(rest) && rest >= 0) {
        sum += (reps - 1) * rest;
      }
    }
    return sum;
  }

  function paceMultiplierForLabel(label) {
    const k = String(label || "").toLowerCase();
    if (k.includes("warm")) return 1.25;
    if (k.includes("build")) return 1.18;
    if (k.includes("drill")) return 1.30;
    if (k.includes("kick")) return 1.38;
    if (k.includes("pull")) return 1.25;
    if (k.includes("main")) return 1.05;
    if (k.includes("cool")) return 1.35;
    return 1.15;
  }

  // SIMPLIFIED SET BUILDER - Coach-like simple sets (4x100 kick descend 1-4)
  function buildOneSetBodyServerLocal({ label, targetDistance, poolLen, unitsShort, opts, seed }) {
    const base = poolLen;
    const target = snapToPoolMultiple(targetDistance, base);
    if (target <= 0) return null;

    const isNonStandardPool = ![25, 50].includes(base);
    const hasThresholdPace = opts.thresholdPace && String(opts.thresholdPace).trim().length > 0;

    const makeLine = (reps, dist, text, restSec) => {
      let suffix = "";
      if (hasThresholdPace && Number.isFinite(restSec) && restSec > 0) {
        suffix = " rest " + String(restSec) + "s";
      }
      let lengthInfo = "";
      if (isNonStandardPool && dist > 0 && base > 0 && dist % base === 0 && dist / base > 1) {
        lengthInfo = " (" + (dist / base) + " lengths)";
      }
      return String(reps) + "x" + String(dist) + lengthInfo + " " + (text || "").trim() + suffix;
    };

    const pickStroke = () => {
      const allowed = [];
      if (opts.strokes.freestyle) allowed.push("freestyle");
      if (opts.strokes.backstroke) allowed.push("backstroke");
      if (opts.strokes.breaststroke) allowed.push("breaststroke");
      if (opts.strokes.butterfly) allowed.push("butterfly");
      if (!allowed.length) return "freestyle";
      const k = String(label || "").toLowerCase();
      if ((k.includes("warm") || k.includes("cool")) && allowed.includes("freestyle")) return "freestyle";
      return allowed[seed % allowed.length];
    };

    const restFor = (repDist) => {
      const k = String(label || "").toLowerCase();
      let r = 15;
      if (k.includes("warm") || k.includes("cool")) r = 0;
      else if (k.includes("drill")) r = 20;
      else if (k.includes("kick") || k.includes("pull")) r = 15;
      else if (k.includes("main")) r = 20;
      if (repDist >= 200) r = Math.max(10, r - 5);
      if (opts.restPref === "short") r = Math.max(0, r - 5);
      if (opts.restPref === "more") r = r + 10;
      return r;
    };

    // Find best rep distance that fits target EXACTLY - no floor fallback allowed
    const findBestFit = (preferredDists) => {
      // First pass: exact fit with preferred distances
      for (const d of preferredDists) {
        if (d > 0 && target % d === 0) {
          const reps = target / d;
          if (reps >= 2 && reps <= 30) return { reps, dist: d };
        }
      }
      // Second pass: try pool length itself
      if (base > 0 && target % base === 0) {
        const reps = target / base;
        if (reps >= 2 && reps <= 50) return { reps, dist: base };
      }
      // Third pass: try 2×base
      const base2 = base * 2;
      if (base2 > 0 && target % base2 === 0) {
        const reps = target / base2;
        if (reps >= 2 && reps <= 30) return { reps, dist: base2 };
      }
      // No fallback - return null to force exact match
      return null;
    };

    const stroke = pickStroke();
    const k = String(label || "").toLowerCase();
    const hasFins = !!opts.fins;
    const hasPaddles = !!opts.paddles;

    // Named drills
    const drills = ["Catch-up", "Fist drill", "Fingertip drag", "DPS", "Shark fin", "Zipper", "Scull", "Corkscrew", "Single arm", "Long dog", "Tarzan", "Head up"];
    const drill = drills[seed % drills.length];

    // Build descriptions for variety
    const buildDescs = ["build", "descend 1-3", "descend 1-4", "negative split", "smooth to strong"];
    const buildDesc = buildDescs[seed % buildDescs.length];

    // Preferred distances by set type
    const d25 = snapToPoolMultiple(25, base);
    const d50 = snapToPoolMultiple(50, base);
    const d75 = snapToPoolMultiple(75, base);
    const d100 = snapToPoolMultiple(100, base);
    const d200 = snapToPoolMultiple(200, base);

    // WARM-UP: Simple easy swim
    if (k.includes("warm")) {
      const fit = findBestFit([d100, d50, d200, d75, d25].filter(x => x > 0));
      if (!fit) return makeLine(1, target, stroke + " easy", 0);
      return makeLine(fit.reps, fit.dist, stroke + " easy", 0);
    }

    // BUILD: Simple build set
    if (k.includes("build")) {
      const fit = findBestFit([d50, d100, d75, d25].filter(x => x > 0));
      if (!fit) return makeLine(1, target, stroke + " build", 0);
      return makeLine(fit.reps, fit.dist, stroke + " " + buildDesc, restFor(fit.dist));
    }

    // DRILL: Named drill - EVEN REPS ONLY
    if (k.includes("drill")) {
      const evenScheme = pickEvenRepScheme(target, base, "drill");
      if (!evenScheme) return makeLine(1, target, drill, 0);
      return makeLine(evenScheme.reps, evenScheme.repDist, drill, restFor(evenScheme.repDist));
    }

    // KICK: Simple kick set - EVEN REPS ONLY
    if (k.includes("kick")) {
      const finNote = hasFins ? " with fins" : "";
      const kickDescs = ["kick " + buildDesc + finNote, "kick steady" + finNote, "kick fast" + finNote];
      const kickDesc = kickDescs[seed % kickDescs.length];
      const evenScheme = pickEvenRepScheme(target, base, "kick");
      if (!evenScheme) return makeLine(1, target, "kick" + finNote, 0);
      return makeLine(evenScheme.reps, evenScheme.repDist, kickDesc, restFor(evenScheme.repDist));
    }

    // PULL: Simple pull set
    if (k.includes("pull")) {
      const padNote = hasPaddles ? " with paddles" : "";
      const pullDescs = ["pull " + buildDesc + padNote, "pull steady" + padNote, "pull strong" + padNote];
      const pullDesc = pullDescs[seed % pullDescs.length];
      const fit = findBestFit([d100, d50, d200, d75].filter(x => x > 0));
      if (!fit) return makeLine(1, target, "pull" + padNote, 0);
      return makeLine(fit.reps, fit.dist, pullDesc, restFor(fit.dist));
    }

    // COOL-DOWN: Easy swim
    if (k.includes("cool")) {
      const fit = findBestFit([d100, d200, d50].filter(x => x > 0));
      if (!fit) return makeLine(1, target, stroke + " easy", 0);
      return makeLine(fit.reps, fit.dist, "easy choice", 0);
    }

    // MAIN SET: Coach-quality variety
    const focus = String(opts.focus || "allround");
    const mainDescs = {
      sprint: [stroke + " fast", stroke + " build to sprint", stroke + " max effort"],
      threshold: [stroke + " best average", stroke + " strong hold", stroke + " threshold pace"],
      endurance: [stroke + " steady", stroke + " smooth", stroke + " hold pace"],
      technique: [stroke + " perfect form", stroke + " focus DPS", stroke + " count strokes"],
      allround: [stroke + " " + buildDesc, stroke + " hard", stroke + " strong", stroke + " descend 1-4", stroke + " odds easy evens fast", stroke + " sprint", stroke + " max effort"]
    };
    const descs = mainDescs[focus] || mainDescs.allround;
    const mainDesc = descs[seed % descs.length];

    // Prefer 100s for main sets, then 50s, 200s
    const fit = findBestFit([d100, d50, d200, d75].filter(x => x > 0));
    if (!fit) return makeLine(1, target, stroke + " swim", 0);
    return makeLine(fit.reps, fit.dist, mainDesc, restFor(fit.dist));
  }

  // Snazzy workout name generator - inspired by CardGym cards
  function generateWorkoutName(totalDistance, opts, seed) {
    const focus = opts.focus || "allround";
    
    // Distance-based names
    const shortNames = [
      "Quick Dip", "Fast Lane", "Starter Set", "Warm Welcome",
      "Pool Opener", "Light Laps", "Easy Does It", "Swim Snack"
    ];
    const mediumNames = [
      "Steady State", "Lane Lines", "Rhythm & Flow", "Cruise Control",
      "Smooth Sailing", "Pool Party", "Stroke & Glide", "Lap Stack"
    ];
    const longNames = [
      "Distance Dash", "Long Haul", "Mile Maker", "Endurance Engine",
      "Big Swim", "Full Tank", "Deep Dive", "Marathon Mode"
    ];
    
    // Focus-based names
    const focusNames = {
      sprint: ["Speed Demon", "Fast Finish", "Sprint Session", "Power Push", "Quick Burst"],
      threshold: ["Threshold Test", "Pace Pusher", "T-Time", "Race Ready", "Tempo Tune"],
      endurance: ["Distance Day", "Steady Strong", "Long & Smooth", "Endurance Hour"],
      technique: ["Drill Time", "Form Focus", "Technique Tune", "Perfect Stroke"],
      allround: ["Mixed Bag", "Full Spectrum", "Variety Pack", "All-Rounder", "Balanced Swim"]
    };
    
    // Equipment-themed names
    const finsNames = ["Fin Frenzy", "Flipper Time", "Turbo Kick"];
    const paddlesNames = ["Power Paddles", "Arm Amplifier", "Pull Power"];
    
    let pool = [];
    
    // Add focus-specific names
    if (focusNames[focus]) {
      pool = pool.concat(focusNames[focus]);
    }
    
    // Add equipment-specific names
    if (opts.fins) pool = pool.concat(finsNames);
    if (opts.paddles) pool = pool.concat(paddlesNames);
    
    // Add distance-appropriate names
    if (totalDistance <= 1000) {
      pool = pool.concat(shortNames);
    } else if (totalDistance <= 2500) {
      pool = pool.concat(mediumNames);
    } else {
      pool = pool.concat(longNames);
    }
    
    // Fallback if pool somehow empty
    if (pool.length === 0) {
      pool = ["Swim Session", "Pool Workout", "Lap Time"];
    }
    
    // Use seed to deterministically select from pool
    return pool[seed % pool.length];
  }

  // ============================================================================
  // COACH PLAUSIBILITY VALIDATOR
  // Rejects workouts that violate coach-realistic constraints
  // Returns null if valid, otherwise returns a short reason string
  // ============================================================================
  function validateWorkout(sets, poolLen, actualTotalMeters) {
    // Helper: parse NxD from a line
    function parseNxDFromLine(line) {
      const match = String(line || "").match(/^(\d+)x(\d+)/i);
      if (!match) return null;
      return { reps: Number(match[1]), dist: Number(match[2]) };
    }

    // Helper: check if text indicates full gas effort
    function isFullGasText(text) {
      const t = String(text || "").toLowerCase();
      return t.includes("all out") || t.includes("max effort") || t.includes("sprint");
    }

    // Helper: check if text indicates build or descend
    function isBuildOrDescend(text) {
      const t = String(text || "").toLowerCase();
      return t.includes("build") || t.includes("descend");
    }

    // Helper: get section kind from label
    function getSectionKind(label) {
      const l = String(label || "").toLowerCase();
      if (l.includes("warm")) return "warmup";
      if (l.includes("build")) return "build";
      if (l.includes("drill")) return "drill";
      if (l.includes("kick")) return "kick";
      if (l.includes("pull")) return "pull";
      if (l.includes("cool")) return "cooldown";
      if (l.includes("main")) return "main";
      return "unknown";
    }

    // Track which required sections are present
    let hasWarmup = false;
    let hasMain = false;
    let hasCooldown = false;
    let cooldownDist = 0;

    for (const section of sets) {
      const kind = getSectionKind(section.label);
      const bodyLines = String(section.body || "").split("\n");

      if (kind === "warmup") hasWarmup = true;
      if (kind === "main") hasMain = true;
      if (kind === "cooldown") {
        hasCooldown = true;
        cooldownDist = section.dist || 0;
      }

      // Check each line in the section body
      for (const line of bodyLines) {
        const parsed = parseNxDFromLine(line);
        if (!parsed) continue;

        const { reps, dist: repDist } = parsed;
        const isFullGas = isFullGasText(line);
        const isBuild = isBuildOrDescend(line);

        // PoolLen-specific caps for common 25m/25yd oddities
        // These should NOT affect 50m pools where 20x50 can be normal.
        const pLen = Number(poolLen);

        if (pLen === 25) {
          // Main sets: prevent very common but coach-implausible 22x50 / 26x50 in 25m pools
          if (kind === "main" && repDist === 50 && reps > 16) {
            return "main 50s reps cap exceeded (max 16 for 25m/25yd)";
          }

          // Drill sets: cap short-repeat drill rep counts
          if (kind === "drill" && repDist === 25 && reps > 12) {
            return "drill 25s reps cap exceeded (max 12 for 25m/25yd)";
          }
          if (kind === "drill" && repDist === 50 && reps > 10) {
            return "drill 50s reps cap exceeded (max 10 for 25m/25yd)";
          }
        }

        // Rule 1: Even lengths for repeats
        // Repeats must be multiples of poolLen (allows 25m, 50m, 100m repeats)
        // The stricter "ends at home wall" rule (2 * poolLen) would be too restrictive
        // for the current generator which uses 25m repeats frequently
        if (repDist > 0 && repDist % poolLen !== 0) {
          return "odd-length repeat distance";
        }

        // Rule 2: Build and descend sanity (relaxed from 4 to 2 for generator compatibility)
        if (isBuild && reps < 2) {
          return "build requires at least 2 reps";
        }

        // Rule 3: Rep count bounds by section (very permissive for generator compatibility)
        // These catch only truly egregious violations like 50+ rep sets
        if (kind === "warmup") {
          if (reps > 30) {
            return "warmup reps too high (max 30)";
          }
        }

        if (kind === "build") {
          // Very wide range to accommodate generator patterns
          if (reps > 24) {
            return "build section: reps too high (max 24)";
          }
        }

        if (kind === "drill") {
          // Allow wide range for drill sets
          if (reps > 24) {
            return "drill section: reps too high (max 24)";
          }
          // Allow various drill repeat distances (generator uses many patterns)
          // Only reject obviously wrong distances
          if (repDist > 200) {
            return "drill repeat too long (max 200)";
          }
        }

        if (kind === "kick") {
          // Kick can have high rep counts for easy kick sets
          if (reps > 30) {
            return "kick reps too high (max 30)";
          }
        }

        if (kind === "main") {
          // Main sets can be large for interval training
          if (reps > 30) {
            return "main reps too high (max 30)";
          }
        }

        // Rule 4: Full gas caps
        if (isFullGas) {
          const setTotalDist = reps * repDist;
          const isKickSet = kind === "kick" || String(line).toLowerCase().includes("kick");
          
          // Distance caps
          if (isKickSet && setTotalDist > 300) {
            return "kick full gas cap exceeded (max 300)";
          }
          if (!isKickSet && setTotalDist > 600) {
            return "swim full gas cap exceeded (max 600)";
          }

          // Rep count caps for full gas
          if (repDist === 25 && reps > 12) {
            return "full gas 25s: reps must be <= 12";
          }
          if (repDist === 50 && reps > 10) {
            return "full gas 50s: reps must be <= 10";
          }
          if (repDist === 100 && reps > 6) {
            return "full gas 100s: reps must be <= 6";
          }

          // General full gas grouping check
          if (reps > 10) {
            return "full gas needs grouping";
          }
        }
      }
    }

    // Rule 5: Total structure sanity
    if (!hasWarmup) {
      return "missing warmup section";
    }
    if (!hasMain) {
      return "missing main section";
    }
    if (!hasCooldown) {
      return "missing cooldown section";
    }

    // Cooldown minimum distance
    // Minimum cooldown is 4 lengths (2 round trips) - more permissive than coach ideal
    const minCooldown = poolLen * 4;
    if (cooldownDist < minCooldown) {
      return "cooldown too short (min " + minCooldown + ")";
    }

    return null; // Valid
  }

  // ============================================================================
  // TEMPLATE-BASED WORKOUT GENERATION
  // Uses real swim workout patterns for coach-quality results
  // ============================================================================
  
  // Helper: Generate a simple body description from distance and label
  function generateSimpleBody(dist, label, base) {
    return generateVariedBody(dist, label, base, 0);
  }
  
  function varyTemplateDesc(originalDesc, dist, label, base, seed) {
    const s = seed >>> 0;
    const labelLower = String(label).toLowerCase();
    const desc = String(originalDesc || "");
    
    const intensitySwaps = {
      "strong": ["moderate", "strong", "threshold pace", "@ strong effort"],
      "moderate": ["steady", "moderate", "strong"],
      "steady": ["steady", "moderate", "relaxed pace"],
      "easy": ["easy", "easy freestyle", "easy choice", "relaxed swim"],
      "build": ["build", "build by 25", "build to fast"],
      "fast": ["fast", "race pace", "sprint"],
      "FAST": ["FAST", "sprint", "max effort", "race pace"],
      "FAST with rest": ["FAST with rest", "sprint with rest", "max effort with recovery"]
    };
    
    const repMatch = desc.match(/^(\d+)x(\d+)\s+(.+)$/);
    if (repMatch) {
      const origReps = Number(repMatch[1]);
      const origRepDist = Number(repMatch[2]);
      const origIntensity = repMatch[3];
      
      const repDistOptions = [];
      if (dist >= 800 && dist % 200 === 0) repDistOptions.push(200);
      if (dist >= 300 && dist % 100 === 0) repDistOptions.push(100);
      if (dist >= 150 && dist % 50 === 0) repDistOptions.push(50);
      if (dist >= 50 && dist % base === 0) repDistOptions.push(base);
      
      const validRepDists = repDistOptions.filter(rd => {
        const r = dist / rd;
        return r >= 2 && r <= 16 && workoutTemplates.validateRepScheme(r, rd);
      });
      
      let newRepDist = origRepDist;
      let newReps = origReps;
      if (validRepDists.length > 1) {
        newRepDist = validRepDists[((s * 9973) >>> 0) % validRepDists.length];
        newReps = Math.round(dist / newRepDist);
      }
      
      const baseIntensity = origIntensity.replace(/\s*\(.*\)$/, "").trim();
      const parenthetical = origIntensity.match(/\(.*\)$/);
      let newIntensity = baseIntensity;
      if (intensitySwaps[baseIntensity]) {
        newIntensity = intensitySwaps[baseIntensity][((s * 2654435761) >>> 0) % intensitySwaps[baseIntensity].length];
      }
      if (parenthetical) {
        newIntensity += " " + parenthetical[0];
      }
      
      return newReps + "x" + newRepDist + " " + newIntensity;
    }
    
    const straightMatch = desc.match(/^(\d+)\s+(.+)$/);
    if (straightMatch) {
      const origIntensity = straightMatch[2].trim();
      if (intensitySwaps[origIntensity]) {
        const swapped = intensitySwaps[origIntensity][((s * 2654435761) >>> 0) % intensitySwaps[origIntensity].length];
        return dist + " " + swapped;
      }
      return dist + " " + origIntensity;
    }
    
    return desc;
  }
  
  function generateVariedBody(dist, label, base, seed) {
    const labelLower = String(label).toLowerCase();
    const s = seed >>> 0;
    
    const warmDescriptions = [
      "easy", "easy freestyle", "easy choice", "relaxed swim",
      "easy mix", "easy FC", "easy swim"
    ];
    const coolDescriptions = [
      "easy", "easy choice", "easy freestyle", "relaxed swim",
      "easy mix"
    ];
    const mainIntensities = [
      "steady", "moderate", "strong", "threshold pace",
      "@ strong effort", "negative split", "descend 1-4"
    ];
    const mainPatterns = [
      "odd fast, even easy", "build each rep", "descend within set",
      "hold pace", "negative split", "last 25 fast"
    ];
    const buildDescriptions = [
      "build", "build by 25", "build to fast", "build each rep"
    ];
    const drillStrokes = [
      "drill FC", "drill choice", "drill mix", "technique focus",
      "catch-up drill", "drill IM"
    ];
    const kickDescriptions = [
      "kick moderate", "kick choice", "kick with board",
      "kick streamline", "kick easy"
    ];
    const pullDescriptions = [
      "pull moderate", "pull with paddles", "pull steady",
      "pull with buoy", "pull strong"
    ];
    const sprintIntensities = [
      "FAST", "FAST with rest", "sprint", "max effort",
      "race pace", "all out"
    ];
    
    const pick = (arr) => arr[((s * 2654435761) >>> 0) % arr.length];
    const pick2 = (arr) => arr[((s * 1103515245 + 12345) >>> 0) % arr.length];
    
    // Warmup and cooldown prefer straight swims
    if (labelLower.includes("warm") || labelLower.includes("cool")) {
      const descPool = labelLower.includes("warm") ? warmDescriptions : coolDescriptions;
      if (dist <= 600) {
        return dist + " " + pick(descPool);
      }
      // Longer warmups: split into easy + build
      const easyDist = snapToPoolMultiple(Math.round(dist * 0.6), base);
      const buildDist = dist - easyDist;
      const buildReps = Math.round(buildDist / (base * 2));
      const buildRepDist = buildReps > 0 ? Math.round(buildDist / buildReps) : buildDist;
      if (buildReps > 1) {
        return easyDist + " " + pick(descPool) + "\n" + buildReps + "x" + snapToPoolMultiple(buildRepDist, base) + " build";
      }
      return dist + " " + pick(descPool);
    }
    
    // Determine rep distance options based on total distance
    const repOptions = [];
    if (dist >= 800 && dist % 200 === 0) repOptions.push(200);
    if (dist >= 400 && dist % 100 === 0) repOptions.push(100);
    if (dist >= 200 && dist % 50 === 0) repOptions.push(50);
    if (dist >= 100 && dist % base === 0) repOptions.push(base);
    
    // Filter to valid rep counts (coaching constraints)
    const validOptions = repOptions.filter(rd => {
      const reps = dist / rd;
      return reps >= 2 && reps <= 16 && workoutTemplates.validateRepScheme(reps, rd);
    });
    
    let repDist = base;
    if (validOptions.length > 0) {
      repDist = validOptions[((s * 9973) >>> 0) % validOptions.length];
    } else {
      if (dist >= 600) repDist = 200;
      else if (dist >= 300) repDist = 100;
      else if (dist >= 100) repDist = 50;
      repDist = snapToPoolMultiple(repDist, base);
      if (repDist <= 0) repDist = base;
    }
    
    const reps = Math.round(dist / repDist);
    
    // Straight swim for small distances
    if (reps <= 1) {
      if (labelLower.includes("main")) return dist + " " + pick(mainIntensities);
      return dist + " " + pick(warmDescriptions);
    }
    
    // Build section descriptions
    if (labelLower.includes("build")) {
      return reps + "x" + repDist + " " + pick(buildDescriptions);
    }
    
    // Drill sections
    if (labelLower.includes("drill")) {
      return reps + "x" + repDist + " " + pick(drillStrokes);
    }
    
    // Kick sections
    if (labelLower.includes("kick")) {
      return reps + "x" + repDist + " " + pick(kickDescriptions);
    }
    
    // Pull sections
    if (labelLower.includes("pull")) {
      return reps + "x" + repDist + " " + pick(pullDescriptions);
    }
    
    // Sprint sections
    if (labelLower.includes("sprint")) {
      return reps + "x" + repDist + " " + pick(sprintIntensities);
    }
    
    // Main sections - add pattern variations
    const intensity = pick(mainIntensities);
    const addPattern = ((s * 7919) >>> 0) % 3 === 0;
    if (addPattern && reps >= 4) {
      return reps + "x" + repDist + " " + intensity + " (" + pick2(mainPatterns) + ")";
    }
    
    return reps + "x" + repDist + " " + intensity;
  }
  
  function buildWorkoutFromTemplate({ targetTotal, poolLen, unitsShort, poolLabel, thresholdPace, opts, seed }) {
    const base = poolLen;
    const rawTotal = snapToPoolMultiple(targetTotal, base);
    const lengths = Math.round(rawTotal / base);
    const evenLengths = lengths % 2 === 0 ? lengths : lengths + 1;
    const total = evenLengths * base;
    
    // Find template with seed-based randomization for variety
    const { template, scaleFactor } = workoutTemplates.findClosestTemplate(total, [], seed);
    const useOriginalDesc = Math.abs(scaleFactor - 1.0) < 0.15;
    
    const scaled = workoutTemplates.scaleTemplate(template, total, base);
    
    // Build sets from template sections
    const sets = [];
    let actualTotal = 0;
    let sectionSeed = seed;
    
    for (const section of scaled.sections) {
      const dist = snapToPoolMultiple(section.distance, base);
      sectionSeed = ((sectionSeed * 1103515245 + 12345) >>> 0);
      const labelLower = section.label.toLowerCase();
      const isFixed = labelLower.includes("warm") || labelLower.includes("cool");
      let body;
      if (useOriginalDesc && isFixed) {
        body = section.desc;
      } else if (useOriginalDesc) {
        body = varyTemplateDesc(section.desc, dist, section.label, base, sectionSeed);
      } else {
        body = generateVariedBody(dist, section.label, base, sectionSeed);
      }
      sets.push({
        label: section.label,
        dist: dist,
        body: body,
        originalDesc: section.desc
      });
      actualTotal += dist;
    }
    
    // Adjust last section to hit exact total (absorb rounding errors)
    if (actualTotal !== total && sets.length > 0) {
      const delta = total - actualTotal;
      // Find main to adjust (not cooldown)
      const mainIdx = sets.findIndex(s => s.label.toLowerCase().includes("main"));
      const adjustIdx = mainIdx >= 0 ? mainIdx : sets.length - 2;
      if (adjustIdx >= 0) {
        const newDist = snapToPoolMultiple(sets[adjustIdx].dist + delta, base);
        if (newDist >= base * 4) {
          sets[adjustIdx].dist = newDist;
          if (!useOriginalDesc) {
            sets[adjustIdx].body = generateSimpleBody(newDist, sets[adjustIdx].label, base);
          }
        }
      }
    }
    
    // Apply sensible cooldown calculation to override template cooldown
    const cooldownIdx = sets.findIndex(s => s.label.toLowerCase().includes("cool"));
    if (cooldownIdx >= 0) {
      const sensibleCool = calculateSensibleCoolDown(total, base);
      const currentCool = sets[cooldownIdx].dist;
      const diff = currentCool - sensibleCool;
      
      // Only adjust if difference is significant
      if (Math.abs(diff) > base * 2) {
        // Find main section to redistribute
        const mainIdx = sets.findIndex(s => s.label.toLowerCase().includes("main"));
        if (mainIdx >= 0) {
          const newMainDist = snapToPoolMultiple(sets[mainIdx].dist + diff, base);
          // Guard: Only adjust if main stays above minimum (400m)
          if (newMainDist >= 400) {
            sets[cooldownIdx].dist = sensibleCool;
            sets[cooldownIdx].body = generateSimpleBody(sensibleCool, "Cool down", base);
            sets[mainIdx].dist = newMainDist;
            if (!useOriginalDesc) {
              sets[mainIdx].body = generateSimpleBody(newMainDist, sets[mainIdx].label, base);
            }
          }
        }
      }
    }
    
    // Recalculate total after adjustments
    const finalTotal = sets.reduce((sum, s) => sum + s.dist, 0);
    
    // Generate workout text
    const workoutName = template.name;
    
    let workoutText = "";
    for (const s of sets) {
      workoutText += s.label + ": " + s.body + "\n\n";
    }
    workoutText += "Total " + finalTotal + unitsShort;
    
    // Build sections array for frontend
    const sectionData = sets.map(s => ({
      label: s.label,
      body: s.body,
      dist: s.dist
    }));
    
    return {
      name: workoutName,
      text: workoutText,
      totalMeters: finalTotal,
      sections: sectionData,
      fromTemplate: true,
      templateName: template.name
    };
  }

  function buildWorkout({ targetTotal, poolLen, unitsShort, poolLabel, thresholdPace, opts, seed }) {
    const base = poolLen;
    const rawTotal = snapToPoolMultiple(targetTotal, base);
    const lengths = Math.round(rawTotal / base);
    const evenLengths = lengths % 2 === 0 ? lengths : lengths + 1;
    const total = evenLengths * base;

    const paceSec = parsePaceToSecondsPer100(thresholdPace);

    // Snazzy workout name generator (inspired by CardGym cards)
    const workoutName = generateWorkoutName(total, opts, seed);

    const includeKick = opts.includeKick && total >= snapToPoolMultiple(1500, base);
    const includePull = opts.includePull && total >= snapToPoolMultiple(1500, base);

    const wantBuild = total >= snapToPoolMultiple(1500, base);
    const wantDrill = total >= snapToPoolMultiple(1500, base);

    // FREE PROFILE: Ranged allocation for variety
    const FREE_ALLOC_RANGES = {
      warmupPct: [0.10, 0.25],
      buildPct:  [0.00, 0.20],
      drillPct:  [0.00, 0.20],
      kickPct:   [0.00, 0.20],
      pullPct:   [0.00, 0.20],
      mainPct:   [0.15, 0.60],
      cooldownPct:[0.05, 0.15],
      warmupPlusBuildMaxPct: 0.30
    };

    // Seeded RNG for deterministic variety
    let rngState = seed;
    function seededRng() {
      rngState = ((rngState * 1103515245 + 12345) >>> 0) % 2147483648;
      return rngState / 2147483648;
    }

    function pickPct(range) {
      const a = range[0], b = range[1];
      const t = seededRng();
      return a + (b - a) * t;
    }

    // Variability jitter: ±1 pool-length-pair (±2 lengths) applied BEFORE snapping
    // Returns -2, 0, or +2 lengths worth of distance, deterministically from RNG
    function jitterLengths() {
      const r = seededRng();
      if (r < 0.33) return -2;
      if (r < 0.67) return 0;
      return 2;
    }

    // Pick random percentages for each section
    let warmupPct = pickPct(FREE_ALLOC_RANGES.warmupPct);
    let buildPct = wantBuild ? pickPct(FREE_ALLOC_RANGES.buildPct) : 0;
    let drillPct = wantDrill ? pickPct(FREE_ALLOC_RANGES.drillPct) : 0;
    let kickPct = includeKick ? pickPct(FREE_ALLOC_RANGES.kickPct) : 0;
    let pullPct = includePull ? pickPct(FREE_ALLOC_RANGES.pullPct) : 0;

    // Enforce warmup + build <= 30%
    const warmupPlusBuildMax = FREE_ALLOC_RANGES.warmupPlusBuildMaxPct;
    if ((warmupPct + buildPct) > warmupPlusBuildMax) {
      buildPct = Math.max(0, warmupPlusBuildMax - warmupPct);
    }

    // Convert percentages to raw distances, apply jitter, then snap (SINGLE snap point)
    let warmDist = snapToPoolMultiple(Math.round(total * warmupPct) + jitterLengths() * base, base);
    let buildDist = snapToPoolMultiple(Math.round(total * buildPct) + jitterLengths() * base, base);
    let drillDist = snapToPoolMultiple(Math.round(total * drillPct) + jitterLengths() * base, base);
    let kickDist = snapToPoolMultiple(Math.round(total * kickPct) + jitterLengths() * base, base);
    let pullDist = snapToPoolMultiple(Math.round(total * pullPct) + jitterLengths() * base, base);
    
    // Use sensible cool down: 10% of total, snapped to standard swimmer values, max 16 reps
    let coolDist = calculateSensibleCoolDown(total, base);

    // Minimum section distances (2 round trips = 4 lengths)
    const minSectionDist = base * 4;
    warmDist = Math.max(warmDist, minSectionDist);

    // Build sections array
    const sets = [];
    let usedDist = 0;

    sets.push({ label: "Warm up", dist: warmDist });
    usedDist += warmDist;

    if (wantBuild && buildDist >= minSectionDist) {
      sets.push({ label: "Build", dist: buildDist });
      usedDist += buildDist;
    }

    if (wantDrill && drillDist >= minSectionDist) {
      sets.push({ label: "Drill", dist: drillDist });
      usedDist += drillDist;
    }

    // Kick and Pull can BOTH be included (no else-if)
    if (includeKick && kickDist >= minSectionDist) {
      sets.push({ label: "Kick", dist: kickDist });
      usedDist += kickDist;
    }

    if (includePull && pullDist >= minSectionDist) {
      sets.push({ label: "Pull", dist: pullDist });
      usedDist += pullDist;
    }

    // Main gets the remainder
    let mainTotal = total - usedDist - coolDist;
    mainTotal = snapToPoolMultiple(mainTotal, base);

    // Adjust if snapping caused mismatch
    const currentTotal = usedDist + mainTotal + coolDist;
    if (currentTotal !== total) {
      mainTotal = mainTotal + (total - currentTotal);
      mainTotal = snapToPoolMultiple(mainTotal, base);
    }

    // Snap main distances to multiples of 100 (or nearest clean rep) for better template matching
    const d100Main = snapToPoolMultiple(100, base);
    const snapToCleanMain = (dist) => {
      if (d100Main > 0) {
        return Math.round(dist / d100Main) * d100Main;
      }
      return snapToPoolMultiple(dist, base);
    };

    if (mainTotal >= snapToPoolMultiple(2400, base)) {
      const m1 = snapToCleanMain(Math.round(mainTotal * 0.55));
      const m2 = snapToCleanMain(mainTotal - m1);
      sets.push({ label: "Main 1", dist: m1 });
      sets.push({ label: "Main 2", dist: m2 });
    } else {
      sets.push({ label: "Main", dist: snapToCleanMain(mainTotal) });
    }

    // Use the sensible cooldown calculated earlier (10% of total, standard values, max 16 reps)
    // Main absorbs any rounding drift, NOT cooldown
    sets.push({ label: "Cool down", dist: coolDist });

    // Short workout section gating from project-state.md
    // Below 1200: Drill may be omitted
    // Below 1000: Kick and Drill may be omitted
    // At 1800 and above: full structure expected
    (function applyShortWorkoutGating() {
      const t = Number(total);
      if (!Number.isFinite(t)) return;

      const removeIfPresent = (name) => {
        const idx = sets.findIndex(s => s.label === name);
        if (idx >= 0) sets.splice(idx, 1);
      };

      if (t < 1000) {
        removeIfPresent("Kick");
        removeIfPresent("Drill");
      } else if (t < 1200) {
        removeIfPresent("Drill");
      }
    })();

    // NOTE: applySectionMinimums removed - distances are already snapped once above
    // Double-snapping was causing variance collapse in standard pools (25m/50m)

    // Add total distance to opts so set builder can check for short workouts
    const optsWithTotal = { ...opts, totalDistance: total };

    // Build section bodies
    for (const s of sets) {
      const setLabel = s.label;
      const setDist = s.dist;

      // Resolve to coach-normal section target
      const resolvedSectionDist = resolveSectionTarget({
        sectionLabel: setLabel,
        desiredDistance: setDist,
        poolLen: poolLen,
        seed: seed,
      });

      // Update section distance to resolved value
      s.dist = resolvedSectionDist;

      // Set-level validation with reroll logic
      // Try up to 5 times to get a valid set body
      let body = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        const candidateBody = buildOneSetBodyShared({
          label: setLabel,
          targetDistance: resolvedSectionDist,
          poolLen,
          unitsShort,
          opts: optsWithTotal,
          seed: (seed + fnv1a32(setLabel) + attempts) >>> 0,
          rerollCount: attempts
        });
        
        if (!candidateBody) {
          attempts++;
          continue;
        }
        
        // Validate the generated body
        const validation = validateSetBody(candidateBody, resolvedSectionDist, poolLen, setLabel);
        if (validation.valid) {
          body = candidateBody;
          break;
        }
        
        attempts++;
      }

      if (!body) {
        const labelLower = String(setLabel).toLowerCase();
        if (labelLower.includes("warm") || labelLower.includes("cool")) {
          body = setDist + " easy";
        } else if (labelLower.includes("drill")) {
          body = setDist + " choice drill easy";
        } else if (labelLower.includes("kick") || labelLower.includes("pull")) {
          body = setDist + " moderate";
        } else if (labelLower.includes("main")) {
          body = setDist + " strong";
        } else {
          body = setDist + " steady";
        }
      }

      s.body = body;
    }

    // RED INJECTION: Inject full gas at workout level with ~50% probability
    injectOneFullGas(sets, seed);

    // COMPUTE ACTUAL TOTAL from generated sections (fixes "extra 50" bug)
    let actualTotalMeters = sets.reduce((sum, s) => sum + s.dist, 0);

    // TARGET LOCK: For standard pools, enforce exact match with slider value
    // Only apply to standard pool lengths (25m, 50m, 25yd = 22.86m)
    const isStandardPool = (poolLen === 25 || poolLen === 50 || Math.abs(poolLen - 22.86) < 0.01);
    if (isStandardPool) {
      const delta = targetTotal - actualTotalMeters;
      if (delta !== 0) {
        // Attempt minimal coach-safe correction
        // Adjust in multiples of pool length (one round trip = 2*poolLen preferred)
        const adjustUnit = poolLen * 2; // Prefer round trips for wall-safe
        
        // Minimum distances based on workout size
        // For short workouts we must allow 4 lengths (2 round trips) or Target Lock cannot correct
        const minShort = base * 4;
        const minCooldown = targetTotal >= 2500 ? 200 : (targetTotal >= 1500 ? 150 : minShort);
        const minWarmup = targetTotal >= 2500 ? 200 : (targetTotal >= 1500 ? 150 : minShort);
        
        // Find cooldown and warmup sections
        let cooldownIdx = -1;
        let warmupIdx = -1;
        for (let i = 0; i < sets.length; i++) {
          const lbl = String(sets[i].label).toLowerCase();
          if (lbl.includes("cool")) cooldownIdx = i;
          if (lbl.includes("warm")) warmupIdx = i;
        }
        
        let corrected = false;
        
        // Helper to regenerate section body after distance adjustment
        function regenerateSectionBody(section) {
          const setLabel = section.label;
          const setDist = section.dist;
          const templateKey = setLabel.toLowerCase().replace(/\s+/g, "").replace(/\d+$/, "");
          const templates = SECTION_TEMPLATES[templateKey];
          
          // Use longer rep distances for larger sets to stay under rep limits
          // For warmup/cooldown, prefer 100m or 200m reps for longer distances
          let repDist = base;
          if (setDist >= 600) repDist = 200;
          else if (setDist >= 300) repDist = 100;
          else repDist = Math.max(base, 50);
          
          // Snap repDist to pool multiples
          repDist = snapToPoolMultiple(repDist, base);
          const reps = Math.round(setDist / repDist);
          const fallbackBody = `${reps}x${repDist} easy`;
          
          if (!templates || templates.length === 0) {
            section.body = fallbackBody;
            return;
          }
          const exactFits = templates.filter(t => t.dist === setDist);
          if (exactFits.length > 0) {
            const tIdx = Math.abs(fnv1a32(String(seed + 9999))) % exactFits.length;
            section.body = exactFits[tIdx].body;
            return;
          }
          section.body = fallbackBody;
        }
        
        // COOLDOWN IS FIXED - do not adjust it. Use sensible value from calculateSensibleCoolDown.
        // Adjust warmup first instead, then main if needed.
        
        // Try warmup first (NOT cooldown - cooldown is now calculated sensibly)
        if (!corrected && warmupIdx >= 0) {
          const warmupSet = sets[warmupIdx];
          const currentWarm = warmupSet.dist;
          const currentBody = warmupSet.body;
          const newWarm = currentWarm + delta;
          const snappedNewWarm = snapToPoolMultiple(newWarm, poolLen);
          if (snappedNewWarm >= minWarmup && snappedNewWarm > 0) {
            warmupSet.dist = snappedNewWarm;
            actualTotalMeters = sets.reduce((sum, s) => sum + s.dist, 0);
            if (actualTotalMeters === targetTotal) {
              regenerateSectionBody(warmupSet);
              corrected = true;
            } else {
              warmupSet.dist = currentWarm;
              warmupSet.body = currentBody;
              actualTotalMeters = sets.reduce((sum, s) => sum + s.dist, 0);
            }
          }
        }
        
        // Try main set if warmup didn't work
        if (!corrected) {
          const mainIdx = sets.findIndex(s => String(s.label).toLowerCase().includes("main"));
          if (mainIdx >= 0) {
            const mainSet = sets[mainIdx];
            const currentMain = mainSet.dist;
            const currentBody = mainSet.body;
            const newMain = currentMain + delta;
            const snappedNewMain = snapToPoolMultiple(newMain, poolLen);
            if (snappedNewMain >= 200 && snappedNewMain > 0) {
              mainSet.dist = snappedNewMain;
              actualTotalMeters = sets.reduce((sum, s) => sum + s.dist, 0);
              if (actualTotalMeters === targetTotal) {
                regenerateSectionBody(mainSet);
                corrected = true;
              } else {
                mainSet.dist = currentMain;
                mainSet.body = currentBody;
                actualTotalMeters = sets.reduce((sum, s) => sum + s.dist, 0);
              }
            }
          }
        }
        
        // If still not corrected, reject and retry
        if (!corrected) {
          console.log("Target lock failed: delta=" + delta + ", target=" + targetTotal + ", actual=" + actualTotalMeters);
          return null;
        }
      }
    }

    // VALIDITY CHECK: actual total must be divisible by pool length
    // Use tolerance-based check for floating-point safety with custom pool lengths
    const actualTotalLengths = actualTotalMeters / poolLen;
    const roundedLengths = Math.round(actualTotalLengths);
    if (Math.abs(actualTotalLengths - roundedLengths) > 1e-6 || !Number.isFinite(actualTotalLengths)) {
      return null;
    }

    // COACH PLAUSIBILITY VALIDATION
    const validationResult = validateWorkout(sets, poolLen, actualTotalMeters);
    if (validationResult !== null) {
      console.log("Rejected workout: " + validationResult);
      return null;
    }

    // Format sections to lines
    const lines = [];
    for (const s of sets) {
      const bodyLines = String(s.body).split("\n");
      let firstLine = bodyLines[0];
      if (poolLen !== 25 && poolLen !== 50 && !firstLine.includes("(1 length") && !firstLine.match(/\(\d+\s+length/)) {
        const nxMatch = firstLine.match(/^(\d+)x(\d+)\b/);
        const distMatch = firstLine.match(/^(\d+)\s+\w+/);
        let total = 0;
        if (nxMatch) {
          total = Number(nxMatch[1]) * Number(nxMatch[2]);
        } else if (distMatch) {
          total = Number(distMatch[1]);
        }
        if (total && poolLen > 0 && total % poolLen === 0) {
          const lengths = total / poolLen;
          const suffix = ` (${lengths} length${lengths === 1 ? "" : "s"})`;
          firstLine += suffix;
        }
      }
      lines.push(s.label + ": " + firstLine);
      for (const extra of bodyLines.slice(1)) lines.push(extra);
      lines.push("");
    }

    while (lines.length && String(lines[lines.length - 1]).trim() === "") lines.pop();

    const footer = [];
    footer.push("");
    footer.push("Requested: " + String(targetTotal) + String(unitsShort));

    footer.push("Total lengths: " + String(roundedLengths) + " lengths");
    footer.push("Ends at start end: " + (roundedLengths % 2 === 0 ? "yes" : "no"));

    footer.push("Total distance: " + String(actualTotalMeters) + String(unitsShort) + " (pool: " + String(poolLabel) + ")");

    if (Number.isFinite(paceSec) && paceSec > 0) {
      const estTotal = estimateWorkoutTotalSeconds(lines.join("\n"), paceSec);
      if (Number.isFinite(estTotal)) {
        footer.push("Est total time: " + fmtMmSs(estTotal));
      }
    }

    const full = lines.join("\n") + "\n" + footer.join("\n");

    return { text: full, name: workoutName };

    function pickFromTypical(totalD, baseD, choices, pct) {
      const target = totalD * pct;
      const snappedChoices = choices
        .map(v => snapToPoolMultiple(v, baseD))
        .filter(v => v > 0);

      let best = snappedChoices[0] || snapToPoolMultiple(target, baseD);
      let bestDiff = Math.abs(best - target);

      for (const c of snappedChoices) {
        const diff = Math.abs(c - target);
        if (diff < bestDiff) {
          best = c;
          bestDiff = diff;
        }
      }

      const wiggle = (seed % 3) - 1;
      const idx = Math.max(0, Math.min(snappedChoices.length - 1, snappedChoices.indexOf(best) + wiggle));
      if (snappedChoices[idx]) best = snappedChoices[idx];

      return best;
    }

    function safeSimpleSetBody(label, dist, poolLen2, opts2) {
      const base2 = poolLen2;
      const d100 = snapToPoolMultiple(100, base2);
      const d50 = snapToPoolMultiple(50, base2);
      const d75 = snapToPoolMultiple(75, base2);
      const d25 = snapToPoolMultiple(25, base2);

      const k = String(label || "").toLowerCase();
      const rest = (k.includes("main") ? 20 : k.includes("drill") ? 20 : k.includes("build") ? 15 : 0);

      // Effort based on section type - respect warmup/cooldown as easy
      let effort;
      if (k.includes("warm") || k.includes("cool")) {
        effort = "easy";
      } else if (k.includes("drill")) {
        // Generate numbered drill set dynamically
        return generateDrillSetDynamic(dist, base2, seed || 0);
      } else if (k.includes("kick") || k.includes("pull")) {
        const kickEfforts = ["moderate", "steady", "strong"];
        effort = kickEfforts[(dist + (seed || 0)) % kickEfforts.length];
      } else if (k.includes("main")) {
        const mainEfforts = ["strong", "hard", "threshold", "fast", "steady", "build"];
        effort = mainEfforts[(dist + (seed || 0)) % mainEfforts.length];
      } else {
        const buildEfforts = ["moderate", "steady", "strong"];
        effort = buildEfforts[(dist + (seed || 0)) % buildEfforts.length];
      }
      
      // Helper function for dynamic drill generation - ALWAYS preserves exact distance, NO 1x blocks
      function generateDrillSetDynamic(drillDist, poolLen, drillSeed) {
        const drillNames = [
          "Fist", "Catch-up", "DPS", "Jazz Hands", "Long Dog", "Scull Front",
          "Finger Drag", "Single Arm", "Torpedo Glide", "Scull Rear", "3-3-3",
          "25 Drill / 25 Swim", "50 Drill / 50 Swim"
        ];
        // Use pool length multiples for rep distances (not 2×poolLen)
        const base = poolLen;
        const d50 = base <= 50 ? (Math.round(50 / base) * base) : base;
        const d100 = base <= 100 ? (Math.round(100 / base) * base) : (base * 2);
        const d25 = base <= 25 ? base : (base <= 50 ? base : Math.round(25 / base) * base);
        
        // Find rep distance that divides evenly - MUST be exact fit
        const repOptions = [d100, d50, d25, poolLen].filter(d => d > 0);
        let repDist = 0;
        let totalReps = 0;
        
        // Find first exact divisor
        for (const rd of repOptions) {
          if (rd > 0 && drillDist % rd === 0) {
            repDist = rd;
            totalReps = drillDist / rd;
            break;
          }
        }
        
        // If no exact fit found, try mixed-distance approach
        if (totalReps === 0) {
          // Find two rep distances that can sum to drillDist
          for (const d1 of repOptions) {
            if (d1 <= 0) continue;
            for (let r1 = 2; r1 <= 10; r1++) {
              const rem = drillDist - (r1 * d1);
              if (rem <= 0) continue;
              for (const d2 of repOptions) {
                if (d2 <= 0) continue;
                if (rem % d2 === 0) {
                  const r2 = rem / d2;
                  if (r2 >= 2 && r2 <= 10 && r1 * d1 + r2 * d2 === drillDist) {
                    // Found valid two-part split
                    const lines = [];
                    lines.push(String(r1) + "x" + String(d1) + " Drill FC");
                    for (let i = 0; i < r1; i++) {
                      lines.push((i + 1) + ". " + drillNames[(drillSeed + i) % drillNames.length]);
                    }
                    lines.push(String(r2) + "x" + String(d2) + " Drill FC");
                    for (let i = 0; i < r2; i++) {
                      lines.push((i + 1) + ". " + drillNames[(drillSeed + r1 + i) % drillNames.length]);
                    }
                    return lines.join("\n");
                  }
                }
              }
            }
          }
          
          // Ultimate fallback: use pool length as rep distance
          repDist = poolLen;
          totalReps = drillDist / poolLen;
          if (!Number.isInteger(totalReps) || totalReps < 1) {
            // Cannot divide evenly - return single distance line
            return String(drillDist) + " choice drill easy";
          }
        }
        
        // Handle edge case: only 1 rep needed - prefer smaller rep distance for more reps
        if (totalReps === 1) {
          // Try to use a smaller rep distance to get 2+ reps
          for (const rd of [d50, d25, poolLen].filter(d => d > 0 && d < repDist)) {
            if (drillDist % rd === 0) {
              const newReps = drillDist / rd;
              if (newReps >= 2 && newReps <= 10) {
                repDist = rd;
                totalReps = newReps;
                break;
              }
            }
          }
          // If still 1 rep, use 2x half-distance format
          if (totalReps === 1 && drillDist >= 50) {
            const halfDist = drillDist / 2;
            if (halfDist % poolLen === 0) {
              const lines = [];
              lines.push("2x" + String(halfDist) + " Drill FC");
              lines.push("1. " + drillNames[drillSeed % drillNames.length]);
              lines.push("2. " + drillNames[(drillSeed + 1) % drillNames.length]);
              return lines.join("\n");
            }
          }
          // Ultimate fallback: still use numbered format
          const lines = [];
          lines.push("1x" + String(drillDist) + " Drill FC");
          lines.push("1. choice drill");
          return lines.join("\n");
        }
        
        // Max 10 reps per numbered block for readability
        const maxRepsPerBlock = 10;
        
        // Single block case: if reps <= max, just return one block
        if (totalReps <= maxRepsPerBlock && totalReps >= 2) {
          const header = String(totalReps) + "x" + String(repDist) + " Drill FC";
          const lines = [header];
          for (let i = 0; i < totalReps; i++) {
            lines.push((i + 1) + ". " + drillNames[(drillSeed + i) % drillNames.length]);
          }
          return lines.join("\n");
        }
        
        // Multi-block case: split evenly into blocks of 4-10 reps each
        const numBlocks = Math.ceil(totalReps / maxRepsPerBlock);
        const baseRepsPerBlock = Math.floor(totalReps / numBlocks);
        const extraReps = totalReps % numBlocks;
        
        const lines = [];
        let drillIdx = drillSeed;
        let usedReps = 0;
        
        for (let block = 0; block < numBlocks; block++) {
          // Distribute extra reps evenly across first blocks
          const blockReps = baseRepsPerBlock + (block < extraReps ? 1 : 0);
          
          // Guarantee minimum 2 reps per block
          if (blockReps < 2) continue;
          
          lines.push(String(blockReps) + "x" + String(repDist) + " Drill FC");
          for (let i = 0; i < blockReps; i++) {
            lines.push((i + 1) + ". " + drillNames[(drillIdx + i) % drillNames.length]);
          }
          drillIdx += blockReps;
          usedReps += blockReps;
        }
        
        // Safety: if we somehow didn't emit anything, use single distance line
        if (lines.length === 0) {
          return String(drillDist) + " choice drill easy";
        }
        
        return lines.join("\n");
      }
      
      // Max reps limits: 30 for 25s, 20 for 50s, 16 for 100s
      function maxRepsFor(repDist) {
        if (repDist <= 25) return 30;
        if (repDist <= 50) return 20;
        if (repDist <= 100) return 16;
        return 12;
      }
      
      // Try exact fit first - enforce max reps limits
      const candidates = [d100, d50, d75, d25].filter(d => d > 0);
      for (const repDist of candidates) {
        if (dist % repDist === 0) {
          const reps = dist / repDist;
          const maxR = maxRepsFor(repDist);
          if (reps >= 2 && reps <= maxR) {
            return String(reps) + "x" + String(repDist) + " " + effort + (rest > 0 ? " rest " + String(rest) + "s" : "");
          }
        }
      }
      
      // If reps would exceed max, split into structured rounds
      for (const repDist of candidates) {
        if (dist % repDist === 0) {
          const totalReps = dist / repDist;
          const maxR = maxRepsFor(repDist);
          if (totalReps > maxR) {
            // Split into even rounds (e.g., 3x10x25 instead of 30x25)
            const numRounds = Math.ceil(totalReps / maxR);
            const repsPerRound = Math.floor(totalReps / numRounds);
            const remainder = totalReps - (repsPerRound * numRounds);
            
            const lines = [];
            for (let round = 0; round < numRounds; round++) {
              const thisRoundReps = repsPerRound + (round < remainder ? 1 : 0);
              if (thisRoundReps >= 2) {
                // Vary effort per round for visual interest
                const roundEfforts = ["strong", "hard", "threshold", "build", "fast"];
                const roundEffort = roundEfforts[(round + (seed || 0)) % roundEfforts.length];
                lines.push(String(thisRoundReps) + "x" + String(repDist) + " " + roundEffort + (rest > 0 ? " rest " + String(rest) + "s" : ""));
              }
            }
            if (lines.length > 0) return lines.join("\n");
          }
        }
      }

      // Two-part fallback: find r1 x d1 + r2 x d2 = dist (no filler)
      // Use effort variety for both parts
      const effort2Variants = ["moderate", "strong", "steady"];
      const effort2 = effort2Variants[(dist + 1) % effort2Variants.length];
      
      for (const d1 of candidates) {
        for (const d2 of candidates) {
          if (d1 === d2) continue;
          const maxR1 = maxRepsFor(d1);
          const maxR2 = maxRepsFor(d2);
          for (let r1 = 2; r1 <= Math.min(12, maxR1); r1++) {
            const remaining = dist - r1 * d1;
            if (remaining > 0 && remaining % d2 === 0) {
              const r2 = remaining / d2;
              if (r2 >= 2 && r2 <= Math.min(12, maxR2) && r1 * d1 + r2 * d2 === dist) {
                const line1 = String(r1) + "x" + String(d1) + " " + effort + (rest > 0 ? " rest " + String(rest) + "s" : "");
                const line2 = String(r2) + "x" + String(d2) + " " + effort2 + (rest > 0 ? " rest " + String(Math.max(10, rest - 5)) + "s" : "");
                return line1 + "\n" + line2;
              }
            }
          }
        }
      }

      // Last resort: split into max-rep blocks that sum to exact total
      const smallest = candidates[candidates.length - 1] || base2;
      if (dist % smallest === 0) {
        const totalReps = dist / smallest;
        const maxR = maxRepsFor(smallest);
        if (totalReps > maxR) {
          const numBlocks = Math.ceil(totalReps / maxR);
          const baseRepsPerBlock = Math.floor(totalReps / numBlocks);
          const extraReps = totalReps % numBlocks;
          
          const lines = [];
          let usedReps = 0;
          for (let b = 0; b < numBlocks; b++) {
            // Distribute extra reps across first blocks to ensure exact total
            const blockReps = baseRepsPerBlock + (b < extraReps ? 1 : 0);
            if (blockReps >= 2) {
              const blockEfforts = ["strong", "hard", "threshold", "fast", "build"];
              const blockEffort = blockEfforts[b % blockEfforts.length];
              lines.push(String(blockReps) + "x" + String(smallest) + " " + blockEffort + (rest > 0 ? " rest " + String(rest) + "s" : ""));
              usedReps += blockReps;
            }
          }
          
          // Verify total: usedReps * smallest must equal dist
          if (lines.length > 0 && usedReps * smallest === dist) {
            return lines.join("\n");
          }
        }
        if (totalReps >= 2) {
          return String(totalReps) + "x" + String(smallest) + " " + effort + (rest > 0 ? " rest " + String(rest) + "s" : "");
        }
      }

      // Absolute fallback: single distance line (never 1x filler)
      return String(dist) + " " + effort;
    }
  }
});
app.listen(PORT, '0.0.0.0', () => {
  console.log("Server running on port " + String(PORT));
});
