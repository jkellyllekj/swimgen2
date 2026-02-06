/**
 * ORIGINAL POOL MATH BACKUP
 * 
 * Preserved from index.js and src/modules/setMath.js before modularization.
 * Purpose: Reference for fixing broken pool length math (27m+ pools).
 * 
 * This file is NOT imported anywhere - it exists purely as a reference backup.
 * Date preserved: 2026-02-06
 */

// =============================================================================
// FROM src/modules/setMath.js - Core snapping functions
// =============================================================================

// Universal snapping: 2x poolLen for section totals (home-wall finish)
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

// Check if total distance ends at home end (even number of lengths)
function endsAtHomeEnd(totalDistance, poolLen) {
  const d = Number(totalDistance);
  const p = Number(poolLen);
  if (!Number.isFinite(d) || !Number.isFinite(p) || p <= 0) return false;
  const lengths = d / p;
  return Number.isInteger(lengths) && lengths % 2 === 0;
}

// EVEN REP SCHEME PICKER - Enforces even rep counts for Drill/Kick sets
// CRITICAL: 4-pass algorithm for odd pool edge cases
// Returns { reps, repDist } or null if no valid scheme found
function pickEvenRepScheme(targetDistance, poolLen, kind) {
  const target = Number(targetDistance);
  const base = Number(poolLen);
  if (!target || target <= 0 || !base || base <= 0) return null;
  
  const snapRep = (d) => {
    if (d <= 0 || base <= 0) return 0;
    return Math.round(d / base) * base || base;
  };
  
  const prefDists = kind === "drill" 
    ? [50, 25, 75, 100] 
    : [50, 25, 100]; // kick
  
  const allowedReps = [4, 6, 8, 10, 12, 16, 20];
  
  // First pass: try preferred distances with allowed rep counts
  for (const pref of prefDists) {
    const repDist = snapRep(pref);
    if (repDist <= 0) continue;
    if (target % repDist !== 0) continue;
    const reps = target / repDist;
    if (!Number.isInteger(reps)) continue;
    if (reps % 2 === 0 && allowedReps.includes(reps)) {
      return { reps, repDist };
    }
  }
  
  // Second pass: accept any even reps between 4 and 24
  for (const pref of prefDists) {
    const repDist = snapRep(pref);
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
    const repDist = snapRep(pref);
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

// Sensible cool down calculation
const SWIMMER_COOL_DOWNS = [100, 150, 200, 300, 400, 500];

function calculateSensibleCoolDown(totalDistance, poolLength) {
  const target = totalDistance * 0.1;
  let closest = SWIMMER_COOL_DOWNS.reduce((prev, curr) =>
    Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
  );
  const maxByRepeats = poolLength * 16;
  if (closest > maxByRepeats) closest = maxByRepeats;
  return snapToPoolMultiple(closest, poolLength);
}


// =============================================================================
// FROM index.js - Pool-aware distance helpers
// =============================================================================

// Snap distance to nearest pool multiple with even lengths (ends at home end)
function snapSection(dist, poolLen) {
  if (dist <= 0) return 0;
  const lengths = Math.round(dist / poolLen);
  const evenLengths = lengths % 2 === 0 ? lengths : lengths + 1;
  return Math.max(evenLengths * poolLen, poolLen * 2);
}

// Enforce divisible by (2 * poolLen)
function snapToWallSafe(dist, poolLen) {
  const unit = 2 * poolLen;
  if (unit <= 0) return dist;
  const snapped = Math.round(dist / unit) * unit;
  return Math.max(unit, snapped);
}

// Pick closest bucket then snap wall-safe
function clampToBucket(targetDist, buckets, poolLen) {
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

// Keep coach-normal repeat counts, avoid blowing up smaller targets
function fitRepeatsToTarget(n, rep, targetDist) {
  if (rep <= 0) return n;
  const maxN = Math.floor(targetDist / rep);
  const n2 = Math.min(n, maxN);
  return Math.max(2, n2);
}


// =============================================================================
// FROM index.js - Section target resolution with pool snapping
// =============================================================================

const SECTION_TARGET_BUCKETS = {
  warmup:   [200, 300, 400, 500, 600, 700, 800],
  build:    [200, 300, 400, 500, 600],
  kick:     [200, 300, 400, 500, 600],
  drill:    [200, 300, 400],
  cooldown: [100, 200, 300, 400],
  main:     [400, 600, 800, 1000, 1200, 1500, 1800, 2000, 2500, 3000]
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


// =============================================================================
// FROM index.js - Section minimums and adjustment logic
// =============================================================================

const SECTION_MIN_DIST = {
  warmup: 300,
  build: 200,
  drill: 200,
  kick: 200,
  cooldown: 200
};

function applySectionMinimums(sets, total, poolLen) {
  let adjustment = 0;
  
  for (const s of sets) {
    const key = normalizeSectionKey(s.label);
    const minDist = SECTION_MIN_DIST[key] || 0;
    
    if (String(s.label).toLowerCase().includes("main")) continue;
    
    let snapped = snapSection(s.dist, poolLen);
    
    if (minDist > 0 && snapped < minDist) {
      const needed = snapSection(minDist, poolLen);
      adjustment += needed - snapped;
      snapped = needed;
    }
    
    s.dist = snapped;
  }
  
  const mainSets = sets.filter(s => String(s.label).toLowerCase().includes("main"));
  if (mainSets.length > 0) {
    if (adjustment > 0) {
      const mainTotal = mainSets.reduce((sum, s) => sum + s.dist, 0);
      for (const m of mainSets) {
        const share = Math.round((m.dist / mainTotal) * adjustment);
        m.dist = snapSection(m.dist - share, poolLen);
      }
    } else {
      for (const m of mainSets) {
        m.dist = snapSection(m.dist, poolLen);
      }
    }
  }
  
  return sets;
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


// =============================================================================
// FROM index.js - Rep distance calculation with pool awareness
// =============================================================================

// Preferred rep distances - use single pool length multiples (not 2x poolLen)
// These lines show how rep distances are computed relative to pool length:
//
//   const base = poolLen;
//   const d25 = base <= 25 ? base : (base <= 50 ? base : Math.round(25 / base) * base);
//   const d50 = base <= 50 ? (Math.round(50 / base) * base) : base;
//   const d75 = base <= 75 ? (Math.round(75 / base) * base) : base;
//   const d100 = base <= 100 ? (Math.round(100 / base) * base) : (base * 2);
//   const d200 = base <= 200 ? (Math.round(200 / base) * base) : (base * 4);
//
// KNOWN ISSUE: For pools > 25m (e.g. 27m, 33m), Math.round(25 / 27) * 27 = 27
// which is correct, but downstream functions may not handle non-standard
// multiples correctly, leading to broken workouts for 27m+ pools.


// =============================================================================
// FROM index.js - findBestFit (pool-aware rep scheme selection)
// =============================================================================

// Research-based constraints for realistic workouts
const MAX_REALISTIC_REPS = 20;
const MIN_DISTANCE_FOR_HIGH_REPS = 50;

function findBestFit(preferredDists, target, base, seedC) {
  const { shuffleWithSeed } = require('./src/modules/setMath');
  const dists = shuffleWithSeed(preferredDists, seedC);
  
  // First pass: exact fit with research constraints
  for (const d of dists) {
    if (d > 0 && target % d === 0) {
      const reps = target / d;
      const maxReps = (d < MIN_DISTANCE_FOR_HIGH_REPS) ? 8 : MAX_REALISTIC_REPS;
      if (reps >= 2 && reps <= maxReps) {
        return { reps, dist: d };
      }
    }
  }
  
  // Second pass: try pool length itself
  if (base > 0 && target % base === 0) {
    const reps = target / base;
    const maxReps = (base < MIN_DISTANCE_FOR_HIGH_REPS) ? 8 : MAX_REALISTIC_REPS;
    if (reps >= 2 && reps <= maxReps) {
      return { reps, dist: base };
    }
  }
  
  // Third pass: try 2xbase
  const base2 = base * 2;
  if (base2 > 0 && target % base2 === 0) {
    const reps = target / base2;
    if (reps >= 2 && reps <= MAX_REALISTIC_REPS) {
      return { reps, dist: base2 };
    }
  }
  
  return null;
}


// =============================================================================
// FROM index.js - Validation helpers (pool-aware)
// =============================================================================

function validateSetBody(body, targetDistance, poolLen, sectionLabel) {
  const lines = String(body || "").split("\n").filter(l => l.trim());
  if (lines.length === 0) return { valid: false, reason: "empty body" };
  
  let totalParsed = 0;
  const label = String(sectionLabel || "").toLowerCase();
  
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
  
  // ... (remainder of validation checks parsed line distances)
  
  return { valid: true };
}


// =============================================================================
// FROM index.js - Pool type handling in frontend/route logic
// =============================================================================

// Pool type resolution from form payload:
//
//   function getUnitsShort(payload) {
//     if (payload.poolLength === "custom") {
//       return payload.poolLengthUnit === "yards" ? "yd" : "m";
//     }
//     return payload.poolLength === "25yd" ? "yd" : "m";
//   }
//
//   function getPoolLabel(payload) {
//     if (payload.poolLength !== "custom") return payload.poolLength;
//     const u = payload.poolLengthUnit === "yards" ? "yd" : "m";
//     return String(payload.customPoolLength) + u + " custom";
//   }
//
// Pool length numeric extraction (route handler):
//
//   const isCustom = payload.poolLength === "custom";
//   if (isCustom) {
//     if (!payload.customPoolLength) {
//       renderError("Error", ["Enter a custom pool length."]);
//       return;
//     }
//     payload.customPoolLength = Number(payload.customPoolLength);
//   } else {
//     delete payload.customPoolLength;
//     payload.poolLengthUnit = "meters";
//   }
//
// Standard pool values: "25m" -> 25, "50m" -> 50, "25yd" -> 25
// Custom pools: user enters numeric value + unit selection
