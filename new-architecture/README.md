# New Architecture

Modular rebuild of SwimGen2 alongside the working legacy app.

## Directory Structure

```
new-architecture/
  core/
    generator.js      # Template-based workout generation
  ui/
    WorkoutCard.js    # Card rendering component
    GestureHandler.js # Touch/swipe gesture handling
    EditModal.js      # Set editing modal
  tools/
    catalog-builder.js # Collect/analyze real workouts
  catalog/
    sets.json         # Generated template data
  index.js            # Main entry point
```

## Migration Strategy

1. **Current State**: Legacy `index.js` (7,300 lines) continues working
2. **New modules**: Built and tested alongside legacy
3. **Comparison tests**: Verify new modules match legacy behavior
4. **Gradual replacement**: Swap one piece at a time
5. **Always working**: App functions at every step

## Usage

### Generator
```javascript
const { WorkoutGenerator } = require('./new-architecture');
const gen = new WorkoutGenerator();
const workout = gen.generateWorkout({
  targetTotal: 2000,
  poolLen: 25,
  unitsShort: 'm',
  seed: Date.now()
});
```

### Catalog Builder
```javascript
const { CatalogBuilder } = require('./new-architecture');
const builder = new CatalogBuilder();
builder.importBatch([
  { text: '10x100 @ 1:40', category: 'main', effort: 'orange' }
]);
builder.analyzeAll();
builder.save();
```

## Testing

Run comparison test:
```bash
node test/compare.js
```

## Next Steps

1. Wire `/reroll-set` to use new generator
2. Expand template library to 200+ sets
3. Extract more UI components
4. Remove legacy code when validated
