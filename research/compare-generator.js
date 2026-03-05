/**
 * Compares generator output to conventional-rules.json and produces a violation report.
 * Run from repo root: node research/compare-generator.js
 */

const path = require("path");
const fs = require("fs");

if (!global.window) global.window = global;
require(path.join(process.cwd(), "public", "offline-engine.js"));

const RULES_PATH = path.join(__dirname, "outputs/conventional-rules.json");
const REPORT_PATH = path.join(__dirname, "outputs/conventional-violation-report.json");

function loadRules() {
  const raw = fs.readFileSync(RULES_PATH, "utf8");
  return JSON.parse(raw);
}

function makePayload(distance, poolLength) {
  return {
    distance,
    poolLength,
    poolLengthUnit: "meters",
    customPoolLength: "",
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
    lastWorkoutFp: ""
  };
}

/** Normalize label for rule lookup */
function normLabel(label) {
  const l = String(label || "").toLowerCase();
  if (l.includes("warm") || l.includes("build")) return l.includes("warm") ? "warm-up" : "build";
  if (l.includes("cool")) return "cool-down";
  if (l.includes("kick")) return "kick";
  if (l.includes("drill")) return "drill";
  return "main";
}

/** Extract rep×dist patterns from text */
function extractRepPatterns(text) {
  const out = [];
  const re = /(\d+)\s*[x×]\s*(\d+)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push(m[1] + "x" + m[2]);
  }
  return out;
}

function run() {
  const rules = loadRules();
  const buckets25 = rules.distanceBuckets["25m_25yd"];
  const buckets50 = rules.distanceBuckets["50m"];
  const mainAllowed = new Set((rules.repPatterns.main && rules.repPatterns.main.allowed) || []);
  const mainRare = new Set((rules.repPatterns.main && rules.repPatterns.main.rare) || []);
  const kickAllowed = new Set((rules.repPatterns.kick && rules.repPatterns.kick.allowed) || []);
  const drillAllowed = new Set((rules.repPatterns.drill && rules.repPatterns.drill.allowed) || []);

  const pools = ["25m", "25yd", "50m"];
  const distances = [1500, 1800, 2000, 2200, 2500, 2800, 3000, 3200, 3500, 4000];
  const runs = [];
  for (let i = 0; i < 60; i++) {
    const pool = pools[i % pools.length];
    const dist = distances[Math.floor(i / pools.length) % distances.length];
    runs.push({ distance: dist, poolLength: pool });
  }

  const violations = [];
  let totalOk = 0;
  let totalRun = 0;

  for (const run of runs) {
    const res = window.generateWorkoutLocal(makePayload(run.distance, run.poolLength));
    if (!res || res.ok !== true) continue;
    totalRun++;
    const sectionDists = res.sectionDists || [];
    const sections = res.sections || [];
    const poolBucket = run.poolLength === "50m" ? "50m" : "25";
    const warmCool = run.poolLength === "50m" ? buckets50 : buckets25;

    for (const s of sectionDists) {
      const label = s.label;
      const dist = s.dist;
      const key = normLabel(label);
      if (key === "warm-up" || key === "build") {
        const allowed = warmCool.warmUpBuild || [];
        if (allowed.length && dist != null && !allowed.includes(dist)) {
          violations.push({
            type: "distance",
            section: label,
            value: dist,
            expected: allowed,
            pool: run.poolLength,
            distance: run.distance
          });
        }
      } else if (key === "cool-down") {
        const allowed = warmCool.coolDown || [];
        if (allowed.length && dist != null && !allowed.includes(dist)) {
          violations.push({
            type: "distance",
            section: label,
            value: dist,
            expected: allowed,
            pool: run.poolLength,
            distance: run.distance
          });
        }
      }
    }

    for (const sec of sections) {
      const body = String(sec.body || "");
      const key = normLabel(sec.label);
      const patterns = extractRepPatterns(body);
      for (const p of patterns) {
        if (key === "main") {
          if (!mainAllowed.has(p) && !mainRare.has(p)) {
            violations.push({
              type: "rep_pattern",
              section: sec.label,
              pattern: p,
              kind: "main",
              pool: run.poolLength,
              distance: run.distance
            });
          }
        } else if (key === "kick" && !kickAllowed.has(p)) {
          violations.push({
            type: "rep_pattern",
            section: sec.label,
            pattern: p,
            kind: "kick",
            pool: run.poolLength,
            distance: run.distance
          });
        } else if (key === "drill" && !drillAllowed.has(p)) {
          violations.push({
            type: "rep_pattern",
            section: sec.label,
            pattern: p,
            kind: "drill",
            pool: run.poolLength,
            distance: run.distance
          });
        }
      }
    }
  }

  const byType = {};
  const byViolation = {};
  for (const v of violations) {
    const key = v.type === "distance" ? `distance:${v.section}:${v.value}` : `rep:${v.kind}:${v.pattern}`;
    byViolation[key] = (byViolation[key] || 0) + 1;
    byType[v.type] = (byType[v.type] || 0) + 1;
  }

  const summary = [];
  for (const [k, count] of Object.entries(byViolation)) {
    summary.push({ violation: k, count });
  }
  summary.sort((a, b) => b.count - a.count);

  const report = {
    generatedAt: new Date().toISOString(),
    runsRequested: runs.length,
    runsOk: totalRun,
    totalViolations: violations.length,
    byType,
    summary,
    sampleViolations: violations.slice(0, 50)
  };

  const outDir = path.join(__dirname, "outputs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`Violation report: ${violations.length} violations from ${totalRun} workouts -> ${REPORT_PATH}`);
  if (summary.length) {
    console.log("Top violations:");
    summary.slice(0, 15).forEach((s) => console.log("  ", s.count, s.violation));
  }
  return report;
}

if (require.main === module) {
  run();
}

module.exports = { run, loadRules };
