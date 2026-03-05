const path = require("path");

// Minimal browser-ish globals so offline-engine can attach to window
if (!global.window) {
  global.window = global;
}

// Load the generator (IIFE that writes to window.*)
require(path.join(process.cwd(), "public", "offline-engine.js"));

if (typeof window.generateWorkoutLocal !== "function") {
  console.error("generateWorkoutLocal not found on window");
  process.exit(1);
}

function makePayload(distance, poolLength, opts = {}) {
  return {
    distance,
    poolLength, // '25m', '50m', '25yd', or 'custom'
    poolLengthUnit: opts.poolLengthUnit || "meters",
    customPoolLength: opts.customPoolLength || "",
    thresholdPace: "",
    focus: "allround",
    restPref: "balanced",
    includeKick: true,
    includePull: true,
    equip_fins: false,
    equip_paddles: false,
    stroke_freestyle: true,
    stroke_backstroke: false,
    stroke_breaststroke: false,
    stroke_butterfly: false,
    lastWorkoutFp: "",
  };
}

const CONVENTIONAL_WARM_BUILD = [200, 300, 400, 500, 600, 800];
const CONVENTIONAL_COOL = [200, 300, 400, 500];
const DISALLOWED_REPS = new Set([11, 13, 17, 19]);

function checkConventional(label, dist, base) {
  if (base !== 25 && base !== 50) return null;
  const l = String(label || "").toLowerCase();
  const buckets = l.includes("cool") ? CONVENTIONAL_COOL : (l.includes("warm") || l.includes("build") ? CONVENTIONAL_WARM_BUILD : null);
  if (!buckets || dist == null) return null;
  if (buckets.includes(dist)) return null;
  return { label, dist, expected: buckets };
}

function checkRepScheme(body) {
  const issues = [];
  const repRe = /(\d+)\s*x\s*(\d+)/g;
  let m;
  while ((m = repRe.exec(body)) !== null) {
    const reps = parseInt(m[1], 10);
    const repDist = parseInt(m[2], 10);
    if (DISALLOWED_REPS.has(reps) && (repDist === 50 || repDist === 100 || repDist === 200)) {
      issues.push({ reps, repDist, excerpt: m[0] });
    }
  }
  return issues;
}

function summarize(requestedDistance, poolLabel, result, options = {}) {
  const verbose = options.verbose !== false;
  const assertMath = options.assertMath !== false;
  if (verbose) {
    console.log("==== Workout ====");
    console.log("Requested:", requestedDistance, "in", poolLabel);
  }
  if (!result || result.ok !== true) {
    if (verbose) console.log("ERROR:", result && result.error);
    console.log();
    return { ok: false, mathOk: false };
  }
  const sectionDists = result.sectionDists || result.sections;
  let sum = 0;
  for (const s of sectionDists) {
    sum += s.dist || 0;
  }
  const totalMeters = result.totalMeters || sum;
  const mathOk = sum === totalMeters;
  if (assertMath && !mathOk) {
    console.error("[FAIL] Section sum " + sum + " !== totalMeters " + totalMeters + " (requested " + requestedDistance + " " + poolLabel + ")");
  }
  const poolLen = result.poolLength || (poolLabel === "25m" ? 25 : poolLabel === "50m" ? 50 : poolLabel === "25yd" ? 25 : null);
  const unconventionals = [];
  const repIssues = [];
  for (const s of sectionDists) {
    const u = checkConventional(s.label, s.dist, poolLen);
    if (u) unconventionals.push(u);
  }
  for (const s of result.sections || []) {
    const r = checkRepScheme(String(s.body || ""));
    if (r.length) repIssues.push({ label: s.label, issues: r });
  }
  if (unconventionals.length && verbose) {
    console.log("Unconventional section distances:", unconventionals);
  }
  if (repIssues.length && verbose) {
    console.log("Disallowed rep schemes (11/13/17/19 x 50/100/200):", repIssues);
  }
  if (verbose) {
    console.log("Name:", result.workoutName, "| totalMeters:", totalMeters, "| sum:", sum, mathOk ? "[OK]" : "[FAIL]");
    console.log("Sections:");
    for (const s of result.sections) {
      console.log("---", s.label, "(" + s.dist + "):");
      console.log(String(s.body || "").replace(/\n/g, "\n    "));
    }
    console.log();
  }
  return { ok: true, mathOk, sum, totalMeters, unconventionals, repIssues };
}

