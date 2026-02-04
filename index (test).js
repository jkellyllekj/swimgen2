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

// Universal snapping: ALL pools use 2×poolLen as base unit for home-wall finish
function snapToPoolMultipleShared(dist, poolLen) {
  const d = Number(dist);
  if (!Number.isFinite(d) || d <= 0) return 0;
  const base = Number(poolLen);
  if (!Number.isFinite(base) || base <= 0) return d;
  // Snap to 2×poolLen (round trip) to ensure home-wall finish
  const base2 = base * 2;
  return Math.round(d / base2) * base2;
}

// For rep distances, snap to single pool length multiples
function snapRepDistToPool(dist, poolLen) {
  const d = Number(dist);
  if (!Number.isFinite(d) || d <= 0) return 0;
  const base = Number(poolLen);
  if (!Number.isFinite(base) || base <= 0) return d;
  return Math.round(d / base) * base;
}
// Backward-compat wrappers.
// Some parts of the codebase still call the older names.
// If these wrappers are missing, generation throws and the UI falls back.
function snapToPoolMultiple(dist, poolLen) {
  return snapToPoolMultipleShared(dist, poolLen);
}

function snapRepDist(dist, poolLen) {
  return snapRepDistToPool(dist, poolLen);
}

// ============================================================================
// SECTION_TARGET_RESOLVER_R020
// Shared resolver for coach-normal section target distances.
// ============================================================================

