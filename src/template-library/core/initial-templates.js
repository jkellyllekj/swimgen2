// ============================================================================
// SwimGen2 Template Library - Thousands of Validated Sets
// ============================================================================
// Target: 1,000+ validated real-world sets
// Continuous collection pipeline foundation
// NO algorithmic invention - real coach templates only
// ============================================================================

const TEMPLATE_LIBRARY = {
  // Metadata for scaling to thousands
  version: '2.0.0',
  targetCount: 1000,
  lastUpdated: '2026-02-04',
  validationStatus: 'human-validated',
  
  // Section arrays - populated by import pipeline
  warmup: [],    // Target: 150+ sets
  build: [],     // Target: 150+ sets  
  kick: [],      // Target: 150+ sets
  drill: [],     // Target: 150+ sets
  main: [],      // Target: 300+ sets
  cooldown: [],  // Target: 100+ sets
  
  // Bulk import method
  importBatch: function(batch) {
    let imported = 0;
    batch.forEach(set => {
      const category = set.category || this._categorize(set);
      if (!this[category]) {
        this[category] = [];
      }
      this[category].push(set);
      imported++;
    });
    console.log(`Imported ${imported} sets. Total: ${this.totalCount()}`);
    return imported;
  },
  
  // Auto-categorize based on content
  _categorize: function(set) {
    const struct = (set.structure || '').toLowerCase();
    const name = (set.name || '').toLowerCase();
    
    if (name.includes('cool') || name.includes('recovery')) return 'cooldown';
    if (name.includes('kick') || struct.includes('kick')) return 'kick';
    if (name.includes('drill') || struct.includes('drill')) return 'drill';
    if (name.includes('build') || struct.includes('build') || struct.includes('descend')) return 'build';
    if (name.includes('warm') || (set.effort === 'blue' && set.distance <= 500)) return 'warmup';
    return 'main';
  },
  
  // Total count across all sections
  totalCount: function() {
    return this.warmup.length + this.build.length + this.kick.length + 
           this.drill.length + this.main.length + this.cooldown.length;
  },
  
  // Get sets for a section
  getSection: function(section) {
    return this[section] || [];
  },
  
  // Get random template from section matching distance
  getRandomTemplate: function(section, targetDistance) {
    const templates = this[section] || [];
    if (templates.length === 0) return null;
    
    // Filter by distance match (within 200m)
    const matching = templates.filter(t => 
      Math.abs(t.distance - targetDistance) < 200
    );
    
    const pool = matching.length > 0 ? matching : templates;
    return pool[Math.floor(Math.random() * pool.length)];
  }
};

// Template access class for advanced queries
class TemplateLibrary {
  constructor() {
    this.templates = TEMPLATE_LIBRARY;
  }
  
  calculateTotal() {
    return this.templates.totalCount();
  }
  
  getTemplateById(id) {
    for (const section of ['warmup', 'build', 'kick', 'drill', 'main', 'cooldown']) {
      const templates = this.templates[section] || [];
      const found = templates.find(t => t.id === id);
      if (found) return { section, ...found };
    }
    return null;
  }
  
  getTemplatesBySection(section, count = 'all') {
    const sectionTemplates = this.templates[section] || [];
    if (count === 'all') return sectionTemplates;
    return sectionTemplates.slice(0, Math.min(count, sectionTemplates.length));
  }
  
  getTemplatesMatchingDistance(section, distance, tolerance = 200) {
    const templates = this.templates[section] || [];
    return templates.filter(t => Math.abs(t.distance - distance) <= tolerance);
  }
  
  selectWeightedRandom(section, targetDistance) {
    return this.templates.getRandomTemplate(section, targetDistance);
  }
  
  addTemplates(section, newTemplates) {
    if (!Array.isArray(this.templates[section])) {
      this.templates[section] = [];
    }
    this.templates[section].push(...newTemplates);
    console.log(`Added ${newTemplates.length} templates to ${section}. Total: ${this.calculateTotal()}`);
  }
  
  getStats() {
    return {
      warmup: this.templates.warmup.length,
      build: this.templates.build.length,
      kick: this.templates.kick.length,
      drill: this.templates.drill.length,
      main: this.templates.main.length,
      cooldown: this.templates.cooldown.length,
      total: this.calculateTotal()
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TEMPLATE_LIBRARY,
    TemplateLibrary
  };
}
