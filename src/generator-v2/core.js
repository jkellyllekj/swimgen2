// ============================================================================
// Generator v2 - Template-Based Workout Generation
// ============================================================================
// Uses ONLY real-world templates from the template library
// Returns EXACT same structure as legacy buildOneSetBodyServer()
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
    this.generationCount = 0;
  }

  generateWorkout({ targetTotal, poolLen, unitsShort, poolLabel, thresholdPace, opts, seed }) {
    this.generationCount++;
    const base = poolLen;
    
    const rawTotal = this.snapToPoolMultiple(targetTotal, base);
    const lengths = Math.round(rawTotal / base);
    const evenLengths = lengths % 2 === 0 ? lengths : lengths + 1;
    const total = evenLengths * base;

    let rngState = seed || Date.now();
    const seededRng = () => {
      rngState = ((rngState * 1103515245 + 12345) >>> 0) % 2147483648;
      return rngState / 2147483648;
    };

    const minSectionDist = base * 4;
    const sections = [];
    let usedDist = 0;

    const warmDist = Math.max(this.snapToPoolMultiple(Math.round(total * 0.15), base), minSectionDist);
    const coolDist = Math.max(this.snapToPoolMultiple(Math.round(total * 0.10), base), minSectionDist);
    const mainDist = total - warmDist - coolDist;

    sections.push({ label: 'Warm up', dist: warmDist });
    sections.push({ label: 'Main', dist: mainDist });
    sections.push({ label: 'Cool down', dist: coolDist });

    const textLines = [];
    const parsedSections = [];

    for (const section of sections) {
      const sectionKey = this.mapLabelToCategory(section.label);
      const body = this.buildSectionBody(sectionKey, section.dist, base, seededRng);
      
      textLines.push(`${section.label}: ${section.dist}`);
      textLines.push(body);
      textLines.push('');

      parsedSections.push({
        label: section.label,
        dist: section.dist,
        body: body
      });
    }

    const workoutName = this.generateWorkoutName(total, seededRng);

    return {
      text: textLines.join('\n'),
      sections: parsedSections,
      name: workoutName,
      total: total,
      poolLen: poolLen,
      generatedBy: 'template-v2'
    };
  }

  buildSectionBody(category, targetDistance, poolLen, rng) {
    const lines = [];
    let remaining = targetDistance;
    const minDist = poolLen * 2;
    let attempts = 0;
    const maxAttempts = 20;

    while (remaining >= minDist && attempts < maxAttempts) {
      attempts++;
      
      const allTemplates = this.library.getTemplatesBySection(category);
      const validTemplates = allTemplates.filter(t => {
        const snapped = this.snapToPoolMultiple(t.distance, poolLen);
        return snapped > 0 && snapped <= remaining;
      });

      if (validTemplates.length === 0) {
        const fallbackDist = this.snapToPoolMultiple(remaining, poolLen);
        if (fallbackDist >= minDist) {
          lines.push(`${fallbackDist} easy swim`);
          remaining -= fallbackDist;
        }
        break;
      }

      const template = validTemplates[Math.floor(rng() * validTemplates.length)];
      const snappedDist = this.snapToPoolMultiple(template.distance, poolLen);
      
      lines.push(template.structure);
      remaining -= snappedDist;
    }

    if (remaining >= minDist) {
      lines.push(`${remaining} easy swim`);
    }

    return lines.join('\n');
  }

  mapLabelToCategory(label) {
    const lower = label.toLowerCase();
    if (lower.includes('warm')) return 'warmup';
    if (lower.includes('build')) return 'build';
    if (lower.includes('drill')) return 'drill';
    if (lower.includes('kick')) return 'kick';
    if (lower.includes('pull')) return 'main';
    if (lower.includes('main')) return 'main';
    if (lower.includes('cool')) return 'cooldown';
    return 'main';
  }

  snapToPoolMultiple(dist, poolLen) {
    if (!poolLen || poolLen <= 0) return dist;
    const wallSafe = poolLen * 2;
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