const SECTION_TARGET_BUCKETS = {
  warmup:   [200, 300, 400, 500, 600],
  build:    [200, 300, 400, 500],
  kick:     [200, 300, 400, 500],
  drill:    [200, 300, 400],
  main:     [400, 600, 800, 1000, 1200, 1600],
  cooldown: [100, 200, 300, 400, 500],
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

// Allowed rep counts by rep distance (coach-plausible patterns)
// Expanded to include common counts like 11, 14, 15 that occur with odd pools
function isAllowedRepCount(repCount, repDistance) {
  const r = Number(repCount);
  const d = Number(repDistance);
  if (!Number.isFinite(r) || r < 1) return false;
  if (!Number.isFinite(d) || d <= 0) return false;
  
  // Single rep is always allowed
  if (r === 1) return true;

  // Coach-plausible rep counts only.
  // These are the common shapes a real coach writes.
  const allowed = new Set([2, 3, 4, 5, 6, 8, 9, 10, 12, 16, 20]);

  return allowed.has(r);
}

// Check if total distance ends at home end (even number of lengths)
function endsAtHomeEnd(totalDistance, poolLen) {
  const d = Number(totalDistance);
  const p = Number(poolLen);
  if (!Number.isFinite(d) || !Number.isFinite(p) || p <= 0) return false;
  const lengths = d / p;
  return Number.isInteger(lengths) && lengths % 2 === 0;
}

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

// EVEN REP SCHEME PICKER - Enforces even rep counts for Drill/Kick sets
// Returns { reps, repDist } or null if no valid scheme found
function pickEvenRepScheme(targetDistance, poolLen, kind) {
  const target = Number(targetDistance);
  const base = Number(poolLen);
  if (!target || target <= 0 || !base || base <= 0) return null;
  
  // Snap rep distance to pool multiple
  const snapRepDist = (d) => {
    if (d <= 0 || base <= 0) return 0;
    return Math.round(d / base) * base || base;
  };
  
  // Preferred rep distances by kind (in priority order)
  const prefDists = kind === "drill" 
    ? [50, 25, 75, 100] 
    : [50, 25, 100]; // kick
  
  // Allowed even rep counts (coach-plausible)
  const allowedReps = [4, 6, 8, 10, 12, 16, 20];
  
  // First pass: try preferred distances with allowed rep counts
  for (const pref of prefDists) {
    const repDist = snapRepDist(pref);
    if (repDist <= 0) continue;
    if (target % repDist !== 0) continue;
    const reps = target / repDist;
    if (!Number.isInteger(reps)) continue;
    if (reps % 2 === 0 && allowedReps.includes(reps)) {
      return { reps, repDist };
    }
  }
  
  // Second pass: accept any even reps between 4 and 24 (for odd pool edge cases)
  for (const pref of prefDists) {
    const repDist = snapRepDist(pref);
    if (repDist <= 0) continue;
    if (target % repDist !== 0) continue;
    const reps = target / repDist;
    if (!Number.isInteger(reps)) continue;
    if (reps >= 4 && reps <= 24 && reps % 2 === 0) {
      return { reps, repDist };
    }
  }
  
  // Third pass: try pool length multiples directly
  for (let mult = 1; mult <= 4; mult++) {
    const repDist = base * mult;
    if (target % repDist !== 0) continue;
    const reps = target / repDist;
    if (!Number.isInteger(reps)) continue;
    if (reps >= 4 && reps <= 24 && reps % 2 === 0) {
      return { reps, repDist };
    }
  }
  
  // Fourth pass: accept even reps 2-30 as last resort
  for (const pref of prefDists) {
    const repDist = snapRepDist(pref);
    if (repDist <= 0) continue;
    if (target % repDist !== 0) continue;
    const reps = target / repDist;
    if (!Number.isInteger(reps)) continue;
    if (reps >= 2 && reps <= 30 && reps % 2 === 0) {
      return { reps, repDist };
    }
  }
  
  return null;
}

// Parse a line to extract NxD format
function parseNxD(line) {
  const match = String(line || "").match(/^(\d+)x(\d+)/i);
  if (!match) return null;
  return { reps: Number(match[1]), dist: Number(match[2]) };
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

// Shuffle array deterministically based on seed
function shuffleWithSeed(arr, seed) {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = ((seed * (i + 1) * 9973) >>> 0) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// FNV-1a 32-bit hash for deterministic randomisation
function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h >>> 0;
}

// Mulberry32 PRNG for deterministic random
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Check if body contains full gas effort words
function isFullGasBody(body) {
  const low = String(body).toLowerCase();
  return low.includes("sprint") || low.includes("all out") || low.includes("full gas") || low.includes("max effort");
}

// Inject one full gas into Main or Kick with ~30% probability (reduced for more flat sets)
function injectOneFullGas(sections, seed) {
  // If any section already full gas, do nothing
  const already = sections.some(s => isFullGasBody(s.body));
  if (already) return sections;

  // 60% probability to ensure red appears regularly in realistic workouts
  if (mulberry32(seed >>> 0)() >= 0.6) return sections;

  // Only Main (not Kick - kick should stay moderate/strong)
  const candidates = sections
    .map((s, i) => ({ s, i, k: String(s.label).toLowerCase() }))
    .filter(x => x.k.includes("main"));

  if (!candidates.length) return sections;

  const pick = candidates[
    Math.floor(mulberry32((seed ^ 0x9e3779b9) >>> 0)() * candidates.length)
  ];

  const idx = pick.i;
  const lines = String(sections[idx].body).split("\n").filter(Boolean);
  if (!lines.length) return sections;

  // Prefer to replace an existing effort word on any line, not just line 0.
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    if (/strong/i.test(lines[i])) {
      lines[i] = lines[i].replace(/strong/i, "sprint");
      changed = true;
      break;
    }
    if (/fast/i.test(lines[i])) {
      lines[i] = lines[i].replace(/fast/i, "sprint");
      changed = true;
      break;
    }
    if (/hard/i.test(lines[i])) {
      lines[i] = lines[i].replace(/hard/i, "sprint");
      changed = true;
      break;
    }
  }

  // If there was no explicit effort word, allow build or descend to become sprint focused.
  // This keeps it coach shaped without appending sprint blindly.
  if (!changed) {
    for (let i = 0; i < lines.length; i++) {
      if (/\bbuild\b/i.test(lines[i]) && !/sprint/i.test(lines[i])) {
        lines[i] = lines[i].replace(/\bbuild\b/i, "build to sprint");
        changed = true;
        break;
      }
      if (/\bdescend\b/i.test(lines[i]) && !/sprint/i.test(lines[i])) {
        // If it already has "to X", overwrite X with sprint
        if (/\bdescend\b.*\bto\b/i.test(lines[i])) {
          lines[i] = lines[i].replace(/\bto\b\s+\w+/i, "to sprint");
        } else {
          lines[i] = lines[i].replace(/\bdescend\b/i, "descend to sprint");
        }
        changed = true;
        break;
      }
    }
  }

  if (!changed) return sections;

  sections[idx].body = lines.join("\n");
  return sections;
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
    <div id="adBanner" style="width:100%; max-width:520px; height:50px; margin-bottom:10px; background:rgba(200,200,200,0.5); border-radius:6px; display:flex; align-items:center; justify-content:center; gap:16px; font-size:12px; color:#666;">
      <a href="/viewport-lab" style="color:inherit; text-decoration:underline; font-weight:600;">Viewport Lab</a>
    </div>

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
                <button id="bgCycleBtn" type="button" aria-label="Change background" class="iconBtnBare iconSm">🖼️</button>
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

                <div id="advancedRow" style="display:flex; align-items:center; justify-content:flex-start; gap:10px; margin-top:10px; position:relative;">
                  <button type="button" id="toggleAdvanced" style="background:transparent; border:none; text-align:left; font-size:16px; opacity:0.95; display:flex; align-items:center; gap:8px; cursor:pointer; padding:0; font-weight:700;">
                    <span id="advancedChip" class="whiteChip">▶ Advanced options</span>
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

      <div id="resultWrap" style="margin-top:16px; padding:0; background:transparent; border-radius:0; border:none; box-shadow:none;">
        <div id="errorBox" style="display:none; margin-bottom:10px; padding:10px; background:#fff; border:1px solid #e7e7e7; border-radius:8px;"></div>

        <div id="workoutNameDisplay" style="display:none; margin-bottom:8px; margin-top:10px; scroll-margin-top:20px;">
          <div class="workoutTitleRow">
            <button id="regenBtn2" type="button" aria-label="Regenerate" class="iconBtnBare iconSm"><img class="dolphinIcon" src="/assets/dolphins/dolphin-base.png" alt=""></button>
            <button id="bgCycleBtn2" type="button" aria-label="Change background" class="iconBtnSilhouette iconSm">🖼️</button>
            <span id="workoutNameText" style="display:inline-block; font-weight:700; font-size:15px; font-variant:small-caps; color:#111; background:#ffff00; padding:6px 14px; border-radius:4px; border:1px solid #111; box-shadow:0 2px 6px rgba(0,0,0,0.25);"></span>
          </div>
        </div>
        <div id="cards" style="display:none;"></div>

        <div id="totalBox" style="display:none; text-align:right; margin-top:8px;"><span id="totalText" style="display:inline-block; font-weight:700; font-size:15px; font-variant:small-caps; color:#111; background:#ffff00; padding:6px 14px; border-radius:4px; border:1px solid #111; box-shadow:0 2px 6px rgba(0,0,0,0.25);"></span></div>
        <div id="footerBox" class="glassSummary" style="display:none; margin-top:8px; padding:12px;"></div>

        <pre id="raw" style="display:none; margin-top:12px; padding:12px; background:#fff; border-radius:8px; border:1px solid #e7e7e7; white-space:pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size:13px; line-height:1.35;"></pre>
      </div>
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
  `;
  const HOME_JS_OPEN = `
    <script>
  `;
  const HOME_JS_DOM = `
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

      function setDistance(val, skipSave) {
        const snapped = snap100(val);
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

      async function cycleBackgroundManually() {
        const btn = document.getElementById("bgCycleBtn");
        const bgA = document.getElementById("bgA");
        const bgB = document.getElementById("bgB");
        if (!btn || !bgA || !bgB) return;

        btn.disabled = true;

        const nextIndex = (bgIndex + 1) % backgroundImages.length;
        const nextUrl = backgroundImages[nextIndex];

        console.log("[BG CYCLE] BEFORE:", {
          bgIndex: bgIndex,
          nextIndex: nextIndex,
          activeBgLayer: activeBgLayer,
          nextUrl: nextUrl
        });

        try {
          await preloadImage(nextUrl);
        } catch (e) {
          console.log("[BG CYCLE] preload FAILED:", e);
          btn.disabled = false;
          return;
        }

        const fromLayer = activeBgLayer === "A" ? bgA : bgB;
        const toLayer = activeBgLayer === "A" ? bgB : bgA;

        console.log("[BG CYCLE] LAYERS:", {
          fromLayerId: fromLayer.id,
          toLayerId: toLayer.id
        });

        setLayerImage(toLayer, nextUrl);

        toLayer.classList.add("isActive");
        fromLayer.classList.remove("isActive");

        console.log("[BG CYCLE] AFTER TOGGLE:", {
          bgA_classList: bgA.className,
          bgB_classList: bgB.className,
          bgA_opacity: getComputedStyle(bgA).opacity,
          bgB_opacity: getComputedStyle(bgB).opacity,
          bgA_bgImage: bgA.style.backgroundImage.slice(0, 60),
          bgB_bgImage: bgB.style.backgroundImage.slice(0, 60)
        });

        window.setTimeout(function() {
          bgIndex = nextIndex;
          activeBgLayer = activeBgLayer === "A" ? "B" : "A";
          btn.disabled = false;
          console.log("[BG CYCLE] COMMITTED:", { bgIndex: bgIndex, activeBgLayer: activeBgLayer });
        }, 300);
      }

      function wireBackgroundCycleButton() {
        const btn = document.getElementById("bgCycleBtn");
        if (!btn) return;
        btn.addEventListener("click", cycleBackgroundManually);
      }

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

        for (const btn of poolButtons.querySelectorAll("button[data-pool]")) {
          const isActive = btn.getAttribute("data-pool") === poolValue;
          if (isActive) {
            btn.classList.add("active");
          } else {
            btn.classList.remove("active");
          }
        }
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
              scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
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

      function setupCardGestures(card, index) {
        let startX = 0, startY = 0;
        let currentX = 0, currentY = 0;
        let isSwiping = false;
        let isPointerDown = false;
        let tapCount = 0;
        let tapTimer = null;
        
        // Long-press drag variables
        let pressTimer = null;
        let isLongPressDragging = false;
        let dragStartY = 0;
        let dragStartX = 0;
        let dragPlaceholder = null;

        function startPressTimer() {
          pressTimer = setTimeout(() => {
            isLongPressDragging = true;
            isSwiping = false; // Cancel any swipe
            card.classList.add('dragging');
            card.style.opacity = '0.85';
            card.style.transform = 'scale(1.03)';
            card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
            card.style.zIndex = '1000';
            card.style.position = 'relative';
            card.style.touchAction = 'none'; // Prevent page scroll on mobile
            document.body.style.overflow = 'hidden'; // Lock body scroll
            dragStartY = currentY;
            dragStartX = currentX; // Track X position for horizontal swipe detection during drag
            
            // Create placeholder for drop zone visualization
            dragPlaceholder = document.createElement('div');
            dragPlaceholder.className = 'drag-placeholder';
            dragPlaceholder.style.height = card.offsetHeight + 'px';
            dragPlaceholder.style.display = 'none';
          }, 300);
        }

        function cancelPressTimer() {
          if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
          }
          // Reset touch action if not in drag mode
          if (!isLongPressDragging) {
            card.style.touchAction = '';
          }
        }

        // Touch move handler to prevent page scroll during drag
        function preventScroll(e) {
          if (isLongPressDragging) {
            e.preventDefault();
          }
        }
        
        card.addEventListener('touchmove', preventScroll, { passive: false });
        
        card.addEventListener('pointerdown', function(e) {
          startX = e.clientX;
          startY = e.clientY;
          currentX = e.clientX;
          currentY = e.clientY;
          isPointerDown = true;
          card.setPointerCapture(e.pointerId);
          
          // Start long-press timer
          startPressTimer();

          tapCount++;
          if (tapCount === 1) {
            tapTimer = setTimeout(() => { tapCount = 0; }, 300);
          } else if (tapCount === 2) {
            clearTimeout(tapTimer);
            cancelPressTimer();
            tapCount = 0;
            // Use data-index for accurate index after delete/move operations
            const currentIndex = parseInt(card.getAttribute('data-index'));
            console.log('Double-tap on set with data-index:', currentIndex);
            if (!isNaN(currentIndex)) {
              openGestureEditModal(currentIndex);
            }
            e.preventDefault();
          }
        });

        card.addEventListener('pointermove', function(e) {
          if (!isPointerDown) return;
          currentX = e.clientX;
          currentY = e.clientY;
          const deltaX = currentX - startX;
          const deltaY = currentY - startY;
          
          // Detect vertical drag start even without long-press (25px threshold for reliability)
          if (!isLongPressDragging && Math.abs(deltaY) > 25 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
            // Clear long-press timer since we're starting drag
            cancelPressTimer();
            
            // Start drag mode
            isLongPressDragging = true;
            dragStartY = startY;
            dragStartX = startX;
            
            // Set up drag visuals
            card.classList.add('dragging');
            card.style.transition = 'none';
            card.style.zIndex = '1000';
            card.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
            card.style.touchAction = 'none';
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
            
            e.preventDefault();
            return; // Let next move event handle the actual drag
          }
          
          // Handle long-press dragging - allow diagonal movement (both X and Y)
          if (isLongPressDragging) {
            e.preventDefault();
            const dragOffsetY = currentY - dragStartY;
            const dragOffsetX = currentX - dragStartX;
            
            // Allow diagonal movement: translate both X and Y
            card.style.transform = 'translate(' + dragOffsetX + 'px, ' + dragOffsetY + 'px) scale(1.03)';
            
            // Auto-scroll when dragging near screen edges
            const autoScrollMargin = 100;
            const viewportHeight = window.innerHeight;
            const cardRect = card.getBoundingClientRect();
            
            if (cardRect.bottom > viewportHeight - autoScrollMargin) {
              window.scrollBy({ top: 30, behavior: 'instant' });
            } else if (cardRect.top < autoScrollMargin && window.scrollY > 0) {
              window.scrollBy({ top: -30, behavior: 'instant' });
            }
            
            // Show visual feedback for horizontal swipe during drag
            card.classList.remove('swiping-right', 'swiping-left');
            if (dragOffsetX > 60) card.classList.add('swiping-right');
            else if (dragOffsetX < -60) card.classList.add('swiping-left');
            
            // Highlight potential drop positions (gap animation) with smooth transition
            highlightDropZoneSmooth(card, currentY);
            return;
          }
          
          // If moving too much before long-press triggers, cancel it (increased threshold)
          if (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15) {
            cancelPressTimer();
          }

          // Handle horizontal swiping (existing logic) - only if not in long-press mode
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            isSwiping = true;
            e.preventDefault();
            const limitedDelta = Math.max(-100, Math.min(100, deltaX));
            card.style.transform = 'translateX(' + limitedDelta + 'px)';
            card.classList.remove('swiping-right', 'swiping-left');
            if (deltaX > 50) card.classList.add('swiping-right');
            else if (deltaX < -50) card.classList.add('swiping-left');
          }
        });

        card.addEventListener('pointerup', function(e) {
          cancelPressTimer();
          if (!isPointerDown) return;
          isPointerDown = false;
          
          // Handle long-press drag drop - decide swipe vs drop at the END
          if (isLongPressDragging) {
            isLongPressDragging = false;
            
            const dragOffsetX = currentX - dragStartX;
            const dragOffsetY = currentY - dragStartY;
            
            // Decide: is this a horizontal swipe or a drag-drop?
            const isHorizontalSwipe = Math.abs(dragOffsetX) > 80 && Math.abs(dragOffsetX) > Math.abs(dragOffsetY) * 1.5;
            
            if (isHorizontalSwipe) {
              // Horizontal swipe detected - trigger delete/defer
              card.classList.remove('swiping-right', 'swiping-left');
              resetDragStyles(card);
              
              // Clear gap animations on other cards
              document.querySelectorAll('[data-effort][data-index]').forEach(c => {
                c.style.transform = '';
                c.style.transition = 'transform 0.2s ease-out';
              });
              
              const currentIndex = parseInt(card.getAttribute('data-index'));
              if (!isNaN(currentIndex)) {
                if (dragOffsetX > 0) {
                  deleteWorkoutSet(currentIndex);
                } else {
                  moveSetToBottom(currentIndex);
                }
              }
            } else {
              // This is a drag-drop operation
              handleDragDropSmooth(card, currentY);
            }
            return;
          }
          
          const deltaX = currentX - startX;
          card.style.transform = '';
          card.classList.remove('swiping-right', 'swiping-left');

          if (isSwiping) {
            // Use data-index for accurate index after delete/move operations
            const currentIndex = parseInt(card.getAttribute('data-index'));
            if (!isNaN(currentIndex)) {
              if (deltaX > 100) {
                // Delete immediately without confirmation for smoother UX
                deleteWorkoutSet(currentIndex);
              } else if (deltaX < -100) {
                moveSetToBottom(currentIndex);
              }
            }
          }
          isSwiping = false;
        });
        
        card.addEventListener('pointercancel', function(e) {
          cancelPressTimer();
          isPointerDown = false;
          
          // Only handle if we're actively dragging
          if (!isLongPressDragging) return;
          
          // Log and preserve drag state - let pointerup handle cleanup
          console.log('Pointer canceled during drag, preserving state');
          
          // Delay reset to allow any in-progress drop to complete
          isLongPressDragging = false;
          setTimeout(() => {
            resetDragStyles(card);
          }, 50);
        });
      }
      
      // Track last stable drop target to prevent flickering
      let lastDropTarget = null;
      
      // Highlight drop zone during drag - shows a line/gap where card will be inserted
      function highlightDropZone(draggedCard, currentY) {
        const cards = Array.from(document.querySelectorAll('[data-effort][data-index]'));
        const draggedIndex = parseInt(draggedCard.getAttribute('data-index'));
        const bufferZone = 10; // 10px buffer to prevent flickering at boundaries
        
        // Find where the drop line should appear
        let newDropTarget = null;
        let newDropPosition = null;
        
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (c === draggedCard) continue;
          
          const rect = c.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const cardIndex = parseInt(c.getAttribute('data-index'));
          
          // Add buffer zone to prevent flickering at boundary
          if (currentY < midY - bufferZone) {
            // Clearly above midpoint - show line above this card
            if (cardIndex !== draggedIndex + 1) {
              newDropTarget = c;
              newDropPosition = 'above';
            }
            break;
          } else if (Math.abs(currentY - midY) <= bufferZone && lastDropTarget === c) {
            // Within buffer zone and same target - keep current highlight
            newDropTarget = c;
            newDropPosition = c.classList.contains('drop-above') ? 'above' : 
                             c.classList.contains('drop-below') ? 'below' : null;
            break;
          }
        }
        
        // If no target found above, check if below all cards
        if (!newDropTarget) {
          const lastCard = cards.filter(c => c !== draggedCard).pop();
          if (lastCard) {
            const lastRect = lastCard.getBoundingClientRect();
            const lastMidY = lastRect.top + lastRect.height / 2;
            const lastIndex = parseInt(lastCard.getAttribute('data-index'));
            
            if (currentY > lastMidY + bufferZone) {
              // Clearly below last card
              if (lastIndex !== draggedIndex - 1) {
                newDropTarget = lastCard;
                newDropPosition = 'below';
              }
            } else if (Math.abs(currentY - lastMidY) <= bufferZone && lastDropTarget === lastCard) {
              // Within buffer zone - keep current
              newDropTarget = lastCard;
              newDropPosition = lastCard.classList.contains('drop-below') ? 'below' : 
                               lastCard.classList.contains('drop-above') ? 'above' : null;
            }
          }
        }
        
        // Update highlights only if target changed
        if (newDropTarget !== lastDropTarget || newDropPosition) {
          cards.forEach(c => c.classList.remove('drop-above', 'drop-below'));
          
          if (newDropTarget && newDropPosition) {
            newDropTarget.classList.add('drop-' + newDropPosition);
          }
        }
        
        lastDropTarget = newDropTarget;
      }
      
      // Reset drag styles
      function resetDragStyles(card) {
        card.classList.remove('dragging');
        card.style.opacity = '';
        card.style.transform = '';
        card.style.boxShadow = '';
        card.style.zIndex = '';
        card.style.position = '';
        card.style.touchAction = ''; // Re-enable touch scrolling
        document.body.style.overflow = ''; // Unlock body scroll
        document.body.style.touchAction = ''; // Re-enable body touch
        lastDropTarget = null; // Reset drop target tracking
        lastHighlightedIndex = -1; // Reset highlight tracking
        
        // Remove all drop highlights and clear transforms
        document.querySelectorAll('.drop-above, .drop-below').forEach(c => {
          c.classList.remove('drop-above', 'drop-below');
        });
        document.querySelectorAll('[data-effort][data-index]').forEach(c => {
          if (c !== card) {
            c.style.transform = '';
          }
        });
      }
      
      // Track current drop state to prevent unnecessary updates
      let lastHighlightedIndex = -1;
      let highlightRAFPending = false;
      
      // Highlight drop zone with smooth gap animation
      function highlightDropZoneSmooth(draggedCard, currentY) {
        const cards = Array.from(document.querySelectorAll('[data-effort][data-index]'));
        const draggedIndex = parseInt(draggedCard.getAttribute('data-index'));
        const bufferZone = 15; // Buffer to prevent flickering
        
        // Find the target drop position
        let targetIndex = -1;
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (c === draggedCard) continue;
          
          const rect = c.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const cardIndex = parseInt(c.getAttribute('data-index'));
          
          // Use buffer zone to prevent flickering at boundaries
          if (currentY < midY - bufferZone) {
            targetIndex = cardIndex;
            break;
          } else if (Math.abs(currentY - midY) <= bufferZone && lastHighlightedIndex === cardIndex) {
            // Within buffer zone and same target - keep current
            targetIndex = lastHighlightedIndex;
            break;
          }
        }
        
        // Only update if target changed (prevents constant re-renders)
        if (targetIndex === lastHighlightedIndex) {
          return;
        }
        
        lastHighlightedIndex = targetIndex;
        
        // Skip if RAF already pending
        if (highlightRAFPending) return;
        highlightRAFPending = true;
        
        // Apply transforms in next frame to minimize disruption to dragged card
        requestAnimationFrame(() => {
          highlightRAFPending = false;
          
          // Apply transforms based on target
          cards.forEach(c => {
            if (c === draggedCard) return;
            
            const cardIndex = parseInt(c.getAttribute('data-index'));
            c.style.transition = 'transform 0.15s ease-out';
          
          if (targetIndex !== -1 && cardIndex >= targetIndex && cardIndex !== draggedIndex) {
            // Cards at or below drop point shift down
            c.style.transform = 'translateY(40px)';
            if (cardIndex === targetIndex) {
              c.classList.add('drop-above');
            }
          } else {
            // Cards above drop point - no shift
            c.style.transform = '';
            c.classList.remove('drop-above', 'drop-below');
          }
        });
        }); // End requestAnimationFrame
      }
      
      // Handle drop with smooth animation
      function handleDragDropSmooth(draggedCard, dropY) {
        const cards = Array.from(document.querySelectorAll('[data-effort][data-index]'));
        const draggedIndex = parseInt(draggedCard.getAttribute('data-index'));
        let insertBeforeIndex = -1;
        
        // Find which card to insert before based on Y position
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (c === draggedCard) continue;
          
          const rect = c.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          
          if (dropY < midY) {
            insertBeforeIndex = i;
            break;
          }
        }
        
        // Calculate effective new position
        let newIndex;
        if (insertBeforeIndex === -1) {
          newIndex = cards.length - 1;
        } else if (insertBeforeIndex > draggedIndex) {
          newIndex = insertBeforeIndex - 1;
        } else {
          newIndex = insertBeforeIndex;
        }
        
        const willDrop = newIndex !== draggedIndex;
        console.log('handleDragDropSmooth: draggedIndex=' + draggedIndex + ', newIndex=' + newIndex + ', willDrop=' + willDrop);
        
        // Clear drop highlights
        cards.forEach(c => {
          c.classList.remove('drop-above', 'drop-below');
        });
        
        if (willDrop) {
          // We're dropping to a new position
          // Store the dragged card's current visual position
          const draggedRect = draggedCard.getBoundingClientRect();
          
          // Prevent dragged card from interfering during reorder
          draggedCard.style.pointerEvents = 'none';
          draggedCard.style.zIndex = '1000';
          
          // Do DOM reorder immediately (this moves the card in the DOM)
          reorderWorkoutSet(draggedIndex, newIndex);
          
          // Force layout recalc to get new position
          void draggedCard.offsetHeight;
          
          // Get the new position after reorder
          const newRect = draggedCard.getBoundingClientRect();
          
          // Calculate offset from current visual position to new DOM position
          const deltaX = draggedRect.left - newRect.left;
          const deltaY = draggedRect.top - newRect.top;
          
          // Position card at its old visual location (where user dropped it)
          draggedCard.style.transition = 'none';
          draggedCard.style.transform = 'translate(' + deltaX + 'px, ' + deltaY + 'px)';
          
          // Force reflow
          void draggedCard.offsetHeight;
          
          // Animate other cards to their new positions
          cards.forEach(c => {
            if (c !== draggedCard) {
              c.style.transition = 'transform 0.2s ease-out';
              c.style.transform = '';
            }
          });
          
          // Animate dragged card from old position to new position
          draggedCard.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s, opacity 0.2s';
          draggedCard.style.transform = '';
          draggedCard.style.boxShadow = '';
          draggedCard.style.opacity = '';
          
          // Clean up after animation
          setTimeout(() => {
            draggedCard.style.pointerEvents = '';
            draggedCard.style.zIndex = '';
            resetDragStyles(draggedCard);
            cards.forEach(c => {
              c.style.transition = '';
            });
          }, 200);
          
        } else {
          // Not dropping to new position - animate back to original
          draggedCard.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.3, 1.1), opacity 0.2s, box-shadow 0.2s';
          draggedCard.style.transform = '';
          draggedCard.style.opacity = '';
          draggedCard.style.boxShadow = '';
          
          // Animate all other cards back to position
          cards.forEach(c => {
            if (c !== draggedCard) {
              c.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.3, 1.1)';
              c.style.transform = '';
            }
          });
          
          // Clean up after animation
          setTimeout(() => {
            resetDragStyles(draggedCard);
            cards.forEach(c => {
              c.style.transition = '';
            });
          }, 200);
        }
      }
      
      // Handle drop after long-press drag
      function handleDragDrop(draggedCard, dropY) {
        const cards = Array.from(document.querySelectorAll('[data-effort][data-index]'));
        const draggedIndex = parseInt(draggedCard.getAttribute('data-index'));
        let insertBeforeIndex = -1; // -1 means insert at end
        
        // Find which card to insert before based on Y position
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (c === draggedCard) continue;
          
          const rect = c.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          
          if (dropY < midY) {
            insertBeforeIndex = i;
            break;
          }
        }
        
        // Calculate effective new position
        let newIndex;
        if (insertBeforeIndex === -1) {
          newIndex = cards.length - 1; // Moving to end
        } else if (insertBeforeIndex > draggedIndex) {
          newIndex = insertBeforeIndex - 1; // Account for removal
        } else {
          newIndex = insertBeforeIndex;
        }
        
        // Clear drop highlights first
        document.querySelectorAll('.drop-above, .drop-below').forEach(c => {
          c.classList.remove('drop-above', 'drop-below');
        });
        
        console.log('Drop: draggedIndex=' + draggedIndex + ', newIndex=' + newIndex, ', insertBeforeIndex=' + insertBeforeIndex);
        if (newIndex !== draggedIndex) {
          // Store the dragged card's current visual position
          const draggedRect = draggedCard.getBoundingClientRect();
          
          // Prevent dragged card from interfering during reorder
          draggedCard.style.pointerEvents = 'none';
          draggedCard.style.zIndex = '1000';
          
          // Do DOM reorder immediately
          reorderWorkoutSet(draggedIndex, newIndex);
          
          // Force layout recalc
          void draggedCard.offsetHeight;
          
          // Get the new position after reorder
          const newRect = draggedCard.getBoundingClientRect();
          
          // Calculate offset from current visual position to new DOM position
          const deltaX = draggedRect.left - newRect.left;
          const deltaY = draggedRect.top - newRect.top;
          
          // Position card at its old visual location
          draggedCard.style.transition = 'none';
          draggedCard.style.transform = 'translate(' + deltaX + 'px, ' + deltaY + 'px)';
          
          // Force reflow
          void draggedCard.offsetHeight;
          
          // Animate other cards
          cards.forEach(c => {
            if (c !== draggedCard) {
              c.style.transition = 'transform 0.2s ease-out';
              c.style.transform = '';
            }
          });
          
          // Animate dragged card from old position to new position
          draggedCard.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s, opacity 0.2s';
          draggedCard.style.transform = '';
          draggedCard.style.boxShadow = '';
          draggedCard.style.opacity = '';
          
          // Clean up after animation
          setTimeout(() => {
            draggedCard.style.pointerEvents = '';
            draggedCard.style.zIndex = '';
            resetDragStyles(draggedCard);
            cards.forEach(c => {
              c.style.transition = '';
            });
          }, 200);
        } else {
          console.log('Not reordering: same position');
          resetDragStyles(draggedCard);
        }
      }
      
      // Reorder a workout set from one index to another
      function reorderWorkoutSet(fromIndex, toIndex) {
        console.log('reorderWorkoutSet called: from=' + fromIndex + ' to=' + toIndex);
        const container = document.getElementById('cards');
        if (!container) {
          console.log('No container found');
          return;
        }
        
        const cards = Array.from(container.querySelectorAll('[data-effort][data-index]'));
        console.log('Found ' + cards.length + ' cards');
        const draggedCard = cards[fromIndex];
        if (!draggedCard) {
          console.log('No card at fromIndex ' + fromIndex);
          return;
        }
        
        // Update currentWorkoutArray
        if (currentWorkoutArray && currentWorkoutArray.length > fromIndex) {
          const [removed] = currentWorkoutArray.splice(fromIndex, 1);
          currentWorkoutArray.splice(toIndex, 0, removed);
        }
        
        // Reorder DOM: remove the card first
        draggedCard.remove();
        
        // Get remaining cards after removal
        const remainingCards = Array.from(container.querySelectorAll('[data-effort][data-index]'));
        
        if (toIndex >= remainingCards.length) {
          // Insert at end
          const lastCard = remainingCards[remainingCards.length - 1];
          if (lastCard) {
            lastCard.after(draggedCard);
          } else {
            container.appendChild(draggedCard);
          }
        } else {
          // Insert before the card at toIndex position
          const targetCard = remainingCards[toIndex];
          if (targetCard) {
            targetCard.before(draggedCard);
          }
        }
        
        // Renumber all data-index attributes
        const finalCards = container.querySelectorAll('[data-effort][data-index]');
        finalCards.forEach((c, i) => {
          c.setAttribute('data-index', i);
        });
        
        // Update totals
        updateMathTotals();
        
        console.log('Reordered set from', fromIndex, 'to', toIndex);
      }

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

