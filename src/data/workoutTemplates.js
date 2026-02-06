/**
 * Workout Templates Database
 * 
 * Real swim workout patterns from coaching literature.
 * Templates are designed for 25m pools and can be scaled for different distances.
 * 
 * Structure:
 * - name: Workout title
 * - totalDistance: Base total in meters
 * - sections: Array of workout sections with label, desc, distance
 * - tags: Categories for filtering (endurance, speed, technique, etc.)
 */

const WORKOUT_TEMPLATES = [
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

/**
 * Coaching constraints for rep limits by distance
 * Ensures no absurd sets like 20x200
 */
const REP_LIMITS = {
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

/**
 * Cooldown scaling by total distance
 * Returns target cooldown as percentage of total
 */
function getCooldownPercent(totalDistance) {
  if (totalDistance <= 1500) return 0.10;
  if (totalDistance <= 3000) return 0.08;
  if (totalDistance <= 5000) return 0.07;
  if (totalDistance <= 7000) return 0.06;
  return 0.05;
}

/**
 * Find a template for the target distance with seed-based randomization.
 * Collects all templates within a reasonable scaling range and picks one
 * using the seed so each Generate click produces a different workout.
 */
function findClosestTemplate(targetDistance, tags = [], seed = 0) {
  let candidates = WORKOUT_TEMPLATES;
  
  if (tags.length > 0) {
    candidates = WORKOUT_TEMPLATES.filter(t => 
      tags.some(tag => t.tags.includes(tag))
    );
    if (candidates.length === 0) candidates = WORKOUT_TEMPLATES;
  }
  
  const viable = [];
  for (const template of candidates) {
    const sf = targetDistance / template.totalDistance;
    if (sf >= 0.5 && sf <= 2.0) {
      const delta = Math.abs(sf - 1.0);
      viable.push({ template, scaleFactor: sf, delta });
    }
  }
  
  if (viable.length === 0) {
    let best = candidates[0];
    let bestDelta = Math.abs(best.totalDistance - targetDistance);
    for (const t of candidates) {
      const d = Math.abs(t.totalDistance - targetDistance);
      if (d < bestDelta) { best = t; bestDelta = d; }
    }
    return {
      template: best,
      scaleFactor: targetDistance / best.totalDistance,
      originalDistance: best.totalDistance,
      targetDistance
    };
  }
  
  viable.sort((a, b) => a.delta - b.delta);
  
  const weights = viable.map(v => {
    if (v.delta < 0.05) return 10;
    if (v.delta < 0.15) return 6;
    if (v.delta < 0.30) return 3;
    return 1;
  });
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  
  const pick = Math.floor(Math.random() * totalWeight);
  let cumulative = 0;
  let chosen = viable[0];
  for (let i = 0; i < viable.length; i++) {
    cumulative += weights[i];
    if (pick < cumulative) {
      chosen = viable[i];
      break;
    }
  }
  
  return {
    template: chosen.template,
    scaleFactor: chosen.scaleFactor,
    originalDistance: chosen.template.totalDistance,
    targetDistance
  };
}

/**
 * Scale a template to match target distance
 * Maintains proportions and applies coaching constraints
 */
function scaleTemplate(template, targetDistance, poolLen = 25) {
  const scaleFactor = targetDistance / template.totalDistance;
  const scaledSections = [];
  let runningTotal = 0;
  
  for (let i = 0; i < template.sections.length; i++) {
    const section = template.sections[i];
    const isLast = i === template.sections.length - 1;
    
    let scaledDist;
    if (isLast) {
      scaledDist = targetDistance - runningTotal;
    } else {
      scaledDist = Math.round(section.distance * scaleFactor);
      scaledDist = Math.round(scaledDist / poolLen) * poolLen;
    }
    
    if (scaledDist < poolLen * 2) scaledDist = poolLen * 2;
    
    scaledSections.push({
      label: section.label,
      desc: section.desc,
      distance: scaledDist,
      originalDistance: section.distance
    });
    
    runningTotal += scaledDist;
  }
  
  return {
    name: template.name,
    totalDistance: targetDistance,
    sections: scaledSections,
    tags: template.tags,
    scaleFactor
  };
}

/**
 * Check if a rep scheme violates coaching constraints
 */
function validateRepScheme(reps, repDistance) {
  const limit = REP_LIMITS[repDistance];
  if (!limit) {
    if (repDistance >= 200) return reps <= 8;
    if (repDistance >= 100) return reps <= 16;
    return reps <= 24;
  }
  return reps <= limit.max;
}

module.exports = {
  WORKOUT_TEMPLATES,
  REP_LIMITS,
  getCooldownPercent,
  findClosestTemplate,
  scaleTemplate,
  validateRepScheme
};
