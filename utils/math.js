/**
 * utils/math.js - Pure math functions for swim workout generation
 * Extracted from legacy-index.js
 */

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

// Backward-compat wrappers
function snapToPoolMultiple(dist, poolLen) {
  return snapToPoolMultipleShared(dist, poolLen);
}

function snapRepDist(dist, poolLen) {
  return snapRepDistToPool(dist, poolLen);
}

// FNV-1a 32-bit hash for deterministic randomisation
// EXACT match to legacy-index.js implementation
function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h >>> 0;
}

// Shuffle array deterministically based on seed
// EXACT match to legacy-index.js implementation
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

module.exports = {
  snapToPoolMultipleShared,
  snapRepDistToPool,
  snapToPoolMultiple,
  snapRepDist,
  fnv1a32,
  shuffleWithSeed,
  mulberry32
};
