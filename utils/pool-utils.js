/**
 * utils/pool-utils.js - Pool length handling utilities
 * Extracted from legacy-index.js
 */

const { snapToPoolMultiple } = require('./math');

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

// Snap distance to nearest pool multiple with even lengths (ends at home end)
function snapSection(dist, poolLen) {
  if (dist <= 0) return 0;
  const lengths = Math.round(dist / poolLen);
  const evenLengths = lengths % 2 === 0 ? lengths : lengths + 1;
  return Math.max(evenLengths * poolLen, poolLen * 2);
}

// Normalize section key for lookup
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

module.exports = {
  SECTION_TARGET_BUCKETS,
  SECTION_MIN_DIST,
  resolveSectionTarget,
  snapSection,
  normalizeSectionKey,
  applySectionMinimums
};
