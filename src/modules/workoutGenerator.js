/**
 * Workout Generator Module
 * 
 * Contains core workout generation logic including:
 * - Workout name generation
 * - Workout validation
 * - Full gas injection
 * - Options normalization
 * 
 * Note: The main buildWorkout function remains in index.js due to
 * complex dependencies on section templates and nested scope.
 * This module provides supporting functions used by buildWorkout.
 */

const { mulberry32 } = require('./setMath');
const { 
  WORKOUT_NAMES, 
  FOCUS_NAMES, 
  EQUIPMENT_NAMES, 
  FALLBACK_NAMES,
  DRILL_NAMES
} = require('./workoutLibrary');

// Check if body contains full gas effort words
function isFullGasBody(body) {
  const low = String(body).toLowerCase();
  return low.includes("sprint") || low.includes("all out") || low.includes("full gas") || low.includes("max effort");
}

// Inject one full gas into Main with ~60% probability
function injectOneFullGas(sections, seed) {
  const already = sections.some(s => isFullGasBody(s.body));
  if (already) return sections;

  if (mulberry32(seed >>> 0)() >= 0.6) return sections;

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

  if (changed) {
    sections[idx].body = lines.join("\n");
  }

  return sections;
}

// Snazzy workout name generator - inspired by CardGym cards
function generateWorkoutName(totalDistance, opts, seed) {
  const focus = opts.focus || "allround";
  
  let pool = [];
  
  if (FOCUS_NAMES[focus]) {
    pool = pool.concat(FOCUS_NAMES[focus]);
  }
  
  if (opts.fins) pool = pool.concat(EQUIPMENT_NAMES.fins);
  if (opts.paddles) pool = pool.concat(EQUIPMENT_NAMES.paddles);
  
  if (totalDistance <= 1000) {
    pool = pool.concat(WORKOUT_NAMES.short);
  } else if (totalDistance <= 2500) {
    pool = pool.concat(WORKOUT_NAMES.medium);
  } else {
    pool = pool.concat(WORKOUT_NAMES.long);
  }
  
  if (pool.length === 0) {
    pool = FALLBACK_NAMES.slice();
  }
  
  return pool[seed % pool.length];
}

// Coach plausibility validator - rejects implausible workouts
function validateWorkout(sets, poolLen, actualTotalMeters) {
  function parseNxDFromLine(line) {
    const match = String(line || "").match(/^(\d+)x(\d+)/i);
    if (!match) return null;
    return { reps: Number(match[1]), dist: Number(match[2]) };
  }

  function isFullGasText(text) {
    const t = String(text || "").toLowerCase();
    return t.includes("all out") || t.includes("max effort") || t.includes("sprint");
  }

  function isBuildOrDescend(text) {
    const t = String(text || "").toLowerCase();
    return t.includes("build") || t.includes("descend");
  }

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

    for (const line of bodyLines) {
      const parsed = parseNxDFromLine(line);
      if (!parsed) continue;

      const { reps, dist: repDist } = parsed;
      const isFullGas = isFullGasText(line);
      const isBuild = isBuildOrDescend(line);

      const pLen = Number(poolLen);

      if (pLen === 25) {
        if (kind === "main" && repDist === 50 && reps > 16) {
          return "main 50s reps cap exceeded (max 16 for 25m/25yd)";
        }
        if (kind === "drill" && repDist === 25 && reps > 12) {
          return "drill 25s reps cap exceeded (max 12 for 25m/25yd)";
        }
        if (kind === "drill" && repDist === 50 && reps > 10) {
          return "drill 50s reps cap exceeded (max 10 for 25m/25yd)";
        }
      }

      if (repDist > 0 && repDist % poolLen !== 0) {
        return "odd-length repeat distance";
      }

      if (isBuild && reps < 2) {
        return "build requires at least 2 reps";
      }

      if (kind === "warmup" && reps > 30) {
        return "warmup reps too high (max 30)";
      }
      if (kind === "build" && reps > 24) {
        return "build section: reps too high (max 24)";
      }
      if (kind === "drill" && reps > 24) {
        return "drill section: reps too high (max 24)";
      }
      if (kind === "drill" && repDist > 200) {
        return "drill repeat too long (max 200)";
      }
      if (kind === "kick" && reps > 30) {
        return "kick reps too high (max 30)";
      }
      if (kind === "main" && reps > 30) {
        return "main reps too high (max 30)";
      }

      if (isFullGas) {
        const setTotalDist = reps * repDist;
        const isKickSet = kind === "kick" || String(line).toLowerCase().includes("kick");
        
        if (isKickSet && setTotalDist > 300) {
          return "kick full gas cap exceeded (max 300)";
        }
        if (!isKickSet && setTotalDist > 600) {
          return "swim full gas cap exceeded (max 600)";
        }

        if (repDist === 25 && reps > 12) {
          return "full gas 25s: reps must be <= 12";
        }
        if (repDist === 50 && reps > 10) {
          return "full gas 50s: reps must be <= 10";
        }
        if (repDist === 100 && reps > 6) {
          return "full gas 100s: reps must be <= 6";
        }

        if (reps > 10) {
          return "full gas needs grouping";
        }
      }
    }
  }

  if (!hasWarmup) {
    return "missing warmup section";
  }
  if (!hasMain) {
    return "missing main section";
  }
  if (!hasCooldown) {
    return "missing cooldown section";
  }

  const minCooldown = poolLen * 4;
  if (cooldownDist < minCooldown) {
    return "cooldown too short (min " + minCooldown + ")";
  }

  return null;
}

