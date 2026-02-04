/**
 * New Architecture - Core Generator Module
 * =========================================
 * Template-based workout generation with same interface as legacy buildWorkout.
 * Uses real coach templates from template library.
 */

const { TemplateLibrary } = require('../../src/template-library/core/initial-templates.js');

class WorkoutGenerator {
  constructor() {
    this.library = new TemplateLibrary();
  }

  /**
   * Generate a complete workout matching legacy interface
   * @param {Object} params - Same params as legacy buildWorkout
   * @returns {Object} { text, sections, name, total, poolLen, generatedBy }
   */
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
        sections[mainIdx].body += '\n' + this.createFillerSet(diff);
        sections[mainIdx].sets.push({ structure: this.createFillerSet(diff), distance: diff });
        actualTotal = total;
      }
    }
    
    const textLines = [];
    const cleanSections = [];
    for (const s of sections) {
      textLines.push(`${s.label}:`);
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
      generatedBy: 'new-architecture-v1'
    };
  }

  /**
   * Generate a single set for reroll functionality
   */
  generateSingleSet({ label, targetDistance, poolLen, avoidText, seed }) {
    const wallSafe = poolLen * 2;
    const snapped = this.snapToWallSafe(targetDistance, wallSafe);
    
    let rngState = seed || Date.now();
    const rng = () => {
      rngState = ((rngState * 1103515245 + 12345) >>> 0) % 2147483648;
      return rngState / 2147483648;
    };
    
    const category = this.labelToCategory(label);
    const templates = this.library.getTemplatesMatchingBudget(category, snapped);
    
    const filtered = avoidText 
      ? templates.filter(t => !avoidText.includes(t.structure))
      : templates;
    
    const pool = filtered.length > 0 ? filtered : templates;
    
    if (pool.length === 0) {
      return { structure: this.createFillerSet(snapped), distance: snapped };
    }
    
    const template = pool[Math.floor(rng() * pool.length)];
    const distance = this.snapToWallSafe(template.baseDistance, wallSafe);
    
    return { structure: template.structure, distance };
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
    
    return { warmup, main, cooldown };
  }

  selectTemplatesForSection(category, budget, wallSafe, rng) {
    const selected = [];
    let remaining = budget;
    const maxSets = 3;
    
    const templates = this.library.getTemplatesBySection(category);
    if (!templates || templates.length === 0) {
      selected.push({ structure: `${budget} easy swim`, distance: budget });
      return { selected, actualTotal: budget };
    }
    
    for (let i = 0; i < maxSets && remaining >= wallSafe; i++) {
      const valid = templates.filter(t => {
        const snapped = this.snapToWallSafe(t.baseDistance, wallSafe);
        return snapped > 0 && snapped <= remaining;
      });
      
      if (valid.length === 0) break;
      
      const template = valid[Math.floor(rng() * valid.length)];
      const snapped = this.snapToWallSafe(template.baseDistance, wallSafe);
      
      selected.push({ 
        structure: template.structure, 
        distance: snapped
      });
      remaining -= snapped;
    }
    
    if (remaining >= wallSafe) {
      selected.push({ 
        structure: this.createFillerSet(remaining), 
        distance: remaining 
      });
      remaining = 0;
    }
    
    const actualTotal = budget - remaining;
    return { selected, actualTotal };
  }

  createFillerSet(distance) {
    if (distance <= 100) {
      return `${distance} easy swim`;
    } else if (distance <= 200) {
      return `${distance} easy choice`;
    } else if (distance % 100 === 0 && distance <= 800) {
      const reps = distance / 100;
      return `${reps}x100 easy @ 2:00`;
    } else if (distance % 50 === 0 && distance <= 600) {
      const reps = distance / 50;
      return `${reps}x50 easy @ 1:00`;
    }
    return `${distance} easy swim`;
  }

  labelToCategory(label) {
    const l = String(label || '').toLowerCase();
    if (l.includes('warm')) return 'warmup';
    if (l.includes('cool')) return 'cooldown';
    if (l.includes('build')) return 'build';
    if (l.includes('kick')) return 'kick';
    if (l.includes('drill')) return 'drill';
    return 'main';
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

module.exports = { WorkoutGenerator };
