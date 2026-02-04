/**
 * core/patterns.js - Real-world pattern storage and template functions
 * Extracted from legacy-index.js
 */

const { snapToPoolMultipleShared } = require('../utils/math');

// Helpers for v1 catalogue
function pickFrom(arr, seed) {
  return arr[seededIndex(seed, arr.length)];
}

function seededIndex(seed, n) {
  const x = Math.abs(Math.floor(seed * 9973)) || 1;
  return x % n;
}

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

function snapToWallSafe(dist, poolLen) {
  const unit = 2 * poolLen;
  if (unit <= 0) return dist;
  const snapped = Math.round(dist / unit) * unit;
  return Math.max(unit, snapped);
}

function fitRepeatsToTarget(n, rep, targetDist) {
  if (rep <= 0) return n;
  const maxN = Math.floor(targetDist / rep);
  const n2 = Math.min(n, maxN);
  return Math.max(2, n2);
}

// V1 Base Set Catalogue - coach-normal set shapes
const V1_BASE_SET_CATALOGUE = {
  "Warm-up": [
    {
      id: "WU_CONTINUOUS_SWIM",
      kind: "continuous",
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

// Section templates for coach-plausible workout blocks
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
    { body: "8x100 Drill FC\n1. 50 Drill / 50 Swim\n2. Catch-up\n3. DPS\n4. Fist\n5. Single Arm\n6. Long Dog\n7. Torpedo Glide\n8. Scull Front", dist: 800 },
    { body: "14x50 Drill FC\n1. Fist\n2. Catch-up\n3. DPS\n4. Jazz Hands\n5. Long Dog\n6. Scull Front\n7. Finger Drag\n8. Single Arm\n9. Torpedo Glide\n10. Scull Rear\n11. 3-3-3\n12. 25 Drill / 25 Swim\n13. Fist\n14. Catch-up", dist: 700 }
  ],
  kick: [
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
    { body: "200 kick moderate\n4x50 kick strong", dist: 400 },
    { body: "6x50 kick descend 1-3 twice", dist: 300 },
    { body: "4x100 kick build", dist: 400 },
    { body: "4x100 kick descend 1-4", dist: 400 },
    { body: "6x50 kick (25 easy / 25 fast)", dist: 300 },
    { body: "8x50 kick (25 moderate / 25 fast)", dist: 400 },
    { body: "4x100 kick (50 steady / 50 fast)", dist: 400 },
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
    { body: "5x100 descend 1-5", dist: 500 },
    { body: "6x100 descend 1-3 twice", dist: 600 },
    { body: "8x100 descend 1-4 twice", dist: 800 },
    { body: "10x100 descend 1-5 twice", dist: 1000 },
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

// Pick template based on section and target distance - EXACT MATCH ONLY
function pickTemplate(section, targetDistance, seed, poolLen) {
  const { endsAtHomeEnd } = require('./validator');
  const { fnv1a32, shuffleWithSeed } = require('../utils/math');
  
  const list = SECTION_TEMPLATES[section];
  if (!list) return null;
  
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
  
  return null;
}

module.exports = {
  V1_BASE_SET_CATALOGUE,
  SECTION_TEMPLATES,
  pickV1CatalogueBody,
  pickTemplate,
  pickFrom,
  seededIndex,
  clampToBucket,
  snapToWallSafe,
  fitRepeatsToTarget
};