// Normalize user options from payload
function normalizeOptions(payload) {
  const b = (v) => v === true || v === "true" || v === "on" || v === 1;
  
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

// Generate numbered drill set dynamically
function generateDrillSetDynamic(drillDist, poolLen, drillSeed) {
  const base = poolLen;
  const d50 = base <= 50 ? (Math.round(50 / base) * base) : base;
  const d100 = base <= 100 ? (Math.round(100 / base) * base) : (base * 2);
  const d25 = base <= 25 ? base : (base <= 50 ? base : Math.round(25 / base) * base);
  
  const repOptions = [d100, d50, d25, poolLen].filter(d => d > 0);
  let repDist = 0;
  let totalReps = 0;
  
  for (const rd of repOptions) {
    if (rd > 0 && drillDist % rd === 0) {
      repDist = rd;
      totalReps = drillDist / rd;
      break;
    }
  }
  
  if (totalReps === 0) {
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
              const lines = [];
              lines.push(String(r1) + "x" + String(d1) + " Drill FC");
              for (let i = 0; i < r1; i++) {
                lines.push((i + 1) + ". " + DRILL_NAMES[(drillSeed + i) % DRILL_NAMES.length]);
              }
              lines.push(String(r2) + "x" + String(d2) + " Drill FC");
              for (let i = 0; i < r2; i++) {
                lines.push((i + 1) + ". " + DRILL_NAMES[(drillSeed + r1 + i) % DRILL_NAMES.length]);
              }
              return lines.join("\n");
            }
          }
        }
      }
    }
    
    repDist = poolLen;
    totalReps = drillDist / poolLen;
    if (!Number.isInteger(totalReps) || totalReps < 1) {
      return String(drillDist) + " choice drill easy";
    }
  }
  
  if (totalReps === 1) {
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
    if (totalReps === 1 && drillDist >= 50) {
      const halfDist = drillDist / 2;
      if (halfDist % poolLen === 0) {
        const lines = [];
        lines.push("2x" + String(halfDist) + " Drill FC");
        lines.push("1. " + DRILL_NAMES[drillSeed % DRILL_NAMES.length]);
        lines.push("2. " + DRILL_NAMES[(drillSeed + 1) % DRILL_NAMES.length]);
        return lines.join("\n");
      }
    }
    if (totalReps === 1) {
      const lines = [];
      lines.push("1x" + String(drillDist) + " Drill FC");
      lines.push("1. choice drill");
      return lines.join("\n");
    }
  }
  
  const maxRepsPerBlock = 10;
  
  if (totalReps <= maxRepsPerBlock && totalReps >= 2) {
    const header = String(totalReps) + "x" + String(repDist) + " Drill FC";
    const lines = [header];
    for (let i = 0; i < totalReps; i++) {
      lines.push((i + 1) + ". " + DRILL_NAMES[(drillSeed + i) % DRILL_NAMES.length]);
    }
    return lines.join("\n");
  }
  
  const numBlocks = Math.ceil(totalReps / maxRepsPerBlock);
  const baseRepsPerBlock = Math.floor(totalReps / numBlocks);
  const extraReps = totalReps % numBlocks;
  
  const lines = [];
  let drillIdx = drillSeed;
  
  for (let block = 0; block < numBlocks; block++) {
    const blockReps = baseRepsPerBlock + (block < extraReps ? 1 : 0);
    
    if (blockReps < 2) continue;
    
    lines.push(String(blockReps) + "x" + String(repDist) + " Drill FC");
    for (let i = 0; i < blockReps; i++) {
      lines.push((i + 1) + ". " + DRILL_NAMES[(drillIdx + i) % DRILL_NAMES.length]);
    }
    drillIdx += blockReps;
  }
  
  return lines.join("\n");
}

