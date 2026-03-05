/**
 * Analyzes conventional-corpus.json and writes conventional-rules.json.
 * Output: allowed warm/build/cool distance buckets; allowed rep×distance patterns; rare/never list.
 */

const fs = require("fs");
const path = require("path");

const CORPUS_PATH = path.join(__dirname, "../outputs/conventional-corpus.json");
const RULES_PATH = path.join(__dirname, "../outputs/conventional-rules.json");

function loadCorpus() {
  const raw = fs.readFileSync(CORPUS_PATH, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data.workouts) ? data.workouts : [];
}

/** Extract rep×distance patterns from set text (e.g. "8x100", "6x200", "4x50"). */
function extractRepPatterns(sets) {
  const patterns = [];
  const regex = /(\d+)\s*[x×]\s*(\d+)/gi;
  for (const s of sets) {
    if (typeof s !== "string") continue;
    let m;
    while ((m = regex.exec(s)) !== null) {
      const reps = parseInt(m[1], 10);
      const dist = parseInt(m[2], 10);
      patterns.push(`${reps}x${dist}`);
    }
  }
  return patterns;
}

/** Normalize pool for bucketing: 25yd treated like 25m for distance buckets. */
function poolBucket(pool) {
  if (pool === "50m") return "50m";
  return "25"; // 25m and 25yd
}

function run() {
  const workouts = loadCorpus();
  const warmBuild = { "25": new Set(), "50m": new Set() };
  const cool = { "25": new Set(), "50m": new Set() };
  const mainPatternCounts = {};
  const kickPatternCounts = {};
  const drillPatternCounts = {};

  for (const w of workouts) {
    const bucket = poolBucket(w.pool);
    for (const sec of w.sections || []) {
      const d = sec.distance;
      if (d == null) continue;
      const label = (sec.label || "").toLowerCase();
      if (label.includes("warm") || label.includes("build")) {
        warmBuild[bucket].add(d);
      } else if (label.includes("cool")) {
        cool[bucket].add(d);
      }
      const patterns = extractRepPatterns(sec.sets || []);
      if (label.includes("main")) {
        patterns.forEach((p) => { mainPatternCounts[p] = (mainPatternCounts[p] || 0) + 1; });
      } else if (label.includes("kick")) {
        patterns.forEach((p) => { kickPatternCounts[p] = (kickPatternCounts[p] || 0) + 1; });
      } else if (label.includes("drill")) {
        patterns.forEach((p) => { drillPatternCounts[p] = (drillPatternCounts[p] || 0) + 1; });
      }
    }
  }

  const sortNum = (a, b) => a - b;
  const allowedWarmBuild25 = Array.from(warmBuild["25"]).sort(sortNum);
  const allowedWarmBuild50m = Array.from(warmBuild["50m"]).sort(sortNum);
  const allowedCool25 = Array.from(cool["25"]).sort(sortNum);
  const allowedCool50m = Array.from(cool["50m"]).sort(sortNum);

  const allMain = Object.entries(mainPatternCounts).sort((a, b) => b[1] - a[1]);
  const allKick = Object.entries(kickPatternCounts).sort((a, b) => b[1] - a[1]);
  const allDrill = Object.entries(drillPatternCounts).sort((a, b) => b[1] - a[1]);

  const threshold = Math.max(1, Math.floor(workouts.length * 0.05));
  const allowedMain = allMain.filter(([, c]) => c >= threshold).map(([p]) => p);
  const allowedKick = allKick.filter(([, c]) => c >= threshold).map(([p]) => p);
  const allowedDrill = allDrill.filter(([, c]) => c >= threshold).map(([p]) => p);
  const rareMain = allMain.filter(([, c]) => c < threshold && c > 0).map(([p]) => p);
  const neverMain = []; // could add 11x100, 13x200 etc. as explicit "never" if we want

  const rules = {
    generatedAt: new Date().toISOString(),
    corpusWorkouts: workouts.length,
    distanceBuckets: {
      "25m_25yd": {
        warmUpBuild: allowedWarmBuild25.length ? allowedWarmBuild25 : [200, 300, 400, 500, 600, 800],
        coolDown: allowedCool25.length ? allowedCool25 : [200, 300, 400, 500]
      },
      "50m": {
        warmUpBuild: allowedWarmBuild50m.length ? allowedWarmBuild50m : [200, 300, 400, 500, 600, 800],
        coolDown: allowedCool50m.length ? allowedCool50m : [200, 300, 400, 500]
      }
    },
    repPatterns: {
      main: { allowed: allowedMain, rare: rareMain, never: neverMain },
      kick: { allowed: allowedKick.length ? allowedKick : ["4x50", "6x50", "8x50", "4x100", "6x100", "8x100"] },
      drill: { allowed: allowedDrill.length ? allowedDrill : ["4x50", "6x50", "8x50"] }
    }
  };

  fs.writeFileSync(RULES_PATH, JSON.stringify(rules, null, 2));
  console.log(`Conventional rules written to ${RULES_PATH}`);
  return rules;
}

if (require.main === module) {
  run();
}

module.exports = { run, loadCorpus, extractRepPatterns };
