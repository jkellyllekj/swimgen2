/**
 * New Architecture - WorkoutCard Component
 * =========================================
 * Extracted from legacy index.js renderCards function.
 * Renders individual workout set cards with zone-based colors.
 */

const WorkoutCard = {
  /**
   * Render a single workout card
   * @param {Object} section - { label, body, dist }
   * @param {Object} options - { idx, unitShort, paceSec, textColor }
   * @returns {string} HTML string
   */
  render(section, options) {
    const { idx, unitShort, paceSec } = options;
    
    const label = section.label || `Set ${idx}`;
    const body = section.body || '';
    const setDist = section.dist || this.computeDistance(body);
    
    const effortLevel = this.getEffortLevel(label, body);
    const variantSeed = idx * 7 + body.length;
    const boxStyle = this.getBoxStyle(effortLevel, variantSeed);
    const textColor = effortLevel === 'fullgas' ? '#fff' : '#111';
    
    const dropShadow = "0 6px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.25)";
    const distColor = textColor === '#fff' ? '#99ccff' : '#0055aa';
    
    return `
      <div data-effort="${effortLevel}" data-index="${idx - 1}" 
           style="${boxStyle} box-shadow:${dropShadow}; border-radius:12px; padding:12px;">
        <div class="setHeaderRow">
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; color:${textColor}; margin-bottom:6px;">${this.escape(label)}</div>
            <div data-set-body="${idx}" data-original-body="${this.escape(body)}" 
                 style="white-space:pre-wrap; line-height:1.35; font-weight:600; color:${textColor};">
              ${this.escape(body)}
            </div>
          </div>
          <div class="setRightCol">
            <button type="button" data-reroll-set="${idx}" 
                    style="padding:0; border-radius:8px; border:none; background:transparent; cursor:pointer;" 
                    title="Reroll this set">
              <span class="reroll-dolphin setDolphin">
                <img class="dolphinIcon setDolphinSpinTarget" src="/assets/dolphins/dolphin-base.png" alt="">
              </span>
            </button>
            ${Number.isFinite(setDist) ? `<div class="setMeters" style="font-size:14px; color:${distColor};">${setDist}${unitShort}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Get effort level from label and body text
   */
  getEffortLevel(label, body) {
    const text = (label + ' ' + body).toLowerCase();
    
    if (text.includes('all out') || text.includes('race pace') || text.includes('full gas')) {
      return 'fullgas';
    }
    if (text.includes('sprint') || text.includes('fast') || text.includes('hard')) {
      return 'hard';
    }
    if (text.includes('strong') || text.includes('threshold')) {
      return 'strong';
    }
    if (text.includes('moderate') || text.includes('steady')) {
      return 'moderate';
    }
    if (text.includes('warm') || text.includes('cool') || text.includes('easy')) {
      return 'easy';
    }
    return 'moderate';
  },

  /**
   * Get CSS style for effort level
   */
  getBoxStyle(effort, seed) {
    const colors = {
      easy: ['#e3f2fd', '#bbdefb', '#90caf9'],
      moderate: ['#e8f5e9', '#c8e6c9', '#a5d6a7'],
      strong: ['#fff8e1', '#ffecb3', '#ffe082'],
      hard: ['#fff3e0', '#ffe0b2', '#ffcc80'],
      fullgas: ['#ffebee', '#ffcdd2', '#ef9a9a']
    };
    
    const palette = colors[effort] || colors.moderate;
    const bg = palette[seed % palette.length];
    
    return `background:${bg}; border:none;`;
  },

  /**
   * Compute distance from body text
   */
  computeDistance(body) {
    let total = 0;
    const lines = String(body).split('\n');
    
    for (const line of lines) {
      const nxd = line.match(/(\d+)\s*x\s*(\d+)/i);
      if (nxd) {
        total += parseInt(nxd[1]) * parseInt(nxd[2]);
        continue;
      }
      
      const single = line.match(/^(\d+)/);
      if (single) {
        total += parseInt(single[1]);
      }
    }
    
    return total || null;
  },

  /**
   * HTML escape helper
   */
  escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

module.exports = { WorkoutCard };
