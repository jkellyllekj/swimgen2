/**
 * New Architecture - Main Entry Point
 * ====================================
 * Orchestrates the modular components.
 * Provides same interface as legacy for gradual migration.
 */

const { WorkoutGenerator } = require('./core/generator.js');
const { WorkoutCard } = require('./ui/WorkoutCard.js');
const { GestureHandler } = require('./ui/GestureHandler.js');
const { EditModal } = require('./ui/EditModal.js');
const { CatalogBuilder } = require('./tools/catalog-builder.js');

module.exports = {
  WorkoutGenerator,
  WorkoutCard,
  GestureHandler,
  EditModal,
  CatalogBuilder
};
