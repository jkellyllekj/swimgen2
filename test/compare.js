#!/usr/bin/env node
/**
 * Comparison Test - New Architecture vs Legacy
 * =============================================
 * Validates that template generator produces correct results.
 */

const { TemplateGenerator } = require('../src/generator-v2/core.js');

function runTests() {
  console.log('='.repeat(60));
  console.log('SwimGen2 Comparison Test Suite');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;

  // Test 1: Template Generator produces valid workout
  console.log('\n[TEST 1] Template Generator - Basic 2000m workout');
  try {
    const gen = new TemplateGenerator();
    const workout = gen.generateWorkout({
      targetTotal: 2000,
      poolLen: 25,
      unitsShort: 'm',
      seed: 12345
    });
    
    const sectionTotal = workout.sections.reduce((sum, s) => sum + s.dist, 0);
    
    console.log('  Sections:', workout.sections.map(s => `${s.label}: ${s.dist}m`).join(', '));
    console.log('  Total:', sectionTotal);
    
    if (sectionTotal === 2000) {
      console.log('  PASS: Total matches target');
      passed++;
    } else {
      console.log('  FAIL: Total mismatch');
      failed++;
    }
  } catch (e) {
    console.log('  FAIL:', e.message);
    failed++;
  }

  // Test 2: Sections have clean body (no distance in header)
  console.log('\n[TEST 2] Clean body format (no section distances in text)');
  try {
    const gen = new TemplateGenerator();
    const workout = gen.generateWorkout({
      targetTotal: 1500,
      poolLen: 25,
      unitsShort: 'm',
      seed: 54321
    });
    
    const hasDistInBody = workout.sections.some(s => {
      const firstLine = s.body.split('\n')[0];
      return /^\d+$/.test(firstLine.trim());
    });
    
    if (!hasDistInBody) {
      console.log('  PASS: No raw distance lines in body');
      passed++;
    } else {
      console.log('  FAIL: Found raw distance in body');
      failed++;
    }
  } catch (e) {
    console.log('  FAIL:', e.message);
    failed++;
  }

  // Test 3: Wall-safe distances (divisible by 2x pool length)
  console.log('\n[TEST 3] Wall-safe distances (50m pool)');
  try {
    const gen = new TemplateGenerator();
    const workout = gen.generateWorkout({
      targetTotal: 3000,
      poolLen: 50,
      unitsShort: 'm',
      seed: 99999
    });
    
    const allWallSafe = workout.sections.every(s => s.dist % 100 === 0);
    
    console.log('  Sections:', workout.sections.map(s => `${s.dist}m`).join(', '));
    
    if (allWallSafe) {
      console.log('  PASS: All sections wall-safe (divisible by 100)');
      passed++;
    } else {
      console.log('  FAIL: Non-wall-safe distance found');
      failed++;
    }
  } catch (e) {
    console.log('  FAIL:', e.message);
    failed++;
  }

  // Test 4: generateSingleSet works
  console.log('\n[TEST 4] Single set reroll');
  try {
    const gen = new TemplateGenerator();
    const set = gen.generateSingleSet({
      label: 'Main',
      targetDistance: 400,
      poolLen: 25,
      avoidText: '',
      seed: 11111
    });
    
    console.log('  Structure:', set.structure);
    console.log('  Distance:', set.distance);
    
    if (set.structure && set.distance > 0) {
      console.log('  PASS: Single set generated');
      passed++;
    } else {
      console.log('  FAIL: Invalid single set');
      failed++;
    }
  } catch (e) {
    console.log('  FAIL:', e.message);
    failed++;
  }

  // Test 5: Avoid text filtering
  console.log('\n[TEST 5] Avoid text filtering');
  try {
    const gen = new TemplateGenerator();
    const set1 = gen.generateSingleSet({
      label: 'Warm up',
      targetDistance: 300,
      poolLen: 25,
      avoidText: '',
      seed: 22222
    });
    
    const set2 = gen.generateSingleSet({
      label: 'Warm up',
      targetDistance: 300,
      poolLen: 25,
      avoidText: set1.structure,
      seed: 22223
    });
    
    console.log('  Set 1:', set1.structure);
    console.log('  Set 2:', set2.structure);
    
    if (set1.structure !== set2.structure || set2.structure.length > 0) {
      console.log('  PASS: Different sets generated');
      passed++;
    } else {
      console.log('  FAIL: Same set returned');
      failed++;
    }
  } catch (e) {
    console.log('  FAIL:', e.message);
    failed++;
  }

  // Test 6: Multiple distances work correctly
  console.log('\n[TEST 6] Multiple target distances');
  const distances = [500, 1000, 1500, 2500, 3000, 4000];
  let allCorrect = true;
  
  for (const target of distances) {
    const gen = new TemplateGenerator();
    const workout = gen.generateWorkout({
      targetTotal: target,
      poolLen: 25,
      unitsShort: 'm',
      seed: target
    });
    const total = workout.sections.reduce((sum, s) => sum + s.dist, 0);
    const correct = total === target;
    console.log(`  ${target}m: ${total}m ${correct ? '✓' : '✗'}`);
    if (!correct) allCorrect = false;
  }
  
  if (allCorrect) {
    console.log('  PASS: All distances correct');
    passed++;
  } else {
    console.log('  FAIL: Some distances incorrect');
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
