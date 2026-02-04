/**
 * core/validator.js - Math validation for swim workouts
 * Extracted from legacy-index.js
 */

// Allowed rep counts by rep distance (coach-plausible patterns)
function isAllowedRepCount(repCount, repDistance) {
  const r = Number(repCount);
  const d = Number(repDistance);
  if (!Number.isFinite(r) || r < 1) return false;
  if (!Number.isFinite(d) || d <= 0) return false;
  
  // Single rep is always allowed
  if (r === 1) return true;

  // Coach-plausible rep counts only
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
  const forbidden = [7, 9, 11, 13, 14, 15, 17, 18, 19];
  return !forbidden.includes(r);
}

// Validate kick line: no "relaxed" or "easy" with short reps
function isValidKickLine(text, repDistance) {
  const t = String(text || "").toLowerCase();
  const d = Number(repDistance);
  if (d <= 50 && (t.includes("relaxed") || t.includes("easy"))) {
    return false;
  }
  return true;
}

// EVEN REP SCHEME PICKER - Enforces even rep counts for Drill/Kick sets
// EXACT match to legacy-index.js implementation (4 passes)
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

module.exports = {
  isAllowedRepCount,
  endsAtHomeEnd,
  isValidWarmupCoolLine,
  isValidDrillLine,
  isValidKickLine,
  pickEvenRepScheme
};
