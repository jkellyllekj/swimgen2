#!/usr/bin/env node
// ============================================================================
// Import Initial Templates into Template Library
// ============================================================================
// Run with: node scripts/import-initial-templates.js
// Current batch: 125 validated templates
// Target: Scale to 1000+ validated templates
// ============================================================================

const { TemplateImportPipeline } = require('../src/template-library/import-pipeline.js');
const { TEMPLATE_LIBRARY, TemplateLibrary } = require('../src/template-library/core/initial-templates.js');

console.log('='.repeat(60));
console.log('SwimGen2 Template Import');
console.log('='.repeat(60));

// Create import pipeline
const pipeline = new TemplateImportPipeline();

// Get initial batch of validated sets
const initialBatch = pipeline.getInitialBatch();
console.log(`\nLoaded ${initialBatch.length} validated templates from pipeline...`);

// Import into library
const result = pipeline.importBatch(initialBatch, TEMPLATE_LIBRARY);

// Create library instance to get stats
const library = new TemplateLibrary();

console.log('\n' + '='.repeat(60));
console.log('IMPORT COMPLETE');
console.log('='.repeat(60));
console.log(`\nLibrary Statistics:`);
const stats = library.getStats();
console.log(`  Warmup:   ${stats.warmup} sets`);
console.log(`  Build:    ${stats.build} sets`);
console.log(`  Kick:     ${stats.kick} sets`);
console.log(`  Drill:    ${stats.drill} sets`);
console.log(`  Main:     ${stats.main} sets`);
console.log(`  Cooldown: ${stats.cooldown} sets`);
console.log(`  ─────────────────────`);
console.log(`  TOTAL:    ${stats.total} sets`);
console.log(`  TARGET:   1000+ sets`);

console.log(`\nPipeline Stats:`);
const pipelineStats = pipeline.getStats();
console.log(`  Imported: ${pipelineStats.imported}`);
console.log(`  Rejected: ${pipelineStats.rejected}`);

console.log('\n' + '='.repeat(60));
console.log('Ready for template-based generation!');
console.log('Next: Add more templates via JSON import or batch expansion');
console.log('='.repeat(60));

// Test random selection
console.log('\nSample random selections:');
['warmup', 'main', 'cooldown'].forEach(section => {
  const template = library.selectWeightedRandom(section, 500);
  if (template) {
    console.log(`  ${section}: "${template.name}" (${template.distance}m)`);
  }
});

module.exports = { library, stats };
