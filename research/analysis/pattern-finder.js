// Pattern Finder - analyzes collected workouts for common patterns
// Runs separately, does NOT touch the working app

const fs = require('fs');
const path = require('path');

class PatternFinder {
  constructor() {
    this.workouts = [];
    this.patterns = {};
  }
  
  loadWorkouts() {
    const filePath = path.join(__dirname, '../outputs/collected-workouts.json');
    if (fs.existsSync(filePath)) {
      this.workouts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  }
  
  findCommonPatterns() {
    console.log(`Analyzing ${this.workouts.length} workouts for patterns...`);
    
    // Group by structure pattern
    const patternCounts = {};
    
    this.workouts.forEach(w => {
      const pattern = this.extractPattern(w.workout);
      if (pattern) {
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      }
    });
    
    // Sort by frequency
    const sortedPatterns = Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 500); // Top 500
    
    this.patterns = sortedPatterns.map(([pattern, count], index) => ({
      id: `pattern-${index + 1}`,
      structure: pattern,
      count: count,
      rank: index + 1
    }));
    
    this.savePatterns();
  }
  
  extractPattern(workoutText) {
    // Extract base pattern (e.g., "10x100 descend" from "10x100 descend 1-4 @ 1:40")
    return workoutText.split('@')[0].trim();
  }
  
  savePatterns() {
    const outputPath = path.join(__dirname, '../outputs/top-500-patterns.json');
    fs.writeFileSync(outputPath, JSON.stringify(this.patterns, null, 2));
    console.log(`Saved ${this.patterns.length} patterns to ${outputPath}`);
  }
}

module.exports = PatternFinder;
