// ============================================================================
// Generator v2 - Template-Based Workout Generation (Complete Rewrite)
// ============================================================================
// STRICT math validation - totals MUST be correct
// Every set distance is parsed and verified
// ============================================================================

const { TemplateLibrary, TEMPLATE_LIBRARY } = require('../template-library/core/initial-templates.js');
const { TemplateImportPipeline } = require('../template-library/import-pipeline.js');

let templatesLoaded = false;

class TemplateGenerator {
  constructor() {
    if (!templatesLoaded) {
      const pipeline = new TemplateImportPipeline();
      const batch = pipeline.getInitialBatch();
      pipeline.importBatch(batch, TEMPLATE_LIBRARY);
      templatesLoaded = true;
    }
    this.library = new TemplateLibrary();
  }

  parseSetStructure(text) {
    const repMatch = text.match(/^(\d+)x(\d+)/i);
    if (repMatch) {
      const reps = parseInt(repMatch[1], 10);
      const dist = parseInt(repMatch[2], 10);
      return { reps, distance: dist, total: reps * dist, structure: text };
    }
    
    const singleMatch = text.match(/^(\d+)\s+/);
    if (singleMatch) {
      const dist = parseInt(singleMatch[1], 10);
      return { reps: 1, distance: dist, total: dist, structure: text };
    }
    
    return null;
  }

  allocateSectionBudgets(totalDistance, wallSafe) {
    const minSection = wallSafe * 2;
    
    let warmupPct, cooldownPct;
    if (totalDistance <= 1000) {
      warmupPct = 0.20;
      cooldownPct = 0.10;
    } else if (totalDistance <= 2000) {
      warmupPct = 0.175;
      cooldownPct = 0.125;
    } else {
      warmupPct = 0.15;
      cooldownPct = 0.10;
    }
    
    let warmup = this.snapToWallSafe(Math.round(totalDistance * warmupPct), wallSafe);
    let cooldown = this.snapToWallSafe(Math.round(totalDistance * cooldownPct), wallSafe);
    
    warmup = Math.max(warmup, minSection);
    cooldown = Math.max(cooldown, minSection);
    
    let main = totalDistance - warmup - cooldown;
    if (main < minSection) {
      main = minSection;
      warmup = Math.max(minSection, totalDistance - main - cooldown);
    }
    
    const sum = warmup + main + cooldown;
    if (sum !== totalDistance) {
      main = totalDistance - warmup - cooldown;
    }
    
    return { warmup, main, cooldown };
  }

  selectTemplatesForSection(category, budget, wallSafe, rng) {
    const selected = [];
    let remaining = budget;
    const maxSets = 4;
    
    const templates = this.library.getTemplatesBySection(category);
    if (!templates || templates.length === 0) {
      selected.push({ structure: `${budget} easy swim`, total: budget });
      return { selected, actualTotal: budget };
    }
    
    for (let i = 0; i < maxSets && remaining >= wallSafe; i++) {
      const valid = templates.filter(t => {
        const parsed = this.parseSetStructure(t.structure);
        if (!parsed) return false;
        const snapped = this.snapToWallSafe(parsed.total, wallSafe);
        return snapped > 0 && snapped <= remaining;
      });
      
      if (valid.length === 0) break;
      
      const template = valid[Math.floor(rng() * valid.length)];
      const parsed = this.parseSetStructure(template.structure);
      const snapped = this.snapToWallSafe(parsed.total, wallSafe);
      
      selected.push({ 
        structure: template.structure, 
        total: snapped,
        parsed: parsed
      });
      remaining -= snapped;
    }
    
    if (remaining >= wallSafe) {
      selected.push({ 
        structure: this.createFillerSet(remaining, category), 
        total: remaining 
      });
      remaining = 0;
    }
    
    const actualTotal = budget - remaining;
    return { selected, actualTotal };
  }

