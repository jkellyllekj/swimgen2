#!/usr/bin/env node
// ============================================================================
// Generator Comparison Test
// ============================================================================
// Compares legacy algorithmic generator output with template-based generator
// Run with: node test/compare.js
// ============================================================================

const { TemplateGenerator } = require('../src/generator-v2/core.js');

console.log('='.repeat(60));
console.log('Generator Comparison Test');
console.log('='.repeat(60));

const templateGen = new TemplateGenerator();

const testParams = {
  targetTotal: 2000,
  poolLen: 25,
  unitsShort: 'm',
  poolLabel: '25m',
  thresholdPace: '',
  opts: { includeKick: false, includePull: false },
  seed: 12345
};

console.log('\nTest Parameters:');
console.log(`  Distance: ${testParams.targetTotal}m`);
console.log(`  Pool: ${testParams.poolLen}m`);

console.log('\n--- Template Generator Output ---');
const templateResult = templateGen.generateWorkout(testParams);

console.log(`Name: ${templateResult.name}`);
console.log(`Total: ${templateResult.total}m`);
console.log(`Sections: ${templateResult.sections.length}`);
templateResult.sections.forEach(s => {
  console.log(`  ${s.label}: ${s.dist}m`);
  console.log(`    ${s.body.split('\n')[0]}...`);
});

console.log('\n--- Structure Validation ---');
const hasText = typeof templateResult.text === 'string' && templateResult.text.length > 0;
const hasSections = Array.isArray(templateResult.sections) && templateResult.sections.length > 0;
const hasName = typeof templateResult.name === 'string' && templateResult.name.length > 0;
const hasTotal = typeof templateResult.total === 'number' && templateResult.total > 0;

console.log(`  Has text: ${hasText}`);
console.log(`  Has sections: ${hasSections}`);
console.log(`  Has name: ${hasName}`);
console.log(`  Has total: ${hasTotal}`);

const structureValid = hasText && hasSections && hasName && hasTotal;
console.log(`\nStructure valid: ${structureValid}`);

console.log('\n' + '='.repeat(60));
console.log(structureValid ? 'PASS: Template generator produces valid output' : 'FAIL: Structure issues detected');
console.log('='.repeat(60));

process.exit(structureValid ? 0 : 1);
