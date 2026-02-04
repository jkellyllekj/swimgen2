/**
 * core/generator.js - Pure workout generation functions
 * Extracted from legacy-index.js (lines 959-1365)
 */

const { snapToPoolMultipleShared, shuffleWithSeed, fnv1a32 } = require('../utils/math');
const { normalizeSectionKey } = require('../utils/pool-utils');
const { endsAtHomeEnd, isValidWarmupCoolLine, isValidKickLine, pickEvenRepScheme } = require('./validator');
const { pickTemplate, pickV1CatalogueBody } = require('./patterns');

// Research-based constraints
const MAX_REALISTIC_REPS = 20;
const MIN_DISTANCE_FOR_HIGH_REPS = 50;

/**
 * Build a single set body for a workout section
 * This is the core generation function that creates coach-quality sets
 */
function buildOneSetBodyShared({ label, targetDistance, poolLen, unitsShort, opts, seed, rerollCount }) {
  const base = poolLen;
  const target = snapToPoolMultipleShared(targetDistance, base);
  if (target <= 0) return null;
  
  const isNonStandardPool = ![25, 50].includes(base);
  const hasThresholdPace = opts.thresholdPace && String(opts.thresholdPace).trim().length > 0;
  
  // Use different seed bits for different decisions
  const seedA = seed >>> 0;
  const seedB = ((seed * 7919) >>> 0);
  const seedC = ((seed * 104729) >>> 0);
  const seedD = ((seed * 224737) >>> 0);
  
  // Reroll handling
  const hasRerollCount = typeof rerollCount === 'number' && rerollCount > 0;
  const rerollNum = hasRerollCount ? rerollCount : seedA;

  // TEMPLATE SELECTION - runs first
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
    r = r + (seedD % 3) - 1;
    return Math.max(0, r);
  };

  // Find best rep distance - MUST return exact target distance
  const findBestFit = (preferredDists, useSeed) => {
    const dists = useSeed ? shuffleWithSeed(preferredDists, seedC) : preferredDists;
    
    // First pass: exact fit with research constraints
    for (const d of dists) {
      if (d > 0 && target % d === 0) {
        const reps = target / d;
        const minReps = (d < MIN_DISTANCE_FOR_HIGH_REPS) ? 2 : 2;
        const maxReps = (d < MIN_DISTANCE_FOR_HIGH_REPS) ? 8 : MAX_REALISTIC_REPS;
        if (reps >= minReps && reps <= maxReps) {
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
  };

  const stroke = pickStroke();
  const k = String(label || "").toLowerCase();
  const hasFins = !!opts.fins;
  const hasPaddles = !!opts.paddles;

  // Named drills
  const drills = [
    "Catch-up", "Fist drill", "Fingertip drag", "DPS", "Shark fin", "Zipper", 
    "Scull", "Corkscrew", "Single arm", "Long dog", "Tarzan", "Head up",
    "Hip rotation", "6-3-6", "Kickboard balance", "Paddle scull"
  ];
  const drill = drills[seedA % drills.length];

  // Preferred rep distances
  const d25 = base <= 25 ? base : (base <= 50 ? base : Math.round(25 / base) * base);
  const d50 = base <= 50 ? (Math.round(50 / base) * base) : base;
  const d75 = base <= 75 ? (Math.round(75 / base) * base) : base;
  const d100 = base <= 100 ? (Math.round(100 / base) * base) : (base * 2);
  const d200 = base <= 200 ? (Math.round(200 / base) * base) : (base * 4);

  // ~20% chance of multi-part set for main sets 400m+
  const wantMultiPart = (seedA % 5) === 0 && target >= 400 && k.includes("main");

  // WARM-UP
  if (k.includes("warm")) {
    const catPick = pickV1CatalogueBody("Warm-up", target, base, seed);
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

  // BUILD
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

  // DRILL
  if (k.includes("drill")) {
    const drillPool = [
      "Fist", "Catch-up", "DPS", "Jazz Hands", "Long Dog",
      "Scull Front", "Scull Rear", "Torpedo Glide", "Single Arm",
      "3-3-3", "Finger Drag", "25 Drill / 25 Swim"
    ];
    
    const evenScheme = pickEvenRepScheme(target, base, "drill");
    
    if (!evenScheme) {
      return target + " drill easy";
    }
    
    const fit = { reps: evenScheme.reps, dist: evenScheme.repDist };
    
    const shuffledDrills = shuffleWithSeed([...drillPool], seedA);
    const drillLines = [];
    for (let i = 0; i < fit.reps; i++) {
      drillLines.push((i + 1) + ". " + shuffledDrills[i % shuffledDrills.length]);
    }
    
    const heading = fit.reps + "x" + fit.dist + " Drill FC";
    return heading + "\n" + drillLines.join("\n");
  }

  // KICK
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
    
    const evenScheme = pickEvenRepScheme(target, base, "kick");
    if (!evenScheme) return makeLine(1, target, "kick" + finNote, 0);
    
    const fit = { reps: evenScheme.reps, dist: evenScheme.repDist };
    
    if (!isValidKickLine(kickDesc, fit.dist)) {
      kickDesc = "kick steady" + finNote;
    }
    return makeLine(fit.reps, fit.dist, kickDesc, restFor(fit.dist, effort));
  }

  // PULL
  if (k.includes("pull")) {
    const padNote = hasPaddles ? " with paddles" : "";
    const pullByEffort = {
      moderate: ["pull steady" + padNote, "pull smooth" + padNote, "pull focus DPS" + padNote, "pull relaxed" + padNote, "pull technique" + padNote],
      strong: ["pull build" + padNote, "pull descend" + padNote, "pull descend 1-4" + padNote],
      hard: ["pull strong" + padNote, "pull hard" + padNote, "pull hold pace" + padNote],
      fullgas: ["pull fast" + padNote, "pull sprint" + padNote]
    };
    const effortLevels = ["moderate", "strong", "hard", "fullgas"];
    const effortIdx = rerollNum % effortLevels.length;
    const effort = effortLevels[effortIdx];
    const descs = pullByEffort[effort];
    const pullDesc = descs[seedA % descs.length];
    const fit = findBestFit([d100, d50, d200, d75].filter(x => x > 0), true);
    if (!fit) return makeLine(1, target, "pull" + padNote, 0);
    return makeLine(fit.reps, fit.dist, pullDesc, restFor(fit.dist, effort));
  }

  // COOL-DOWN
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

  // MAIN SET - with optional multi-part
  const focus = String(opts.focus || "allround");
  
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
      // Three-part ladder
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
      // Mixed distance
      () => {
        if (d50 <= 0 || d100 <= 0) return null;
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
    
    const startIdx = seedB % multiPatterns.length;
    for (let i = 0; i < multiPatterns.length; i++) {
      const idx = (startIdx + i) % multiPatterns.length;
      const result = multiPatterns[idx]();
      if (result) return result;
    }
  }

  // Simple single-line main set (default)
  const allroundByEffort = {
    easy: [stroke + " easy", stroke + " recovery", stroke + " relaxed pace", stroke + " loosen up"],
    moderate: [stroke + " steady", stroke + " smooth", stroke + " aerobic", stroke + " hold pace"],
    strong: [stroke + " build", stroke + " descend 1-4", stroke + " negative split", stroke + " build to strong"],
    hard: [stroke + " hard", stroke + " strong hold", stroke + " threshold", stroke + " fast hold", stroke + " descend to hard"],
    fullgas: [stroke + " sprint", stroke + " max effort", stroke + " race pace", stroke + " all out", stroke + " build to sprint"]
  };
  
  let mainDesc;
  let effortForRest = "hard";
  const mainEfforts = ["moderate", "strong", "hard", "fullgas", "easy"];
  const effortIdx = rerollNum % mainEfforts.length;
  const effort = mainEfforts[effortIdx];
  const descs = allroundByEffort[effort];
  mainDesc = descs[seedA % descs.length];
  effortForRest = effort === "easy" ? "easy" : (effort === "moderate" ? "moderate" : "hard");

  const fit = findBestFit([d100, d50, d200, d75].filter(x => x > 0), true);
  if (!fit) return makeLine(1, target, stroke + " swim", 0);
  return makeLine(fit.reps, fit.dist, mainDesc, restFor(fit.dist, effortForRest));
}

module.exports = {
  buildOneSetBodyShared,
  MAX_REALISTIC_REPS,
  MIN_DISTANCE_FOR_HIGH_REPS
};
