#!/usr/bin/env node
// ============================================================================
// Template Generator - Complete Math Validation
// ============================================================================

const { TemplateGenerator } = require('../src/generator-v2/core.js');

console.log('='.repeat(60));
console.log('Template Generator - Math Validation');
console.log('='.repeat(60));

const generator = new TemplateGenerator();

function parseSetTotal(text) {
  const repMatch = text.match(/^(\d+)x(\d+)/i);
  if (repMatch) {
    return parseInt(repMatch[1], 10) * parseInt(repMatch[2], 10);
  }
  const singleMatch = text.match(/^(\d+)\s+/);
  if (singleMatch) {
    return parseInt(singleMatch[1], 10);
  }
  return 0;
}

function validateWorkout(result, target, poolLen) {
  const errors = [];
  const wallSafe = poolLen * 2;
  
  let actualTotal = 0;
  console.log(`\nSections:`);
  
  for (const section of result.sections) {
    console.log(`  ${section.label}: ${section.dist}m`);
    
    const sets = section.body.split('\n').filter(s => s.trim());
    let sectionSum = 0;
    
    for (const set of sets) {
      const setTotal = parseSetTotal(set);
      const snapped = Math.round(setTotal / wallSafe) * wallSafe;
      console.log(`    - "${set}" = ${snapped}m`);
      sectionSum += snapped;
    }
    
    if (sectionSum !== section.dist) {
      errors.push(`${section.label}: claimed ${section.dist}m but sets sum to ${sectionSum}m`);
    }
    actualTotal += section.dist;
  }
  
  console.log(`\nReported total: ${result.total}m`);
  console.log(`Calculated total: ${actualTotal}m`);
  
  const expectedSnapped = Math.round(target / wallSafe) * wallSafe;
  const tolerance = wallSafe * 2;
  
  if (Math.abs(result.total - expectedSnapped) > tolerance) {
    errors.push(`Total ${result.total}m not within tolerance of target ${target}m`);
  }
  
  if (result.total !== actualTotal) {
    errors.push(`Reported total ${result.total} != section sum ${actualTotal}`);
  }
  
  return errors;
}

const testCases = [
  { total: 1000, pool: 25 },
  { total: 2000, pool: 25 },
  { total: 1500, pool: 50 }
];

let allPassed = true;

for (const test of testCases) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${test.total}m in ${test.pool}m pool`);
  console.log('='.repeat(60));
  
  const result = generator.generateWorkout({
    targetTotal: test.total,
    poolLen: test.pool,
    unitsShort: 'm',
    poolLabel: `${test.pool}m`,
    thresholdPace: '',
    opts: {},
    seed: 12345
  });
  
  const errors = validateWorkout(result, test.total, test.pool);
  
  if (errors.length > 0) {
    console.log(`\nERRORS:`);
    for (const e of errors) {
      console.log(`  - ${e}`);
    }
    console.log(`Result: FAIL`);
    allPassed = false;
  } else {
    console.log(`Result: PASS`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
console.log('='.repeat(60));

process.exit(allPassed ? 0 : 1);