function runBatch(opts) {
  const poolLength = opts.poolLength || "25m";
  const count = opts.count || 10;
  const distances = opts.distances || [1500, 1800, 2200, 2600, 3000, 3400, 3800, 4200, 4600, 5000];
  const results = [];
  let failed = 0;
  for (let i = 0; i < count; i++) {
    const distance = distances[i % distances.length];
    const payload = makePayload(distance, poolLength, {
      customPoolLength: opts.customPoolLength,
      poolLengthUnit: opts.poolLengthUnit || "meters",
    });
    const res = window.generateWorkoutLocal(payload);
    const label = poolLength === "custom" ? `${opts.customPoolLength || 25}${opts.poolLengthUnit === "yards" ? "yd" : "m"}` : poolLength;
    const summary = summarize(distance, label, res, { verbose: opts.verbose, assertMath: true });
    if (summary.ok && !summary.mathOk) failed++;
    results.push({ distance, poolLabel: label, ...summary });
  }
  return { results, failed };
}

const poolArg = process.env.POOL || process.argv[2];
const batchSize = parseInt(process.env.BATCH || process.env.TEN_TESTS || "10", 10);
const verboseEnv = process.env.VERBOSE === "1" || process.env.VERBOSE === "true";
const isReleaseCheck = process.argv[2] === "release" || process.env.TEST_RELEASE === "1";

// One-command release check: 25m, 50m, 25yd × a few distances; math only; exit 1 if any fail
if (isReleaseCheck) {
  const releaseTests = [
    { poolLength: "25m", distances: [1500, 2000, 3000, 4000] },
    { poolLength: "50m", distances: [2000, 3000, 4000] },
    { poolLength: "25yd", distances: [1650, 2000, 3000, 5000] },
  ];
  let totalFail = 0;
  let totalRun = 0;
  console.log("Release check: math assertions across 25m, 50m, 25yd...");
  for (const { poolLength, distances } of releaseTests) {
    const { results, failed } = runBatch({ poolLength, count: distances.length, distances, verbose: false });
    totalRun += results.length;
    totalFail += failed;
    for (const r of results) {
      if (!r.mathOk) console.error("FAIL", poolLength, r.distance, "sum=" + r.sum, "total=" + r.totalMeters);
    }
  }
  console.log("Done. " + totalFail + " math failures / " + totalRun + " workouts.");
  process.exit(totalFail > 0 ? 1 : 0);
}

if (poolArg && (poolArg === "25m" || poolArg === "50m" || poolArg === "25yd")) {
  const distances = [1500, 1800, 2200, 2600, 3000, 3400, 3800, 4200, 4600, 5400];
  console.log("Batch: " + batchSize + " workouts, pool " + poolArg + ", distances 1500–5400");
  const { results, failed } = runBatch({ poolLength: poolArg, count: batchSize, distances, verbose: verboseEnv });
  for (const r of results) {
    if (!r.mathOk) console.log("Math FAIL:", r.distance, r.poolLabel, "sum=" + r.sum, "total=" + r.totalMeters);
    if (r.unconventionals && r.unconventionals.length) console.log("Unconventional:", r.distance, r.unconventionals);
    if (r.repIssues && r.repIssues.length) console.log("Rep issues:", r.distance, r.repIssues);
  }
  console.log("Done. Math failures: " + failed + " / " + results.length);
  process.exit(failed > 0 ? 1 : 0);
}

const tests = [
  { distance: 1500, poolLength: "25m" },
  { distance: 2000, poolLength: "25m" },
  { distance: 3000, poolLength: "25m" },
  { distance: 2000, poolLength: "50m" },
  { distance: 3000, poolLength: "50m" },
  { distance: 2000, poolLength: "25yd" },
  { distance: 3000, poolLength: "25yd" },
  { distance: 1500, poolLength: "custom", customPoolLength: 15, poolLengthUnit: "meters" },
  { distance: 2500, poolLength: "custom", customPoolLength: 15, poolLengthUnit: "meters" },
];

let anyFail = false;
for (const t of tests) {
  const payload = makePayload(t.distance, t.poolLength, {
    customPoolLength: t.customPoolLength,
    poolLengthUnit: t.poolLengthUnit,
  });
  const res = window.generateWorkoutLocal(payload);
  const label =
    t.poolLength === "custom"
      ? `${t.customPoolLength}${t.poolLengthUnit === "yards" ? "yd" : "m"}`
      : t.poolLength;
  const summary = summarize(t.distance, label, res);
  if (summary.ok && !summary.mathOk) anyFail = true;
}
process.exit(anyFail ? 1 : 0);

