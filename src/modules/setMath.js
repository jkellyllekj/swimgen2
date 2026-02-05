/**
 * Set Math Module
 * 
 * Pure calculation utilities for swim workout generation.
 * All functions have clear inputs/outputs and no side effects.
 * 
 * Includes:
 * - Deterministic random functions (fnv1a32, shuffleWithSeed, mulberry32)
 * - Distance snapping functions (snapToPoolMultiple, snapRepDist)
 * - Pace calculations (parsePaceToSecondsPer100, fmtMmSs, paceMultiplierForLabel)
 * - Set parsing utilities (parseNxD, computeSetDistanceFromBody, computeRestSecondsFromBody)
 * - Rep scheme selection (pickEvenRepScheme)
 */

// FNV-1a 32-bit hash for deterministic randomisation
// CRITICAL: Must never change - used for workout seed generation
function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h >>> 0;
}

// Shuffle array deterministically based on seed
// CRITICAL: Must never change - shuffleWithSeed: ((seed * (i + 1) * 9973) >>> 0) % (i + 1)
function shuffleWithSeed(arr, seed) {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = ((seed * (i + 1) * 9973) >>> 0) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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

// Parse pace string to seconds per 100m (e.g., "1:30" -> 90)
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

// Format seconds to MM:SS string
function fmtMmSs(totalSeconds) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return String(mm) + ":" + String(ss).padStart(2, "0");
}

// Get pace multiplier based on section label
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

// Parse NxD format from a line (e.g., "4x100" -> { reps: 4, dist: 100 })
function parseNxD(line) {
  const match = String(line || "").match(/^(\d+)x(\d+)/i);
  if (!match) return null;
  return { reps: Number(match[1]), dist: Number(match[2]) };
}

// Compute total distance from set body text
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

// Compute total rest seconds from set body text
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

// Check if total ends at home wall (even number of lengths)
function endsAtHomeEnd(total, poolLen) {
  const t = Number(total);
  const p = Number(poolLen);
  if (!t || !p || p <= 0) return false;
  const lengths = Math.round(t / p);
  return lengths % 2 === 0;
}

// EVEN REP SCHEME PICKER - Enforces even rep counts for Drill/Kick sets
// CRITICAL: 4-pass algorithm for odd pool edge cases - pickEvenRepScheme
// Returns { reps, repDist } or null if no valid scheme found
function pickEvenRepScheme(targetDistance, poolLen, kind) {
  const target = Number(targetDistance);
  const base = Number(poolLen);
  if (!target || target <= 0 || !base || base <= 0) return null;
  
  // Snap rep distance to pool multiple
  const snapRep = (d) => {
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
    const repDist = snapRep(pref);
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

// Check if rep count is within allowed bounds for a given distance
function isAllowedRepCount(reps, dist) {
  const r = Number(reps);
  const d = Number(dist);
  if (!Number.isFinite(r) || r < 1) return false;
  if (!Number.isFinite(d) || d < 25) return false;

  // 25s: max 20
  if (d <= 25 && r > 20) return false;
  // 50s: max 20
  if (d <= 50 && r > 20) return false;
  // 75s: max 16
  if (d <= 75 && r > 16) return false;
  // 100s: max 20
  if (d <= 100 && r > 20) return false;
  // 150s: max 12
  if (d <= 150 && r > 12) return false;
  // 200s: max 10
  if (d <= 200 && r > 10) return false;
  // 300+: max 6
  if (d >= 300 && r > 6) return false;

  return true;
}

// Fingerprint workout text for comparison
function fingerprintWorkoutText(workoutText) {
  return String(fnv1a32(String(workoutText || "")));
}

// Generate a seed from current time
function nowSeed() {
  const a = Date.now() >>> 0;
  const b2 = Math.floor(Math.random() * 0xffffffff) >>> 0;
  return (a ^ b2) >>> 0;
}

module.exports = {
  fnv1a32,
  shuffleWithSeed,
  mulberry32,
  snapToPoolMultiple,
  snapRepDist,
  parsePaceToSecondsPer100,
  fmtMmSs,
  paceMultiplierForLabel,
  parseNxD,
  computeSetDistanceFromBody,
  computeRestSecondsFromBody,
  endsAtHomeEnd,
  pickEvenRepScheme,
  isAllowedRepCount,
  fingerprintWorkoutText,
  nowSeed
};
