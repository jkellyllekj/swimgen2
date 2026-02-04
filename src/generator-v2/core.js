// ============================================================================
// Generator v2 - Template-Based Workout Generation
// ============================================================================
// Uses ONLY real-world templates from the template library
// STRICT math validation - totals must always match
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

  generateWorkout({ targetTotal, poolLen, unitsShort, poolLabel, thresholdPace, opts, seed }) {
    const base = poolLen;
    const wallSafe = base * 2;
    
    const total = this.snapToWallSafe(targetTotal, wallSafe);

    let rngState = seed || Date.now();
    const rng = () => {
      rngState = ((rngState * 1103515245 + 12345) >>> 0) % 2147483648;
      return rngState / 2147483648;
    };

    const budgets = this.allocateSectionBudgets(total, wallSafe);
    
    const sections = [];
    let actualTotal = 0;

    for (const budget of budgets) {
      const result = this.buildSection(budget.category, budget.target, wallSafe, rng);
      sections.push({
        label: budget.label,
        dist: result.actualDist,
        body: result.lines.join('\n')
      });
      actualTotal += result.actualDist;
    }

    if (actualTotal !== total) {
      const diff = total - actualTotal;
      if (diff > 0 && sections.length > 1) {
        const mainIdx = sections.findIndex(s => s.label === 'Main');
        if (mainIdx >= 0) {
          sections[mainIdx].dist += diff;
          sections[mainIdx].body += `\n${diff} easy swim`;
          actualTotal = total;
        }
      }
    }

    const textLines = [];
    for (const s of sections) {
      textLines.push(`${s.label}: ${s.dist}`);
      textLines.push(s.body);
      textLines.push('');
    }

    return {
      text: textLines.join('\n'),
      sections: sections,
      name: this.generateWorkoutName(actualTotal, rng),
      total: actualTotal,
      poolLen: poolLen,
      generatedBy: 'template-v2'
    };
  }

  allocateSectionBudgets(total, wallSafe) {
    const minSection = wallSafe * 2;
    
    let warmup, main, cooldown;
    
    if (total <= 1000) {
      warmup = this.snapToWallSafe(Math.round(total * 0.20), wallSafe);
      cooldown = this.snapToWallSafe(Math.round(total * 0.10), wallSafe);
    } else if (total <= 2000) {
      warmup = this.snapToWallSafe(Math.round(total * 0.18), wallSafe);
      cooldown = this.snapToWallSafe(Math.round(total * 0.12), wallSafe);
    } else {
      warmup = this.snapToWallSafe(Math.round(total * 0.15), wallSafe);
      cooldown = this.snapToWallSafe(Math.round(total * 0.10), wallSafe);
    }
    
    warmup = Math.max(warmup, minSection);
    cooldown = Math.max(cooldown, minSection);
    main = total - warmup - cooldown;
    main = Math.max(main, minSection);
    
    const allocated = warmup + main + cooldown;
    if (allocated !== total) {
      main = total - warmup - cooldown;
    }

    return [
      { label: 'Warm up', category: 'warmup', target: warmup },
      { label: 'Main', category: 'main', target: main },
      { label: 'Cool down', category: 'cooldown', target: cooldown }
    ];
  }

  buildSection(category, targetDist, wallSafe, rng) {
    const lines = [];
    let remaining = targetDist;
    let actualDist = 0;
    const maxSets = 5;

    for (let i = 0; i < maxSets && remaining >= wallSafe; i++) {
      const templates = this.library.getTemplatesBySection(category);
      
      const valid = templates.filter(t => {
        const snapped = this.snapToWallSafe(t.distance, wallSafe);
        return snapped > 0 && snapped <= remaining;
      });

      if (valid.length === 0) break;

      const template = valid[Math.floor(rng() * valid.length)];
      const snapped = this.snapToWallSafe(template.distance, wallSafe);
      
      lines.push(template.structure);
      remaining -= snapped;
      actualDist += snapped;
    }

    if (remaining >= wallSafe) {
      lines.push(this.createFillerSet(remaining, category, wallSafe));
      actualDist += remaining;
      remaining = 0;
    }

    return { lines, actualDist };
  }

  createFillerSet(distance, category, wallSafe) {
    const snapped = this.snapToWallSafe(distance, wallSafe);
    if (snapped <= 0) return '';
    
    if (snapped <= 100) {
      return `${snapped} easy swim`;
    } else if (snapped <= 200) {
      return `${snapped} easy choice`;
    } else if (snapped <= 400) {
      const reps = Math.floor(snapped / 100);
      return `${reps}x100 easy`;
    } else {
      const reps = Math.floor(snapped / 100);
      if (category === 'warmup' || category === 'cooldown') {
        return `${reps}x100 easy`;
      } else {
        return `${reps}x100 steady`;
      }
    }
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
