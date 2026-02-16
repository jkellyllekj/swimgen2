    // ===== CLIENT-SIDE OFFLINE WORKOUT GENERATION =====

    var WORKOUT_TEMPLATES_LOCAL = [
  // ============================================================
  // MINI WORKOUTS (500-1200m) - Quick Sessions
  // ============================================================
  {
    name: "Quick Dip",
    totalDistance: 500,
    sections: [
      { label: "Warm up", desc: "100 easy", distance: 100 },
      { label: "Main", desc: "4x75 steady\nbuild each 75 by 25", distance: 300 },
      { label: "Cool down", desc: "100 easy", distance: 100 }
    ],
    tags: ["short", "quick"]
  },
  {
    name: "Express Swim",
    totalDistance: 800,
    sections: [
      { label: "Warm up", desc: "200 easy choice", distance: 200 },
      { label: "Main", desc: "4x100 moderate\nfocus on technique", distance: 400 },
      { label: "Cool down", desc: "200 easy", distance: 200 }
    ],
    tags: ["short", "express"]
  },
  {
    name: "Lunch Break",
    totalDistance: 1000,
    sections: [
      { label: "Warm up", desc: "200 easy", distance: 200 },
      { label: "Build", desc: "4x50 build by 25", distance: 200 },
      { label: "Main", desc: "4x100 strong", distance: 400 },
      { label: "Cool down", desc: "200 easy", distance: 200 }
    ],
    tags: ["short", "moderate"]
  },
  {
    name: "Quick Technique",
    totalDistance: 1200,
    sections: [
      { label: "Warm up", desc: "300 easy", distance: 300 },
      { label: "Drill", desc: "4x50 drill choice", distance: 200 },
      { label: "Main", desc: "4x125 steady\nbuild last 25", distance: 500 },
      { label: "Cool down", desc: "200 easy", distance: 200 }
    ],
    tags: ["short", "technique"]
  },

  // ============================================================
  // SHORT WORKOUTS (1500-2000m) - Recovery/Technique Focus
  // ============================================================
  {
    name: "Easy Recovery",
    totalDistance: 1500,
    sections: [
      { label: "Warm up", desc: "300 easy choice", distance: 300 },
      { label: "Drill", desc: "4x50 drill FC\n1. Catch-up\n2. Fist\n3. DPS\n4. Finger drag", distance: 200 },
      { label: "Main", desc: "4x200 easy @ moderate effort", distance: 800 },
      { label: "Cool down", desc: "200 easy", distance: 200 }
    ],
    tags: ["recovery", "easy"]
  },
  {
    name: "Technique Tune-up",
    totalDistance: 1800,
    sections: [
      { label: "Warm up", desc: "400 easy", distance: 400 },
      { label: "Drill", desc: "6x50 drill FC\n1. Catch-up\n2. Fist\n3. DPS\n4. Finger drag\n5. Single arm\n6. Scull", distance: 300 },
      { label: "Build", desc: "4x100 build by 25", distance: 400 },
      { label: "Main", desc: "4x150 steady", distance: 600 },
      { label: "Cool down", desc: "100 easy", distance: 100 }
    ],
    tags: ["technique", "drill"]
  },
  {
    name: "Sprint Prep",
    totalDistance: 2000,
    sections: [
      { label: "Warm up", desc: "400 easy", distance: 400 },
      { label: "Build", desc: "6x50 build", distance: 300 },
      { label: "Main", desc: "8x100 strong (odd fast, even easy)", distance: 800 },
      { label: "Sprint", desc: "4x50 FAST with rest", distance: 200 },
      { label: "Cool down", desc: "300 easy", distance: 300 }
    ],
    tags: ["speed", "sprint"]
  },

  // ============================================================
  // MEDIUM WORKOUTS (2500-3500m) - Balanced Training
  // ============================================================
  {
    name: "Aerobic Base",
    totalDistance: 2500,
    sections: [
      { label: "Warm up", desc: "400 easy\n4x50 build", distance: 600 },
      { label: "Drill", desc: "4x50 drill choice", distance: 200 },
      { label: "Main", desc: "5x300 steady @ threshold", distance: 1500 },
      { label: "Cool down", desc: "200 easy", distance: 200 }
    ],
    tags: ["endurance", "aerobic"]
  },
  {
    name: "Threshold Builder",
    totalDistance: 3000,
    sections: [
      { label: "Warm up", desc: "400 easy", distance: 400 },
      { label: "Build", desc: "4x100 build by 25", distance: 400 },
      { label: "Main 1", desc: "6x200 @ threshold pace\n10-15 sec rest", distance: 1200 },
      { label: "Kick", desc: "4x50 kick moderate", distance: 200 },
      { label: "Main 2", desc: "4x150 descend 1-4", distance: 600 },
      { label: "Cool down", desc: "200 easy", distance: 200 }
    ],
    tags: ["threshold", "endurance"]
  },
  {
    name: "Mixed Pace",
    totalDistance: 3000,
    sections: [
      { label: "Warm up", desc: "300 easy\n4x50 choice", distance: 500 },
      { label: "Drill", desc: "4x75 drill/swim by 25", distance: 300 },
      { label: "Main", desc: "3x(200 strong + 100 easy)", distance: 900 },
      { label: "Pull", desc: "4x150 pull steady", distance: 600 },
      { label: "Sprint", desc: "6x50 fast", distance: 300 },
      { label: "Cool down", desc: "400 easy", distance: 400 }
    ],
    tags: ["variety", "mixed"]
  },
  {
    name: "Pyramid Power",
    totalDistance: 3200,
    sections: [
      { label: "Warm up", desc: "400 easy", distance: 400 },
      { label: "Build", desc: "4x100 build", distance: 400 },
      { label: "Main", desc: "Pyramid: 100-200-300-400-300-200-100\nAll @ strong effort", distance: 1600 },
      { label: "Kick", desc: "4x100 kick moderate", distance: 400 },
      { label: "Cool down", desc: "400 easy", distance: 400 }
    ],
    tags: ["pyramid", "endurance"]
  },
  {
    name: "Descend Focus",
    totalDistance: 3500,
    sections: [
      { label: "Warm up", desc: "500 easy", distance: 500 },
      { label: "Drill", desc: "6x50 drill FC", distance: 300 },
      { label: "Main 1", desc: "4x200 descend 1-4", distance: 800 },
      { label: "Pull", desc: "4x200 pull steady", distance: 800 },
      { label: "Main 2", desc: "8x100 descend 1-4 twice", distance: 800 },
      { label: "Cool down", desc: "300 easy", distance: 300 }
    ],
    tags: ["descend", "pacing"]
  },

  // ============================================================
  // STANDARD WORKOUTS (4000-4500m) - Full Training Session
  // ============================================================
  {
    name: "Endurance Builder",
    totalDistance: 4000,
    sections: [
      { label: "Warm up", desc: "400 easy\n4x100 build", distance: 800 },
      { label: "Drill", desc: "4x50 drill choice", distance: 200 },
      { label: "Main", desc: "5x400 steady @ threshold", distance: 2000 },
      { label: "Kick", desc: "4x100 kick moderate", distance: 400 },
      { label: "Cool down", desc: "600 easy", distance: 600 }
    ],
    tags: ["endurance", "distance"]
  },
  {
    name: "Speed Endurance",
    totalDistance: 4000,
    sections: [
      { label: "Warm up", desc: "600 easy choice", distance: 600 },
      { label: "Build", desc: "6x100 build by 25", distance: 600 },
      { label: "Main 1", desc: "8x150 strong", distance: 1200 },
      { label: "Main 2", desc: "12x50 fast\n15 sec rest", distance: 600 },
      { label: "Pull", desc: "4x150 pull easy", distance: 600 },
      { label: "Cool down", desc: "400 easy", distance: 400 }
    ],
    tags: ["speed", "endurance"]
  },
  {
    name: "Broken Distance",
    totalDistance: 4200,
    sections: [
      { label: "Warm up", desc: "500 easy\n4x50 build", distance: 700 },
      { label: "Drill", desc: "6x50 drill FC", distance: 300 },
      { label: "Main", desc: "3x(500 steady + 100 easy)", distance: 1800 },
      { label: "Kick", desc: "4x100 kick choice", distance: 400 },
      { label: "Pull", desc: "600 pull steady", distance: 600 },
      { label: "Cool down", desc: "400 easy", distance: 400 }
    ],
    tags: ["endurance", "broken"]
  },
  {
    name: "IM Focus",
    totalDistance: 4000,
    sections: [
      { label: "Warm up", desc: "400 IM easy", distance: 400 },
      { label: "Drill", desc: "4x100 IM drill\n25 each stroke", distance: 400 },
      { label: "Main 1", desc: "4x200 IM strong", distance: 800 },
      { label: "Main 2", desc: "8x100 IM @ threshold", distance: 800 },
      { label: "Kick", desc: "4x100 IM kick", distance: 400 },
      { label: "Sprint", desc: "8x50 choice fast", distance: 400 },
      { label: "Cool down", desc: "800 easy choice", distance: 800 }
    ],
    tags: ["IM", "variety"]
  },

  // ============================================================
  // LONGER WORKOUTS (5000-6000m) - High Volume
  // ============================================================
  {
    name: "Distance Day",
    totalDistance: 5000,
    sections: [
      { label: "Warm up", desc: "600 easy\n4x100 build", distance: 1000 },
      { label: "Main 1", desc: "1000 steady", distance: 1000 },
      { label: "Drill", desc: "6x50 drill choice", distance: 300 },
      { label: "Main 2", desc: "6x300 @ threshold", distance: 1800 },
      { label: "Pull", desc: "500 pull easy", distance: 500 },
      { label: "Cool down", desc: "400 easy", distance: 400 }
    ],
    tags: ["distance", "endurance"]
  },
  {
    name: "Ladder Challenge",
    totalDistance: 5000,
    sections: [
      { label: "Warm up", desc: "800 easy choice", distance: 800 },
      { label: "Build", desc: "4x100 build", distance: 400 },
      { label: "Main", desc: "Ladder: 50-100-150-200-250-300-250-200-150-100-50\nStrong effort", distance: 1800 },
      { label: "Kick", desc: "6x100 kick moderate", distance: 600 },
      { label: "Pull", desc: "4x200 pull steady", distance: 800 },
      { label: "Cool down", desc: "600 easy", distance: 600 }
    ],
    tags: ["ladder", "challenge"]
  },
  {
    name: "Triple Threat",
    totalDistance: 5400,
    sections: [
      { label: "Warm up", desc: "600 easy\n6x50 build", distance: 900 },
      { label: "Main 1", desc: "4x400 steady", distance: 1600 },
      { label: "Drill", desc: "4x75 drill/swim", distance: 300 },
      { label: "Main 2", desc: "6x200 strong", distance: 1200 },
      { label: "Pull", desc: "4x150 pull moderate", distance: 600 },
      { label: "Sprint", desc: "8x50 fast", distance: 400 },
      { label: "Cool down", desc: "400 easy", distance: 400 }
    ],
    tags: ["variety", "challenge"]
  },
  {
    name: "Threshold Master",
    totalDistance: 6000,
    sections: [
      { label: "Warm up", desc: "800 easy", distance: 800 },
      { label: "Build", desc: "6x100 build by 25", distance: 600 },
      { label: "Drill", desc: "4x75 drill choice", distance: 300 },
      { label: "Main 1", desc: "5x400 @ threshold\n20 sec rest", distance: 2000 },
      { label: "Main 2", desc: "8x150 descend 1-4 twice", distance: 1200 },
      { label: "Kick", desc: "4x100 kick moderate", distance: 400 },
      { label: "Cool down", desc: "700 easy", distance: 700 }
    ],
    tags: ["threshold", "endurance"]
  },

  // ============================================================
  // LONG WORKOUTS (7000-8000m) - Masters/Competitive
  // ============================================================
  {
    name: "Marathon Prep",
    totalDistance: 7000,
    sections: [
      { label: "Warm up", desc: "800 easy\n4x100 build", distance: 1200 },
      { label: "Main 1", desc: "2000 steady", distance: 2000 },
      { label: "Drill", desc: "6x50 drill FC", distance: 300 },
      { label: "Main 2", desc: "5x400 @ threshold", distance: 2000 },
      { label: "Pull", desc: "600 pull moderate", distance: 600 },
      { label: "Kick", desc: "4x100 kick easy", distance: 400 },
      { label: "Cool down", desc: "500 easy", distance: 500 }
    ],
    tags: ["marathon", "distance"]
  },
  {
    name: "Volume Day",
    totalDistance: 8000,
    sections: [
      { label: "Warm up", desc: "1000 easy choice", distance: 1000 },
      { label: "Build", desc: "8x100 build", distance: 800 },
      { label: "Main 1", desc: "4x500 steady", distance: 2000 },
      { label: "Drill", desc: "6x75 drill/swim", distance: 450 },
      { label: "Main 2", desc: "6x300 strong", distance: 1800 },
      { label: "Pull", desc: "800 pull easy", distance: 800 },
      { label: "Kick", desc: "4x150 kick moderate", distance: 600 },
      { label: "Cool down", desc: "550 easy", distance: 550 }
    ],
    tags: ["volume", "distance"]
  },
  {
    name: "Championship Prep",
    totalDistance: 8000,
    sections: [
      { label: "Warm up", desc: "800 easy\n6x100 build", distance: 1400 },
      { label: "Main 1", desc: "8x200 @ race pace\n15 sec rest", distance: 1600 },
      { label: "Pull", desc: "4x200 pull steady", distance: 800 },
      { label: "Main 2", desc: "4x400 strong", distance: 1600 },
      { label: "Kick", desc: "6x100 kick fast", distance: 600 },
      { label: "Main 3", desc: "16x50 fast\n10 sec rest", distance: 800 },
      { label: "Cool down", desc: "1200 easy", distance: 1200 }
    ],
    tags: ["race", "competition"]
  },

  // ============================================================
  // ULTRA WORKOUTS (9000-10000m) - Elite/Competitive
  // ============================================================
  {
    name: "Iron Swimmer",
    totalDistance: 9000,
    sections: [
      { label: "Warm up", desc: "1000 easy\n6x100 build", distance: 1600 },
      { label: "Main 1", desc: "3000 steady continuous", distance: 3000 },
      { label: "Drill", desc: "6x75 drill FC", distance: 450 },
      { label: "Main 2", desc: "8x250 strong", distance: 2000 },
      { label: "Pull", desc: "600 pull easy", distance: 600 },
      { label: "Kick", desc: "4x150 kick moderate", distance: 600 },
      { label: "Cool down", desc: "750 easy", distance: 750 }
    ],
    tags: ["ultra", "distance"]
  },
  {
    name: "Ultimate Challenge",
    totalDistance: 10000,
    sections: [
      { label: "Warm up", desc: "1000 easy\n8x100 build", distance: 1800 },
      { label: "Main 1", desc: "5x600 @ steady pace", distance: 3000 },
      { label: "Drill", desc: "8x50 drill choice", distance: 400 },
      { label: "Main 2", desc: "8x300 strong", distance: 2400 },
      { label: "Pull", desc: "4x200 pull moderate", distance: 800 },
      { label: "Kick", desc: "4x150 kick easy", distance: 600 },
      { label: "Cool down", desc: "1000 easy", distance: 1000 }
    ],
    tags: ["ultra", "challenge"]
  }
];

    var REP_LIMITS_LOCAL = {
  25:  { max: 24 },
  50:  { max: 20 },
  75:  { max: 16 },
  100: { max: 16 },
  150: { max: 10 },
  200: { max: 8 },
  250: { max: 6 },
  300: { max: 6 },
  400: { max: 5 },
  500: { max: 4 },
  600: { max: 3 },
  800: { max: 2 },
  1000: { max: 2 }
};

