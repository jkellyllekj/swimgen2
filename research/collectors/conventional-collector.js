/**
 * Conventional workout collector - builds corpus from public sources + optional seed.
 * Runs separately; does NOT touch the working app.
 * Output: research/outputs/conventional-corpus.json
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const OUTPUT_DIR = path.join(__dirname, "../outputs");
const CORPUS_PATH = path.join(OUTPUT_DIR, "conventional-corpus.json");
const SEED_PATH = path.join(OUTPUT_DIR, "conventional-sample-workouts.json");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Parse USMS article text (e.g. best-3000-yard) into workout objects.
 * Expects sections like "Warm-up (850)" and set lines below.
 */
function stripHtml(html) {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseUSMSArticleText(text) {
  const workouts = [];
  const normalized = text.replace(/\s+/g, " ");
  const blocks = normalized.split(/(?:Workout \d+:|Fast With)/i).filter(b => b.length > 100);
  for (const block of blocks) {
    const match = block.match(/(\d{1,3}(?:,\d{3})?)\s*yards/i);
    const totalYards = match ? parseInt(match[1].replace(/,/g, ""), 10) : null;
    const sectionRegex = /(Warm-up|Sculling Warm-up|Main Set|Freestyle Focus|Cool-down|3 Rounds[^]*?|25-50s[^]*?|300s[^]*?)\s*\((\d{1,3}(?:,\d{3})?)\)/gi;
    const sections = [];
    let secMatch;
    while ((secMatch = sectionRegex.exec(block)) !== null) {
      const label = secMatch[1].split(/\s*\(/)[0].trim();
      const dist = parseInt(secMatch[2].replace(/,/g, ""), 10);
      const normalized = label.toLowerCase().includes("warm") ? "warm-up" : label.toLowerCase().includes("cool") ? "cool-down" : "main";
      sections.push({ label: normalized, distance: dist, sets: [] });
    }
    if (sections.length >= 2 && totalYards) {
      workouts.push({ source: "USMS-3000yd-article", pool: "25yd", totalDistance: totalYards, sections });
    }
  }
  return workouts;
}

/**
 * Curated seed: 50+ workouts with conventional section distances and set patterns
 * (warm/build: 200,300,400,500,600,800; cool: 200,300,400,500; main/kick/drill rep schemes).
 */
function getCuratedSeed() {
  const base = [
    { source: "curated", pool: "25yd", totalDistance: 3000, sections: [
      { label: "warm-up", distance: 800, sets: ["300 choice", "4x50 build", "200 pull"] },
      { label: "main", distance: 1800, sets: ["6x200 descend", "8x100 steady"] },
      { label: "cool-down", distance: 400, sets: ["400 easy"] }
    ]},
    { source: "curated", pool: "25yd", totalDistance: 3000, sections: [
      { label: "warm-up", distance: 600, sets: ["300 easy", "4x75 kick-swim"] },
      { label: "main", distance: 2100, sets: ["3x(200 smooth", "4x50", "3x100 descend)"] },
      { label: "cool-down", distance: 300, sets: ["6x50 easy"] }
    ]},
    { source: "curated", pool: "25yd", totalDistance: 2900, sections: [
      { label: "warm-up", distance: 600, sets: ["200 choice", "4x50 scull", "200 choice"] },
      { label: "main", distance: 2100, sets: ["4x75", "300 pull", "4x75", "300 pull", "4x75", "300 pull", "4x75"] },
      { label: "cool-down", distance: 200, sets: ["200 kick/swim"] }
    ]},
    { source: "curated", pool: "25m", totalDistance: 1600, sections: [
      { label: "warm-up", distance: 400, sets: ["400 easy"] },
      { label: "main", distance: 800, sets: ["8x100 steady"] },
      { label: "cool-down", distance: 400, sets: ["400 easy"] }
    ]},
    { source: "curated", pool: "25m", totalDistance: 2000, sections: [
      { label: "warm-up", distance: 400, sets: ["400 easy"] },
      { label: "build", distance: 300, sets: ["6x50 build"] },
      { label: "main", distance: 1000, sets: ["10x100 descend 1-5"] },
      { label: "cool-down", distance: 300, sets: ["300 easy"] }
    ]},
    { source: "curated", pool: "25m", totalDistance: 2500, sections: [
      { label: "warm-up", distance: 500, sets: ["500 easy"] },
      { label: "drill", distance: 200, sets: ["4x50 drill"] },
      { label: "main", distance: 1600, sets: ["8x200 steady"] },
      { label: "cool-down", distance: 200, sets: ["200 easy"] }
    ]},
    { source: "curated", pool: "25m", totalDistance: 3000, sections: [
      { label: "warm-up", distance: 600, sets: ["600 easy"] },
      { label: "build", distance: 400, sets: ["8x50 build"] },
      { label: "main", distance: 1600, sets: ["8x200 threshold"] },
      { label: "cool-down", distance: 400, sets: ["400 easy"] }
    ]},
    { source: "curated", pool: "50m", totalDistance: 3000, sections: [
      { label: "warm-up", distance: 400, sets: ["400 easy"] },
      { label: "main", distance: 2200, sets: ["4x400", "6x100"] },
      { label: "cool-down", distance: 400, sets: ["400 easy"] }
    ]},
  ];
  const warm = [200, 300, 400, 500, 600, 800];
  const cool = [200, 300, 400, 500];
  const mainPatterns = ["4x100", "6x100", "8x100", "10x100", "12x100", "4x200", "6x200", "8x200", "4x50", "6x50", "8x50", "10x50", "12x50", "5x100", "5x200", "6x50", "8x75"];
  for (let i = 0; i < 50; i++) {
    const pool = i % 3 === 0 ? "50m" : (i % 2 === 0 ? "25m" : "25yd");
    const w = warm[i % warm.length];
    const c = cool[i % cool.length];
    const pat = mainPatterns[i % mainPatterns.length];
    const [reps, dist] = pat.split("x").map(Number);
    const mainD = reps * dist;
    const total = pool === "50m" ? 2000 + (i % 20) * 100 : 1500 + (i % 25) * 100;
    base.push({
      source: "curated",
      pool,
      totalDistance: total,
      sections: [
        { label: "warm-up", distance: w, sets: [`${w} easy`] },
        { label: "main", distance: mainD, sets: [pat + " steady"] },
        { label: "cool-down", distance: c, sets: [`${c} easy`] }
      ]
    });
  }
  return base;
}

function fetchUSMS3000() {
  return new Promise((resolve) => {
    const req = https.get("https://www.usms.org/fitness-and-training/articles-and-videos/articles/best-3000-yard-swimming-workouts", (res) => {
      let body = "";
      res.on("data", (ch) => { body += ch; });
      res.on("end", () => {
        try {
          const text = stripHtml(body);
          resolve(parseUSMSArticleText(text));
        } catch (e) {
          console.warn("Parse USMS page failed:", e.message);
          resolve([]);
        }
      });
    });
    req.on("error", (e) => { console.warn("Fetch USMS 3000 yd failed:", e.message); resolve([]); });
    req.setTimeout(10000, () => { req.destroy(); resolve([]); });
  });
}

function run() {
  ensureDir(OUTPUT_DIR);
  const corpus = { workouts: [], generatedAt: new Date().toISOString() };

  return (async () => {
    const fromFetch = await fetchUSMS3000();
    corpus.workouts.push(...fromFetch);
    corpus.workouts.push(...getCuratedSeed());
    if (fs.existsSync(SEED_PATH)) {
      try {
        const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
        const list = Array.isArray(seed) ? seed : (seed.workouts || []);
        corpus.workouts.push(...list);
      } catch (e) {
        console.warn("Could not load seed file:", e.message);
      }
    }
    fs.writeFileSync(CORPUS_PATH, JSON.stringify(corpus, null, 2));
    console.log(`Conventional corpus: ${corpus.workouts.length} workouts -> ${CORPUS_PATH}`);
    return corpus;
  })();
}

if (require.main === module) {
  run().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { run, parseUSMSArticleText, getCuratedSeed, CORPUS_PATH };
