# SwimGen2 Research Pipeline

This directory contains tools for collecting and analyzing real swim workouts.

## IMPORTANT
- These tools run SEPARATELY from the working app
- They do NOT modify index.js or any app code
- Research findings will inform gradual improvements

## Directory Structure:
- `collectors/` - Scripts to collect real workouts from public sources
- `analysis/` - Tools to analyze patterns and popularity
- `outputs/` - Research findings and data

## Usage:
```bash
node collectors/usms-collector.js
node analysis/pattern-finder.js
```

## Data Sources:
- USMS workout library (public)
- SwimSwam Workout Wednesday archive
- Public coach blogs
- Team training logs (public)

## Output Files:
- `outputs/collected-workouts.json` - Raw collected workouts
- `outputs/top-500-patterns.json` - Most common set patterns
