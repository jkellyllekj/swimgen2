// Workout Generator - Test Version (Self-contained)
// Mock data version that doesn't need server endpoints

// ===== GLOBAL VARIABLES =====
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

// ===== MOCK WORKOUT DATA =====
const MOCK_WORKOUTS = {
    strength: {
        beginner: `Warm up:
400 easy swim
8x50 build

Drill:
200 3-3-3 drill
200 catch-up

Main 1:
4x100 moderate
Rest 30s

Main 2:
3x150 strong
Rest 45s

Cool down:
200 easy choice

Total distance: 2100m
Total lengths: 84 lengths
Est total time: 45:00`,
        intermediate: `Warm up:
500 easy swim
6x75 build pace

Drill:
300 4-4-4 drill
200 fist drill

Main 1:
5x200 moderate-hard
Rest 30s

Main 2:
4x150 fast
Rest 45s

Cool down:
300 easy choice

Total distance: 2800m
Total lengths: 112 lengths
Est total time: 55:00`,
        advanced: `Warm up:
600 easy swim
10x50 build

Drill:
400 technique work
200 kick with fins

Main 1:
8x150 strong
Rest 20s

Main 2:
6x200 hard
Rest 30s

Main 3:
4x100 sprint
Rest 60s

Cool down:
400 easy

Total distance: 4000m
Total lengths: 160 lengths
Est total time: 75:00`
    },
    hypertrophy: {
        beginner: `Warm up:
400 easy swim
6x75 moderate

Kick:
8x50 kick with board

Pull:
6x100 pull buoy
Rest 20s

Main 1:
5x150 strong
Rest 30s

Cool down:
200 easy

Total distance: 2300m
Total lengths: 92 lengths
Est total time: 50:00`,
        intermediate: `Warm up:
500 swim
8x50 build

Kick:
10x50 fast kick

Pull:
8x100 paddles
Rest 25s

Main 1:
6x150 strong-hard
Rest 30s

Main 2:
4x200 moderate
Rest 30s

Cool down:
300 easy

Total distance: 3200m
Total lengths: 128 lengths
Est total time: 65:00`,
        advanced: `Warm up:
600 swim
10x50 build

Kick:
12x50 sprint kick
Rest 15s

Pull:
10x100 paddles + buoy
Rest 20s

Main 1:
8x150 very strong
Rest 25s

Main 2:
6x200 hard
Rest 30s

Main 3:
4x100 all out
Rest 60s

Cool down:
400 easy

Total distance: 4500m
Total lengths: 180 lengths
Est total time: 85:00`
    },
    endurance: {
        beginner: `Warm up:
600 easy swim
6x100 moderate

Main:
4x400 steady
Rest 45s

Drill:
300 technique work

Cool down:
300 easy

Total distance: 2900m
Total lengths: 116 lengths
Est total time: 60:00`,
        intermediate: `Warm up:
800 swim
8x100 build

Main 1:
3x600 steady
Rest 60s

Main 2:
4x300 moderate
Rest 40s

Cool down:
400 easy

Total distance: 4400m
Total lengths: 176 lengths
Est total time: 85:00`,
        advanced: `Warm up:
1000 swim
10x100 build

Main 1:
5x500 steady pace
Rest 60s

Main 2:
8x200 moderate-strong
Rest 30s

Main 3:
4x100 fast
Rest 45s

Cool down:
500 easy

Total distance: 6500m
Total lengths: 260 lengths
Est total time: 110:00`
    }
};

// ===== HELPER FUNCTIONS =====
function snap100(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 1000;
    return Math.round(x / 100) * 100;
}

function setDistance(val, skipSave) {
    const snapped = snap100(val);
    if (distanceSlider) distanceSlider.value = String(snapped);
    if (distanceHidden) distanceHidden.value = String(snapped);
    if (distanceLabel) distanceLabel.textContent = String(snapped);
}

function safeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
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

function clearUI() {
    if (errorBox) {
        errorBox.style.display = "none";
        errorBox.innerHTML = "";
    }
    if (cards) {
        cards.style.display = "none";
        cards.innerHTML = "";
    }
    if (totalBox) {
        totalBox.style.display = "none";
        totalBox.classList.remove("workout-fade-in");
    }
    if (footerBox) {
        footerBox.style.display = "none";
        footerBox.innerHTML = "";
        footerBox.classList.remove("workout-fade-in");
    }
    if (raw) {
        raw.style.display = "none";
        raw.textContent = "";
    }
    if (statusPill) {
        statusPill.innerHTML = "";
    }
    if (copyBtn) {
        copyBtn.disabled = true;
        copyBtn.dataset.copyText = "";
    }
    window.__swgSummary = null;
}

