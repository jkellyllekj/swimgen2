// ============================================================================
// Real Coach Templates - Complete Swim Sets
// ============================================================================
// Each template is a complete, coherent set from real coaching practice.
// Uses baseDistance for math calculations, structure for display.
// ============================================================================

const REAL_TEMPLATES = {
  warmup: [
    { id: 'W001', structure: '300: 100 free, 100 back, 100 free', baseDistance: 300, effort: 'blue' },
    { id: 'W002', structure: '400: 200 swim, 100 kick, 100 swim', baseDistance: 400, effort: 'blue' },
    { id: 'W003', structure: '500: 200 easy, 200 moderate, 100 strong', baseDistance: 500, effort: 'green' },
    { id: 'W004', structure: '200 easy swim', baseDistance: 200, effort: 'blue' },
    { id: 'W005', structure: '6x50 build @ 1:00', baseDistance: 300, effort: 'green' },
    { id: 'W006', structure: '4x100 easy @ 2:00', baseDistance: 400, effort: 'blue' },
    { id: 'W007', structure: '8x25 drill @ :40', baseDistance: 200, effort: 'blue' },
    { id: 'W008', structure: '300 IM easy', baseDistance: 300, effort: 'blue' },
    { id: 'W009', structure: '600 steady freestyle', baseDistance: 600, effort: 'blue' },
    { id: 'W010', structure: '4x75 swim/kick @ 1:30', baseDistance: 300, effort: 'blue' },
    { id: 'W011', structure: '100 easy choice', baseDistance: 100, effort: 'blue' },
    { id: 'W012', structure: '150 easy swim', baseDistance: 150, effort: 'blue' },
    { id: 'W013', structure: '250 easy choice', baseDistance: 250, effort: 'blue' },
    { id: 'W014', structure: '350: 200 free, 150 back', baseDistance: 350, effort: 'blue' },
    { id: 'W015', structure: '450: 200 free, 150 kick, 100 back', baseDistance: 450, effort: 'blue' }
  ],
  
  main: [
    { id: 'M001', structure: '10x100 descend 1-4 @ 1:40', baseDistance: 1000, effort: 'gradient' },
    { id: 'M002', structure: '5x200 pull @ 3:30', baseDistance: 1000, effort: 'orange' },
    { id: 'M003', structure: '16x50 sprint @ :45', baseDistance: 800, effort: 'red' },
    { id: 'M004', structure: '8x100 strong @ 1:30', baseDistance: 800, effort: 'orange' },
    { id: 'M005', structure: '20x50 odds fast, evens easy @ :50', baseDistance: 1000, effort: 'gradient' },
    { id: 'M006', structure: '4x200 threshold @ 3:00', baseDistance: 800, effort: 'orange' },
    { id: 'M007', structure: '6x150 build each @ 2:30', baseDistance: 900, effort: 'green' },
    { id: 'M008', structure: '12x75 fast @ 1:15', baseDistance: 900, effort: 'orange' },
    { id: 'M009', structure: '3x300 steady @ 5:00', baseDistance: 900, effort: 'green' },
    { id: 'M010', structure: '5x100 race pace @ 2:00', baseDistance: 500, effort: 'red' },
    { id: 'M011', structure: '8x125 pull @ 2:00', baseDistance: 1000, effort: 'orange' },
    { id: 'M012', structure: '4x250 negative split @ 4:00', baseDistance: 1000, effort: 'gradient' },
    { id: 'M013', structure: '10x50 all out @ 1:00', baseDistance: 500, effort: 'red' },
    { id: 'M014', structure: '6x100 IM order @ 1:45', baseDistance: 600, effort: 'orange' },
    { id: 'M015', structure: '15x100 steady @ 1:45', baseDistance: 1500, effort: 'green' },
    { id: 'M016', structure: '400 steady swim', baseDistance: 400, effort: 'green' },
    { id: 'M017', structure: '500 moderate freestyle', baseDistance: 500, effort: 'green' },
    { id: 'M018', structure: '600 strong swim', baseDistance: 600, effort: 'orange' },
    { id: 'M019', structure: '3x200 build @ 3:00', baseDistance: 600, effort: 'green' },
    { id: 'M020', structure: '4x150 steady @ 2:30', baseDistance: 600, effort: 'green' },
    { id: 'M021', structure: '6x100 moderate @ 1:40', baseDistance: 600, effort: 'green' },
    { id: 'M022', structure: '8x75 strong @ 1:20', baseDistance: 600, effort: 'orange' },
    { id: 'M023', structure: '12x50 fast @ :50', baseDistance: 600, effort: 'orange' },
    { id: 'M024', structure: '2x400 steady @ 6:00', baseDistance: 800, effort: 'green' },
    { id: 'M025', structure: '4x100 fast @ 1:45', baseDistance: 400, effort: 'orange' },
    { id: 'M026', structure: '300 strong swim', baseDistance: 300, effort: 'orange' },
    { id: 'M027', structure: '200 fast swim', baseDistance: 200, effort: 'red' },
    { id: 'M028', structure: '250 moderate swim', baseDistance: 250, effort: 'green' },
    { id: 'M029', structure: '350 steady swim', baseDistance: 350, effort: 'green' },
    { id: 'M030', structure: '2x150 strong @ 2:30', baseDistance: 300, effort: 'orange' }
  ],
  
  cooldown: [
    { id: 'C001', structure: '200 easy swim', baseDistance: 200, effort: 'blue' },
    { id: 'C002', structure: '300 easy choice', baseDistance: 300, effort: 'blue' },
    { id: 'C003', structure: '4x50 easy @ 1:00', baseDistance: 200, effort: 'blue' },
    { id: 'C004', structure: '100 easy backstroke', baseDistance: 100, effort: 'blue' },
    { id: 'C005', structure: '200 IM easy', baseDistance: 200, effort: 'blue' },
    { id: 'C006', structure: '400: 200 free, 100 back, 100 choice', baseDistance: 400, effort: 'blue' },
    { id: 'C007', structure: '8x25 easy @ :30', baseDistance: 200, effort: 'blue' },
    { id: 'C008', structure: '150 easy swim', baseDistance: 150, effort: 'blue' },
    { id: 'C009', structure: '250 easy choice', baseDistance: 250, effort: 'blue' },
    { id: 'C010', structure: '350: 200 easy, 150 choice', baseDistance: 350, effort: 'blue' }
  ]
};

const TEMPLATE_LIBRARY = {
  warmup: [...REAL_TEMPLATES.warmup],
  main: [...REAL_TEMPLATES.main],
  cooldown: [...REAL_TEMPLATES.cooldown],
  build: [],
  kick: [],
  drill: []
};

class TemplateLibrary {
  constructor() {
    this.templates = TEMPLATE_LIBRARY;
  }

  getTemplatesBySection(category) {
    return this.templates[category] || [];
  }

  getTemplatesMatchingBudget(category, maxDistance) {
    const templates = this.templates[category] || [];
    return templates.filter(t => t.baseDistance <= maxDistance);
  }
}

module.exports = { TemplateLibrary, TEMPLATE_LIBRARY, REAL_TEMPLATES };
