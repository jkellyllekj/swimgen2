/**
 * data/preferences.js - User settings and preferences
 * Extracted from legacy-index.js
 */

// Default user preferences
const DEFAULT_PREFERENCES = {
  version: '1.0',
  core: {
    distance: 2000,
    poolLength: '25m',
  },
  strokes: {
    freestyleBias: 70,
    backstrokeBias: 10,
    breaststrokeBias: 10,
    butterflyBias: 10,
  },
  equipment: {
    pullBuoy: false,
    fins: false,
    paddles: false,
    snorkel: false,
  },
  pace: {
    cssTime: '',
    intervalStyle: '',
    restPeriod: 0,
  },
  preferences: {
    showTimeEstimates: true,
    autoCalculateIntervals: true,
  }
};

/**
 * Get default preferences
 */
function getDefaultPreferences() {
  return { ...DEFAULT_PREFERENCES };
}

/**
 * Validate preferences object
 */
function validatePreferences(prefs) {
  if (!prefs || typeof prefs !== 'object') {
    return getDefaultPreferences();
  }
  
  // Ensure all required sections exist
  const validated = { ...getDefaultPreferences() };
  
  if (prefs.version) validated.version = prefs.version;
  if (prefs.core) validated.core = { ...validated.core, ...prefs.core };
  if (prefs.strokes) validated.strokes = { ...validated.strokes, ...prefs.strokes };
  if (prefs.equipment) validated.equipment = { ...validated.equipment, ...prefs.equipment };
  if (prefs.pace) validated.pace = { ...validated.pace, ...prefs.pace };
  if (prefs.preferences) validated.preferences = { ...validated.preferences, ...prefs.preferences };
  
  return validated;
}

/**
 * Parse pool length string to numeric value
 */
function parsePoolLength(poolLengthStr, customPoolLength, poolLengthUnit) {
  if (poolLengthStr === 'custom') {
    const custom = Number(customPoolLength);
    return Number.isFinite(custom) && custom > 0 ? custom : 25;
  }
  
  switch (poolLengthStr) {
    case '25m': return 25;
    case '50m': return 50;
    case '25yd': return 22.86; // 25 yards in meters
    default: return 25;
  }
}

/**
 * Get units short label
 */
function getUnitsShort(poolLengthStr, poolLengthUnit) {
  if (poolLengthStr === 'custom') {
    return poolLengthUnit === 'yards' ? 'yd' : 'm';
  }
  return poolLengthStr === '25yd' ? 'yd' : 'm';
}

module.exports = {
  DEFAULT_PREFERENCES,
  getDefaultPreferences,
  validatePreferences,
  parsePoolLength,
  getUnitsShort
};
