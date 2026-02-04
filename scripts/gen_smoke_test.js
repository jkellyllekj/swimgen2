const http = require("http");

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

async function postGenerate(distance, poolLength) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ distance, poolLength });
    const req = http.request(
      `${BASE_URL}/generate-workout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, body: null, parseError: e.message, rawBody: body });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function findMainLines(text) {
  if (!text) return [];
  const lines = text.split("\n");
  let inMain = false;
  let mainLines = [];
  for (const line of lines) {
    if (/^MAIN/i.test(line.trim())) {
      inMain = true;
      mainLines.push(line);
    } else if (inMain) {
      if (/^\s*$/.test(line) || /^(WARM|COOL|DRILL|KICK|PULL|PRE-MAIN)/i.test(line.trim())) {
        break;
      }
      mainLines.push(line);
    }
  }
  return mainLines;
}

let requiredKeys = null;
let responseShapePrinted = false;

async function discoverResponseShape() {
  console.log("Discovering response shape...");
  const res = await postGenerate(2000, "25m");
  if (res.body) {
    requiredKeys = Object.keys(res.body);
    console.log(`Response top-level keys: ${requiredKeys.join(", ")}`);
    console.log(`Response has 'workoutText' field: ${res.body.workoutText ? "YES (text-based)" : "NO"}`);
    console.log(`Response has 'sections' array: ${Array.isArray(res.body.sections) ? "YES" : "NO"}`);
    if (res.body.workoutText) {
      console.log("API returns plain text workout. Parsing will use text-based detection.\n");
    }
  } else {
    console.log("Failed to get initial response for shape discovery.");
    console.log(`Status: ${res.status}, Error: ${res.parseError || "unknown"}`);
  }
  responseShapePrinted = true;
}

async function suiteA() {
  console.log("=== SUITE A: Crash and retry hardening ===");
  console.log("Pool: 25m, Target: 2000, Runs: 30\n");
  
  let non200Count = 0;
  let errorFieldCount = 0;
  let missingKeysCount = 0;
  let errors = [];

  for (let i = 0; i < 30; i++) {
    try {
      const res = await postGenerate(2000, "25m");
      
      if (res.status !== 200) {
        non200Count++;
        errors.push({ run: i + 1, type: "non-200", status: res.status, body: res.body });
      }
      
      if (res.body) {
        if (res.body.error) {
          errorFieldCount++;
          errors.push({ run: i + 1, type: "error-field", error: res.body.error });
        }
        if (requiredKeys) {
          for (const key of requiredKeys) {
            if (!(key in res.body)) {
              missingKeysCount++;
              errors.push({ run: i + 1, type: "missing-key", key });
              break;
            }
          }
        }
      } else {
        missingKeysCount++;
        errors.push({ run: i + 1, type: "parse-error", error: res.parseError });
      }
    } catch (e) {
      non200Count++;
      errors.push({ run: i + 1, type: "exception", error: e.message });
    }
  }

  console.log(`Non-200 HTTP responses: ${non200Count}`);
  console.log(`Responses with error field: ${errorFieldCount}`);
  console.log(`Responses missing required keys: ${missingKeysCount}`);
  
  if (errors.length > 0) {
    console.log("\nFailure details:");
    errors.slice(0, 5).forEach(e => {
      console.log(`  Run ${e.run}: ${e.type} - ${e.error || e.status || e.key}`);
    });
    if (errors.length > 5) {
      console.log(`  ... and ${errors.length - 5} more`);
    }
  }
  
  const pass = non200Count === 0 && errorFieldCount === 0 && missingKeysCount === 0;
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}\n`);
  return { pass, non200Count, errorFieldCount, missingKeysCount, errors };
}

async function suiteB() {
  console.log("=== SUITE B: Rep count sanity ===");
  console.log("Pool: 25m, Target: 2000, Runs: 15\n");
  
  let violations = [];

  for (let i = 0; i < 15; i++) {
    try {
      const res = await postGenerate(2000, "25m");
      if (res.body && res.body.workoutText) {
        const mainLines = findMainLines(res.body.workoutText);
        for (const line of mainLines) {
          const match = line.match(/(\d+)\s*x\s*50/i);
          if (match) {
            const reps = parseInt(match[1], 10);
            if (reps > 16) {
              violations.push({ run: i + 1, line: line.trim(), reps });
            }
          }
        }
      }
    } catch (e) {}
  }

  console.log(`Violations (Main with Nx50 where N > 16): ${violations.length}`);
  
  if (violations.length > 0) {
    console.log("\nViolating lines:");
    violations.forEach(v => {
      console.log(`  Run ${v.run}: "${v.line}" (${v.reps} reps)`);
    });
  }
  
  console.log(`\nRESULT: ${violations.length === 0 ? "PASS" : "INFO (violations found)"}\n`);
  return { violations };
}

async function suiteC() {
  console.log("=== SUITE C: Red distribution / intensity proxy ===");
  console.log("Pool: 25m, Target: 3000, Runs: 20\n");
  
  console.log("Cannot detect intensity from API payload.");
  console.log("API returns plain text (workoutText) with no structured intensity/zone metadata.");
  console.log("To detect red/high-intensity, the API would need to return section objects with");
  console.log("intensity, zone, effort, or color fields.\n");
  
  console.log("RESULT: SKIPPED (text-only API)\n");
  return { skipped: true };
}

async function suiteD() {
  console.log("=== SUITE D: 25yd parity ===");
  console.log("Pool: 25yd, Target: 2000, Runs: 10\n");
  
  let violations = [];

  for (let i = 0; i < 10; i++) {
    try {
      const res = await postGenerate(2000, "25yd");
      if (res.body && res.body.workoutText) {
        const mainLines = findMainLines(res.body.workoutText);
        for (const line of mainLines) {
          if (/\b(22|26)\s*x\s*50\b/i.test(line)) {
            violations.push({ run: i + 1, line: line.trim() });
          }
        }
      }
    } catch (e) {}
  }

  console.log(`Main sets with 22x50 or 26x50: ${violations.length}`);
  
  if (violations.length > 0) {
    console.log("\nExact lines:");
    violations.forEach(v => {
      console.log(`  Run ${v.run}: "${v.line}"`);
    });
  }
  
  console.log(`\nRESULT: ${violations.length === 0 ? "PASS" : "INFO (odd rep counts found)"}\n`);
  return { violations };
}

async function main() {
  console.log("========================================");
  console.log("SwimGen Smoke Test");
  console.log("========================================");
  console.log(`Endpoint: POST ${BASE_URL}/generate-workout`);
  console.log(`Request shape: { distance: number, poolLength: string }\n`);

  await discoverResponseShape();

  const results = {
    A: await suiteA(),
    B: await suiteB(),
    C: await suiteC(),
    D: await suiteD(),
  };

  console.log("========================================");
  console.log("SUMMARY");
  console.log("========================================");
  console.log(`Suite A (Crash hardening):  ${results.A.pass ? "PASS" : "FAIL"} - ${results.A.non200Count} HTTP errors, ${results.A.errorFieldCount} error fields`);
  console.log(`Suite B (Rep count sanity): ${results.B.violations.length === 0 ? "PASS" : "INFO"} - ${results.B.violations.length} violations`);
  console.log(`Suite C (Red distribution): SKIPPED (text-only API)`);
  console.log(`Suite D (25yd parity):      ${results.D.violations.length === 0 ? "PASS" : "INFO"} - ${results.D.violations.length} odd rep counts`);
}

main().catch(console.error);