function renderError(title, details) {
    if (!errorBox) return;

    const lines = [];
    lines.push("<div style=\"font-weight:700; color:#b00020; margin-bottom:6px;\">" + safeHtml(title) + "</div>");
    if (Array.isArray(details) && details.length) {
        lines.push("<ul style=\"margin:0; padding-left:18px;\">");
        for (const d of details) {
            lines.push("<li style=\"margin:4px 0;\">" + safeHtml(String(d)) + "</li>");
        }
        lines.push("</ul>");
    }
    errorBox.innerHTML = lines.join("");
    errorBox.style.display = "block";
}

function canonicalizeLabel(labelRaw) {
    const raw = String(labelRaw || "").trim();
    if (!raw) return null;
    const key = raw.toLowerCase().replace(/\s+/g, " ").trim();
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

    if (text.includes("warm") || text.includes("cool")) return "easy";
    if (text.includes("sprint") || text.includes("all out") || text.includes("max effort")) return "fullgas";
    if (text.includes("fast") || text.includes("hard")) return "hard";
    if (labelOnly.includes("main")) return "strong";
    if (text.includes("build") || text.includes("descend")) return "strong";
    if (text.includes("steady") || text.includes("moderate")) return "moderate";
    if (text.includes("easy") || text.includes("relaxed")) return "easy";

    return "moderate";
}

function getZoneColors(zone) {
    const zones = {
        easy: { bg: '#b9f0fd', bar: '#7ac8db' },
        moderate: { bg: '#cfffc0', bar: '#8fcc80' },
        strong: { bg: '#fcf3d5', bar: '#d4c9a0' },
        hard: { bg: '#ffc374', bar: '#cc9a4a' },
        fullgas: { bg: '#fe0000', bar: '#cc0000' }
    };
    return zones[zone] || zones.moderate;
}

function colorStyleForEffort(effort, variantSeed) {
    const variant = (variantSeed || 0) % 4;

    if (effort === "easy") {
        const bg = '#b9f0fd';
        const bgLight = '#d4f7ff';
        if (variant === 1) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + ");";
        if (variant === 2) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bg + " 100%);";
        return "background:" + bg + ";";
    }
    if (effort === "moderate") {
        const bg = '#cfffc0';
        const bgLight = '#e0ffe0';
        if (variant === 1) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + ");";
        if (variant === 2) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bg + " 100%);";
        return "background:" + bg + ";";
    }
    if (effort === "strong") {
        const bg = '#fcf3d5';
        const bgLight = '#fffaea';
        const bgDark = '#f5e6b8';
        if (variant === 1) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + ");";
        if (variant === 2) return "background:linear-gradient(to bottom, " + bg + ", " + bgDark + ");";
        if (variant === 3) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bgDark + " 100%);";
        return "background:" + bg + ";";
    }
    if (effort === "hard") {
        const bg = '#ffc374';
        const bgLight = '#ffd9a8';
        const bgDark = '#ff9933';
        if (variant === 0) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + ");";
        if (variant === 1) return "background:linear-gradient(to bottom, " + bg + ", " + bgDark + ");";
        if (variant === 2) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bgDark + " 100%);";
        if (variant === 3) return "background:linear-gradient(180deg, " + bgLight + " 0%, " + bg + " 50%, " + bgDark + " 100%);";
        return "background:" + bg + ";";
    }
    if (effort === "fullgas") {
        const bg = '#fe0000';
        const bgLight = '#ff4444';
        const bgDark = '#cc0000';
        if (variant === 0) return "background:linear-gradient(to bottom, " + bgLight + ", " + bg + "); color:#fff;";
        if (variant === 1) return "background:linear-gradient(to bottom, " + bg + ", " + bgDark + "); color:#fff;";
        if (variant === 2) return "background:linear-gradient(135deg, " + bgLight + " 0%, " + bgDark + " 100%); color:#fff;";
        if (variant === 3) return "background:linear-gradient(180deg, " + bgLight + " 0%, " + bg + " 40%, " + bgDark + " 100%); color:#fff;";
        return "background:" + bg + "; color:#fff;";
    }
    return "background:#fff;";
}

function splitWorkout(workoutText) {
    const lines = String(workoutText || "").split(/\r?\n/);
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
    const m = trimmed.match(/^([^:]{2,30}):\s*(.+)$/);
    if (m) {
        const label = m[1].trim();
        const body = m[2].trim();
        return { label: label, body: body };
    }
    return { label: null, body: trimmed };
}

