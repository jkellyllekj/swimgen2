/**
 * SwimGen2 Modular v2 - Main Orchestrator
 * 
 * This file loads all modules and initializes the Express server.
 * Maintains identical behavior to legacy-index.js while using modular architecture.
 */

// Import core modules
const mathUtils = require('./utils/math');
const poolUtils = require('./utils/pool-utils');
const validator = require('./core/validator');
const patterns = require('./core/patterns');
const generator = require('./core/generator');
const workoutStore = require('./data/workout-store');
const preferences = require('./data/preferences');

// Re-export for legacy compatibility
const {
  snapToPoolMultipleShared,
  snapRepDistToPool,
  snapToPoolMultiple,
  snapRepDist,
  fnv1a32,
  shuffleWithSeed
} = mathUtils;

const {
  SECTION_TARGET_BUCKETS,
  SECTION_MIN_DIST,
  resolveSectionTarget,
  snapSection,
  normalizeSectionKey,
  applySectionMinimums
} = poolUtils;

const {
  isAllowedRepCount,
  endsAtHomeEnd,
  isValidWarmupCoolLine,
  isValidDrillLine,
  isValidKickLine,
  pickEvenRepScheme
} = validator;

const {
  V1_BASE_SET_CATALOGUE,
  SECTION_TEMPLATES,
  pickV1CatalogueBody,
  pickTemplate
} = patterns;

const { buildOneSetBodyShared } = generator;

console.log('SwimGen2 Modular v2 - Loading modules...');
console.log('  - Math utilities loaded');
console.log('  - Pool utilities loaded');
console.log('  - Validator loaded');
console.log('  - Patterns loaded');
console.log('  - Generator loaded');
console.log('  - Data modules loaded');

// Load the full Express server from legacy code for now
// This maintains backward compatibility while modules are extracted
console.log('SwimGen2 Modular v2 - Starting server with legacy routes...');

// Load legacy server (this contains Express server, routes, and full UI)
require('./legacy-index.js');

console.log('SwimGen2 Modular v2 - Fully loaded!');

// Export modules for testing and external use
module.exports = {
  // Utils
  mathUtils,
  poolUtils,
  
  // Core
  validator,
  patterns,
  generator,
  
  // Data
  workoutStore,
  preferences,
  
  // Legacy compatibility exports
  snapToPoolMultipleShared,
  snapRepDistToPool,
  snapToPoolMultiple,
  snapRepDist,
  fnv1a32,
  shuffleWithSeed,
  SECTION_TARGET_BUCKETS,
  SECTION_MIN_DIST,
  resolveSectionTarget,
  snapSection,
  normalizeSectionKey,
  applySectionMinimums,
  isAllowedRepCount,
  endsAtHomeEnd,
  isValidWarmupCoolLine,
  isValidDrillLine,
  isValidKickLine,
  pickEvenRepScheme,
  V1_BASE_SET_CATALOGUE,
  SECTION_TEMPLATES,
  pickV1CatalogueBody,
  pickTemplate,
  buildOneSetBodyShared
};