var SECTION_TEMPLATES_LOCAL = {
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
    // Structured numbered drill sets (coach-style)
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
    { body: "6x100 Drill FC\n1. 50 Drill / 50 Swim\n2. Catch-up\n3. DPS\n4. Fist\n5. Single Arm\n6. Long Dog", dist: 600 },
    { body: "8x100 Drill FC\n1. 50 Drill / 50 Swim\n2. Catch-up\n3. DPS\n4. Fist\n5. Single Arm\n6. Long Dog\n7. Torpedo Glide\n8. Scull Front", dist: 800 },
    { body: "14x50 Drill FC\n1. Fist\n2. Catch-up\n3. DPS\n4. Jazz Hands\n5. Long Dog\n6. Scull Front\n7. Finger Drag\n8. Single Arm\n9. Torpedo Glide\n10. Scull Rear\n11. 3-3-3\n12. 25 Drill / 25 Swim\n13. Fist\n14. Catch-up", dist: 700 }
  ],
  kick: [
    // Simple flat effort sets (majority for cleaner variety)
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
    // Progression sets (multi-line builds)
    { body: "200 kick moderate\n4x50 kick strong", dist: 400 },
    { body: "6x50 kick descend 1-3 twice", dist: 300 },
    { body: "4x100 kick build", dist: 400 },
    { body: "4x100 kick descend 1-4", dist: 400 },
    // Alternating effort sets
    { body: "6x50 kick (25 easy / 25 fast)", dist: 300 },
    { body: "8x50 kick (25 moderate / 25 fast)", dist: 400 },
    { body: "4x100 kick (50 steady / 50 fast)", dist: 400 },
    { body: "6x50 kick (25 easy / 25 fast)", dist: 300 },
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
    // Flat effort sets (variety of colors)
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
    // Progression/build sets
    { body: "5x100 descend 1-5", dist: 500 },
    { body: "6x100 descend 1-3 twice", dist: 600 },
    { body: "8x100 descend 1-4 twice", dist: 800 },
    { body: "10x100 descend 1-5 twice", dist: 1000 },
    // Multi-part sets (dist = sum of both parts)
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

var V1_BASE_SET_CATALOGUE_LOCAL = {
  "Warm-up": [
    {
      id: "WU_CONTINUOUS_SWIM",
      kind: "continuous",
      // returns a single-line body like: "400 easy swim (choice)"
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
        // split roughly 1/2 swim, 1/4 kick, 1/4 swim
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
        const dist = rep * n;
        // if target is smaller, reduce n; if bigger, we still keep the shape coach-normal
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

    var SWIMMER_COOL_DOWNS_LOCAL = [100, 150, 200, 300, 400, 500];

    function fnv1a32(str) {
      let h = 0x811c9dc5;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
      }
      return h >>> 0;
    }
    function shuffleWithSeed(arr, seed) {
      const result = arr.slice();
      for (let i = result.length - 1; i > 0; i--) {
        const j = ((seed * (i + 1) * 9973) >>> 0) % (i + 1);
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }
    function mulberry32(a) {
      return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function snapToPoolMultiple(dist, poolLen) {
      const d = Number(dist);
      if (!Number.isFinite(d) || d <= 0) return 0;
      const base = Number(poolLen);
      if (!Number.isFinite(base) || base <= 0) return d;
      return Math.round(d / (base * 2)) * (base * 2);
    }
    var snapToPoolMultipleShared = snapToPoolMultiple;
    function snapRepDist(dist, poolLen) {
      const d = Number(dist);
      if (!Number.isFinite(d) || d <= 0) return 0;
      const base = Number(poolLen);
      if (!Number.isFinite(base) || base <= 0) return d;
      return Math.round(d / base) * base;
    }
    function endsAtHomeEnd(totalDistance, poolLen) {
      const d = Number(totalDistance);
      const p = Number(poolLen);
      if (!Number.isFinite(d) || !Number.isFinite(p) || p <= 0) return false;
      const lengths = d / p;
      return Number.isInteger(lengths) && lengths % 2 === 0;
    }

    function pickEvenRepScheme(targetDistance, poolLen, kind) {
      const target = Number(targetDistance);
      const base = Number(poolLen);
      if (!target || target <= 0 || !base || base <= 0) return null;
      
      // Snap rep distance to pool multiple
      const snapRep = (d) => {
        if (d <= 0 || base <= 0) return 0;
        return Math.round(d / base) * base || base;
      };
      
      // Preferred rep distances by kind (in priority order)
      const prefDists = kind === "drill" 
        ? [50, 25, 75, 100] 
        : [50, 25, 100]; // kick
      
      // Allowed even rep counts (coach-plausible)
      const allowedReps = [4, 6, 8, 10, 12, 16, 20];
      
      // First pass: try preferred distances with allowed rep counts
      for (const pref of prefDists) {
        const repDist = snapRep(pref);
        if (repDist <= 0) continue;
        if (target % repDist !== 0) continue;
        const reps = target / repDist;
        if (!Number.isInteger(reps)) continue;
        if (reps % 2 === 0 && allowedReps.includes(reps)) {
          return { reps, repDist };
        }
      }
      
      // Second pass: accept any even reps between 4 and 24 (for odd pool edge cases)
      for (const pref of prefDists) {
        const repDist = snapRep(pref);
        if (repDist <= 0) continue;
        if (target % repDist !== 0) continue;
        const reps = target / repDist;
        if (!Number.isInteger(reps)) continue;
        if (reps >= 4 && reps <= 24 && reps % 2 === 0) {
          return { reps, repDist };
        }
      }
      
      // Third pass: try pool length multiples directly
      for (let mult = 1; mult <= 4; mult++) {
        const repDist = base * mult;
        if (target % repDist !== 0) continue;
        const reps = target / repDist;
        if (!Number.isInteger(reps)) continue;
        if (reps >= 4 && reps <= 24 && reps % 2 === 0) {
          return { reps, repDist };
        }
      }
      
      // Fourth pass: accept even reps 2-30 as last resort
      for (const pref of prefDists) {
        const repDist = snapRep(pref);
        if (repDist <= 0) continue;
        if (target % repDist !== 0) continue;
        const reps = target / repDist;
        if (!Number.isInteger(reps)) continue;
        if (reps >= 2 && reps <= 30 && reps % 2 === 0) {
          return { reps, repDist };
        }
      }
      
      return null;
    }

    function isAllowedRepCount(repCount, repDistance) {
      const r = Number(repCount);
      const d = Number(repDistance);
      if (!Number.isFinite(r) || r < 1) return false;
      if (!Number.isFinite(d) || d <= 0) return false;
      
      // Single rep is always allowed
      if (r === 1) return true;
    
      // Coach-plausible rep counts only.
      // These are the common shapes a real coach writes.
      const allowed = new Set([2, 3, 4, 5, 6, 8, 9, 10, 12, 16, 20]);
    
      return allowed.has(r);
    }

    function calculateSensibleCoolDown(totalDistance, poolLength) {
      const target = totalDistance * 0.1;
      let closest = SWIMMER_COOL_DOWNS_LOCAL.reduce(function(prev, curr) {
        return Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev;
      });
      const maxByRepeats = poolLength * 16;
      if (closest > maxByRepeats) closest = maxByRepeats;
      return snapToPoolMultiple(closest, poolLength);
    }
    function nowSeed() {
      const a = Date.now() >>> 0;
      const b2 = Math.floor(Math.random() * 0xffffffff) >>> 0;
      return (a ^ b2) >>> 0;
    }
    function isValidWarmupCoolLine(text) {
      const t = String(text || "").toLowerCase();
      const forbidden = ["hard", "threshold", "sprint", "max", "full gas", "fullgas", "fast", "race pace", "all out"];
      for (const word of forbidden) { if (t.includes(word)) return false; }
      return true;
    }
    function isValidKickLine(text, repDistance) {
      const t = String(text || "").toLowerCase();
      const d = Number(repDistance);
      if (d <= 50 && (t.includes("relaxed") || t.includes("easy"))) return false;
      return true;
    }
    function normalizeSectionKey(label) {
      const l = String(label).toLowerCase();
      if (l.includes("warm")) return "warmup";
      if (l.includes("build")) return "build";
      if (l.includes("drill")) return "drill";
      if (l.includes("kick")) return "kick";
      if (l.includes("cool")) return "cooldown";
      if (l.includes("main")) return "main";
      return null;
    }
    var SECTION_MIN_DIST_LOCAL = { warmup: 300, build: 200, drill: 200, kick: 200, cooldown: 200 };
    function pickFrom(arr, seed) { return arr[seededIndex(seed, arr.length)]; }
    function seededIndex(seed, n) { const x = Math.abs(Math.floor(seed * 9973)) || 1; return x % n; }
    function clampToBucket(targetDist, buckets, poolLen) {
      let best = buckets[0], bestDelta = Math.abs(targetDist - best);
      for (const b of buckets) { const d = Math.abs(targetDist - b); if (d < bestDelta) { best = b; bestDelta = d; } }
      return snapToWallSafe(best, poolLen);
    }
    function snapToWallSafe(dist, poolLen) {
      const unit = 2 * poolLen; if (unit <= 0) return dist;
      return Math.max(unit, Math.round(dist / unit) * unit);
    }
    function fitRepeatsToTarget(n, rep, targetDist) {
      if (rep <= 0) return n;
      return Math.max(2, Math.min(n, Math.floor(targetDist / rep)));
    }
    function snapSection(dist, poolLen) {
      if (dist <= 0) return 0;
      const lengths = Math.round(dist / poolLen);
      const evenLengths = lengths % 2 === 0 ? lengths : lengths + 1;
      return Math.max(evenLengths * poolLen, poolLen * 2);
    }
    function pickIndexWithCooldown(len, seed, rerollCount, cooldownN) {
      if (len <= 1) return 0;
      const rc = Number(rerollCount) || 0;
      const idx = (((rc * 7) + (seed % 9973)) >>> 0) % len;
      const prevs = [];
      for (let i = 1; i <= cooldownN; i++) { if (rc - i >= 0) prevs.push(((((rc - i) * 7) + (seed % 9973)) >>> 0) % len); }
      for (let step = 0; step < len; step++) { const cand = (idx + step) % len; if (!prevs.includes(cand)) return cand; }
      return idx;
    }
    function pickTemplate(section, targetDistance, seed, poolLen) {
      const list = SECTION_TEMPLATES_LOCAL[section];
      if (!list) return null;
      const exactFits = list.filter(function(t) {
        if (t.dist !== targetDistance) return false;
        if (poolLen === 25 || poolLen === 50) { if (!endsAtHomeEnd(t.dist, poolLen)) return false; }
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
    function pickV1CatalogueBody(sectionLabel, targetDist, poolLen, seed) {
      const list = V1_BASE_SET_CATALOGUE_LOCAL[sectionLabel];
      if (!list || list.length === 0) return null;
      const idx = seededIndex(seed, list.length);
      const pick = list[idx];
      const ctx = { sectionLabel, targetDist, poolLen, seed };
      const body = pick.make(ctx);
      return { ok: true, id: pick.id, body };
    }

function buildOneSetBodyShared({ label, targetDistance, poolLen, unitsShort, opts, seed, rerollCount }) {
  const base = poolLen;
  const target = snapToPoolMultipleShared(targetDistance, base);
  if (target <= 0) return null;
  if (typeof remaining === 'undefined') remaining = 0;
  const isNonStandardPool = ![25, 50].includes(base);
  const hasThresholdPace = opts.thresholdPace && String(opts.thresholdPace).trim().length > 0;
  
  // Use different seed bits for different decisions
  const seedA = seed >>> 0;
  const seedB = ((seed * 7919) >>> 0);
  const seedC = ((seed * 104729) >>> 0);
  const seedD = ((seed * 224737) >>> 0);
  
  // Reroll count for cycling through effort levels
  // If rerollCount is provided (>0), use it to deliberately cycle effort levels
  // If not provided or 0, use seeded random for natural initial variety
  const hasRerollCount = typeof rerollCount === 'number' && rerollCount > 0;
  const rerollNum = hasRerollCount ? rerollCount : seedA;

  // TEMPLATE SELECTION - runs first, before any section-specific logic
  // If a template fits, return it immediately
  // Use real targetDistance only (allocator now ensures clean distances)
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
    // Add some variation based on seed
    r = r + (seedD % 3) - 1;
    return Math.max(0, r);
  };

  // Find best rep distance - MUST return exact target distance
  // No floor division allowed - distance must match exactly
  // ===== RESEARCH-BASED CONSTRAINTS =====
  // Real coaches rarely program >20 repeats of same set
  // Long distance + high repeats is unrealistic
  // Very short repeats in large quantities are unrealistic
  const MAX_REALISTIC_REPS = 20;
  const MIN_DISTANCE_FOR_HIGH_REPS = 50;
  
  const findBestFit = (preferredDists, useSeed) => {
    const dists = useSeed ? shuffleWithSeed(preferredDists, seedC) : preferredDists;
    
    // First pass: exact fit (reps x dist = target exactly) with research constraints
    for (const d of dists) {
      if (d > 0 && target % d === 0) {
        const reps = target / d;
        // CONSTRAINT 1: No unrealistic repeat counts (research-based max 20)
        // CONSTRAINT 3: Very short repeats (<50) in large quantities (>8) are unrealistic
        const minReps = (d < MIN_DISTANCE_FOR_HIGH_REPS) ? 2 : 2;
        const maxReps = (d < MIN_DISTANCE_FOR_HIGH_REPS) ? 8 : MAX_REALISTIC_REPS;
        if (reps >= minReps && reps <= maxReps) {
          return { reps, dist: d };
        }
      }
    }
    
    // Second pass: try pool length itself (still cap at realistic max)
    if (base > 0 && target % base === 0) {
      const reps = target / base;
      const maxReps = (base < MIN_DISTANCE_FOR_HIGH_REPS) ? 8 : MAX_REALISTIC_REPS;
      if (reps >= 2 && reps <= maxReps) {
        return { reps, dist: base };
      }
    }
    
    // Third pass: try 2xbase (always at least 50m for standard pools)
    const base2 = base * 2;
    if (base2 > 0 && target % base2 === 0) {
      const reps = target / base2;
      if (reps >= 2 && reps <= MAX_REALISTIC_REPS) {
        return { reps, dist: base2 };
      }
    }
    
    return null;
  };
  // ===== END RESEARCH-BASED CONSTRAINTS =====

  const stroke = pickStroke();
  const k = String(label || "").toLowerCase();
  const hasFins = !!opts.fins;
  const hasPaddles = !!opts.paddles;

  // Named drills - expanded list
  const drills = [
    "Catch-up", "Fist drill", "Fingertip drag", "DPS", "Shark fin", "Zipper", 
    "Scull", "Corkscrew", "Single arm", "Long dog", "Tarzan", "Head up",
    "Hip rotation", "6-3-6", "Kickboard balance", "Paddle scull"
  ];
  const drill = drills[seedA % drills.length];
  const drill2 = drills[(seedA + 7) % drills.length];

  // Build descriptions - expanded with varied effort levels
  const buildDescs = [
    // Strong (yellow) - building effort
    "build", "descend 1-3", "descend 1-4", "descend 1-5", "negative split", 
    "smooth to strong", "build to fast", "odds easy evens strong",
    "every 3rd fast", "last 2 fast",
    // Hard (orange) - more intense builds
    "descend to hard", "build to threshold", "odds steady evens fast",
    // Fullgas touches
    "last one sprint", "build to max", "descend with final sprint"
  ];
  const buildDesc = buildDescs[seedA % buildDescs.length];

  // Preferred rep distances - use single pool length multiples (not 2×poolLen)
  const d25 = base <= 25 ? base : (base <= 50 ? base : Math.round(25 / base) * base);
  const d50 = base <= 50 ? (Math.round(50 / base) * base) : base;
  const d75 = base <= 75 ? (Math.round(75 / base) * base) : base;
  const d100 = base <= 100 ? (Math.round(100 / base) * base) : (base * 2);
  const d200 = base <= 200 ? (Math.round(200 / base) * base) : (base * 4);

  // ~20% chance of multi-part set for main sets (seed % 5 === 0)
  const wantMultiPart = (seedA % 5) === 0 && target >= 400 && k.includes("main");

  // WARM-UP: Simple easy swim with variety
  // Guard: warm-up must not contain hard effort keywords
  if (k.includes("warm")) {
    // Attempt v1 base catalogue for Warm-up
    const catPick = pickV1CatalogueBody("Warm-up", remaining, base, seed);
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

  // BUILD: Build set with variety - clear progression keywords for gradient
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

  // DRILL: Structured numbered drill list (coach-style)
  // EVEN REPS ONLY: Enforces even rep counts (no 7x50, 9x50, 17x50)
  // CRITICAL: Must match target distance exactly
  if (k.includes("drill")) {
    const drillPool = [
      "Fist", "Catch-up", "DPS", "Jazz Hands", "Long Dog",
      "Scull Front", "Scull Rear", "Torpedo Glide", "Single Arm",
      "3-3-3", "Finger Drag", "25 Drill / 25 Swim"
    ];
    
    // Use even rep scheme picker to enforce even reps only
    const evenScheme = pickEvenRepScheme(target, base, "drill");
    
    if (!evenScheme) {
      // Last resort: single line format (rare edge case)
      return target + " drill easy";
    }
    
    const fit = { reps: evenScheme.reps, dist: evenScheme.repDist };
    
    // Build numbered drill list
    const shuffledDrills = shuffleWithSeed([...drillPool], seedA);
    const drillLines = [];
    for (let i = 0; i < fit.reps; i++) {
      drillLines.push((i + 1) + ". " + shuffledDrills[i % shuffledDrills.length]);
    }
    
    const heading = fit.reps + "x" + fit.dist + " Drill FC";
    return heading + "\n" + drillLines.join("\n");
  }

  // KICK: Kick set with variety across effort levels
  // EVEN REPS ONLY: Enforces even rep counts (no 7x50, 9x50, 17x50)
  // Guard: no "relaxed" or "easy" with short reps (25-50)
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
    
    // Use even rep scheme picker to enforce even reps only
    const evenScheme = pickEvenRepScheme(target, base, "kick");
    if (!evenScheme) return makeLine(1, target, "kick" + finNote, 0);
    
    const fit = { reps: evenScheme.reps, dist: evenScheme.repDist };
    
    if (!isValidKickLine(kickDesc, fit.dist)) {
      kickDesc = "kick steady" + finNote;
    }
    return makeLine(fit.reps, fit.dist, kickDesc, restFor(fit.dist, effort));
  }

  // PULL: Pull set with variety across effort levels
  // Use rerollNum to CYCLE through effort levels deliberately
  if (k.includes("pull")) {
    const padNote = hasPaddles ? " with paddles" : "";
    // Organized by effort level for deliberate cycling
    const pullByEffort = {
      moderate: ["pull steady" + padNote, "pull smooth" + padNote, "pull focus DPS" + padNote, "pull relaxed" + padNote, "pull technique" + padNote],
      strong: ["pull build" + padNote, "pull descend" + padNote, "pull descend 1-4" + padNote],
      hard: ["pull strong" + padNote, "pull hard" + padNote, "pull hold pace" + padNote],
      fullgas: ["pull fast" + padNote, "pull sprint" + padNote]
    };
    const effortLevels = ["moderate", "strong", "hard", "fullgas"];
    // Cycle through effort levels based on rerollNum
    const effortIdx = rerollNum % effortLevels.length;
    const effort = effortLevels[effortIdx];
    const descs = pullByEffort[effort];
    const pullDesc = descs[seedA % descs.length];
    const fit = findBestFit([d100, d50, d200, d75].filter(x => x > 0), true);
    if (!fit) return makeLine(1, target, "pull" + padNote, 0);
    return makeLine(fit.reps, fit.dist, pullDesc, restFor(fit.dist, effort));
  }

  // COOL-DOWN: Easy swim with variety
  // Guard: cool-down must not contain hard effort keywords
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

  // MAIN SET: Coach-quality variety with optional multi-part
  const focus = String(opts.focus || "allround");
  
  // Multi-part set patterns (~20% of the time for main sets 400m+)
  // CRITICAL: Total must equal target exactly - try all patterns until one works
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
      // Three-part ladder: steady + strong + fast (equal thirds)
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
      // Mixed distance: 50s + 100s (requires exact math)
      () => {
        if (d50 <= 0 || d100 <= 0) return null;
        // Try: r1 x 50 + r2 x 100 = target where r1,r2 >= 2
        // Iterate to find valid combo
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
    
    // Try preferred pattern first, then try others
    const startIdx = seedB % multiPatterns.length;
    for (let i = 0; i < multiPatterns.length; i++) {
      const idx = (startIdx + i) % multiPatterns.length;
      const result = multiPatterns[idx]();
      if (result) return result;
    }
  }

  // Simple single-line main set (default) - with varied effort levels
  // Use rerollNum to CYCLE through effort levels for allround focus
  // Descriptions designed to trigger proper effort gradients in parseEffortTimeline
  const mainDescs = {
    sprint: [
      stroke + " fast", stroke + " build to sprint", stroke + " max effort", 
      stroke + " race pace", stroke + " all out", stroke + " descend with final sprint"
    ],
    threshold: [
      stroke + " maintain strong pace", stroke + " threshold hold", stroke + " threshold pace", 
      stroke + " controlled fast", stroke + " tempo hold"
    ],
    endurance: [
      stroke + " steady", stroke + " smooth", stroke + " hold pace", 
      stroke + " aerobic", stroke + " consistent"
    ],
    technique: [
      stroke + " perfect form", stroke + " focus DPS", stroke + " count strokes", 
      stroke + " smooth technique", stroke + " efficient"
    ],
    allround: null // Handled specially with effort cycling below
  };
  
  // For allround focus: cycle through all 5 effort levels for variety
  const allroundByEffort = {
    easy: [stroke + " easy", stroke + " recovery", stroke + " relaxed pace", stroke + " loosen up"],
    moderate: [stroke + " steady", stroke + " smooth", stroke + " aerobic", stroke + " hold pace"],
    strong: [stroke + " build", stroke + " descend 1-4", stroke + " negative split", stroke + " build to strong"],
    hard: [stroke + " hard", stroke + " strong hold", stroke + " threshold", stroke + " fast hold", stroke + " descend to hard"],
    fullgas: [stroke + " sprint", stroke + " max effort", stroke + " race pace", stroke + " all out", stroke + " build to sprint"]
  };
  
  let mainDesc;
  let effortForRest = "hard";
  if (focus === "allround" || !mainDescs[focus]) {
    // Cycle through 5 effort levels for main sets: easy → moderate → strong → hard → fullgas
    const mainEfforts = ["moderate", "strong", "hard", "fullgas", "easy"];
    const effortIdx = rerollNum % mainEfforts.length;
    const effort = mainEfforts[effortIdx];
    const descs = allroundByEffort[effort];
    mainDesc = descs[seedA % descs.length];
    effortForRest = effort === "easy" ? "easy" : (effort === "moderate" ? "moderate" : "hard");
  } else {
    const descs = mainDescs[focus];
    mainDesc = descs[seedA % descs.length];
  }

  // Shuffle distance preferences for variety
  const fit = findBestFit([d100, d50, d200, d75].filter(x => x > 0), true);
  if (!fit) return makeLine(1, target, stroke + " swim", 0);
  return makeLine(fit.reps, fit.dist, mainDesc, restFor(fit.dist, effortForRest));
}

    function validateRepScheme(reps, repDistance) {
      const limit = REP_LIMITS_LOCAL[repDistance];
      if (!limit) {
        if (repDistance >= 200) return reps <= 8;
        if (repDistance >= 100) return reps <= 16;
        return reps <= 24;
      }
      return reps <= limit.max;
    }

    function findClosestTemplate(targetDistance, tags, seed) {
      tags = tags || []; seed = seed || 0;
      let candidates = WORKOUT_TEMPLATES_LOCAL;
      if (tags.length > 0) {
        candidates = WORKOUT_TEMPLATES_LOCAL.filter(t => tags.some(tag => t.tags.includes(tag)));
        if (candidates.length === 0) candidates = WORKOUT_TEMPLATES_LOCAL;
      }
      const viable = [];
      for (const template of candidates) {
        const sf = targetDistance / template.totalDistance;
        if (sf >= 0.5 && sf <= 2.0) viable.push({ template, scaleFactor: sf, delta: Math.abs(sf - 1.0) });
      }
      if (viable.length === 0) {
        let best = candidates[0], bestDelta = Math.abs(best.totalDistance - targetDistance);
        for (const t of candidates) { const d = Math.abs(t.totalDistance - targetDistance); if (d < bestDelta) { best = t; bestDelta = d; } }
        return { template: best, scaleFactor: targetDistance / best.totalDistance, originalDistance: best.totalDistance, targetDistance };
      }
      viable.sort((a, b) => a.delta - b.delta);
      const weights = viable.map(v => v.delta < 0.05 ? 10 : v.delta < 0.15 ? 6 : v.delta < 0.30 ? 3 : 1);
      const totalWeight = weights.reduce((s, w) => s + w, 0);
      const pick = Math.floor(Math.random() * totalWeight);
      let cumulative = 0, chosen = viable[0];
      for (let i = 0; i < viable.length; i++) { cumulative += weights[i]; if (pick < cumulative) { chosen = viable[i]; break; } }
      return { template: chosen.template, scaleFactor: chosen.scaleFactor, originalDistance: chosen.template.totalDistance, targetDistance };
    }

    function scaleTemplate(template, targetDistance, poolLen) {
      poolLen = poolLen || 25;
      const scaleFactor = targetDistance / template.totalDistance;
      const scaledSections = []; let runningTotal = 0;
      for (let i = 0; i < template.sections.length; i++) {
        const section = template.sections[i];
        const isLast = i === template.sections.length - 1;
        let scaledDist;
        if (isLast) { scaledDist = targetDistance - runningTotal; }
        else { scaledDist = Math.round(section.distance * scaleFactor); scaledDist = Math.round(scaledDist / poolLen) * poolLen; }
        if (scaledDist < poolLen * 2) scaledDist = poolLen * 2;
        scaledSections.push({ label: section.label, desc: section.desc, distance: scaledDist, originalDistance: section.distance });
        runningTotal += scaledDist;
      }
      return { name: template.name, totalDistance: targetDistance, sections: scaledSections, tags: template.tags, scaleFactor };
    }

  function generateSimpleBody(dist, label, base) {
    return generateVariedBody(dist, label, base, 0);
  }
  
  function varyTemplateDesc(originalDesc, dist, label, base, seed) {
    const s = seed >>> 0;
    const labelLower = String(label).toLowerCase();
    const desc = String(originalDesc || "");
    
    const intensitySwaps = {
      "strong": ["moderate", "strong", "threshold pace", "@ strong effort"],
      "moderate": ["steady", "moderate", "strong"],
      "steady": ["steady", "moderate", "relaxed pace"],
      "easy": ["easy", "easy freestyle", "easy choice", "relaxed swim"],
      "build": ["build", "build by 25", "build to fast"],
      "fast": ["fast", "race pace", "sprint"],
      "FAST": ["FAST", "sprint", "max effort", "race pace"],
      "FAST with rest": ["FAST with rest", "sprint with rest", "max effort with recovery"]
    };
    
    const repMatch = desc.match(/^(\\d+)x(\\d+)\\s+(.+)$/);
    if (repMatch) {
      const origReps = Number(repMatch[1]);
      const origRepDist = Number(repMatch[2]);
      const origIntensity = repMatch[3];
      
      const repDistOptions = [];
      if (dist >= 800 && dist % 200 === 0) repDistOptions.push(200);
      if (dist >= 300 && dist % 100 === 0) repDistOptions.push(100);
      if (dist >= 150 && dist % 50 === 0) repDistOptions.push(50);
      if (dist >= 50 && dist % base === 0) repDistOptions.push(base);
      
      const validRepDists = repDistOptions.filter(rd => {
        const r = dist / rd;
        return r >= 2 && r <= 16 && validateRepScheme(r, rd);
      });
      
      let newRepDist = origRepDist;
      let newReps = origReps;
      if (validRepDists.length > 1) {
        newRepDist = validRepDists[((s * 9973) >>> 0) % validRepDists.length];
        newReps = Math.round(dist / newRepDist);
      }
      
      const baseIntensity = origIntensity.replace(/\\s*\\(.*\\)$/, "").trim();
      const parenthetical = origIntensity.match(/\\(.*\\)$/);
      let newIntensity = baseIntensity;
      if (intensitySwaps[baseIntensity]) {
        newIntensity = intensitySwaps[baseIntensity][((s * 2654435761) >>> 0) % intensitySwaps[baseIntensity].length];
      }
      if (parenthetical) {
        newIntensity += " " + parenthetical[0];
      }
      
      return newReps + "x" + newRepDist + " " + newIntensity;
    }
    
    const straightMatch = desc.match(/^(\\d+)\\s+(.+)$/);
    if (straightMatch) {
      const origIntensity = straightMatch[2].trim();
      if (intensitySwaps[origIntensity]) {
        const swapped = intensitySwaps[origIntensity][((s * 2654435761) >>> 0) % intensitySwaps[origIntensity].length];
        return dist + " " + swapped;
      }
      return dist + " " + origIntensity;
    }
    
    return desc;
  }
  
  function generateVariedBody(dist, label, base, seed) {
    const labelLower = String(label).toLowerCase();
    const s = seed >>> 0;
    
    const warmDescriptions = [
      "easy", "easy freestyle", "easy choice", "relaxed swim",
      "easy mix", "easy FC", "easy swim"
    ];
    const coolDescriptions = [
      "easy", "easy choice", "easy freestyle", "relaxed swim",
      "easy mix"
    ];
    const mainIntensities = [
      "steady", "moderate", "strong", "threshold pace",
      "@ strong effort", "negative split", "descend 1-4"
    ];
    const mainPatterns = [
      "odd fast, even easy", "build each rep", "descend within set",
      "hold pace", "negative split", "last 25 fast"
    ];
    const buildDescriptions = [
      "build", "build by 25", "build to fast", "build each rep"
    ];
    const drillStrokes = [
      "drill FC", "drill choice", "drill mix", "technique focus",
      "catch-up drill", "drill IM"
    ];
    const kickDescriptions = [
      "kick moderate", "kick choice", "kick with board",
      "kick streamline", "kick easy"
    ];
    const pullDescriptions = [
      "pull moderate", "pull with paddles", "pull steady",
      "pull with buoy", "pull strong"
    ];
    const sprintIntensities = [
      "FAST", "FAST with rest", "sprint", "max effort",
      "race pace", "all out"
    ];
    
    const pick = (arr) => arr[((s * 2654435761) >>> 0) % arr.length];
    const pick2 = (arr) => arr[((s * 1103515245 + 12345) >>> 0) % arr.length];
    
    // Warmup and cooldown prefer straight swims
    if (labelLower.includes("warm") || labelLower.includes("cool")) {
      const descPool = labelLower.includes("warm") ? warmDescriptions : coolDescriptions;
      if (dist <= 600) {
        return dist + " " + pick(descPool);
      }
      // Longer warmups: split into easy + build
      const easyDist = snapToPoolMultiple(Math.round(dist * 0.6), base);
      const buildDist = dist - easyDist;
      const buildReps = Math.round(buildDist / (base * 2));
      const buildRepDist = buildReps > 0 ? Math.round(buildDist / buildReps) : buildDist;
      if (buildReps > 1) {
        return easyDist + " " + pick(descPool) + "\n" + buildReps + "x" + snapToPoolMultiple(buildRepDist, base) + " build";
      }
      return dist + " " + pick(descPool);
    }
    
    // Determine rep distance options based on total distance
    const repOptions = [];
    if (dist >= 800 && dist % 200 === 0) repOptions.push(200);
    if (dist >= 400 && dist % 100 === 0) repOptions.push(100);
    if (dist >= 200 && dist % 50 === 0) repOptions.push(50);
    if (dist >= 100 && dist % base === 0) repOptions.push(base);
    
    // Filter to valid rep counts (coaching constraints)
    const validOptions = repOptions.filter(rd => {
      const reps = dist / rd;
      return reps >= 2 && reps <= 16 && validateRepScheme(reps, rd);
    });
    
    let repDist = base;
    if (validOptions.length > 0) {
      repDist = validOptions[((s * 9973) >>> 0) % validOptions.length];
    } else {
      if (dist >= 600) repDist = 200;
      else if (dist >= 300) repDist = 100;
      else if (dist >= 100) repDist = 50;
      repDist = snapToPoolMultiple(repDist, base);
      if (repDist <= 0) repDist = base;
    }
    
    const reps = Math.round(dist / repDist);
    
    // Straight swim for small distances
    if (reps <= 1) {
      if (labelLower.includes("main")) return dist + " " + pick(mainIntensities);
      return dist + " " + pick(warmDescriptions);
    }
    
    // Build section descriptions
    if (labelLower.includes("build")) {
      return reps + "x" + repDist + " " + pick(buildDescriptions);
    }
    
    // Drill sections
    if (labelLower.includes("drill")) {
      return reps + "x" + repDist + " " + pick(drillStrokes);
    }
    
    // Kick sections
    if (labelLower.includes("kick")) {
      return reps + "x" + repDist + " " + pick(kickDescriptions);
    }
    
    // Pull sections
    if (labelLower.includes("pull")) {
      return reps + "x" + repDist + " " + pick(pullDescriptions);
    }
    
    // Sprint sections
    if (labelLower.includes("sprint")) {
      return reps + "x" + repDist + " " + pick(sprintIntensities);
    }
    
    // Main sections - add pattern variations
    const intensity = pick(mainIntensities);
    const addPattern = ((s * 7919) >>> 0) % 3 === 0;
    if (addPattern && reps >= 4) {
      return reps + "x" + repDist + " " + intensity + " (" + pick2(mainPatterns) + ")";
    }
    
    return reps + "x" + repDist + " " + intensity;
  }

  function buildWorkoutFromTemplate({ targetTotal, poolLen, unitsShort, poolLabel, thresholdPace, opts, seed }) {
    const base = poolLen;
    const rawTotal = snapToPoolMultiple(targetTotal, base);
    const lengths = Math.round(rawTotal / base);
    const evenLengths = lengths % 2 === 0 ? lengths : lengths + 1;
    const total = evenLengths * base;
    
    // Find template with seed-based randomization for variety
    const { template, scaleFactor } = findClosestTemplate(total, [], seed);
    const useOriginalDesc = Math.abs(scaleFactor - 1.0) < 0.15;
    
    const scaled = scaleTemplate(template, total, base);
    
    // Build sets from template sections
    const sets = [];
    let actualTotal = 0;
    let sectionSeed = seed;
    
    for (const section of scaled.sections) {
      const dist = snapToPoolMultiple(section.distance, base);
      sectionSeed = ((sectionSeed * 1103515245 + 12345) >>> 0);
      const labelLower = section.label.toLowerCase();
      const isFixed = labelLower.includes("warm") || labelLower.includes("cool");
      let body;
      if (useOriginalDesc && isFixed) {
        body = section.desc;
      } else if (useOriginalDesc) {
        body = varyTemplateDesc(section.desc, dist, section.label, base, sectionSeed);
      } else {
        body = generateVariedBody(dist, section.label, base, sectionSeed);
      }
      sets.push({
        label: section.label,
        dist: dist,
        body: body,
        originalDesc: section.desc
      });
      actualTotal += dist;
    }
    
    // Adjust last section to hit exact total (absorb rounding errors)
    if (actualTotal !== total && sets.length > 0) {
      const delta = total - actualTotal;
      // Find main to adjust (not cooldown)
      const mainIdx = sets.findIndex(s => s.label.toLowerCase().includes("main"));
      const adjustIdx = mainIdx >= 0 ? mainIdx : sets.length - 2;
      if (adjustIdx >= 0) {
        const newDist = snapToPoolMultiple(sets[adjustIdx].dist + delta, base);
        if (newDist >= base * 4) {
          sets[adjustIdx].dist = newDist;
          if (!useOriginalDesc) {
            sets[adjustIdx].body = generateSimpleBody(newDist, sets[adjustIdx].label, base);
          }
        }
      }
    }
    
    // Apply sensible cooldown calculation to override template cooldown
    const cooldownIdx = sets.findIndex(s => s.label.toLowerCase().includes("cool"));
    if (cooldownIdx >= 0) {
      const sensibleCool = calculateSensibleCoolDown(total, base);
      const currentCool = sets[cooldownIdx].dist;
      const diff = currentCool - sensibleCool;
      
      // Only adjust if difference is significant
      if (Math.abs(diff) > base * 2) {
        // Find main section to redistribute
        const mainIdx = sets.findIndex(s => s.label.toLowerCase().includes("main"));
        if (mainIdx >= 0) {
          const newMainDist = snapToPoolMultiple(sets[mainIdx].dist + diff, base);
          // Guard: Only adjust if main stays above minimum (400m)
          if (newMainDist >= 400) {
            sets[cooldownIdx].dist = sensibleCool;
            sets[cooldownIdx].body = generateSimpleBody(sensibleCool, "Cool down", base);
            sets[mainIdx].dist = newMainDist;
            if (!useOriginalDesc) {
              sets[mainIdx].body = generateSimpleBody(newMainDist, sets[mainIdx].label, base);
            }
          }
        }
      }
    }
    
    // Recalculate total after adjustments
    const finalTotal = sets.reduce((sum, s) => sum + s.dist, 0);
    
    // Generate workout text
    const workoutName = template.name;
    
    let workoutText = "";
    for (const s of sets) {
      workoutText += s.label + ": " + s.body + "\n\n";
    }
    workoutText += "Total " + finalTotal + unitsShort;
    
    // Build sections array for frontend
    const sectionData = sets.map(s => ({
      label: s.label,
      body: s.body,
      dist: s.dist
    }));
    
    return {
      name: workoutName,
      text: workoutText,
      totalMeters: finalTotal,
      sections: sectionData,
      fromTemplate: true,
      templateName: template.name
    };
  }

    function parseWorkoutTextToSections(text) {
      const raw = String(text || "");
      const plines = raw.split("\n");
      const sections = [];
      let current = null;
      const flush = () => {
        if (!current) return;
        current.body = current.bodyLines.join("\n").trim();
        delete current.bodyLines;
        sections.push(current);
        current = null;
      };
      const headerRe = /^([A-Za-z][A-Za-z0-9 \\-]*?)\\s*:\\s*(.*)$/;
      const knownLabels = new Set([
        'warm up','warm-up','warmup','wu','build','builds','drill','drills',
        'kick','kicks','pull','pulls','main','main set','sprint','sprints',
        'speed','cool down','cool-down','cooldown','cd','workout','set','recovery'
      ]);
      for (const line of plines) {
        if (/^Total\\s+\\d+/i.test(line.trim())) continue;
        const m = line.match(headerRe);
        if (m) {
          const label = String(m[1] || "").trim();
          if (!knownLabels.has(label.toLowerCase())) { if (current) current.bodyLines.push(line); continue; }
          flush();
          const tail = String(m[2] || "").trim();
          let dist = null;
          const distMatch = tail.match(/(^|\\s)(\\d{2,5})(\\s|$)/);
          if (distMatch) dist = Number(distMatch[2]);
          current = { label, dist, bodyLines: [] };
          if (tail) current.bodyLines.push(tail);
          continue;
        }
        if (!current) continue;
        current.bodyLines.push(line);
      }
      flush();
      if (!sections.length && raw.trim()) return { sections: [{ label: "Workout", dist: null, body: raw.trim() }] };
      return { sections };
    }

    function inferZoneFromText(body) {
      const t = String(body || "").toLowerCase();
      if (t.includes("full gas")||t.includes("fullgas")||t.includes("all out")||t.includes("max effort")||t.includes("sprint")) return "full_gas";
      if (t.includes("threshold")||t.includes("race pace")||t.includes("hard")) return "hard";
      if (t.includes("strong")||t.includes("fast")) return "strong";
      if (t.includes("moderate")||t.includes("steady")) return "moderate";
      return "easy";
    }
    function inferIsStriatedFromText(body) {
      const t = String(body || "").toLowerCase();
      if (t.includes("odds") && t.includes("evens")) return true;
      if (t.includes("descend") || t.includes("build") || t.includes("negative split")) return true;
      if (t.match(/\\b(\\d+)\\s*to\\s*(\\d+)\\b/)) return true;
      return false;
    }

    function normalizeOptionsLocal(payload) {
      const b = v => v === true || v === "true" || v === "on" || v === 1;
      const strokes = {
        freestyle: b(payload.stroke_freestyle), backstroke: b(payload.stroke_backstroke),
        breaststroke: b(payload.stroke_breaststroke), butterfly: b(payload.stroke_butterfly)
      };
      if (!strokes.freestyle && !strokes.backstroke && !strokes.breaststroke && !strokes.butterfly) strokes.freestyle = true;
      return {
        focus: typeof payload.focus === "string" ? payload.focus : "allround",
        restPref: typeof payload.restPref === "string" ? payload.restPref : "balanced",
        thresholdPace: typeof payload.thresholdPace === "string" ? payload.thresholdPace : "",
        includeKick: payload.includeKick === undefined ? true : b(payload.includeKick),
        includePull: b(payload.includePull),
        fins: b(payload.equip_fins), paddles: b(payload.equip_paddles),
        strokes, notes: typeof payload.notes === "string" ? payload.notes.trim() : ""
      };
    }
    function canonicalLabelLocal(labelRaw) {
      const raw = String(labelRaw || "").trim();
      const key = raw.toLowerCase().replace(/\\s+/g, " ").trim();
      const map = {
        "warm-up":"Warm up","warm up":"Warm up","warmup":"Warm up",
        "build":"Build","drill":"Drill","kick":"Kick","pull":"Pull",
        "main":"Main","main 1":"Main 1","main 2":"Main 2",
        "cooldown":"Cool down","cool down":"Cool down"
      };
      return map[key] || raw;
    }

    function generateWorkoutLocal(payload) {
      const body = payload;
      const minTotal = 800;
      const distance = Math.max(Number(body.distance), minTotal);
      const poolLength = body.poolLength;
      const customPoolLength = body.customPoolLength;
      const poolLengthUnit = body.poolLengthUnit;
      const lastWorkoutFp = typeof body.lastWorkoutFp === "string" ? body.lastWorkoutFp : "";
      if (!Number.isFinite(distance) || distance <= 0) return { ok: false, error: "Invalid distance." };
      if (!poolLength || typeof poolLength !== "string") return { ok: false, error: "Invalid pool selection." };
      const isCustomPool = poolLength === "custom";
      const unitsShort = isCustomPool ? (poolLengthUnit === "yards" ? "yd" : "m") : (poolLength === "25yd" ? "yd" : "m");
      const poolLen = isCustomPool ? Number(customPoolLength) : (poolLength === "25m" ? 25 : poolLength === "50m" ? 50 : poolLength === "25yd" ? 25 : null);
      if (!poolLen || !Number.isFinite(poolLen) || poolLen <= 0) return { ok: false, error: "Invalid pool length." };
      const opts = normalizeOptionsLocal(body);
      const targetTotal = snapToPoolMultiple(distance, poolLen);
      let workout = buildWorkoutFromTemplate({
        targetTotal, poolLen, unitsShort,
        poolLabel: isCustomPool ? (String(poolLen) + unitsShort + " custom") : String(poolLength),
        thresholdPace: String(body.thresholdPace || ""), opts, seed: nowSeed()
      });
      if (!workout || !workout.text) return { ok: false, error: "Failed to build workout." };
      const fp = fingerprintWorkoutText(workout.text);
      if (lastWorkoutFp && fp === lastWorkoutFp) {
        const workout2 = buildWorkoutFromTemplate({
          targetTotal, poolLen, unitsShort,
          poolLabel: isCustomPool ? (String(poolLen) + unitsShort + " custom") : String(poolLength),
          thresholdPace: String(body.thresholdPace || ""), opts, seed: nowSeed() + 1000
        });
        if (workout2 && workout2.text) workout = workout2;
      }
      const parsed = parseWorkoutTextToSections(workout.text);
      const sectionMeta = parsed.sections.map(s => ({
        zone: inferZoneFromText(s.body), isStriated: inferIsStriatedFromText(s.body)
      }));
      const workoutMeta = (() => {
        const zones = sectionMeta.map(m => m.zone);
        return { hasRed: zones.includes("full_gas"), redSectionsCount: zones.filter(z => z === "full_gas").length };
      })();
      const totalMeters = workout.totalMeters || targetTotal;
      const totalLengths = Math.round(totalMeters / poolLen);
      return {
        ok: true, workoutText: workout.text, workoutName: workout.name || "",
        sections: parsed.sections, sectionMeta, workoutMeta, totalMeters, totalLengths,
        poolLength: poolLen, poolLabel: isCustomPool ? (String(poolLen) + unitsShort + " custom") : String(poolLength)
      };
    }

    function rerollSetLocal(payload) {
      const body = payload;
      const poolLength = body.poolLength;
      const poolLengthUnit = body.poolLengthUnit;
      const customPoolLength = body.customPoolLength;
      const isCustomPool = poolLength === "custom";
      const unitsShort = isCustomPool ? (poolLengthUnit === "yards" ? "yd" : "m") : (poolLength === "25yd" ? "yd" : "m");
      const poolLen = isCustomPool ? Number(customPoolLength) : (poolLength === "25m" ? 25 : poolLength === "50m" ? 50 : poolLength === "25yd" ? 25 : null);
      if (!poolLen || !Number.isFinite(poolLen) || poolLen <= 0) return { ok: false, error: "Invalid pool length." };
      const targetDistance = Number(body.targetDistance);
      if (!Number.isFinite(targetDistance) || targetDistance <= 0) return { ok: false, error: "Invalid targetDistance." };
      const labelRaw = typeof body.label === "string" && body.label.trim() ? body.label.trim() : "Main";
      const label = canonicalLabelLocal(labelRaw);
      const opts = normalizeOptionsLocal(body);
      const avoidText = typeof body.avoidText === "string" ? body.avoidText.trim() : "";
      const rerollCount = Number(body.rerollCount) || 1;
      for (let i = 0; i < 10; i++) {
        const seed = ((rerollCount * 7919) + (i * 9973) + Date.now()) >>> 0;
        const next = buildOneSetBodyShared({ label, targetDistance, poolLen, unitsShort, opts, seed, rerollCount });
        if (!next) continue;
        if (avoidText && next.trim() === avoidText.trim()) continue;
        return { ok: true, setBody: next };
      }
      return { ok: false, error: "Reroll failed to produce a replacement set." };
    }

    function fingerprintWorkoutText(text) {
      return String(fnv1a32(String(text || "")));
    }

    window.WORKOUT_TEMPLATES_LOCAL = WORKOUT_TEMPLATES_LOCAL;
    window.generateWorkoutLocal = generateWorkoutLocal;
    window.rerollSetLocal = rerollSetLocal;
    window.parseWorkoutTextToSections = parseWorkoutTextToSections;
    window.inferZoneFromText = inferZoneFromText;
    window.inferIsStriatedFromText = inferIsStriatedFromText;
    window.fingerprintWorkoutText = fingerprintWorkoutText;
    window.fnv1a32 = fnv1a32;
    window.snapToPoolMultiple = snapToPoolMultiple;
    window.snapRepDist = snapRepDist;
    window.endsAtHomeEnd = endsAtHomeEnd;
    window.pickEvenRepScheme = pickEvenRepScheme;
    window.snapToPoolMultipleShared = snapToPoolMultipleShared;
    window.shuffleWithSeed = shuffleWithSeed;
    window.mulberry32 = mulberry32;
