      const form = document.getElementById("genForm");
      const errorBox = document.getElementById("errorBox");
      const statusPill = document.getElementById("statusPill");
      const dolphinLoader = document.getElementById("dolphinLoader");
      const cards = document.getElementById("cards");
      const totalBox = document.getElementById("totalBox");
      const totalText = document.getElementById("totalText");
      const footerBox = document.getElementById("footerBox");
      const raw = document.getElementById("raw");
      const copyBtn = document.getElementById("copyBtn");
      const distanceSlider = document.getElementById("distanceSlider");
      const distanceHidden = document.getElementById("distanceHidden");
      const distanceLabel = document.getElementById("distanceLabel");
      const poolButtons = document.getElementById("poolButtons");
      const poolHidden = document.getElementById("poolLengthHidden");
      const customLen = document.getElementById("customPoolLength");
      const customUnit = document.getElementById("poolLengthUnit");
      const thresholdPace = document.getElementById("thresholdPace");
      const toggleAdvanced = document.getElementById("toggleAdvanced");
      const advancedWrap = document.getElementById("advancedWrap");
      const generateBtn = document.getElementById("generateBtn");
      const advancedChip = document.getElementById("advancedChip");
      function snap100(n) {
        const x = Number(n);
        if (!Number.isFinite(x)) return 1000;
        return Math.round(x / 100) * 100;
      }
      function setDistance(val, skipSave) {
        const snapped = snap100(val);
        distanceSlider.value = String(snapped);
        distanceHidden.value = String(snapped);
        distanceLabel.textContent = String(snapped);
        if (!skipSave) saveUserSettings();
      }
      // ===== localStorage Settings System =====
      function migrateSettings(savedSettings) {
        if (!savedSettings.version) {
          return {
            version: '1.0',
            core: {
              distance: savedSettings.distance || 2000,
              poolLength: savedSettings.poolLength || '25m',
            },
            strokes: {
              freestyleBias: savedSettings.freestyleBias || 70,
              backstrokeBias: savedSettings.backstrokeBias || 10,
              breaststrokeBias: savedSettings.breaststrokeBias || 10,
              butterflyBias: savedSettings.butterflyBias || 10,
            },
            equipment: {
              pullBuoy: savedSettings.pullBuoy || false,
              fins: savedSettings.fins || false,
              paddles: savedSettings.paddles || false,
              snorkel: savedSettings.snorkel || false,
            },
            pace: {
              cssTime: '',
              intervalStyle: '',
              restPeriod: 0,
            },
            preferences: {
              showTimeEstimates: true,
              autoCalculateIntervals: true,
            }
          };
        }
        return savedSettings;
      }
      function loadUserSettings() {
        const saved = localStorage.getItem('swimWorkoutSettings');
        if (!saved) return null;
        try {
          const parsed = JSON.parse(saved);
          return migrateSettings(parsed);
        } catch (e) {
          console.error('Failed to parse saved settings:', e);
          return null;
        }
      }
      function saveUserSettings() {
        const settings = {
          version: '1.0',
          core: {
            distance: distanceSlider.value,
            poolLength: poolHidden.value,
          },
          strokes: {
            freestyleBias: 70,
            backstrokeBias: 10,
            breaststrokeBias: 10,
            butterflyBias: 10,
          },
          equipment: {
            pullBuoy: false,
            fins: false,
            paddles: false,
            snorkel: false,
          },
          pace: {
            cssTime: '',
            intervalStyle: '',
            restPeriod: 0,
          },
          preferences: {
            showTimeEstimates: true,
            autoCalculateIntervals: true,
          }
        };
        localStorage.setItem('swimWorkoutSettings', JSON.stringify(settings));
      }
      function updateSetting(category, key, value) {
        const settings = loadUserSettings() || {
          version: '1.0',
          core: {}, strokes: {}, equipment: {}, pace: {}, preferences: {}
        };
        if (!settings[category]) settings[category] = {};
        settings[category][key] = value;
        localStorage.setItem('swimWorkoutSettings', JSON.stringify(settings));
      }
      // ===== End localStorage Settings System =====
      function safeHtml(s) {
        return String(s)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");
      }
      function parsePaceToSecondsPer100(s) {
        const t = String(s || "").trim();
        if (!t) return null;
        // Accept 1:30 or 90
        if (/^\\d{1,2}:\\d{2}$/.test(t)) {
          const parts = t.split(":");
          const mm = Number(parts[0]);
          const ss = Number(parts[1]);
          if (!Number.isFinite(mm) || !Number.isFinite(ss)) return null;
          return (mm * 60) + ss;
        }
        if (/^\\d{2,3}$/.test(t)) {
          const v = Number(t);
          if (!Number.isFinite(v) || v <= 0) return null;
          return v;
        }
        return null;
      }
      function fmtMmSs(totalSeconds) {
        const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
        const mm = Math.floor(s / 60);
        const ss = s % 60;
        return String(mm) + ":" + String(ss).padStart(2, "0");
      }
      function unitShortFromPayload(payload) {
        if (payload.poolLength === "custom") {
          return payload.poolLengthUnit === "yards" ? "yd" : "m";
        }
        return payload.poolLength === "25yd" ? "yd" : "m";
      }
      function poolLabelFromPayload(payload) {
        if (payload.poolLength !== "custom") return payload.poolLength;
        const u = payload.poolLengthUnit === "yards" ? "yd" : "m";
        return String(payload.customPoolLength) + u + " custom";
      }
      function fnv1a(str) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
          h ^= str.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      }
      function loadLastWorkoutFingerprint() {
        try {
          return localStorage.getItem("swg_v1_last_fp") || "";
        } catch {
          return "";
        }
      }
      function saveLastWorkoutFingerprint(fp) {
        try {
          localStorage.setItem("swg_v1_last_fp", String(fp || ""));
        } catch {
        }
      }
      function fingerprintWorkoutText(text) {
        return String(fnv1a(String(text || "")));
      }
      // Background cycling with two-layer crossfade
      const backgroundImages = [
        "/backgrounds/Page-002 (Large)_result.webp",
        "/backgrounds/Page-004 (Large)_result.webp",
        "/backgrounds/Page-006 (Large)_result.webp",
        "/backgrounds/Page-008 (Large)_result.webp",
        "/backgrounds/Page-010 (Large)_result.webp",
        "/backgrounds/Page-012 (Large)_result.webp",
        "/backgrounds/Page-014 (Large)_result.webp",
        "/backgrounds/Page-016 (Large)_result.webp",
        "/backgrounds/Page-018 (Large)_result.webp",
        "/backgrounds/Page-020 (Large)_result.webp",
        "/backgrounds/Page-022 (Large)_result.webp",
        "/backgrounds/Page-022(1) (Large)_result.webp",
        "/backgrounds/Page-024 (Large)_result.webp"
      ];
      // Determine initial background index from bgA layer or body
      let bgIndex = (function() {
        const bgA = document.getElementById("bgA");
        const style = (bgA && bgA.style.backgroundImage) || document.body.style.backgroundImage || "";
        for (let i = 0; i < backgroundImages.length; i++) {
          if (style.includes(backgroundImages[i])) return i;
        }
        return 0;
      })();
      let activeBgLayer = "A";
      function setLayerImage(layerEl, url) {
        layerEl.style.backgroundImage = 'url("' + url + '")';
      }
      function preloadImage(url) {
        return new Promise(function(resolve, reject) {
          const img = new Image();
          img.onload = function() { resolve(true); };
          img.onerror = function() { reject(new Error("bg preload failed")); };
          img.src = url;
        });
      }
      function initBackgroundLayers() {
        const bgA = document.getElementById("bgA");
        const bgB = document.getElementById("bgB");
        if (!bgA || !bgB) return;
        const url = backgroundImages[bgIndex];
        setLayerImage(bgA, url);
        bgA.classList.add("isActive");
        bgB.classList.remove("isActive");
        activeBgLayer = "A";
      }
      async function cycleBackgroundManually() {
        const btn = document.getElementById("bgCycleBtn");
        const bgA = document.getElementById("bgA");
        const bgB = document.getElementById("bgB");
        if (!btn || !bgA || !bgB) return;
        btn.disabled = true;
        const nextIndex = (bgIndex + 1) % backgroundImages.length;
        const nextUrl = backgroundImages[nextIndex];
        console.log("[BG CYCLE] BEFORE:", {
          bgIndex: bgIndex,
          nextIndex: nextIndex,
          activeBgLayer: activeBgLayer,
          nextUrl: nextUrl
        });
        try {
          await preloadImage(nextUrl);
        } catch (e) {
          console.log("[BG CYCLE] preload FAILED:", e);
          btn.disabled = false;
          return;
        }
        const fromLayer = activeBgLayer === "A" ? bgA : bgB;
        const toLayer = activeBgLayer === "A" ? bgB : bgA;
        console.log("[BG CYCLE] LAYERS:", {
          fromLayerId: fromLayer.id,
          toLayerId: toLayer.id
        });
        setLayerImage(toLayer, nextUrl);
        toLayer.classList.add("isActive");
        fromLayer.classList.remove("isActive");
        console.log("[BG CYCLE] AFTER TOGGLE:", {
          bgA_classList: bgA.className,
          bgB_classList: bgB.className,
          bgA_opacity: getComputedStyle(bgA).opacity,
          bgB_opacity: getComputedStyle(bgB).opacity,
          bgA_bgImage: bgA.style.backgroundImage.slice(0, 60),
          bgB_bgImage: bgB.style.backgroundImage.slice(0, 60)
        });
        window.setTimeout(function() {
          bgIndex = nextIndex;
          activeBgLayer = activeBgLayer === "A" ? "B" : "A";
          btn.disabled = false;
          console.log("[BG CYCLE] COMMITTED:", { bgIndex: bgIndex, activeBgLayer: activeBgLayer });
        }, 300);
      }
      function wireBackgroundCycleButton() {
        const btn = document.getElementById("bgCycleBtn");
        if (!btn) return;
        btn.addEventListener("click", cycleBackgroundManually);
      }
      initBackgroundLayers();
      wireBackgroundCycleButton();
      function splitWorkout(workoutText) {
        const lines = String(workoutText || "").split(/\\r?\\n/);
        const setLines = [];
        const footerLines = [];
        const isFooterLine = (line) => {
          const t = String(line || "").trim();
          if (!t) return false;
          return (
            t.startsWith("Total lengths:") ||
            t.startsWith("Ends at start end:") ||
            t.startsWith("Requested:") ||
            t.startsWith("Total distance:") ||
            t.startsWith("Est total time:")
          );
        };
        for (const line of lines) {
          if (isFooterLine(line)) footerLines.push(String(line || "").trim());
          else if (String(line || "").trim()) setLines.push(String(line || ""));
        }
        return { setLines: setLines, footerLines: footerLines };
      }
      function parseSetLine(line) {
        const trimmed = String(line || "").trim();
        const m = trimmed.match(/^([^:]{2,30}):\\s*(.+)$/);
        if (m) {
          const label = m[1].trim();
          const body = m[2].trim();
          return { label: label, body: body };
        }
        return { label: null, body: trimmed };
      }
      function clearUI() {
        errorBox.style.display = "none";
        errorBox.innerHTML = "";
        cards.style.display = "none";
        cards.innerHTML = "";
        totalBox.style.display = "none";
        totalBox.classList.remove("workout-fade-in");
        
        footerBox.style.display = "none";
        footerBox.innerHTML = "";
        footerBox.classList.remove("workout-fade-in");
        raw.style.display = "none";
        raw.textContent = "";
        statusPill.innerHTML = "";
        copyBtn.disabled = true;
        copyBtn.dataset.copyText = "";
        window.__swgSummary = null;
        
        const nameDisplay = document.getElementById("workoutNameDisplay");
        if (nameDisplay) nameDisplay.style.display = "none";
      }
      function renderError(title, details) {
        const lines = [];
        lines.push("<div style=\\"font-weight:700; color:#b00020; margin-bottom:6px;\\">" + safeHtml(title) + "</div>");
        if (Array.isArray(details) && details.length) {
          lines.push("<ul style=\\"margin:0; padding-left:18px;\\">");
          for (const d of details) {
            lines.push("<li style=\\"margin:4px 0;\\">" + safeHtml(String(d)) + "</li>");
          }
          lines.push("</ul>");
        }
        errorBox.innerHTML = lines.join("");
        errorBox.style.display = "block";
      }
      function canonicalizeLabel(labelRaw) {
        const raw = String(labelRaw || "").trim();
        if (!raw) return null;
        const key = raw.toLowerCase().replace(/\\s+/g, " ").trim();
        const map = {
          "warm-up": "Warm up",
          "warm up": "Warm up",
          "warmup": "Warm up",
          "build": "Build",
          "drill": "Drill",
          "drills": "Drill",
          "kick": "Kick",
          "pull": "Pull",
          "main": "Main",
          "main 1": "Main 1",
          "main 2": "Main 2",
          "cooldown": "Cool down",
          "cool down": "Cool down"
        };
        if (map[key]) return map[key];
        return raw;
      }
      function getEffortLevel(label, body) {
        const text = (String(label || "") + " " + String(body || "")).toLowerCase();
        const labelOnly = String(label || "").toLowerCase();
        
        // Zone names: easy (green), moderate (blue), strong (yellow), hard (orange), fullgas (red)
        
        // Warm-up and cool-down are always easy (green - Zone 1)
        if (text.includes("warm") || text.includes("cool")) return "easy";
        
        // Full Gas keywords (red - Zone 5) - max intensity
        const fullgasWords = ["sprint", "all out", "max effort", "race pace", "100%", "full gas", "max"];
        for (const w of fullgasWords) if (text.includes(w)) return "fullgas";
        
        // Hard keywords (orange - Zone 4) - sustained hard
        const hardWords = ["fast", "strong", "best average", "race", "threshold", "hard"];
        for (const w of hardWords) if (text.includes(w)) return "hard";
        
        // Main sets are NEVER easy/green - at minimum strong (yellow), default hard (orange)
        if (labelOnly.includes("main")) {
          // Check if it has strong keywords, otherwise default to hard
          const strongWords = ["descend", "build", "negative split", "push", "steady", "smooth"];
          for (const w of strongWords) if (text.includes(w)) return "strong";
          return "hard";
        }
        
        // Strong keywords (yellow - Zone 3) - building effort
        const strongWords = ["descend", "build", "negative split", "push"];
        for (const w of strongWords) if (text.includes(w)) return "strong";
        
        // Moderate keywords (blue - Zone 2) - technique work
        const moderateWords = ["steady", "smooth", "drill", "technique", "focus", "form", "choice"];
        for (const w of moderateWords) if (text.includes(w)) return "moderate";
        
        // Easy keywords (green - Zone 1)
        const easyWords = ["easy", "relaxed", "recovery", "loosen"];
        for (const w of easyWords) if (text.includes(w)) return "easy";
        
        // Default: moderate for technique sets
        return "moderate";
      }
      // Zone order for filling gaps (never skip levels)
      const ZONE_ORDER = ["easy", "moderate", "strong", "hard", "fullgas"];
      
      // Parse a single line or clause to detect its zone
      function detectLineZone(line) {
        const t = String(line || "").toLowerCase();
        
        // Fullgas (red) - maximum intensity
        if (t.includes("sprint") || t.includes("all out") || t.includes("max effort") || 
            t.includes("race pace") || t.includes("full gas") || t.includes("100%")) {
          return "fullgas";
        }
        
        // Hard (orange) - sustained hard
        if (t.includes("fast") || t.includes("strong") || t.includes("hard") || 
            t.includes("threshold") || t.includes("best average")) {
          return "hard";
        }
        
        // Strong (yellow) - building effort, moderate-hard
        if (t.includes("push") || t.includes("moderate")) {
          return "strong";
        }
        
        // Moderate (green) - steady, technique
        if (t.includes("steady") || t.includes("smooth") || t.includes("drill") || 
            t.includes("technique") || t.includes("focus") || t.includes("form") || 
            t.includes("choice") || t.includes("relaxed")) {
          return "moderate";
        }
        
        // Easy (blue)
        if (t.includes("easy") || t.includes("recovery") || t.includes("loosen") || 
            t.includes("warm") || t.includes("cool")) {
          return "easy";
        }
        
        return null; // Unknown
      }
      
      // Fill gaps between two zones so we never skip levels
      function fillZoneGap(fromZone, toZone) {
        const fromIdx = ZONE_ORDER.indexOf(fromZone);
        const toIdx = ZONE_ORDER.indexOf(toZone);
        if (fromIdx < 0 || toIdx < 0) return [fromZone, toZone];
        
        const result = [];
        if (fromIdx <= toIdx) {
          for (let i = fromIdx; i <= toIdx; i++) result.push(ZONE_ORDER[i]);
        } else {
          for (let i = fromIdx; i >= toIdx; i--) result.push(ZONE_ORDER[i]);
        }
        return result;
      }
      
      // Parse body text into effort segments with weights
      // Returns { zones: [...], isStriped: bool, isProgressive: bool }
      // Optional variantSeed adds randomness for gradient probability
      function parseEffortTimeline(label, body, variantSeed) {
        const labelOnly = String(label || "").toLowerCase();
        const bodyText = String(body || "").toLowerCase();
        const lines = String(body || "").split("\\n").filter(l => l.trim());
        
        // LCG-based seeded random generator - advances with each call
        let lcgState = variantSeed || (body ? body.length * 7 + 42 : 42);
        function nextRandom() {
          lcgState = (lcgState * 9301 + 49297) % 233280;
          return lcgState / 233280;
        }
        
        // Detect progression keywords - these create smooth gradients
        const hasProgression = /build|descend|negative split|pyramid|disappearing/i.test(bodyText);
        const hasFinalSprint = /final.*(sprint|fast|hard)|last.*(sprint|fast|hard)|with final|last \\d+ sprint/i.test(bodyText);
        const hasAlternating = /odds.*(easy|fast)|evens.*(easy|fast)|alternate/i.test(bodyText);
        
        // Warm-up: 80% solid blue, 20% easy→moderate gradient
        if (labelOnly.includes("warm")) {
          if (nextRandom() < 0.8) {
            return { zones: ["easy"], isStriped: false, isProgressive: false };
          }
          return { zones: ["easy", "moderate"], isStriped: false, isProgressive: true };
        }
        
        // Cool-down: 80% solid blue, 20% moderate→easy gradient
        if (labelOnly.includes("cool")) {
          if (nextRandom() < 0.8) {
            return { zones: ["easy"], isStriped: false, isProgressive: false };
          }
          return { zones: ["moderate", "easy"], isStriped: false, isProgressive: true };
        }
        
        // Drill: Always solid green or yellow (technique focus, no gradients)
        if (labelOnly.includes("drill")) {
          const zone = nextRandom() < 0.7 ? "moderate" : "strong";
          return { zones: [zone], isStriped: false, isProgressive: false };
        }
        
        // Alternating pattern: odds easy evens fast -> stripes with actual zones
        if (hasAlternating) {
          // Parse exact zones from alternating pattern
          let zone1 = "moderate";
          let zone2 = "hard";
          
          // Detect first zone (odds X or evens X where X is first mentioned)
          if (/odds\\s+easy/i.test(bodyText)) zone1 = "easy";
          else if (/odds\\s+steady|odds\\s+relaxed/i.test(bodyText)) zone1 = "moderate";
          else if (/odds\\s+strong|odds\\s+push/i.test(bodyText)) zone1 = "strong";
          else if (/odds\\s+fast|odds\\s+hard/i.test(bodyText)) zone1 = "hard";
          else if (/odds\\s+sprint/i.test(bodyText)) zone1 = "fullgas";
          
          // Detect second zone (evens X or vice versa)
          if (/evens\\s+easy/i.test(bodyText)) zone2 = "easy";
          else if (/evens\\s+steady|evens\\s+relaxed/i.test(bodyText)) zone2 = "moderate";
          else if (/evens\\s+strong|evens\\s+push/i.test(bodyText)) zone2 = "strong";
          else if (/evens\\s+fast|evens\\s+hard/i.test(bodyText)) zone2 = "hard";
          else if (/evens\\s+sprint/i.test(bodyText)) zone2 = "fullgas";
          
          // Only stripe if zones are different
          if (zone1 !== zone2) {
            return { zones: [zone1, zone2, zone1, zone2], isStriped: true, isProgressive: false };
          }
          // Same zone = solid color
          return { zones: [zone1], isStriped: false, isProgressive: false };
        }
        
        // Steady/hold sets: only solid if explicit "maintain" or "same pace" - not just "hold" 
        // Skip this if progression keywords are present (build then hold is still progressive)
        const hasPureSteady = /maintain.*pace|same pace|consistent pace/i.test(bodyText) && !hasProgression;
        if (hasPureSteady) {
          // Detect the actual zone level
          if (/strong|threshold/i.test(bodyText)) return { zones: ["hard"], isStriped: false, isProgressive: false };
          if (/fast|hard/i.test(bodyText)) return { zones: ["hard"], isStriped: false, isProgressive: false };
          if (/easy|relaxed/i.test(bodyText)) return { zones: ["moderate"], isStriped: false, isProgressive: false };
          return { zones: ["strong"], isStriped: false, isProgressive: false };
        }
        
        // Progression sets: build, descend, etc
        if (hasProgression) {
          // Determine start and end zones based on context
          let startZone = "moderate"; // Default start
          let endZone = "hard"; // Default end
          
          // Check for explicit start zone mentions
          if (/from easy|start easy|start relaxed/i.test(bodyText)) startZone = "easy";
          else if (/from moderate|start steady|start smooth/i.test(bodyText)) startZone = "moderate";
          
          // Check for explicit end zone mentions  
          if (hasFinalSprint || /to sprint|to max|to race pace|to full/i.test(bodyText)) {
            endZone = "fullgas";
          } else if (/to strong|strong effort/i.test(bodyText)) {
            endZone = "hard";
          } else if (/to fast|to hard|to threshold/i.test(bodyText)) {
            endZone = "hard";
          }
          
          // For main sets with build, start higher
          if (labelOnly.includes("main") && startZone === "easy") {
            startZone = "moderate";
          }
          
          // Fill the progression
          const progressionZones = fillZoneGap(startZone, endZone);
          return { zones: progressionZones, isStriped: false, isProgressive: true };
        }
        
        // Multi-line sets: parse each line's zone
        if (lines.length >= 2) {
          const lineZones = [];
          for (const line of lines) {
            const zone = detectLineZone(line);
            if (zone) lineZones.push(zone);
          }
          
          if (lineZones.length >= 2) {
            // Check if it's alternating (A-B-A-B pattern)
            const isAlternatingPattern = lineZones.length >= 3 && lineZones.every((z, i) => 
              z === lineZones[i % 2 === 0 ? 0 : 1]
            ) && lineZones[0] !== lineZones[1];
            
            if (isAlternatingPattern) {
              return { zones: lineZones.slice(0, 6), isStriped: true, isProgressive: false };
            }
            
            // Progressive: fill gaps between first and last
            const firstZone = lineZones[0];
            const lastZone = lineZones[lineZones.length - 1];
            if (firstZone !== lastZone) {
              return { zones: fillZoneGap(firstZone, lastZone), isStriped: false, isProgressive: true };
            }
          }
        }
        
        // Single zone detection for solid colors
        const singleZone = detectLineZone(bodyText);
        if (singleZone) {
          // Check for final sprint modifier - cap gradient at most one level above base
          // unless explicitly fullgas set already
          if (hasFinalSprint && singleZone !== "fullgas") {
            // Determine reasonable end zone - one level up from base, max hard for non-main sets
            const baseIdx = ZONE_ORDER.indexOf(singleZone);
            let endIdx = Math.min(baseIdx + 1, ZONE_ORDER.length - 1);
            // Only go to fullgas if base is already hard, or if label is main
            if (baseIdx >= ZONE_ORDER.indexOf("hard") || labelOnly.includes("main")) {
              endIdx = ZONE_ORDER.length - 1; // fullgas
            }
            const endZone = ZONE_ORDER[endIdx];
            if (singleZone !== endZone) {
              const progressionZones = fillZoneGap(singleZone, endZone);
              return { zones: progressionZones, isStriped: false, isProgressive: true };
            }
          }
          return { zones: [singleZone], isStriped: false, isProgressive: false };
        }
        
        // Default by label type with probability-based variety
        
        // Kick/Pull: mostly moderate (70%), sometimes strong (20%), occasionally hard (10%)
        if (labelOnly.includes("kick") || labelOnly.includes("pull")) {
          const kickRoll = nextRandom();
          if (kickRoll < 0.7) return { zones: ["moderate"], isStriped: false, isProgressive: false };
          if (kickRoll < 0.9) return { zones: ["strong"], isStriped: false, isProgressive: false };
          return { zones: ["hard"], isStriped: false, isProgressive: false };
        }
        
        // Build: 30% gradient (moderate→strong), 70% solid for cleaner visuals
        if (labelOnly.includes("build")) {
          const buildGradientRoll = nextRandom();
          if (buildGradientRoll < 0.3) {
            return { zones: ["moderate", "strong"], isStriped: false, isProgressive: true };
          }
          // Solid color - variety across blue/green/yellow
          const buildZoneRoll = nextRandom();
          if (buildZoneRoll < 0.25) return { zones: ["easy"], isStriped: false, isProgressive: false };
          if (buildZoneRoll < 0.65) return { zones: ["moderate"], isStriped: false, isProgressive: false };
          return { zones: ["strong"], isStriped: false, isProgressive: false };
        }
        
        // Main: 30% gradient, 70% solid for cleaner card appearance
        // Cover ALL effort levels: blue, green, yellow, orange, red
        if (labelOnly.includes("main")) {
          const mainGradientRoll = nextRandom();
          if (mainGradientRoll < 0.3) {
            // Gradient - varied progressions
            const mainEndRoll = nextRandom();
            const endZone = mainEndRoll < 0.2 ? "fullgas" : "hard";
            const startZone = mainEndRoll < 0.5 ? "moderate" : "strong";
            return { zones: fillZoneGap(startZone, endZone), isStriped: false, isProgressive: true };
          }
          // Solid - even distribution across all 5 zones for variety
          const mainSolidRoll = nextRandom();
          if (mainSolidRoll < 0.15) return { zones: ["easy"], isStriped: false, isProgressive: false };
          if (mainSolidRoll < 0.35) return { zones: ["moderate"], isStriped: false, isProgressive: false };
          if (mainSolidRoll < 0.55) return { zones: ["strong"], isStriped: false, isProgressive: false };
          if (mainSolidRoll < 0.85) return { zones: ["hard"], isStriped: false, isProgressive: false };
          return { zones: ["fullgas"], isStriped: false, isProgressive: false };
        }
        
        return { zones: ["moderate"], isStriped: false, isProgressive: false };
      }
      function getZoneSpan(label, body, variantSeed) {
        const timeline = parseEffortTimeline(label, body, variantSeed);
        
        // Single zone = solid color, no gradient needed
        if (timeline.zones.length <= 1) return null;
        
        // Return zones for gradient/stripe rendering
        return timeline.zones;
      }
      
      // Check if zones should be rendered as stripes vs gradient
      function isZoneStriped(label, body, variantSeed) {
        const timeline = parseEffortTimeline(label, body, variantSeed);
        return timeline.isStriped;
      }
      function getZoneColors(zone) {
        const root = document.documentElement;
        const getVar = (name, fallback) => getComputedStyle(root).getPropertyValue(name).trim() || fallback;
        
        // Zone names: easy (blue), moderate (green), strong (yellow), hard (orange), fullgas (red)
        const zones = {
          easy: { bg: getVar('--zone-easy-bg', '#b9f0fd'), bar: getVar('--zone-easy-bar', '#7ac8db') },
          moderate: { bg: getVar('--zone-moderate-bg', '#cfffc0'), bar: getVar('--zone-moderate-bar', '#8fcc80') },
          strong: { bg: getVar('--zone-strong-bg', '#fcf3d5'), bar: getVar('--zone-strong-bar', '#d4c9a0') },
          hard: { bg: getVar('--zone-hard-bg', '#ffc374'), bar: getVar('--zone-hard-bar', '#cc9a4a') },
          fullgas: { bg: getVar('--zone-fullgas-bg', '#fe0000'), bar: getVar('--zone-fullgas-bar', '#cc0000') }
        };
        return zones[zone] || zones.moderate;
      }
      function gradientStyleForZones(zoneSpan, label, body, variantSeed) {
        if (!zoneSpan || zoneSpan.length < 2) return null;
        
        const colors = zoneSpan.map(z => getZoneColors(z));
        
        // Determine text color - white only if more than half is fullgas
        const fullgasCount = zoneSpan.filter(z => z === 'fullgas').length;
        const hardOrFullgasCount = zoneSpan.filter(z => z === 'fullgas' || z === 'hard').length;
        const textColor = (fullgasCount > zoneSpan.length / 2) ? '#fff' : '#111';
        
        // Check if this should be striped (alternating pattern) vs smooth gradient
        const shouldStripe = isZoneStriped(label, body, variantSeed);
        
        if (shouldStripe) {
          // Alternating patterns now use smooth blended gradients (not hard stripes)
          // This creates a wave-like transition between effort levels
          const bgStops = colors.map((c, i) => c.bg + ' ' + Math.round(i * 100 / (colors.length - 1)) + '%').join(', ');
          const bgGradient = 'linear-gradient(to bottom, ' + bgStops + ')';
          
          const barStops = colors.map((c, i) => c.bar + ' ' + Math.round(i * 100 / (colors.length - 1)) + '%').join(', ');
          const barGradient = 'linear-gradient(to bottom, ' + barStops + ')';
          
          return {
            background: bgGradient,
            barGradient: barGradient,
            borderColor: colors[0].bar,
            textColor: textColor
          };
        }
        
        // Smooth gradient for progressive builds
        const bgStops = colors.map((c, i) => c.bg + ' ' + Math.round(i * 100 / (colors.length - 1)) + '%').join(', ');
        const bgGradient = 'linear-gradient(to bottom, ' + bgStops + ')';
        
        const barStops = colors.map((c, i) => c.bar + ' ' + Math.round(i * 100 / (colors.length - 1)) + '%').join(', ');
        const barGradient = 'linear-gradient(to bottom, ' + barStops + ')';
        
        return {
          background: bgGradient,
          barGradient: barGradient,
          borderColor: colors[0].bar,
          textColor: textColor
        };
      }
      function colorStyleForEffort(effort, variantSeed) {
        // Zone-based colors using CSS variables for live color picker
        // Zone names: easy (blue), moderate (green), strong (yellow), hard (orange), fullgas (red)
        // variantSeed adds subtle gradient variety to prevent flat/boring cards
        const root = document.documentElement;
        const getVar = (name, fallback) => getComputedStyle(root).getPropertyValue(name).trim() || fallback;
        const variant = (variantSeed || 0) % 4; // 4 gradient variants per zone
        
        if (effort === "easy") {
          const bg = getVar('--zone-easy-bg', '#b9f0fd');
          const bgLight = '#d4f7ff';
          // Variants: solid, subtle top-down, subtle left-right, subtle diagonal
          if (variant === 1) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + ");";
          if (variant === 2) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bg + " 100%);";
          return "background:" + bg + ";";
        }
        if (effort === "moderate") {
          const bg = getVar('--zone-moderate-bg', '#cfffc0');
          const bgLight = '#e0ffe0';
          if (variant === 1) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + ");";
          if (variant === 2) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bg + " 100%);";
          return "background:" + bg + ";";
        }
        if (effort === "strong") {
          const bg = getVar('--zone-strong-bg', '#fcf3d5');
          const bgLight = '#fffaea';
          const bgDark = '#f5e6b8';
          if (variant === 1) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + ");";
          if (variant === 2) return "background:linear-gradient(to bottom, " + bg + ", " + bgDark + ");";
          if (variant === 3) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bgDark + " 100%);";
          return "background:" + bg + ";";
        }
        if (effort === "hard") {
          const bg = getVar('--zone-hard-bg', '#ffc374');
          const bgLight = '#ffd9a8';
          const bgDark = '#ff9933';
          // More dramatic gradients for hard sets - makes them pop
          if (variant === 0) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + ");";
          if (variant === 1) return "background:linear-gradient(to bottom, " + bg + ", " + bgDark + ");";
          if (variant === 2) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bgDark + " 100%);";
          if (variant === 3) return "background:linear-gradient(180deg, " + bgLight + " 0%, " + bg + " 50%, " + bgDark + " 100%);";
          return "background:" + bg + ";";
        }
        if (effort === "fullgas") {
          const bg = getVar('--zone-fullgas-bg', '#fe0000');
          const bgLight = '#ff4444';
          const bgDark = '#cc0000';
          // Dramatic gradients for max intensity - really stands out
          if (variant === 0) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + "); color:#fff;";
          if (variant === 1) return "background:linear-gradient(to bottom, " + bg + ", " + bgDark + "); color:#fff;";
          if (variant === 2) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bgDark + " 100%); color:#fff;";
          if (variant === 3) return "background:linear-gradient(180deg, " + bgLight + " 0%, " + bg + " 40%, " + bgDark + " 100%); color:#fff;";
          return "background:" + bg + "; color:#fff;";
        }
        return "background:#fff;";
      }
      // Keep old functions for compatibility but mark deprecated
      function labelColorKey(label) {
        const k = String(label || "").toLowerCase();
        if (k.includes("warm")) return "warm";
        if (k.includes("build")) return "build";
        if (k.includes("drill")) return "drill";
        if (k.includes("kick")) return "kick";
        if (k.includes("pull")) return "pull";
        if (k.includes("main")) return "main";
        if (k.includes("cool")) return "cool";
        return "neutral";
      }
      function colorStyleForKey(key) {
        const k = String(key || "");
        if (k === "warm") return "background:linear-gradient(to right, #22c55e 4px, #f0fdf4 4px); border:1px solid #bbf7d0; border-left:4px solid #22c55e;";
        if (k === "build") return "background:linear-gradient(to right, #3b82f6 4px, #eff6ff 4px); border:1px solid #bfdbfe; border-left:4px solid #3b82f6;";
        if (k === "drill") return "background:linear-gradient(to right, #8b5cf6 4px, #f5f3ff 4px); border:1px solid #ddd6fe; border-left:4px solid #8b5cf6;";
        if (k === "kick") return "background:linear-gradient(to right, #f59e0b 4px, #fffbeb 4px); border:1px solid #fde68a; border-left:4px solid #f59e0b;";
        if (k === "pull") return "background:linear-gradient(to right, #f97316 4px, #fff7ed 4px); border:1px solid #fed7aa; border-left:4px solid #f97316;";
        if (k === "main") return "background:linear-gradient(to right, #ef4444 4px, #fef2f2 4px); border:1px solid #fecaca; border-left:4px solid #ef4444;";
        if (k === "cool") return "background:linear-gradient(to right, #06b6d4 4px, #ecfeff 4px); border:1px solid #a5f3fc; border-left:4px solid #06b6d4;";
        return "background:#fff; border:1px solid #e7e7e7;";
      }
      function captureSummary(payload, workoutText) {
        const units = unitShortFromPayload(payload);
        const requested = Number(payload.distance);
        const poolText = poolLabelFromPayload(payload);
        const paceSec = parsePaceToSecondsPer100(payload.thresholdPace || "");
        window.__swgSummary = {
          units: units,
          requested: requested,
          poolText: poolText,
          paceSec: paceSec,
          workoutText: String(workoutText || "")
        };
      }
      function extractFooterInfo(footerLines) {
        const info = {
          totalLengthsLine: null,
          endsLine: null,
          requestedLine: null,
          totalDistanceLine: null,
          estTotalTimeLine: null
        };
        if (!Array.isArray(footerLines)) return info;
        for (const line of footerLines) {
          const t = String(line || "").trim();
          if (!t) continue;
          if (t.startsWith("Total lengths:")) info.totalLengthsLine = t;
          else if (t.startsWith("Ends at start end:")) info.endsLine = t;
          else if (t.startsWith("Requested:")) info.requestedLine = t;
          else if (t.startsWith("Total distance:")) info.totalDistanceLine = t;
          else if (t.startsWith("Est total time:")) info.estTotalTimeLine = t;
        }
        return info;
      }
      function renderFooterTotalsAndMeta(footerLines) {
        const s = window.__swgSummary || { units: "", requested: null, poolText: "", paceSec: null };
        const info = extractFooterInfo(footerLines);
        // Extract total distance for the yellow Total box
        let totalDistStr = "";
        if (info.totalDistanceLine) {
          const match = info.totalDistanceLine.match(/Total distance:\\s*(\\d+)/);
          if (match) totalDistStr = match[1] + (s.units || "m");
        } else if (Number.isFinite(s.requested)) {
          totalDistStr = String(s.requested) + (s.units || "m");
        }
        // Show yellow Total box (prepared for fade-in, triggered by main animation)
        if (totalDistStr) {
          totalText.textContent = "Total " + totalDistStr;
          totalBox.style.opacity = "0";
          totalBox.style.transform = "translateY(16px)";
          totalBox.style.transition = "none";
          totalBox.style.display = "block";
        } else {
          totalBox.style.display = "none";
        }
        // Build summary chips (without Total since it's in yellow box now)
        const chips = [];
        if (s.poolText) chips.push("Pool: " + s.poolText);
        if (info.totalLengthsLine) chips.push(info.totalLengthsLine);
        if (info.estTotalTimeLine) chips.push(info.estTotalTimeLine);
        const seen = new Set();
        const deduped = [];
        for (const c of chips) {
          const k = String(c);
          if (seen.has(k)) continue;
          seen.add(k);
          deduped.push(k);
        }
        if (!deduped.length) {
          footerBox.style.display = "none";
          footerBox.innerHTML = "";
          return;
        }
        const f = [];
        f.push("<div style=\\"display:flex; flex-wrap:wrap; gap:10px;\\">");
        for (const c of deduped) {
          f.push("<div class=\\"readChip\\" style=\\"padding:6px 10px; border-radius:8px; font-weight:700;\\">" + safeHtml(c) + "</div>");
        }
        f.push("</div>");
        
        // Add emoji intensity strip
        const intensityStrip = renderEmojiIntensityStrip();
        if (intensityStrip) {
          f.push(intensityStrip);
        }
        
        // Copyright notice
        f.push("<div style=\\"margin-top:12px; text-align:center; font-size:12px; opacity:0.7;\\">\\u00A9 Creative Arts Global LTD. All rights reserved.</div>");
        
        footerBox.innerHTML = f.join("");
        footerBox.style.opacity = "0";
        footerBox.style.transform = "translateY(16px)";
        footerBox.style.transition = "none";
        footerBox.style.display = "block";
      }
      
      // Emoji intensity strip - 5 faces with gradient background like CardGym
      function renderEmojiIntensityStrip() {
        // Calculate intensity from rendered cards
        const cards = document.querySelectorAll('[data-effort]');
        if (!cards.length) return null;
        
        let intensitySum = 0;
        let count = 0;
        
        cards.forEach(card => {
          const effort = card.getAttribute('data-effort');
          const effortValues = { easy: 1, steady: 2, moderate: 3, strong: 4, hard: 5, fullgas: 5 };
          if (effortValues[effort]) {
            intensitySum += effortValues[effort];
            count++;
          }
        });
        
        if (count === 0) return null;
        
        const avgIntensity = intensitySum / count;
        
        // Map average to 1-5 scale for display
        const level = Math.min(5, Math.max(1, Math.round(avgIntensity)));
        
        // 5 dolphin icons from easy to hard
        const dolphinIcons = [
          '/assets/dolphins/dolphin-easy.png',
          '/assets/dolphins/dolphin-moderate.png',
          '/assets/dolphins/dolphin-strong.png',
          '/assets/dolphins/dolphin-threshold.png',
          '/assets/dolphins/dolphin-fullgas.png'
        ];
        const iconAlts = ['Easy', 'Moderate', 'Strong', 'Threshold', 'Full Gas'];
        
        // Gradient background colors matching CardGym: blue -> green -> yellow -> orange -> red
        const bgColors = ['#b9f0fd', '#cfffc0', '#fcf3d5', '#ffc374', '#fe5050'];
        
        let strip = '<div style=\\"margin-top:6px;\\">';
        
        // Scroll wrapper. On big phones you should see all 5 without scrolling.
        // On smaller widths it can swipe.
        strip += '<div class=\\"effortScrollWrap\\">';
        
        // Inner strip: full width, but won't collapse below 360px.
        strip += '<div class=\\"effortStrip\\">';
        
        for (let i = 0; i < 5; i++) {
          strip += '<div class=\\"effortTile\\" style=\\"background:' + bgColors[i] + ';\\">';
          strip += '<img class=\\"effortIcon\\" src=\\"' + dolphinIcons[i] + '\\" alt=\\"' + iconAlts[i] + '\\">';
          strip += '</div>';
        }
        
        strip += '</div></div></div>';
        return strip;
      }
      // Persistent Map to track reroll counts per set index (survives innerHTML replacement)
      const rerollCountMap = new Map();
      
      function computeSetDistanceFromBody(body) {
        const t = String(body || "");
        let sum = 0;
        // Split by newlines to handle multi-line set bodies
        const lines = t.split(/\\n/);
        
        for (const line of lines) {
          // Skip numbered drill list items (e.g., "1. 25 Drill / 25 Swim", "2. 3-3-3")
          if (/^\\d+\\.\\s+/.test(line.trim())) continue;
          
          // Skip blank lines
          if (!line.trim()) continue;
          
          // Support x and × for NxD format (8x50, 4×100, etc)
          const re = /(\\d+)\\s*[x×]\\s*(\\d+)\\s*(m|yd)?/gi;
          let m;
          while ((m = re.exec(line)) !== null) {
            const reps = Number(m[1]);
            const dist = Number(m[2]);
            if (Number.isFinite(reps) && Number.isFinite(dist)) sum += reps * dist;
          }
          
          // Also check for standalone distances like "200 easy" without NxD
          // Only if this line had no NxD matches
          if (!/(\\d+)\\s*[x×]\\s*(\\d+)/i.test(line)) {
            const standaloneMatch = line.match(/(^|\\s)(\\d{2,5})(\\s*(m|yd|meters|yards))?(\\s|$)/i);
            if (standaloneMatch) {
              const v = Number(standaloneMatch[2]);
              if (Number.isFinite(v) && v >= 25 && v <= 5000) sum += v;
            }
          }
        }
        return sum > 0 ? sum : null;
      }
      function computeRestSecondsFromBody(body) {
        // Sum an estimate of rest for repeats where "rest 15s" appears.
        const t = String(body || "");
        const reSeg = /(\\d+)\\s*[x×]\\s*(\\d+)[^\\n]*?rest\\s*(\\d+)\\s*s/gi;
        let sum = 0;
        let m;
        while ((m = reSeg.exec(t)) !== null) {
          const reps = Number(m[1]);
          const rest = Number(m[3]);
          if (Number.isFinite(reps) && reps >= 2 && Number.isFinite(rest) && rest >= 0) {
            sum += (reps - 1) * rest;
          }
        }
        return sum;
      }
      
      function extractRestDisplay(body) {
        // Free tier: never display rest seconds.
        // Rest UI will return later behind a paid-tier flag.
        return null;
      }
      
      function stripRestFromBody(body) {
        // Remove "rest XXs" from each line for cleaner display
        return String(body || "")
          .split("\\n")
          .map(line => line.replace(/\\s*rest\\s*\\d+\\s*s/gi, "").trim())
          .filter(line => line.length > 0)
          .join("\\n");
      }
      function cycleCardEffortFallback(bodyEl) {
        const card = bodyEl ? bodyEl.closest('[data-effort]') : null;
        if (!card) return;
        const order = ["easy", "steady", "moderate", "strong", "hard", "fullgas"];
        const cur = (card.getAttribute("data-effort") || "steady").toLowerCase();
        const idx = Math.max(0, order.indexOf(cur));
        const next = order[(idx + 1) % order.length];
        card.setAttribute("data-effort", next);
      }
      function estimateSwimSeconds(body, paceSecPer100, label) {
        if (!Number.isFinite(paceSecPer100) || paceSecPer100 <= 0) return null;
        const dist = computeSetDistanceFromBody(body);
        if (!Number.isFinite(dist) || dist <= 0) return null;
        const k = String(label || "").toLowerCase();
        // Multipliers relative to threshold pace
        // Warm up slower, drills slower, main around threshold, sprint slightly faster but more rest.
        let mult = 1.15;
        if (k.includes("warm")) mult = 1.25;
        else if (k.includes("build")) mult = 1.18;
        else if (k.includes("drill")) mult = 1.30;
        else if (k.includes("kick")) mult = 1.38;
        else if (k.includes("pull")) mult = 1.25;
        else if (k.includes("main")) mult = 1.05;
        else if (k.includes("cool")) mult = 1.35;
        const swim = (dist / 100) * paceSecPer100 * mult;
        const rest = computeRestSecondsFromBody(body);
        return swim + rest;
      }
      function renderCards(payload, workoutText) {
        // Expose globally for gesture editing system
        window.renderCards = renderCards;
        
        // Clear reroll counts for fresh workout generation
        rerollCountMap.clear();
        
        const parts = splitWorkout(workoutText);
        const setLines = parts.setLines || [];
        const footerLines = parts.footerLines || [];
        if (!setLines.length) {
          cards.style.display = "none";
          return false;
        }
        const sections = [];
        for (const line of setLines) {
          const parsed = parseSetLine(line);
          const labelCanon = canonicalizeLabel(parsed.label);
          if (labelCanon) {
            sections.push({ label: labelCanon, bodies: [parsed.body] });
          } else if (sections.length) {
            sections[sections.length - 1].bodies.push(parsed.body);
          } else {
            sections.push({ label: null, bodies: [parsed.body] });
          }
        }
        const paceSec = parsePaceToSecondsPer100(payload.thresholdPace || "");
        const html = [];
        html.push('<div style="display:flex; flex-direction:column; gap:10px;">');
        let idx = 0;
        for (const s of sections) {
          idx += 1;
          const label = s.label ? s.label : ("Set " + idx);
          const body = s.bodies.filter(Boolean).join("\\n");
          const setDist = computeSetDistanceFromBody(body);
          const restDisplay = extractRestDisplay(body);
          const estSec = estimateSwimSeconds(body, paceSec, label);
          
          // Get unit for display
          const unitShort = unitShortFromPayload(payload);
          const effortLevel = getEffortLevel(label, body);
          const variantSeed = idx * 7 + body.length;
          const zoneSpan = getZoneSpan(label, body, variantSeed);
          const gradientStyle = zoneSpan ? gradientStyleForZones(zoneSpan, label, body, variantSeed) : null;
          
          let boxStyle;
          let textColor = '#111';
          const dropShadow = "0 6px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.25)";
          
          if (gradientStyle) {
            // Gradient cards: full box color + drop shadow (no left bar)
            boxStyle = "background:" + gradientStyle.background + "; border:none; box-shadow:" + dropShadow + ";";
            textColor = gradientStyle.textColor || '#111';
          } else {
            // Solid color cards with drop shadow - use idx as variant seed for gradient variety
            boxStyle = colorStyleForEffort(effortLevel, idx) + " box-shadow:" + dropShadow + ";";
            // White text only on full red (fullgas)
            if (effortLevel === 'fullgas') {
              textColor = '#fff';
            }
          }
          
          html.push('<div data-effort="' + effortLevel + '" data-index="' + (idx - 1) + '" style="' + boxStyle + ' border-radius:12px; padding:12px;">');
          const subTextColor = textColor === '#fff' ? '#eee' : '#666';
          const distColor = textColor === '#fff' ? '#99ccff' : '#0055aa';
          const restColor = textColor === '#fff' ? '#ffcccc' : '#c41e3a';
          const bodyClean = stripRestFromBody(body);
          // Main layout: left column (title + detail) | right column (dolphin + metres)
          html.push('<div class="setHeaderRow">');
          
          // Left column: title and detail lines
          html.push('<div style="flex:1; min-width:0;">');
          html.push('<div style="font-weight:700; color:' + textColor + '; margin-bottom:6px;">' + safeHtml(label) + '</div>');
          html.push('<div data-set-body="' + safeHtml(String(idx)) + '" data-original-body="' + safeHtml(body) + '" style="white-space:pre-wrap; line-height:1.35; font-weight:600; color:' + textColor + ';">' + safeHtml(bodyClean) + "</div>");
          if (restDisplay) {
            html.push('<div style="color:' + restColor + '; font-weight:600; font-size:14px; margin-top:4px;">' + safeHtml(restDisplay) + "</div>");
          }
          if (Number.isFinite(estSec)) {
            html.push('<div style="font-size:12px; color:' + subTextColor + '; margin-top:4px;">Est: ' + fmtMmSs(estSec) + "</div>");
          }
          html.push("</div>");
          
          // Right column: dolphin aligned with title, metres aligned with detail
          html.push('<div class="setRightCol">');
          html.push(
            '<button type="button" data-reroll-set="' +
              safeHtml(String(idx)) +
              '" style="padding:0; border-radius:8px; border:none; background:transparent; cursor:pointer; line-height:1;" title="Reroll this set">' +
              '<span class="reroll-dolphin setDolphin"><img class="dolphinIcon setDolphinSpinTarget" src="/assets/dolphins/dolphin-base.png" alt=""></span>' +
            "</button>"
          );
          if (Number.isFinite(setDist)) {
            html.push('<div class="setMeters" style="font-size:14px; white-space:nowrap; color:' + distColor + ';">' + String(setDist) + unitShort + "</div>");
          }
          html.push("</div>");
          
          html.push("</div>");
          html.push("</div>");
        }
        html.push("</div>");
        cards.innerHTML = html.join("");
        cards.style.display = "block";
        // Setup gesture editing for the workout
        setupGestureEditing(sections);
        const rerollButtons = cards.querySelectorAll("button[data-reroll-set]");
        for (const btn of rerollButtons) {
          // Prevent pointer/mouse events from triggering card drag
          btn.addEventListener("pointerdown", (e) => e.stopPropagation());
          btn.addEventListener("mousedown", (e) => e.stopPropagation());
          btn.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });
          
          btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            e.preventDefault();
            const setIndex = Number(btn.getAttribute("data-reroll-set"));
            const bodyEl = cards.querySelector('[data-set-body="' + String(setIndex) + '"]');
            if (!bodyEl) return;
            // Use original body (with rest) for avoidText matching, display body for distance calc
            const originalBody = bodyEl.getAttribute("data-original-body") || "";
            const displayBody = bodyEl.textContent || "";
            const currentDist = computeSetDistanceFromBody(displayBody);
            if (!Number.isFinite(currentDist)) {
              renderError("Cannot reroll this set", ["Set distance could not be parsed. Ensure it contains NxD segments like 8x50, 4x100, or a single distance like 600."]);
              return;
            }
            // Increment reroll counter using persistent Map (survives innerHTML replacement)
            const prevCount = rerollCountMap.get(setIndex) || 0;
            const rerollCount = prevCount + 1;
            rerollCountMap.set(setIndex, rerollCount);
            if (btn.dataset.busy === "1") return;
            btn.dataset.busy = "1";
            btn.blur();
            const spinTarget = btn.querySelector('.setDolphinSpinTarget');
            if (spinTarget) {
              spinTarget.classList.add('spinning');
            }
            try {
              const res = await fetch("/reroll-set", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  poolLength: payload.poolLength,
                  poolLengthUnit: payload.poolLengthUnit,
                  customPoolLength: payload.customPoolLength,
                  thresholdPace: payload.thresholdPace || "",
                  focus: payload.focus || "allround",
                  restPref: payload.restPref || "balanced",
                  includeKick: !!payload.includeKick,
                  includePull: !!payload.includePull,
                  equip_fins: !!payload.equip_fins,
                  equip_paddles: !!payload.equip_paddles,
                  stroke_freestyle: !!payload.stroke_freestyle,
                  stroke_backstroke: !!payload.stroke_backstroke,
                  stroke_breaststroke: !!payload.stroke_breaststroke,
                  stroke_butterfly: !!payload.stroke_butterfly,
                  label: (sections[setIndex - 1] && sections[setIndex - 1].label) ? sections[setIndex - 1].label : null,
                  targetDistance: currentDist,
                  avoidText: originalBody,
                  rerollCount: rerollCount
                }),
              });
              const data = await res.json().catch(() => null);
              if (!res.ok || !data || data.ok !== true) {
                // Reroll must never show a scary failure box in v1.
                // Provide a guaranteed visible fallback: cycle the effort colour.
                console.warn("Reroll failed:", data && data.error ? data.error : ("HTTP " + res.status));
                cycleCardEffortFallback(bodyEl);
                return;
              }
              const nextBody = String(data.setBody || "").trim();
              if (!nextBody) {
                // Silent fallback for empty set
                console.warn("Reroll returned empty set");
                cycleCardEffortFallback(bodyEl);
                return;
              }
              // Strip rest from display and update rest column
              const nextBodyClean = stripRestFromBody(nextBody);
              const nextRest = extractRestDisplay(nextBody);
              bodyEl.textContent = nextBodyClean;
              bodyEl.setAttribute("data-original-body", nextBody);
              // Update card color based on new effort level
              const cardContainer = bodyEl.closest('[data-effort]');
              if (cardContainer) {
                const label = sections[setIndex - 1] && sections[setIndex - 1].label ? sections[setIndex - 1].label : "";
                const newEffort = getEffortLevel(label, nextBody);
                cardContainer.setAttribute('data-effort', newEffort);
                // Use Date.now() for true randomness - ensures different styling each reroll
                const nowMs = Date.now();
                const newVariantSeed = (nowMs ^ (rerollCount * 7919) ^ nextBody.length) >>> 0;
                const newZoneSpan = getZoneSpan(label, nextBody, newVariantSeed);
                const newGradientStyle = newZoneSpan ? gradientStyleForZones(newZoneSpan, label, nextBody, newVariantSeed) : null;
                let newStyle;
                let newTextColor = '#111';
                const dropShadow = "0 6px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.25)";
                
                if (newGradientStyle) {
                  newStyle = "background:" + newGradientStyle.background + "; border:none; box-shadow:" + dropShadow + ";";
                  newTextColor = newGradientStyle.textColor || '#111';
                } else {
                  // Use nowMs for true randomness on solid color variant
                  newStyle = colorStyleForEffort(newEffort, nowMs) + " box-shadow:" + dropShadow + ";";
                  // White text only on full red (fullgas)
                  if (newEffort === 'fullgas') {
                    newTextColor = '#fff';
                  }
                }
                cardContainer.style.cssText = newStyle + " border-radius:12px; padding:12px;";
                
                // Update text colors for body and other elements
                bodyEl.style.color = newTextColor;
                const labelEl = cardContainer.querySelector('div[style*="font-weight:700"]');
                if (labelEl) labelEl.style.color = newTextColor;
                
                // Update rest color
                const restEl = bodyEl.nextElementSibling;
                const restColor = newTextColor === '#fff' ? '#ffcccc' : '#c41e3a';
                if (restEl) {
                  restEl.style.color = restColor;
                  if (nextRest) {
                    restEl.textContent = nextRest;
                    restEl.style.display = "";
                  } else {
                    restEl.textContent = "";
                  }
                }
                
                // Update distance color - always blue (royal blue for light, light blue for dark)
                const distanceContainer = restEl ? restEl.nextElementSibling : null;
                if (distanceContainer) {
                  const distEl = distanceContainer.querySelector('div:first-child');
                  const estEl = distanceContainer.querySelector('div:last-child');
                  const distColor = newTextColor === '#fff' ? '#99ccff' : '#0055aa';
                  if (distEl) distEl.style.color = distColor;
                  if (estEl && estEl !== distEl) estEl.style.color = newTextColor === '#fff' ? '#eee' : '#666';
                }
              } else {
                // Fallback: just update rest column
                const restEl = bodyEl.nextElementSibling;
                if (restEl) {
                  if (nextRest) {
                    restEl.textContent = nextRest;
                    restEl.style.display = "";
                  } else {
                    restEl.textContent = "";
                  }
                }
              }
            } catch (e) {
              renderError("Reroll failed", [String(e && e.message ? e.message : e)]);
            } finally {
              // Wait for the full 1.25s spin animation to complete before removing class
              const spinTarget = btn.querySelector('.setDolphinSpinTarget');
              await new Promise(r => setTimeout(r, 1250));
              btn.dataset.busy = "0";
              if (spinTarget) {
                spinTarget.classList.remove('spinning');
              }
            }
          });
        }
        renderFooterTotalsAndMeta(footerLines);
        return true;
      }
      // Dolphin animation stabilisation
      // - single helper path for all generator dolphins
      // - cancels overlapping timers
      // - forces CSS animation restart
      // - tokenises runs to prevent overlap
      let __dolphinAnimToken = 0;
      let __dolphinAnimTimers = [];
      function __clearDolphinAnimTimers() {
        for (const t of __dolphinAnimTimers) clearTimeout(t);
        __dolphinAnimTimers = [];
      }
      function __forceRestartSpin(el) {
        if (!el) return;
        el.classList.remove("dolphinSpin");
        // Force reflow so the CSS animation restarts reliably
        void el.offsetWidth;
        el.classList.add("dolphinSpin");
      }
      function dolphinAnimBegin(mainEl, extraEls, activeBtn) {
        __dolphinAnimToken += 1;
        const token = __dolphinAnimToken;
        __clearDolphinAnimTimers();
        const all = [mainEl].concat(Array.isArray(extraEls) ? extraEls : []).filter(Boolean);
        // Ensure baseline state
        for (const el of all) {
          if (!el.innerHTML || !String(el.innerHTML).trim()) el.innerHTML = '<img class="dolphinIcon" src="/assets/dolphins/dolphin-base.png" alt="">';
          el.dataset.spinStartedAt = String(Date.now());
          __forceRestartSpin(el);
        }
        if (activeBtn) activeBtn.classList.add("active");
        return token;
      }
      function dolphinAnimFinish(mainEl, extraEls, activeBtn, onSplashShown) {
        const token = __dolphinAnimToken;
        const all = [mainEl].concat(Array.isArray(extraEls) ? extraEls : []).filter(Boolean);
        const SPIN_MS = 800;           // one full loop (sped up from 1000)
        const FADE_MS = 200;           // cross-fade chunk
        const SPLASH_HOLD_MS = 1000;   // keep splash visible
        const IDLE_FADEIN_MS = 200;    // dolphin fade back in
        const started = Number(mainEl && mainEl.dataset ? (mainEl.dataset.spinStartedAt || "0") : "0");
        const elapsed = started ? (Date.now() - started) : SPIN_MS;
        const wait = Math.max(0, SPIN_MS - elapsed);
        __clearDolphinAnimTimers();
        __dolphinAnimTimers.push(setTimeout(() => {
          if (token !== __dolphinAnimToken) return;
          // Stop spinning
          for (const el of all) el.classList.remove("dolphinSpin");
          // Crossfade: dolphin fades out AND splash fades in simultaneously
          for (const el of all) {
            // Create splash element with fixed angle class
            const splashSpan = document.createElement("span");
            splashSpan.className = "splashFixed";
            splashSpan.textContent = "💦";
            splashSpan.style.position = "absolute";
            splashSpan.style.top = "50%";
            splashSpan.style.left = "50%";
            splashSpan.style.translate = "-50% -50%";
            splashSpan.style.fontSize = "inherit";
            splashSpan.style.opacity = "0";
            splashSpan.style.transition = "opacity " + FADE_MS + "ms ease";
            
            // Position container relatively if needed
            if (getComputedStyle(el).position === "static") {
              el.style.position = "relative";
            }
            
            // Start dolphin fade out
            const dolphinImg = el.querySelector("img");
            if (dolphinImg) {
              dolphinImg.style.transition = "opacity " + FADE_MS + "ms ease";
              dolphinImg.style.opacity = "0";
            }
            
            // Insert splash and fade in at same time
            el.appendChild(splashSpan);
            void splashSpan.offsetWidth;
            splashSpan.style.opacity = "1";
          }
          // Trigger scroll/reveal callback after splash is clearly visible (150ms delay)
          __dolphinAnimTimers.push(setTimeout(() => {
            if (typeof onSplashShown === "function") {
              try { onSplashShown(); } catch (e) { console.error("onSplashShown error:", e); }
            }
          }, FADE_MS + 150));
          // Hold splash, then fade out and reset to idle dolphin
          __dolphinAnimTimers.push(setTimeout(() => {
            if (token !== __dolphinAnimToken) return;
            // Fade out splash
            for (const el of all) {
              const splash = el.querySelector(".splashFixed");
              if (splash) {
                splash.style.transition = "opacity " + FADE_MS + "ms ease";
                splash.style.opacity = "0";
              }
            }
            __dolphinAnimTimers.push(setTimeout(() => {
              if (token !== __dolphinAnimToken) return;
              for (let i = 0; i < all.length; i++) {
                const el = all[i];
                const isMain = (i === 0);
                const imgClass = isMain ? "dolphinIcon dolphinIcon--generate" : "dolphinIcon";
                // Remove splash and restore dolphin
                const splash = el.querySelector(".splashFixed");
                if (splash) splash.remove();
                const oldImg = el.querySelector("img");
                if (oldImg) oldImg.remove();
                
                const newImg = document.createElement("img");
                newImg.className = imgClass;
                newImg.src = "/assets/dolphins/dolphin-base.png";
                newImg.alt = "";
                newImg.style.opacity = "0";
                newImg.style.transition = "opacity " + IDLE_FADEIN_MS + "ms ease";
                el.appendChild(newImg);
                void newImg.offsetWidth;
                newImg.style.opacity = "1";
              }
              // Explicit final reset after dolphin fade-in completes
              __dolphinAnimTimers.push(setTimeout(() => {
                if (token !== __dolphinAnimToken) return;
                for (const el of all) {
                  el.style.position = "";
                  el.style.display = "";
                  el.style.opacity = "1";
                  el.style.transform = "";
                  el.style.transition = "";
                  el.classList.remove("animating");
                }
                if (activeBtn) activeBtn.classList.remove("active");
              }, IDLE_FADEIN_MS));
            }, FADE_MS));
          }, SPLASH_HOLD_MS));
        }, wait));
      }
      function renderAll(payload, workoutText) {
        captureSummary(payload, workoutText);
        const ok = renderCards(payload, workoutText);
        return ok;
      }
      function setActivePool(poolValue, skipSave) {
        poolHidden.value = poolValue;
        const isCustom = poolValue === "custom";
        if (isCustom) {
          advancedWrap.style.display = "block";
          if (advancedChip) {
            advancedChip.innerHTML = "▼ Advanced options";
            advancedChip.classList.add("whiteChipActive");
          }
        } else {
          customLen.value = "";
          customUnit.value = "meters";
        }
        for (const btn of poolButtons.querySelectorAll("button[data-pool]")) {
          const isActive = btn.getAttribute("data-pool") === poolValue;
          if (isActive) {
            btn.classList.add("active");
          } else {
            btn.classList.remove("active");
          }
        }
        if (!skipSave) saveUserSettings();
      }
      poolButtons.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-pool]");
        if (!btn) return;
        setActivePool(btn.getAttribute("data-pool"));
      });
      distanceSlider.addEventListener("input", (e) => {
        setDistance(e.target.value);
      });
      // Track last selected pool button for reversion
      let lastPoolBtn = "25m";
      // Custom pool length input: auto-select custom mode when user types a value
      customLen.addEventListener("input", () => {
        const val = customLen.value.trim();
        if (val && !isNaN(Number(val)) && Number(val) > 0) {
          // Valid number entered: switch to custom pool mode
          poolHidden.value = "custom";
          // Clear active class from tier buttons
          for (const btn of poolButtons.querySelectorAll("button[data-pool]")) {
            btn.classList.remove("active");
          }
          // Expand advanced options if not already open
          if (advancedWrap.style.display === "none") {
            advancedWrap.style.display = "block";
            if (advancedChip) {
              advancedChip.innerHTML = "▼ Advanced options";
              advancedChip.classList.add("whiteChipActive");
            }
          }
        } else {
          // Cleared or invalid: revert to last selected pool button
          // This restores both the hidden value and button active state
          setActivePool(lastPoolBtn);
        }
      });
      // Update lastPoolBtn when user clicks a pool button (capture phase to run before setActivePool)
      poolButtons.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-pool]");
        if (btn) {
          lastPoolBtn = btn.getAttribute("data-pool");
        }
      }, true);
      toggleAdvanced.addEventListener("click", () => {
        const open = advancedWrap.style.display !== "none";
        if (open) {
          advancedWrap.style.display = "none";
          if (advancedChip) {
            advancedChip.innerHTML = "▶ Advanced options";
            advancedChip.classList.remove("whiteChipActive");
          }
        } else {
          advancedWrap.style.display = "block";
          if (advancedChip) {
            advancedChip.innerHTML = "▼ Advanced options";
            advancedChip.classList.add("whiteChipActive");
          }
        }
      });
      copyBtn.addEventListener("click", async () => {
        const text = copyBtn.dataset.copyText || "";
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          statusPill.textContent = "Copied.";
          setTimeout(() => {
            if (statusPill.textContent === "Copied.") statusPill.innerHTML = "";
          }, 1200);
        } catch {
          statusPill.textContent = "Copy failed.";
          setTimeout(() => {
            if (statusPill.textContent === "Copy failed.") statusPill.innerHTML = "";
          }, 1200);
        }
      });
      function formToPayload() {
        const fd = new FormData(form);
        const payload = Object.fromEntries(fd.entries());
        // Normalize checkboxes (present => "on")
        const boolNames = [
          "stroke_freestyle",
          "stroke_backstroke",
          "stroke_breaststroke",
          "stroke_butterfly",
          "includeKick",
          "includePull",
          "equip_fins",
          "equip_paddles"
        ];
        for (const n of boolNames) payload[n] = payload[n] === "on";
        return payload;
      }
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // STEP 0: Check if there's an existing workout to fade out
        const hasExistingWorkout = cards.innerHTML.trim().length > 0 && cards.style.display !== "none";
        const nameDisplay = document.getElementById("workoutNameDisplay");
        
        if (hasExistingWorkout) {
          // Store current height to prevent layout jump
          const currentHeight = cards.offsetHeight;
          cards.style.minHeight = currentHeight + "px";
          
          // Fade out existing workout and title
          cards.classList.add("workout-fade-out");
          if (nameDisplay && nameDisplay.style.display !== "none") {
            nameDisplay.classList.add("workout-fade-out");
          }
          
          // Wait for fade-out to complete (0.7s animation)
          await new Promise(r => setTimeout(r, 700));
          
          // Remove fade-out class and clear
          cards.classList.remove("workout-fade-out");
          if (nameDisplay) nameDisplay.classList.remove("workout-fade-out");
        }
        
        clearUI();
        
        // Reset min-height after clearing
        cards.style.minHeight = "";
        // Dolphin animation (stabilised)
        const regenDolphin = document.getElementById("regenDolphin");
        dolphinAnimBegin(dolphinLoader, [regenDolphin], generateBtn);
        statusPill.textContent = "";
        const payload = formToPayload();
        const isCustom = payload.poolLength === "custom";
        if (isCustom) {
          if (!payload.customPoolLength) {
            dolphinAnimFinish(dolphinLoader, [regenDolphin], generateBtn);
            statusPill.textContent = "";
            renderError("Error", ["Enter a custom pool length."]);
            return;
          }
          payload.customPoolLength = Number(payload.customPoolLength);
        } else {
          delete payload.customPoolLength;
          payload.poolLengthUnit = "meters";
        }
        try {
          const lastFp = loadLastWorkoutFingerprint();
          const res = await fetch("/generate-workout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, lastWorkoutFp: lastFp })
          });
          let data = null;
          try {
            data = await res.json();
          } catch {
          }
          if (!res.ok) {
            dolphinAnimFinish(dolphinLoader, [regenDolphin], generateBtn);
            statusPill.textContent = "";
            const msg = (data && (data.error || data.message)) ? (data.error || data.message) : ("HTTP " + res.status);
            renderError("Request failed", [msg].filter(Boolean));
            return;
          }
          if (!data || data.ok !== true) {
            dolphinAnimFinish(dolphinLoader, [regenDolphin], generateBtn);
            statusPill.textContent = "";
            const msg = data && data.error ? data.error : "Unknown error.";
            renderError("Generation failed", [msg].filter(Boolean));
            return;
          }
          const workoutText = String(data.workoutText || "").trim();
          const workoutName = String(data.workoutName || "").trim();
          if (!workoutText) {
            dolphinAnimFinish(dolphinLoader, [regenDolphin], generateBtn);
            statusPill.textContent = "";
            renderError("No workout returned", ["workoutText was empty."]);
            return;
          }
          statusPill.textContent = "";
          // STEP 1: Setup title and cards for fade-in (both invisible initially)
          const nameDisplayEl = document.getElementById("workoutNameDisplay");
          const nameText = document.getElementById("workoutNameText");
          
          // Prepare workout name (invisible initially)
          if (workoutName && nameDisplayEl && nameText) {
            nameText.textContent = workoutName;
            nameDisplayEl.style.opacity = "0";
            nameDisplayEl.style.transform = "translateY(16px)";
            nameDisplayEl.style.transition = "none";
            nameDisplayEl.style.display = "block";
          } else if (nameDisplayEl) {
            nameDisplayEl.style.display = "none";
          }
          // Prepare cards (invisible initially)
          cards.style.opacity = "0";
          cards.style.transform = "translateY(20px)";
          cards.style.transition = "none";
          const ok = renderAll(payload, workoutText);
          if (!ok) {
            raw.textContent = workoutText;
            raw.style.display = "block";
          }
          // Force reflow to reset animation state (critical for consistent behavior)
          void cards.offsetWidth;
          if (nameDisplayEl) void nameDisplayEl.offsetWidth;
          // Dolphin animation finish with callback when splash appears
          dolphinAnimFinish(dolphinLoader, [regenDolphin], generateBtn, () => {
            // STEP 2: Scroll to workout area when splash is visible
            const scrollTarget = nameDisplayEl && nameDisplayEl.style.display !== "none" ? nameDisplayEl : cards;
            if (scrollTarget) {
              scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            // STEP 3: Fade in content after scroll starts
            setTimeout(() => {
              // Fade in title first (0.7s)
              if (nameDisplayEl && nameDisplayEl.style.display !== "none") {
                nameDisplayEl.style.transition = "opacity 0.7s ease-out, transform 0.7s ease-out";
                nameDisplayEl.style.opacity = "1";
                nameDisplayEl.style.transform = "translateY(0)";
              }
              
              // Fade in cards (0.7s)
              cards.style.transition = "opacity 0.7s ease-out, transform 0.7s ease-out";
              cards.style.opacity = "1";
              cards.style.transform = "translateY(0)";
              
              // Fade in Total and Summary at the same time
              if (totalBox.style.display !== "none") {
                void totalBox.offsetWidth;
                totalBox.style.transition = "opacity 0.7s ease-out, transform 0.7s ease-out";
                totalBox.style.opacity = "1";
                totalBox.style.transform = "translateY(0)";
              }
              if (footerBox.style.display !== "none") {
                void footerBox.offsetWidth;
                footerBox.style.transition = "opacity 0.7s ease-out, transform 0.7s ease-out";
                footerBox.style.opacity = "1";
                footerBox.style.transform = "translateY(0)";
              }
            }, 500);
          });
          const fp = fingerprintWorkoutText(workoutText);
          saveLastWorkoutFingerprint(fp);
          copyBtn.disabled = false;
          copyBtn.dataset.copyText = workoutText;
        } catch (err) {
            dolphinAnimFinish(dolphinLoader, [regenDolphin], generateBtn);
          statusPill.textContent = "";
          renderError("Network error", [String(err && err.message ? err.message : err)]);
        }
      });
      
      // Wire up regen button to trigger Generate
      const regenBtn = document.getElementById("regenBtn");
      if (regenBtn) {
        regenBtn.addEventListener("click", () => {
          const gen = document.getElementById("generateBtn");
          if (gen) gen.click();
        });
      }
      
      // Wire up workout title area regen and bg buttons
      document.getElementById("regenBtn2")?.addEventListener("click", () => {
        document.getElementById("generateBtn")?.click();
      });
      document.getElementById("generateBtn2")?.addEventListener("click", () => {
        document.getElementById("generateBtn")?.click();
      });
      document.getElementById("bgCycleBtn2")?.addEventListener("click", () => {
        document.getElementById("bgCycleBtn")?.click();
      });
      // Load saved settings on page load
      (function loadSavedSettings() {
        const savedSettings = loadUserSettings();
        if (savedSettings) {
          // Core parameters
          const distance = savedSettings.core?.distance || savedSettings.distance || 2000;
          const poolLength = savedSettings.core?.poolLength || savedSettings.poolLength || '25m';
          
          // Set distance (skipSave=true to avoid saving during load)
          setDistance(distance, true);
          
          // Set pool length (skipSave=true to avoid saving during load)
          setActivePool(poolLength, true);
        }
      })();
      // Initialize gesture editing system
      initGestureSystem();
      /* ===== 30/30 GESTURE EDITING FUNCTIONS - FIXED ===== */
      let currentGestureEditingIndex = -1;
      let currentWorkoutArray = [];
      function setupGestureEditing(workoutData) {
        // Store the workout data in the correct format
        currentWorkoutArray = workoutData.map((section, sectionIndex) => ({
          label: section.label || ('Set ' + (sectionIndex + 1)),
          bodies: section.bodies || [],
          bodyText: (section.bodies || []).join('\\n'),
          sectionIndex: sectionIndex
        }));
        
        // Attach gesture handlers after cards are rendered
        setTimeout(() => {
          const cards = document.querySelectorAll('[data-effort]');
          cards.forEach((card, index) => {
            // Make sure this card hasn't already been set up
            if (card.dataset.gestureSetup === 'true') return;
            
            // Add swipe hints if not already there
            if (!card.querySelector('.swipe-hint')) {
              const deleteHint = document.createElement('div');
              deleteHint.className = 'swipe-hint swipe-hint-delete';
              deleteHint.textContent = '🗑️';
              
              const deferHint = document.createElement('div');
              deferHint.className = 'swipe-hint swipe-hint-defer';
              deferHint.textContent = '↩️';
              
              card.appendChild(deleteHint);
              card.appendChild(deferHint);
            }
            
            setupCardGestures(card, index);
            card.dataset.gestureSetup = 'true';
          });
        }, 150);
      }
      function setupCardGestures(card, index) {
        let startX = 0, startY = 0;
        let currentX = 0, currentY = 0;
        let isSwiping = false;
        let isPointerDown = false;
        let tapCount = 0;
        let tapTimer = null;
        
        // Long-press drag variables
        let pressTimer = null;
        let isLongPressDragging = false;
        let dragStartY = 0;
        let dragStartX = 0;
        let dragPlaceholder = null;
        function startPressTimer() {
          pressTimer = setTimeout(() => {
            isLongPressDragging = true;
            isSwiping = false; // Cancel any swipe
            card.classList.add('dragging');
            card.style.opacity = '0.85';
            card.style.transform = 'scale(1.03)';
            card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
            card.style.zIndex = '1000';
            card.style.position = 'relative';
            card.style.touchAction = 'none'; // Prevent page scroll on mobile
            document.body.style.overflow = 'hidden'; // Lock body scroll
            dragStartY = currentY;
            dragStartX = currentX; // Track X position for horizontal swipe detection during drag
            
            // Create placeholder for drop zone visualization
            dragPlaceholder = document.createElement('div');
            dragPlaceholder.className = 'drag-placeholder';
            dragPlaceholder.style.height = card.offsetHeight + 'px';
            dragPlaceholder.style.display = 'none';
          }, 300);
        }
        function cancelPressTimer() {
          if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
          }
          // Reset touch action if not in drag mode
          if (!isLongPressDragging) {
            card.style.touchAction = '';
          }
        }
        // Touch move handler to prevent page scroll during drag
        function preventScroll(e) {
          if (isLongPressDragging) {
            e.preventDefault();
          }
        }
        
        card.addEventListener('touchmove', preventScroll, { passive: false });
        
        card.addEventListener('pointerdown', function(e) {
          startX = e.clientX;
          startY = e.clientY;
          currentX = e.clientX;
          currentY = e.clientY;
          isPointerDown = true;
          card.setPointerCapture(e.pointerId);
          
          // Start long-press timer
          startPressTimer();
          tapCount++;
          if (tapCount === 1) {
            tapTimer = setTimeout(() => { tapCount = 0; }, 300);
          } else if (tapCount === 2) {
            clearTimeout(tapTimer);
            cancelPressTimer();
            tapCount = 0;
            // Use data-index for accurate index after delete/move operations
            const currentIndex = parseInt(card.getAttribute('data-index'));
            console.log('Double-tap on set with data-index:', currentIndex);
            if (!isNaN(currentIndex)) {
              openGestureEditModal(currentIndex);
            }
            e.preventDefault();
          }
        });
        card.addEventListener('pointermove', function(e) {
          if (!isPointerDown) return;
          currentX = e.clientX;
          currentY = e.clientY;
          const deltaX = currentX - startX;
          const deltaY = currentY - startY;
          
          // Detect vertical drag start even without long-press (25px threshold for reliability)
          if (!isLongPressDragging && Math.abs(deltaY) > 25 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
            // Clear long-press timer since we're starting drag
            cancelPressTimer();
            
            // Start drag mode
            isLongPressDragging = true;
            dragStartY = startY;
            dragStartX = startX;
            
            // Set up drag visuals
            card.classList.add('dragging');
            card.style.transition = 'none';
            card.style.zIndex = '1000';
            card.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
            card.style.touchAction = 'none';
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
            
            e.preventDefault();
            return; // Let next move event handle the actual drag
          }
          
          // Handle long-press dragging - allow diagonal movement (both X and Y)
          if (isLongPressDragging) {
            e.preventDefault();
            const dragOffsetY = currentY - dragStartY;
            const dragOffsetX = currentX - dragStartX;
            
            // Allow diagonal movement: translate both X and Y
            card.style.transform = 'translate(' + dragOffsetX + 'px, ' + dragOffsetY + 'px) scale(1.03)';
            
            // Auto-scroll when dragging near screen edges
            const autoScrollMargin = 100;
            const viewportHeight = window.innerHeight;
            const cardRect = card.getBoundingClientRect();
            
            if (cardRect.bottom > viewportHeight - autoScrollMargin) {
              window.scrollBy({ top: 30, behavior: 'instant' });
            } else if (cardRect.top < autoScrollMargin && window.scrollY > 0) {
              window.scrollBy({ top: -30, behavior: 'instant' });
            }
            
            // Show visual feedback for horizontal swipe during drag
            card.classList.remove('swiping-right', 'swiping-left');
            if (dragOffsetX > 60) card.classList.add('swiping-right');
            else if (dragOffsetX < -60) card.classList.add('swiping-left');
            
            // Highlight potential drop positions (gap animation) with smooth transition
            highlightDropZoneSmooth(card, currentY);
            return;
          }
          
          // If moving too much before long-press triggers, cancel it (increased threshold)
          if (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15) {
            cancelPressTimer();
          }
          // Handle horizontal swiping (existing logic) - only if not in long-press mode
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            isSwiping = true;
            e.preventDefault();
            const limitedDelta = Math.max(-100, Math.min(100, deltaX));
            card.style.transform = 'translateX(' + limitedDelta + 'px)';
            card.classList.remove('swiping-right', 'swiping-left');
            if (deltaX > 50) card.classList.add('swiping-right');
            else if (deltaX < -50) card.classList.add('swiping-left');
          }
        });
        card.addEventListener('pointerup', function(e) {
          cancelPressTimer();
          if (!isPointerDown) return;
          isPointerDown = false;
          
          // Handle long-press drag drop - decide swipe vs drop at the END
          if (isLongPressDragging) {
            isLongPressDragging = false;
            
            const dragOffsetX = currentX - dragStartX;
            const dragOffsetY = currentY - dragStartY;
            
            // Decide: is this a horizontal swipe or a drag-drop?
            const isHorizontalSwipe = Math.abs(dragOffsetX) > 80 && Math.abs(dragOffsetX) > Math.abs(dragOffsetY) * 1.5;
            
            if (isHorizontalSwipe) {
              // Horizontal swipe detected - trigger delete/defer
              card.classList.remove('swiping-right', 'swiping-left');
              resetDragStyles(card);
              
              // Clear gap animations on other cards
              document.querySelectorAll('[data-effort][data-index]').forEach(c => {
                c.style.transform = '';
                c.style.transition = 'transform 0.2s ease-out';
              });
              
              const currentIndex = parseInt(card.getAttribute('data-index'));
              if (!isNaN(currentIndex)) {
                if (dragOffsetX > 0) {
                  deleteWorkoutSet(currentIndex);
                } else {
                  moveSetToBottom(currentIndex);
                }
              }
            } else {
              // This is a drag-drop operation
              handleDragDropSmooth(card, currentY);
            }
            return;
          }
          
          const deltaX = currentX - startX;
          card.style.transform = '';
          card.classList.remove('swiping-right', 'swiping-left');
          if (isSwiping) {
            // Use data-index for accurate index after delete/move operations
            const currentIndex = parseInt(card.getAttribute('data-index'));
            if (!isNaN(currentIndex)) {
              if (deltaX > 100) {
                // Delete immediately without confirmation for smoother UX
                deleteWorkoutSet(currentIndex);
              } else if (deltaX < -100) {
                moveSetToBottom(currentIndex);
              }
            }
          }
          isSwiping = false;
        });
        
        card.addEventListener('pointercancel', function(e) {
          cancelPressTimer();
          isPointerDown = false;
          
          // Only handle if we're actively dragging
          if (!isLongPressDragging) return;
          
          // Log and preserve drag state - let pointerup handle cleanup
          console.log('Pointer canceled during drag, preserving state');
          
          // Delay reset to allow any in-progress drop to complete
          isLongPressDragging = false;
          setTimeout(() => {
            resetDragStyles(card);
          }, 50);
        });
      }
      
      // Track last stable drop target to prevent flickering
      let lastDropTarget = null;
      
      // Highlight drop zone during drag - shows a line/gap where card will be inserted
      function highlightDropZone(draggedCard, currentY) {
        const cards = Array.from(document.querySelectorAll('[data-effort][data-index]'));
        const draggedIndex = parseInt(draggedCard.getAttribute('data-index'));
        const bufferZone = 10; // 10px buffer to prevent flickering at boundaries
        
        // Find where the drop line should appear
        let newDropTarget = null;
        let newDropPosition = null;
        
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (c === draggedCard) continue;
          
          const rect = c.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const cardIndex = parseInt(c.getAttribute('data-index'));
          
          // Add buffer zone to prevent flickering at boundary
          if (currentY < midY - bufferZone) {
            // Clearly above midpoint - show line above this card
            if (cardIndex !== draggedIndex + 1) {
              newDropTarget = c;
              newDropPosition = 'above';
            }
            break;
          } else if (Math.abs(currentY - midY) <= bufferZone && lastDropTarget === c) {
            // Within buffer zone and same target - keep current highlight
            newDropTarget = c;
            newDropPosition = c.classList.contains('drop-above') ? 'above' : 
                             c.classList.contains('drop-below') ? 'below' : null;
            break;
          }
        }
        
        // If no target found above, check if below all cards
        if (!newDropTarget) {
          const lastCard = cards.filter(c => c !== draggedCard).pop();
          if (lastCard) {
            const lastRect = lastCard.getBoundingClientRect();
            const lastMidY = lastRect.top + lastRect.height / 2;
            const lastIndex = parseInt(lastCard.getAttribute('data-index'));
            
            if (currentY > lastMidY + bufferZone) {
              // Clearly below last card
              if (lastIndex !== draggedIndex - 1) {
                newDropTarget = lastCard;
                newDropPosition = 'below';
              }
            } else if (Math.abs(currentY - lastMidY) <= bufferZone && lastDropTarget === lastCard) {
              // Within buffer zone - keep current
              newDropTarget = lastCard;
              newDropPosition = lastCard.classList.contains('drop-below') ? 'below' : 
                               lastCard.classList.contains('drop-above') ? 'above' : null;
            }
          }
        }
        
        // Update highlights only if target changed
        if (newDropTarget !== lastDropTarget || newDropPosition) {
          cards.forEach(c => c.classList.remove('drop-above', 'drop-below'));
          
          if (newDropTarget && newDropPosition) {
            newDropTarget.classList.add('drop-' + newDropPosition);
          }
        }
        
        lastDropTarget = newDropTarget;
      }
      
      // Reset drag styles
      function resetDragStyles(card) {
        card.classList.remove('dragging');
        card.style.opacity = '';
        card.style.transform = '';
        card.style.boxShadow = '';
        card.style.zIndex = '';
        card.style.position = '';
        card.style.touchAction = ''; // Re-enable touch scrolling
        document.body.style.overflow = ''; // Unlock body scroll
        document.body.style.touchAction = ''; // Re-enable body touch
        lastDropTarget = null; // Reset drop target tracking
        lastHighlightedIndex = -1; // Reset highlight tracking
        
        // Remove all drop highlights and clear transforms
        document.querySelectorAll('.drop-above, .drop-below').forEach(c => {
          c.classList.remove('drop-above', 'drop-below');
        });
        document.querySelectorAll('[data-effort][data-index]').forEach(c => {
          if (c !== card) {
            c.style.transform = '';
          }
        });
      }
      
      // Track current drop state to prevent unnecessary updates
      let lastHighlightedIndex = -1;
      let highlightRAFPending = false;
      
      // Highlight drop zone with smooth gap animation
      function highlightDropZoneSmooth(draggedCard, currentY) {
        const cards = Array.from(document.querySelectorAll('[data-effort][data-index]'));
        const draggedIndex = parseInt(draggedCard.getAttribute('data-index'));
        const bufferZone = 15; // Buffer to prevent flickering
        
        // Find the target drop position
        let targetIndex = -1;
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (c === draggedCard) continue;
          
          const rect = c.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const cardIndex = parseInt(c.getAttribute('data-index'));
          
          // Use buffer zone to prevent flickering at boundaries
          if (currentY < midY - bufferZone) {
            targetIndex = cardIndex;
            break;
          } else if (Math.abs(currentY - midY) <= bufferZone && lastHighlightedIndex === cardIndex) {
            // Within buffer zone and same target - keep current
            targetIndex = lastHighlightedIndex;
            break;
          }
        }
        
        // Only update if target changed (prevents constant re-renders)
        if (targetIndex === lastHighlightedIndex) {
          return;
        }
        
        lastHighlightedIndex = targetIndex;
        
        // Skip if RAF already pending
        if (highlightRAFPending) return;
        highlightRAFPending = true;
        
        // Apply transforms in next frame to minimize disruption to dragged card
        requestAnimationFrame(() => {
          highlightRAFPending = false;
          
          // Apply transforms based on target
          cards.forEach(c => {
            if (c === draggedCard) return;
            
            const cardIndex = parseInt(c.getAttribute('data-index'));
            c.style.transition = 'transform 0.15s ease-out';
          
          if (targetIndex !== -1 && cardIndex >= targetIndex && cardIndex !== draggedIndex) {
            // Cards at or below drop point shift down
            c.style.transform = 'translateY(40px)';
            if (cardIndex === targetIndex) {
              c.classList.add('drop-above');
            }
          } else {
            // Cards above drop point - no shift
            c.style.transform = '';
            c.classList.remove('drop-above', 'drop-below');
          }
        });
        }); // End requestAnimationFrame
      }
      
      // Handle drop with smooth animation
      function handleDragDropSmooth(draggedCard, dropY) {
        const cards = Array.from(document.querySelectorAll('[data-effort][data-index]'));
        const draggedIndex = parseInt(draggedCard.getAttribute('data-index'));
        let insertBeforeIndex = -1;
        
        // Find which card to insert before based on Y position
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (c === draggedCard) continue;
          
          const rect = c.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          
          if (dropY < midY) {
            insertBeforeIndex = i;
            break;
          }
        }
        
        // Calculate effective new position
        let newIndex;
        if (insertBeforeIndex === -1) {
          newIndex = cards.length - 1;
        } else if (insertBeforeIndex > draggedIndex) {
          newIndex = insertBeforeIndex - 1;
        } else {
          newIndex = insertBeforeIndex;
        }
        
        const willDrop = newIndex !== draggedIndex;
        console.log('handleDragDropSmooth: draggedIndex=' + draggedIndex + ', newIndex=' + newIndex + ', willDrop=' + willDrop);
        
        // Clear drop highlights
        cards.forEach(c => {
          c.classList.remove('drop-above', 'drop-below');
        });
        
        if (willDrop) {
          // We're dropping to a new position
          // Store the dragged card's current visual position
          const draggedRect = draggedCard.getBoundingClientRect();
          
          // Prevent dragged card from interfering during reorder
          draggedCard.style.pointerEvents = 'none';
          draggedCard.style.zIndex = '1000';
          
          // Do DOM reorder immediately (this moves the card in the DOM)
          reorderWorkoutSet(draggedIndex, newIndex);
          
          // Force layout recalc to get new position
          void draggedCard.offsetHeight;
          
          // Get the new position after reorder
          const newRect = draggedCard.getBoundingClientRect();
          
          // Calculate offset from current visual position to new DOM position
          const deltaX = draggedRect.left - newRect.left;
          const deltaY = draggedRect.top - newRect.top;
          
          // Position card at its old visual location (where user dropped it)
          draggedCard.style.transition = 'none';
          draggedCard.style.transform = 'translate(' + deltaX + 'px, ' + deltaY + 'px)';
          
          // Force reflow
          void draggedCard.offsetHeight;
          
          // Animate other cards to their new positions
          cards.forEach(c => {
            if (c !== draggedCard) {
              c.style.transition = 'transform 0.2s ease-out';
              c.style.transform = '';
            }
          });
          
          // Animate dragged card from old position to new position
          draggedCard.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s, opacity 0.2s';
          draggedCard.style.transform = '';
          draggedCard.style.boxShadow = '';
          draggedCard.style.opacity = '';
          
          // Clean up after animation
          setTimeout(() => {
            draggedCard.style.pointerEvents = '';
            draggedCard.style.zIndex = '';
            resetDragStyles(draggedCard);
            cards.forEach(c => {
              c.style.transition = '';
            });
          }, 200);
          
        } else {
          // Not dropping to new position - animate back to original
          draggedCard.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.3, 1.1), opacity 0.2s, box-shadow 0.2s';
          draggedCard.style.transform = '';
          draggedCard.style.opacity = '';
          draggedCard.style.boxShadow = '';
          
          // Animate all other cards back to position
          cards.forEach(c => {
            if (c !== draggedCard) {
              c.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.3, 1.1)';
              c.style.transform = '';
            }
          });
          
          // Clean up after animation
          setTimeout(() => {
            resetDragStyles(draggedCard);
            cards.forEach(c => {
              c.style.transition = '';
            });
          }, 200);
        }
      }
      
      // Handle drop after long-press drag
      function handleDragDrop(draggedCard, dropY) {
        const cards = Array.from(document.querySelectorAll('[data-effort][data-index]'));
        const draggedIndex = parseInt(draggedCard.getAttribute('data-index'));
        let insertBeforeIndex = -1; // -1 means insert at end
        
        // Find which card to insert before based on Y position
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (c === draggedCard) continue;
          
          const rect = c.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          
          if (dropY < midY) {
            insertBeforeIndex = i;
            break;
          }
        }
        
        // Calculate effective new position
        let newIndex;
        if (insertBeforeIndex === -1) {
          newIndex = cards.length - 1; // Moving to end
        } else if (insertBeforeIndex > draggedIndex) {
          newIndex = insertBeforeIndex - 1; // Account for removal
        } else {
          newIndex = insertBeforeIndex;
        }
        
        // Clear drop highlights first
        document.querySelectorAll('.drop-above, .drop-below').forEach(c => {
          c.classList.remove('drop-above', 'drop-below');
        });
        
        console.log('Drop: draggedIndex=' + draggedIndex + ', newIndex=' + newIndex, ', insertBeforeIndex=' + insertBeforeIndex);
        if (newIndex !== draggedIndex) {
          // Store the dragged card's current visual position
          const draggedRect = draggedCard.getBoundingClientRect();
          
          // Prevent dragged card from interfering during reorder
          draggedCard.style.pointerEvents = 'none';
          draggedCard.style.zIndex = '1000';
          
          // Do DOM reorder immediately
          reorderWorkoutSet(draggedIndex, newIndex);
          
          // Force layout recalc
          void draggedCard.offsetHeight;
          
          // Get the new position after reorder
          const newRect = draggedCard.getBoundingClientRect();
          
          // Calculate offset from current visual position to new DOM position
          const deltaX = draggedRect.left - newRect.left;
          const deltaY = draggedRect.top - newRect.top;
          
          // Position card at its old visual location
          draggedCard.style.transition = 'none';
          draggedCard.style.transform = 'translate(' + deltaX + 'px, ' + deltaY + 'px)';
          
          // Force reflow
          void draggedCard.offsetHeight;
          
          // Animate other cards
          cards.forEach(c => {
            if (c !== draggedCard) {
              c.style.transition = 'transform 0.2s ease-out';
              c.style.transform = '';
            }
          });
          
          // Animate dragged card from old position to new position
          draggedCard.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s, opacity 0.2s';
          draggedCard.style.transform = '';
          draggedCard.style.boxShadow = '';
          draggedCard.style.opacity = '';
          
          // Clean up after animation
          setTimeout(() => {
            draggedCard.style.pointerEvents = '';
            draggedCard.style.zIndex = '';
            resetDragStyles(draggedCard);
            cards.forEach(c => {
              c.style.transition = '';
            });
          }, 200);
        } else {
          console.log('Not reordering: same position');
          resetDragStyles(draggedCard);
        }
      }
      
      // Reorder a workout set from one index to another
      function reorderWorkoutSet(fromIndex, toIndex) {
        console.log('reorderWorkoutSet called: from=' + fromIndex + ' to=' + toIndex);
        const container = document.getElementById('cards');
        if (!container) {
          console.log('No container found');
          return;
        }
        
        const cards = Array.from(container.querySelectorAll('[data-effort][data-index]'));
        console.log('Found ' + cards.length + ' cards');
        const draggedCard = cards[fromIndex];
        if (!draggedCard) {
          console.log('No card at fromIndex ' + fromIndex);
          return;
        }
        
        // Update currentWorkoutArray
        if (currentWorkoutArray && currentWorkoutArray.length > fromIndex) {
          const [removed] = currentWorkoutArray.splice(fromIndex, 1);
          currentWorkoutArray.splice(toIndex, 0, removed);
        }
        
        // Reorder DOM: remove the card first
        draggedCard.remove();
        
        // Get remaining cards after removal
        const remainingCards = Array.from(container.querySelectorAll('[data-effort][data-index]'));
        
        if (toIndex >= remainingCards.length) {
          // Insert at end
          const lastCard = remainingCards[remainingCards.length - 1];
          if (lastCard) {
            lastCard.after(draggedCard);
          } else {
            container.appendChild(draggedCard);
          }
        } else {
          // Insert before the card at toIndex position
          const targetCard = remainingCards[toIndex];
          if (targetCard) {
            targetCard.before(draggedCard);
          }
        }
        
        // Renumber all data-index attributes
        const finalCards = container.querySelectorAll('[data-effort][data-index]');
        finalCards.forEach((c, i) => {
          c.setAttribute('data-index', i);
        });
        
        // Update totals
        updateMathTotals();
        
        console.log('Reordered set from', fromIndex, 'to', toIndex);
      }
      function updateMathTotals() {
        // Calculate total distance from currentWorkoutArray
        let totalDistance = 0;
        
        if (!currentWorkoutArray || currentWorkoutArray.length === 0) {
          return;
        }
        
        currentWorkoutArray.forEach(section => {
          if (section.bodyText) {
            const firstLine = section.bodyText.split('\\n')[0];
            
            // Parse distance - handle formats like "200 easy" or "4x50 build"
            const setMatch = firstLine.match(/^(\\d+)x(\\d+)/); // "4x50"
            const singleMatch = firstLine.match(/^(\\d+)\\s/); // "200 easy"
            
            if (setMatch) {
              const reps = parseInt(setMatch[1]);
              const distance = parseInt(setMatch[2]);
              totalDistance += reps * distance;
            } else if (singleMatch) {
              totalDistance += parseInt(singleMatch[1]);
            }
          }
        });
        
        // Get pool info from stored summary
        const s = window.__swgSummary || { units: 'm', poolLen: 25 };
        const poolLen = s.poolLen || 25;
        const units = s.units || 'm';
        const totalLengths = Math.round(totalDistance / poolLen);
        
        // Update yellow Total box
        const totalText = document.getElementById('totalText');
        if (totalText) {
          totalText.textContent = 'Total ' + totalDistance + units;
        }
        
        // Update footer chips if they exist
        const footerBox = document.getElementById('footerBox');
        if (footerBox) {
          const chips = footerBox.querySelectorAll('.readChip');
          chips.forEach(chip => {
            const text = chip.textContent;
            if (text.startsWith('Total lengths:')) {
              chip.textContent = 'Total lengths: ' + totalLengths + ' lengths';
            }
          });
        }
      }
      function deleteWorkoutSet(index) {
        if (!currentWorkoutArray || !currentWorkoutArray[index]) return;
        
        console.log('Deleting set at index', index);
        
        // 1. Remove from array
        currentWorkoutArray.splice(index, 1);
        
        // 2. Remove from DOM directly (preserves footer)
        const cardsContainer = document.getElementById('cards');
        if (cardsContainer) {
          const setElements = Array.from(cardsContainer.querySelectorAll('[data-index]'));
          if (index < setElements.length) {
            setElements[index].remove();
            console.log('Removed set from DOM');
            
            // 3. Renumber remaining sets
            setElements.forEach((el, i) => {
              if (i > index) {
                el.setAttribute('data-index', i - 1);
              }
            });
          }
        }
        
        // 4. Update math totals
        updateMathTotals();
        
        // 5. Re-attach gesture listeners to remaining sets
        setTimeout(() => {
          if (typeof setupGestureEditing === 'function') {
            setupGestureEditing(currentWorkoutArray);
          }
        }, 50);
      }
      function moveSetToBottom(index) {
        if (!currentWorkoutArray || !currentWorkoutArray[index]) return;
        
        console.log('Moving set', index, 'to bottom');
        
        // 1. Get the set and move in array
        const [movedSet] = currentWorkoutArray.splice(index, 1);
        currentWorkoutArray.push(movedSet);
        
        // 2. Update DOM - remove from current position and append to container
        const cardsContainer = document.getElementById('cards');
        if (cardsContainer) {
          const setElements = Array.from(cardsContainer.querySelectorAll('[data-index]'));
          if (index < setElements.length) {
            const setToMove = setElements[index];
            // Find the wrapper container (first child with flex column)
            const wrapper = cardsContainer.querySelector('div[style*="flex-direction:column"]');
            if (wrapper) {
              wrapper.appendChild(setToMove);
            } else {
              cardsContainer.appendChild(setToMove);
            }
            console.log('Moved set in DOM');
            
            // 3. Renumber all sets to match new array order
            const newSetElements = cardsContainer.querySelectorAll('[data-index]');
            newSetElements.forEach((el, i) => {
              el.setAttribute('data-index', i);
            });
          }
        }
        
        // 4. Update math totals (total doesn't change but keeps consistency)
        updateMathTotals();
        
        // 5. Re-attach gesture listeners
        setTimeout(() => {
          if (typeof setupGestureEditing === 'function') {
            setupGestureEditing(currentWorkoutArray);
          }
        }, 50);
      }
      function rerenderWorkoutFromArray() {
        const container = document.getElementById('cards');
        if (!container) return;
        
        // Get all current cards
        const currentCards = Array.from(container.querySelectorAll('.workout-card'));
        
        // If we have the right number of cards already, just update them
        if (currentCards.length === currentWorkoutArray.length) {
          // Update existing cards instead of recreating them
          currentCards.forEach((card, index) => {
            const set = currentWorkoutArray[index];
            
            // Update data-index
            card.setAttribute('data-index', index);
            
            // Update content if needed (title, body, color)
            const titleEl = card.querySelector('.set-title');
            const bodyEl = card.querySelector('.set-body');
            
            if (titleEl && titleEl.textContent !== set.title) {
              titleEl.textContent = set.title;
            }
            
            if (bodyEl && bodyEl.textContent !== set.body) {
              bodyEl.textContent = set.body;
            }
            
            // Update color if needed
            const colorClass = set.color || 'blue';
            const currentColor = Array.from(card.classList).find(cls => cls.includes('-card'));
            if (currentColor && currentColor !== colorClass + '-card') {
              card.classList.remove(currentColor);
              card.classList.add(colorClass + '-card');
            }
          });
          
          // Just reorder the DOM elements to match the array order
          currentCards.sort((a, b) => {
            const indexA = parseInt(a.getAttribute('data-index'));
            const indexB = parseInt(b.getAttribute('data-index'));
            return indexA - indexB;
          });
          
          // Clear and re-append in correct order
          container.innerHTML = '';
          currentCards.forEach(card => {
            container.appendChild(card);
          });
          
        } else {
          // Different number of cards - need full re-render
          // 1. Convert currentWorkoutArray back to workout text
          let workoutTextLines = [];
          
          if (!currentWorkoutArray || currentWorkoutArray.length === 0) {
            console.error('No currentWorkoutArray to render');
            return;
          }
          
          currentWorkoutArray.forEach(section => {
            if (section.label && section.bodyText) {
              const bodyLines = section.bodyText.split('\\n');
              workoutTextLines.push(section.label + ': ' + bodyLines[0]);
              for (let i = 1; i < bodyLines.length; i++) {
                if (bodyLines[i].trim()) {
                  workoutTextLines.push(bodyLines[i]);
                }
              }
              workoutTextLines.push('');
            }
          });
          
          if (workoutTextLines[workoutTextLines.length - 1] === '') {
            workoutTextLines.pop();
          }
          
          // 2. Calculate TOTAL distance for footer
          let totalDistance = 0;
          currentWorkoutArray.forEach(section => {
            if (section.bodyText) {
              const firstLine = section.bodyText.split('\\n')[0];
              const setMatch = firstLine.match(/^(\\d+)x(\\d+)/);
              const singleMatch = firstLine.match(/^(\\d+)\\s/);
              
              if (setMatch) {
                const reps = parseInt(setMatch[1]);
                const distance = parseInt(setMatch[2]);
                totalDistance += reps * distance;
              } else if (singleMatch) {
                totalDistance += parseInt(singleMatch[1]);
              }
            }
          });
          
          // 3. Get pool info from stored summary
          const s = window.__swgSummary || { units: 'm', poolLen: 25, poolText: '25m' };
          const poolLen = s.poolLen || 25;
          const units = s.units || 'm';
          const totalLengths = Math.round(totalDistance / poolLen);
          
          // 4. Add PROPERLY FORMATTED footer lines that splitWorkout() recognizes
          workoutTextLines.push('');
          workoutTextLines.push('Total distance: ' + totalDistance + units);
          workoutTextLines.push('Total lengths: ' + totalLengths + ' lengths');
          
          const newWorkoutText = workoutTextLines.join('\\n');
          
          // 5. Get form state and trigger re-render
          const payload = window.formToPayload ? window.formToPayload() : {};
          
          // 6. Clear workout sets only
          container.innerHTML = '';
          
          // 7. Re-render with complete workout text
          if (window.renderCards) {
            window.renderCards(payload, newWorkoutText);
          }
        }
        
        // Update math totals
        updateMathTotals();
        
        // Re-attach gesture handlers
        setupGestureEditing();
      }
      function openGestureEditModal(index) {
        currentGestureEditingIndex = index;
        const set = currentWorkoutArray[index];
        
        if (!set) return;
        
        // Parse the set body to get current values
        const bodyText = set.bodyText || '';
        const label = set.label || '';
        
        // Try to extract distance and reps (e.g., "4x100 hard" -> 4 reps, 100 distance)
        const match = bodyText.match(/(\\d+)\\s*x\\s*(\\d+)/i);
        if (match) {
          document.getElementById('modalReps').value = parseInt(match[1]) || 4;
          document.getElementById('modalDistance').value = parseInt(match[2]) || 100;
        }
        
        // Preserve stroke/type from body text or label
        const strokeSelect = document.getElementById('modalStroke');
        if (strokeSelect) {
          // Check body text for stroke keywords
          const bodyLower = bodyText.toLowerCase();
          const labelLower = label.toLowerCase();
          
          if (bodyLower.includes('back') || labelLower.includes('back')) {
            strokeSelect.value = 'Back';
          } else if (bodyLower.includes('breast') || labelLower.includes('breast')) {
            strokeSelect.value = 'Breast';
          } else if (bodyLower.includes('fly') || bodyLower.includes('butter') || labelLower.includes('fly')) {
            strokeSelect.value = 'Fly';
          } else if (bodyLower.includes('kick') || labelLower.includes('kick')) {
            strokeSelect.value = 'Kick';
          } else if (bodyLower.includes('drill') || labelLower.includes('drill')) {
            strokeSelect.value = 'Drill';
          } else if (bodyLower.includes('pull') || labelLower.includes('pull')) {
            strokeSelect.value = 'Pull';
          } else if (bodyLower.includes('im') || bodyLower.includes('medley')) {
            strokeSelect.value = 'IM';
          } else {
            strokeSelect.value = 'Free';
          }
        }
        
        // Set effort button based on card color or label
        const card = document.querySelectorAll('[data-effort]')[index];
        if (card) {
          const effort = card.getAttribute('data-effort') || 'moderate';
          document.querySelectorAll('.gesture-effort-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.effort === effort);
          });
        }
        
        document.getElementById('gestureEditModal').classList.add('active');
      }
      function closeGestureEditModal() {
        document.getElementById('gestureEditModal').classList.remove('active');
        currentGestureEditingIndex = -1;
      }
      function saveGestureEdit() {
        if (currentGestureEditingIndex === -1) return;
        
        const distance = parseInt(document.getElementById('modalDistance').value) || 100;
        const reps = parseInt(document.getElementById('modalReps').value) || 4;
        const stroke = document.getElementById('modalStroke').value;
        const effortBtn = document.querySelector('.gesture-effort-btn.active');
        const effort = effortBtn ? effortBtn.dataset.effort : 'moderate';
        
        // Map effort to label for proper color rendering
        const effortToLabel = {
          'easy': 'Easy',
          'moderate': 'Moderate',
          'strong': 'Strong',
          'hard': 'Hard',
          'fullgas': 'Full Gas',
          'build': 'Build',
          'descend': 'Descend',
          'alternate': 'Main'
        };
        
        // Map effort to body text modifier for gradients/patterns
        const effortToBodyModifier = {
          'easy': 'easy',
          'moderate': '',
          'strong': 'strong',
          'hard': 'hard',
          'fullgas': 'sprint',
          'build': 'build to strong',
          'descend': 'descend 1-4',
          'alternate': 'odds easy, evens fast'
        };
        
        const modifier = effortToBodyModifier[effort] || '';
        const bodyText = reps + 'x' + distance + ' ' + stroke + (modifier ? ' ' + modifier : '');
        
        // Update the set in our array - both label and body
        currentWorkoutArray[currentGestureEditingIndex].label = effortToLabel[effort] || 'Moderate';
        currentWorkoutArray[currentGestureEditingIndex].bodyText = bodyText;
        
        console.log('Edit saved for set at index', currentGestureEditingIndex);
        
        // UPDATE THE SPECIFIC SET IN DOM (not full re-render)
        const cardsContainer = document.getElementById('cards');
        if (cardsContainer) {
          const setElement = cardsContainer.querySelector('[data-index="' + currentGestureEditingIndex + '"]');
          if (setElement) {
            
            // Update the main text (h4 element)
            const mainTextElement = setElement.querySelector('h4');
            if (mainTextElement) {
              mainTextElement.textContent = bodyText;
              console.log('Updated set text:', bodyText);
            }
            
            // Update the effort/color attribute and background
            setElement.dataset.effort = effort;
            
            // Update background color based on effort - use solid colors to match original generation
            const colorMap = {
              'easy': '#b9f0fd',
              'moderate': '#cfffc0',
              'strong': '#fcf3d5',
              'hard': '#ffc374',
              'fullgas': '#fe0000',
              'build': 'linear-gradient(to bottom, #b9f0fd 0%, #cfffc0 33%, #fcf3d5 66%, #ffc374 100%)',
              'descend': 'linear-gradient(to bottom, #ffc374 0%, #fcf3d5 33%, #cfffc0 66%, #b9f0fd 100%)',
              'alternate': 'repeating-linear-gradient(to bottom, #b9f0fd 0px, #b9f0fd 20px, #ffc374 20px, #ffc374 40px)'
            };
            setElement.style.background = colorMap[effort] || colorMap['moderate'];
            // Set text color for fullgas (white text on red)
            if (effort === 'fullgas') {
              setElement.style.color = '#fff';
            } else {
              setElement.style.color = '#000';
            }
          }
        }
        
        closeGestureEditModal();
        
        // Update math totals
        updateMathTotals();
        
        // Re-attach gesture listeners
        setTimeout(() => {
          if (typeof setupGestureEditing === 'function') {
            setupGestureEditing(currentWorkoutArray);
          }
        }, 50);
      }
      function initGestureSystem() {
        // Modal event listeners
        document.getElementById('closeGestureModal')?.addEventListener('click', closeGestureEditModal);
        document.getElementById('modalSaveBtn')?.addEventListener('click', saveGestureEdit);
        document.getElementById('modalDeleteBtn')?.addEventListener('click', function() {
          if (currentGestureEditingIndex !== -1) {
            deleteWorkoutSet(currentGestureEditingIndex);
            closeGestureEditModal();
          }
        });
        
        // Effort button selection
        document.querySelectorAll('.gesture-effort-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            document.querySelectorAll('.gesture-effort-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
          });
        });
        
        // Close modal on overlay click
        document.getElementById('gestureEditModal')?.addEventListener('click', function(e) {
          if (e.target === this) closeGestureEditModal();
        });
        
        // Expose formToPayload globally for rerenderWorkoutFromArray
        window.formToPayload = function() {
          const form = document.getElementById('genForm');
          if (!form) return {};
          const fd = new FormData(form);
          const payload = Object.fromEntries(fd.entries());
          
          // Normalize checkboxes
          const boolNames = [
            "stroke_freestyle",
            "stroke_backstroke",
            "stroke_breaststroke",
            "stroke_butterfly",
            "includeKick",
            "includePull",
            "equip_fins",
            "equip_paddles"
          ];
          for (const n of boolNames) payload[n] = payload[n] === "on";
          
          return payload;
        };
      }
      /* ===== END GESTURE FUNCTIONS ===== */
    for (const frame of document.querySelectorAll('[data-demo]')) {
      const range = frame.querySelector('[data-width]');
      const wout = frame.querySelector('[data-wout]');
      if (!range || !wout) continue;
      const apply = (v) => {
        frame.style.setProperty('--w', v + 'px');
        wout.textContent = v;
      };
      apply(range.value);
      range.addEventListener('input', (e) => apply(e.target.value));
    }
    let dragging = null;
    document.addEventListener('dragstart', (e) => {
      const frame = e.target.closest('.frame');
      const row = e.target.closest('.row, .row-pair');
      if (!frame || !row) return;
      dragging = frame;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'drag');
    });
    document.addEventListener('dragover', (e) => {
      const row = e.target.closest('.row, .row-pair');
      if (!row || !dragging) return;
      if (dragging.parentElement !== row) return;
      e.preventDefault();
      const over = e.target.closest('.frame');
      if (!over || over === dragging) return;
      const r = over.getBoundingClientRect();
      const before = (e.clientX - r.left) < (r.width / 2);
      row.insertBefore(dragging, before ? over : over.nextSibling);
    });
    document.addEventListener('dragend', () => {
      dragging = null;
    });
    // Color picker toggle
    const colorPicker = document.getElementById('colorPicker');
    const togglePicker = document.getElementById('togglePicker');
    togglePicker.addEventListener('click', () => {
      colorPicker.classList.toggle('collapsed');
      togglePicker.textContent = colorPicker.classList.contains('collapsed') ? '+' : '-';
    });
    // Make color picker draggable
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    colorPicker.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      isDragging = true;
      dragOffsetX = e.clientX - colorPicker.offsetLeft;
      dragOffsetY = e.clientY - colorPicker.offsetTop;
      colorPicker.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      colorPicker.style.left = (e.clientX - dragOffsetX) + 'px';
      colorPicker.style.top = (e.clientY - dragOffsetY) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      colorPicker.style.cursor = 'move';
    });
    // Color picker functionality - updates CSS vars in all iframes
    function setupColorInput(inputId, hexDisplayId, cssVarName) {
      const input = document.getElementById(inputId);
      const hexDisplay = document.getElementById(hexDisplayId);
      if (!input || !hexDisplay) return;
      input.addEventListener('input', () => {
        const val = input.value;
        hexDisplay.textContent = val;
        
        // Update the zone row preview
        const zoneRow = input.closest('.zone-row');
        if (zoneRow) {
          if (cssVarName.includes('-bg')) {
            zoneRow.style.background = val;
          } else if (cssVarName.includes('-bar')) {
            zoneRow.style.borderLeftColor = val;
          }
        }
        
        // Push to all iframes
        document.querySelectorAll('iframe').forEach(iframe => {
          try {
            if (iframe.contentDocument) {
              iframe.contentDocument.documentElement.style.setProperty(cssVarName, val);
            }
          } catch (e) {}
        });
      });
    }
    // Setup all color inputs (Zone names: easy, moderate, strong, hard, fullgas)
    setupColorInput('colorEasyBg', 'hexEasyBg', '--zone-easy-bg');
    setupColorInput('colorEasyBar', 'hexEasyBar', '--zone-easy-bar');
    // Simple hex display updaters for new color pickers
    ['Easy', 'Moderate', 'Strong', 'Hard', 'Fullgas'].forEach(zone => {
      const input = document.getElementById('pick' + zone);
      const hex = document.getElementById('hex' + zone);
      if (input && hex) {
        input.addEventListener('input', () => { hex.textContent = input.value; });
      }
    });
    setupColorInput('colorModerateBg', 'hexModerateBg', '--zone-moderate-bg');
    setupColorInput('colorModerateBar', 'hexModerateBar', '--zone-moderate-bar');
    setupColorInput('colorStrongBg', 'hexStrongBg', '--zone-strong-bg');
    setupColorInput('colorStrongBar', 'hexStrongBar', '--zone-strong-bar');
    setupColorInput('colorHardBg', 'hexHardBg', '--zone-hard-bg');
    setupColorInput('colorHardBar', 'hexHardBar', '--zone-hard-bar');
    setupColorInput('colorFullgasBg', 'hexFullgasBg', '--zone-fullgas-bg');
    setupColorInput('colorFullgasBar', 'hexFullgasBar', '--zone-fullgas-bar');
    // Draggable color picker
    (function enableDraggableColorPicker() {
      const picker = document.getElementById("colorPicker");
      if (!picker) return;
      const header = picker.querySelector(".picker-header");
      if (!header) return;
      // Restore saved position
      try {
        const saved = JSON.parse(localStorage.getItem("swg_picker_pos") || "null");
        if (saved && typeof saved.x === "number" && typeof saved.y === "number") {
          picker.style.left = saved.x + "px";
          picker.style.top = saved.y + "px";
          picker.style.right = "auto";
        }
      } catch {}
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let originLeft = 0;
      let originTop = 0;
      header.addEventListener("mousedown", (e) => {
        dragging = true;
        const rect = picker.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        originLeft = rect.left;
        originTop = rect.top;
        picker.style.left = originLeft + "px";
        picker.style.top = originTop + "px";
        picker.style.right = "auto";
        e.preventDefault();
      });
      window.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const x = Math.max(8, originLeft + dx);
        const y = Math.max(8, originTop + dy);
        picker.style.left = x + "px";
        picker.style.top = y + "px";
      });
      window.addEventListener("mouseup", () => {
        if (!dragging) return;
        dragging = false;
        try {
          const rect = picker.getBoundingClientRect();
          localStorage.setItem("swg_picker_pos", JSON.stringify({ x: rect.left, y: rect.top }));
        } catch {}
      });
    })();
