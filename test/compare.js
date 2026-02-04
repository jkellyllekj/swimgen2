#!/usr/bin/env node
// ============================================================================
// Generator Comparison Test - Math Validation
// ============================================================================
// Verifies template generator produces correct totals
// ============================================================================

const { TemplateGenerator } = require('../src/generator-v2/core.js');

console.log('='.repeat(60));
console.log('Template Generator - Math Validation Test');
console.log('='.repeat(60));

const generator = new TemplateGenerator();

const testCases = [
  { total: 1000, pool: 25, desc: '1000m in 25m pool' },
  { total: 2000, pool: 25, desc: '2000m in 25m pool' },
  { total: 1500, pool: 50, desc: '1500m in 50m pool' }
];

let allPassed = true;

for (const test of testCases) {
  console.log(`\n--- Test: ${test.desc} ---`);
  
  const result = generator.generateWorkout({
    targetTotal: test.total,
    poolLen: test.pool,
    unitsShort: 'm',
    poolLabel: `${test.pool}m`,
    thresholdPace: '',
    opts: {},
    seed: 12345
  });

  let sectionTotal = 0;
  console.log(`Sections:`);
  for (const s of result.sections) {
    console.log(`  ${s.label}: ${s.dist}m`);
    const bodyPreview = s.body.split('\n').slice(0, 2).join('; ');
    console.log(`    Sets: ${bodyPreview}...`);
    sectionTotal += s.dist;
  }
  
  console.log(`\nReported total: ${result.total}m`);
  console.log(`Section sum: ${sectionTotal}m`);
  console.log(`Target: ${test.total}m`);
  
  const wallSafe = test.pool * 2;
  const expectedSnapped = Math.round(test.total / wallSafe) * wallSafe;
  
  const mathCorrect = sectionTotal === result.total;
  const closeToTarget = Math.abs(result.total - expectedSnapped) <= wallSafe;
  const passed = mathCorrect && closeToTarget;
  
  console.log(`Math correct: ${mathCorrect}`);
  console.log(`Close to target: ${closeToTarget}`);
  console.log(`Result: ${passed ? 'PASS' : 'FAIL'}`);
  
  if (!passed) allPassed = false;
}

console.log('\n' + '='.repeat(60));
console.log(allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
console.log('='.repeat(60));

process.exit(allPassed ? 0 : 1);