function computeSetDistanceFromBody(body) {
    const t = String(body || "");
    let sum = 0;
    const lines = t.split(/\n/);

    for (const line of lines) {
        if (/^\d+\.\s+/.test(line.trim())) continue;
        if (!line.trim()) continue;

        const re = /(\d+)\s*[x×]\s*(\d+)\s*(m|yd)?/gi;
        let m;
        while ((m = re.exec(line)) !== null) {
            const reps = Number(m[1]);
            const dist = Number(m[2]);
            if (Number.isFinite(reps) && Number.isFinite(dist)) sum += reps * dist;
        }

        if (!/(\d+)\s*[x×]\s*(\d+)/i.test(line)) {
            const standaloneMatch = line.match(/(^|\s)(\d{2,5})(\s*(m|yd|meters|yards))?(\s|$)/i);
            if (standaloneMatch) {
                const v = Number(standaloneMatch[2]);
                if (Number.isFinite(v) && v >= 25 && v <= 5000) sum += v;
            }
        }
    }
    return sum > 0 ? sum : null;
}

function renderCards(payload, workoutText) {
    const parts = splitWorkout(workoutText);
    const setLines = parts.setLines || [];
    const footerLines = parts.footerLines || [];

    if (!setLines.length) {
        if (cards) cards.style.display = "none";
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

    if (!cards) return false;

    const html = [];
    html.push('<div style="display:flex; flex-direction:column; gap:10px;">');

    let idx = 0;
    for (const s of sections) {
        idx += 1;
        const label = s.label ? s.label : ("Set " + idx);
        const body = s.bodies.filter(Boolean).join("\n");
        const setDist = computeSetDistanceFromBody(body);
        const effortLevel = getEffortLevel(label, body);
        const unitShort = unitShortFromPayload(payload);

        let boxStyle;
        let textColor = '#111';
        const dropShadow = "0 6px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.25)";

        boxStyle = colorStyleForEffort(effortLevel, idx) + " box-shadow:" + dropShadow + ";";
        if (effortLevel === 'fullgas') {
            textColor = '#fff';
        }

        html.push('<div data-effort="' + effortLevel + '" data-index="' + (idx - 1) + '" style="' + boxStyle + ' border-radius:12px; padding:12px;">');
        const subTextColor = textColor === '#fff' ? '#eee' : '#666';
        const distColor = textColor === '#fff' ? '#99ccff' : '#0055aa';

        html.push('<div class="setHeaderRow" style="display:flex; justify-content:space-between; align-items:flex-start;">');

        html.push('<div style="flex:1; min-width:0;">');
        html.push('<div style="font-weight:700; color:' + textColor + '; margin-bottom:6px;">' + safeHtml(label) + '</div>');
        html.push('<div data-set-body="' + safeHtml(String(idx)) + '" data-original-body="' + safeHtml(body) + '" style="white-space:pre-wrap; line-height:1.35; font-weight:600; color:' + textColor + ';">' + safeHtml(body) + "</div>");
        html.push("</div>");

        html.push('<div class="setRightCol" style="margin-left:10px; display:flex; flex-direction:column; align-items:flex-end;">');
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

    // Render footer
    renderFooterTotalsAndMeta(footerLines, payload);

    return true;
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

function renderFooterTotalsAndMeta(footerLines, payload) {
    if (!footerBox) return;

    const s = window.__swgSummary || { units: "", requested: null, poolText: "", paceSec: null };
    const info = extractFooterInfo(footerLines);

    // Extract total distance
    let totalDistStr = "";
    if (info.totalDistanceLine) {
        const match = info.totalDistanceLine.match(/Total distance:\s*(\d+)/);
        if (match) totalDistStr = match[1] + (s.units || "m");
    } else if (Number.isFinite(s.requested)) {
        totalDistStr = String(s.requested) + (s.units || "m");
    }

    // Show yellow Total box
    if (totalDistStr && totalBox && totalText) {
        totalText.textContent = "Total " + totalDistStr;
        totalBox.style.opacity = "0";
        totalBox.style.transform = "translateY(16px)";
        totalBox.style.transition = "none";
        totalBox.style.display = "block";
    } else if (totalBox) {
        totalBox.style.display = "none";
    }

    // Build summary chips
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
    f.push("<div style=\"display:flex; flex-wrap:wrap; gap:10px;\">");
    for (const c of deduped) {
        f.push("<div class=\"readChip\" style=\"padding:6px 10px; border-radius:8px; font-weight:700;\">" + safeHtml(c) + "</div>");
    }
    f.push("</div>");

    // Copyright notice
    f.push("<div style=\"margin-top:12px; text-align:center; font-size:12px; opacity:0.7;\">\u00A9 Creative Arts Global LTD. All rights reserved.</div>");

    footerBox.innerHTML = f.join("");
    footerBox.style.opacity = "0";
    footerBox.style.transform = "translateY(16px)";
    footerBox.style.transition = "none";
    footerBox.style.display = "block";
}

function captureSummary(payload, workoutText) {
    const units = unitShortFromPayload(payload);
    const requested = Number(payload.distance);
    const poolText = poolLabelFromPayload(payload);

    window.__swgSummary = {
        units: units,
        requested: requested,
        poolText: poolText,
        paceSec: null,
        workoutText: String(workoutText || "")
    };
}

function renderAll(payload, workoutText) {
    captureSummary(payload, workoutText);
    const ok = renderCards(payload, workoutText);
    return ok;
}

function formToPayload() {
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

    // Ensure numeric values
    payload.distance = Number(payload.distance) || 2000;

    return payload;
}

// ===== INITIALIZATION =====
function initPage() {
    console.log("Workout Generator Test Version Initialized");

    // Initialize form elements
    if (distanceSlider) {
        setDistance(2000);
        distanceSlider.addEventListener("input", (e) => {
            setDistance(e.target.value);
        });
    }

    // Pool buttons
    if (poolButtons) {
        poolButtons.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-pool]");
            if (!btn) return;
            const poolValue = btn.getAttribute("data-pool");
            if (poolHidden) poolHidden.value = poolValue;

            // Update button active state
            for (const b of poolButtons.querySelectorAll("button[data-pool]")) {
                b.classList.toggle("active", b === btn);
            }
        });

        // Set default pool
        const defaultPoolBtn = poolButtons.querySelector("button[data-pool='25m']");
        if (defaultPoolBtn) defaultPoolBtn.click();
    }

    // Advanced toggle
    if (toggleAdvanced && advancedWrap) {
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
    }

    // Copy button
    if (copyBtn) {
        copyBtn.addEventListener("click", async () => {
            const text = copyBtn.dataset.copyText || "";
            if (!text) return;
            try {
                await navigator.clipboard.writeText(text);
                if (statusPill) {
                    statusPill.textContent = "Copied.";
                    setTimeout(() => {
                        if (statusPill.textContent === "Copied.") statusPill.innerHTML = "";
                    }, 1200);
                }
            } catch {
                if (statusPill) {
                    statusPill.textContent = "Copy failed.";
                    setTimeout(() => {
                        if (statusPill.textContent === "Copy failed.") statusPill.innerHTML = "";
                    }, 1200);
                }
            }
        });
    }

    // Generate button
    if (generateBtn && form) {
        generateBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            clearUI();

            if (statusPill) statusPill.textContent = "Generating...";

            // Get form values
            const payload = formToPayload();

            // Validate
            if (!payload.workoutType || !payload.duration || !payload.difficulty) {
                renderError("Missing fields", ["Please fill in all required fields"]);
                if (statusPill) statusPill.textContent = "";
                return;
            }

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Get mock workout
            const workoutType = payload.workoutType;
            const difficulty = payload.difficulty;

            if (!MOCK_WORKOUTS[workoutType] || !MOCK_WORKOUTS[workoutType][difficulty]) {
                renderError("Invalid selection", ["Please select valid workout type and difficulty"]);
                if (statusPill) statusPill.textContent = "";
                return;
            }

            const workoutText = MOCK_WORKOUTS[workoutType][difficulty];

            if (statusPill) statusPill.textContent = "";

            // Render the workout
            const ok = renderAll(payload, workoutText);

            if (ok) {
                // Set up copy button
                if (copyBtn) {
                    copyBtn.disabled = false;
                    copyBtn.dataset.copyText = workoutText;
                }

                // Trigger fade-in animations
                setTimeout(() => {
                    if (cards) {
                        cards.style.transition = "opacity 0.7s ease-out, transform 0.7s ease-out";
                        cards.style.opacity = "1";
                        cards.style.transform = "translateY(0)";
                    }

                    if (totalBox && totalBox.style.display !== "none") {
                        totalBox.style.transition = "opacity 0.7s ease-out, transform 0.7s ease-out";
                        totalBox.style.opacity = "1";
                        totalBox.style.transform = "translateY(0)";
                    }

                    if (footerBox && footerBox.style.display !== "none") {
                        footerBox.style.transition = "opacity 0.7s ease-out, transform 0.7s ease-out";
                        footerBox.style.opacity = "1";
                        footerBox.style.transform = "translateY(0)";
                    }
                }, 100);
            } else {
                if (raw) {
                    raw.textContent = workoutText;
                    raw.style.display = "block";
                }
            }
        });
    }

    // Initialize with default values
    const workoutTypeSelect = document.getElementById("workoutType");
    const durationInput = document.getElementById("duration");
    const difficultySelect = document.getElementById("difficulty");

    if (workoutTypeSelect) workoutTypeSelect.value = "strength";
    if (durationInput) durationInput.value = "60";
    if (difficultySelect) difficultySelect.value = "intermediate";

    console.log("Page initialization complete");
}

// ===== START EVERYTHING =====
// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}