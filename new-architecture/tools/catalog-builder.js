/**
 * New Architecture - Catalog Builder Tool
 * ========================================
 * Collects and analyzes real swim workouts from coaching sources.
 * Generates structured template data for the template library.
 * 
 * DOES NOT touch the running application - runs separately.
 */

const fs = require('fs');
const path = require('path');

class CatalogBuilder {
  constructor() {
    this.rawSets = [];
    this.analyzedPatterns = {};
    this.outputPath = path.join(__dirname, '../catalog/sets.json');
  }

  /**
   * Add a raw set from a coaching source
   * @param {Object} set - { text, source, category, effort }
   */
  addRawSet(set) {
    this.rawSets.push({
      text: set.text,
      source: set.source || 'unknown',
      category: set.category || 'main',
      effort: set.effort || 'moderate',
      addedAt: new Date().toISOString()
    });
  }

  /**
   * Batch import sets from an array
   */
  importBatch(sets) {
    for (const set of sets) {
      this.addRawSet(set);
    }
    console.log(`Imported ${sets.length} sets`);
  }

  /**
   * Analyze a set text and extract structure
   */
  analyzeSet(text) {
    const result = {
      original: text,
      structure: null,
      baseDistance: 0,
      reps: 1,
      repDistance: 0,
      hasInterval: false,
      interval: null
    };

    const nxdMatch = text.match(/(\d+)\s*x\s*(\d+)/i);
    if (nxdMatch) {
      result.reps = parseInt(nxdMatch[1]);
      result.repDistance = parseInt(nxdMatch[2]);
      result.baseDistance = result.reps * result.repDistance;
      result.structure = `${result.reps}x${result.repDistance}`;
    } else {
      const distMatch = text.match(/^(\d+)/);
      if (distMatch) {
        result.baseDistance = parseInt(distMatch[1]);
        result.structure = `${result.baseDistance}`;
      }
    }

    const intervalMatch = text.match(/@\s*([\d:]+)/);
    if (intervalMatch) {
      result.hasInterval = true;
      result.interval = intervalMatch[1];
    }

    return result;
  }

  /**
   * Analyze all raw sets and extract patterns
   */
  analyzeAll() {
    this.analyzedPatterns = {
      warmup: [],
      build: [],
      kick: [],
      drill: [],
      main: [],
      cooldown: []
    };

    for (const set of this.rawSets) {
      const analysis = this.analyzeSet(set.text);
      const category = set.category;

      if (this.analyzedPatterns[category]) {
        this.analyzedPatterns[category].push({
          id: `${category.toUpperCase()[0]}${String(this.analyzedPatterns[category].length + 1).padStart(3, '0')}`,
          structure: set.text,
          baseDistance: analysis.baseDistance,
          effort: set.effort,
          source: set.source,
          analysis
        });
      }
    }

    return this.analyzedPatterns;
  }

  /**
   * Generate template library format output
   */
  generateTemplateOutput() {
    const output = {};
    
    for (const [category, sets] of Object.entries(this.analyzedPatterns)) {
      output[category] = sets.map(s => ({
        id: s.id,
        structure: s.structure,
        baseDistance: s.baseDistance,
        effort: s.effort
      }));
    }

    return output;
  }

  /**
   * Save analyzed patterns to file
   */
  save() {
    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const output = this.generateTemplateOutput();
    fs.writeFileSync(this.outputPath, JSON.stringify(output, null, 2));
    console.log(`Saved ${this.rawSets.length} sets to ${this.outputPath}`);
    return output;
  }

  /**
   * Get statistics about the catalog
   */
  getStats() {
    const stats = {
      total: this.rawSets.length,
      byCategory: {},
      bySource: {}
    };

    for (const set of this.rawSets) {
      stats.byCategory[set.category] = (stats.byCategory[set.category] || 0) + 1;
      stats.bySource[set.source] = (stats.bySource[set.source] || 0) + 1;
    }

    return stats;
  }
}

/**
 * Example usage - import real coach sets
 */
function exampleImport() {
  const builder = new CatalogBuilder();

  builder.importBatch([
    { text: '4x100 easy @ 2:00', category: 'warmup', effort: 'blue', source: 'coach-manual' },
    { text: '6x50 build @ 1:00', category: 'warmup', effort: 'green', source: 'coach-manual' },
    { text: '300: 100 free, 100 back, 100 free', category: 'warmup', effort: 'blue', source: 'coach-manual' },
    { text: '10x100 descend 1-4 @ 1:40', category: 'main', effort: 'gradient', source: 'coach-manual' },
    { text: '5x200 pull @ 3:30', category: 'main', effort: 'orange', source: 'coach-manual' },
    { text: '16x50 sprint @ :45', category: 'main', effort: 'red', source: 'coach-manual' },
    { text: '200 easy swim', category: 'cooldown', effort: 'blue', source: 'coach-manual' },
    { text: '4x50 easy @ 1:00', category: 'cooldown', effort: 'blue', source: 'coach-manual' },
  ]);

  const patterns = builder.analyzeAll();
  console.log('Stats:', builder.getStats());
  
  return builder;
}

module.exports = { CatalogBuilder, exampleImport };