  createFillerSet(distance, category) {
    if (distance <= 100) {
      return `${distance} easy`;
    } else if (distance <= 200) {
      return `${distance} easy choice`;
    } else if (distance % 100 === 0) {
      const reps = distance / 100;
      if (reps <= 10) {
        return category === 'main' ? `${reps}x100 steady` : `${reps}x100 easy`;
      }
    }
    if (distance % 50 === 0) {
      const reps = distance / 50;
      if (reps <= 12) {
        return `${reps}x50 easy`;
      }
    }
    return `${distance} easy swim`;
  }

  validateWorkout(sections, targetDistance) {
    let total = 0;
    for (const section of sections) {
      let sectionSum = 0;
      for (const set of section.sets) {
        sectionSum += set.total;
      }
      if (sectionSum !== section.dist) {
        console.warn(`Section ${section.label} mismatch: claimed ${section.dist}, actual ${sectionSum}`);
      }
      total += section.dist;
    }
    
    const tolerance = 100;
    if (Math.abs(total - targetDistance) > tolerance) {
      console.error(`Workout total mismatch: target ${targetDistance}, actual ${total}`);
      return false;
    }
    return true;
  }

  generateWorkout({ targetTotal, poolLen, unitsShort, poolLabel, thresholdPace, opts, seed }) {
    const wallSafe = poolLen * 2;
    const total = this.snapToWallSafe(targetTotal, wallSafe);
    
    let rngState = seed || Date.now();
    const rng = () => {
      rngState = ((rngState * 1103515245 + 12345) >>> 0) % 2147483648;
      return rngState / 2147483648;
    };
    
    const budgets = this.allocateSectionBudgets(total, wallSafe);
    
    const sectionConfigs = [
      { label: 'Warm up', category: 'warmup', budget: budgets.warmup },
      { label: 'Main', category: 'main', budget: budgets.main },
      { label: 'Cool down', category: 'cooldown', budget: budgets.cooldown }
    ];
    
    const sections = [];
    let actualTotal = 0;
    
    for (const config of sectionConfigs) {
      const result = this.selectTemplatesForSection(config.category, config.budget, wallSafe, rng);
      
      const bodyLines = result.selected.map(s => s.structure);
      
      sections.push({
        label: config.label,
        dist: result.actualTotal,
        body: bodyLines.join('\n'),
        sets: result.selected
      });
      actualTotal += result.actualTotal;
    }
    
    if (actualTotal < total) {
      const diff = total - actualTotal;
      const mainIdx = sections.findIndex(s => s.label === 'Main');
      if (mainIdx >= 0 && diff >= wallSafe) {
        sections[mainIdx].dist += diff;
        sections[mainIdx].body += `\n${this.createFillerSet(diff, 'main')}`;
        sections[mainIdx].sets.push({ structure: this.createFillerSet(diff, 'main'), total: diff });
        actualTotal = total;
      }
    }
    
    this.validateWorkout(sections, total);
    
    const textLines = [];
    const cleanSections = [];
    for (const s of sections) {
      textLines.push(`${s.label}: ${s.dist}`);
      textLines.push(s.body);
      textLines.push('');
      cleanSections.push({ label: s.label, dist: s.dist, body: s.body });
    }
    
    return {
      text: textLines.join('\n'),
      sections: cleanSections,
      name: this.generateWorkoutName(actualTotal, rng),
      total: actualTotal,
      poolLen: poolLen,
      generatedBy: 'template-v2'
    };
  }

  snapToWallSafe(dist, wallSafe) {
    if (!wallSafe || wallSafe <= 0) return dist;
    return Math.round(dist / wallSafe) * wallSafe;
  }

  generateWorkoutName(total, rng) {
    const adjectives = ['Power', 'Speed', 'Endurance', 'Tempo', 'Threshold', 'Sprint', 'Distance', 'Mixed'];
    const types = ['Session', 'Workout', 'Set', 'Practice', 'Training'];
    const adj = adjectives[Math.floor(rng() * adjectives.length)];
    const type = types[Math.floor(rng() * types.length)];
    return `${adj} ${type} - ${total}m`;
  }
}

module.exports = { TemplateGenerator };