// Estimate total workout time in seconds
function estimateWorkoutTotalSeconds(workoutText, paceSecPer100, computeSetDistanceFromBody, computeRestSecondsFromBody, paceMultiplierForLabel) {
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

function parseWorkoutTextToSections(text) {
  const raw = String(text || "");
  const lines = raw.split("\n");

  const sections = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    current.body = current.bodyLines.join("\n").trim();
    delete current.bodyLines;
    sections.push(current);
    current = null;
  };

  const headerRe = /^([A-Za-z][A-Za-z0-9 \-]*?)\s*:\s*(.*)$/;

  for (const line of lines) {
    const m = line.match(headerRe);
    if (m) {
      flush();
      const label = String(m[1] || "").trim();
      const tail = String(m[2] || "").trim();

      let dist = null;
      const distMatch = tail.match(/(^|\s)(\d{2,5})(\s|$)/);
      if (distMatch) dist = Number(distMatch[2]);

      current = { label, dist, bodyLines: [] };
      if (tail) current.bodyLines.push(tail);
      continue;
    }

    if (!current) {
      continue;
    }

    current.bodyLines.push(line);
  }

  flush();

  if (!sections.length && raw.trim()) {
    return {
      sections: [
        { label: "Workout", dist: null, body: raw.trim() }
      ]
    };
  }

  return { sections };
}

function inferZoneFromText(body) {
  const t = String(body || "").toLowerCase();

  if (t.includes("full gas") || t.includes("fullgas") || t.includes("all out") || t.includes("max effort") || t.includes("sprint")) {
    return "full_gas";
  }

  if (t.includes("threshold") || t.includes("race pace") || t.includes("hard")) {
    return "hard";
  }

  if (t.includes("strong") || t.includes("fast")) {
    return "strong";
  }

  if (t.includes("moderate") || t.includes("steady")) {
    return "moderate";
  }

  return "easy";
}

function inferIsStriatedFromText(body) {
  const t = String(body || "").toLowerCase();

  if (t.includes("odds") && t.includes("evens")) return true;
  if (t.includes("descend")) return true;
  if (t.includes("build")) return true;
  if (t.includes("negative split")) return true;
  if (t.match(/\b(\d+)\s*to\s*(\d+)\b/)) return true;

  return false;
}

module.exports = {
  isFullGasBody,
  injectOneFullGas,
  generateWorkoutName,
  validateWorkout,
  normalizeOptions,
  generateDrillSetDynamic,
  estimateWorkoutTotalSeconds,
  parseWorkoutTextToSections,
  inferZoneFromText,
  inferIsStriatedFromText
};
