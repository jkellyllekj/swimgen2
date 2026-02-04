/**
 * New Architecture - EditModal Component
 * =======================================
 * Extracted from legacy index.js gesture edit modal.
 * Modal dialog for editing individual workout sets.
 */

const EditModal = {
  currentEditIndex: -1,
  isOpen: false,

  /**
   * Get the modal HTML template
   */
  getTemplate() {
    return `
      <div id="gestureEditModal" class="gesture-modal-overlay" style="display:none;">
        <div class="gesture-modal-content">
          <div class="gesture-modal-header">
            <h3>Edit Set</h3>
            <button id="closeGestureModal" class="gesture-modal-close">&times;</button>
          </div>
          <div class="gesture-modal-body">
            <label>Distance per rep:</label>
            <input type="number" id="modalDistance" class="gesture-form-input" value="100" min="25" step="25">
            
            <label>Number of reps:</label>
            <input type="number" id="modalReps" class="gesture-form-input" value="4" min="1" max="20">
            
            <label>Stroke:</label>
            <select id="modalStroke" class="gesture-form-select">
              <option value="freestyle">Freestyle</option>
              <option value="backstroke">Backstroke</option>
              <option value="breaststroke">Breaststroke</option>
              <option value="butterfly">Butterfly</option>
              <option value="IM">IM</option>
              <option value="choice">Choice</option>
            </select>
            
            <label>Effort:</label>
            <select id="modalEffort" class="gesture-form-select">
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="strong">Strong</option>
              <option value="hard">Hard</option>
              <option value="sprint">Sprint</option>
            </select>
          </div>
          <div class="gesture-modal-actions">
            <button id="modalDeleteBtn" class="gesture-delete-btn">Delete Set</button>
            <button id="modalSaveBtn" class="gesture-save-btn">Save Changes</button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Get the modal CSS styles
   */
  getStyles() {
    return `
      .gesture-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .gesture-modal-content {
        background: white;
        border-radius: 16px;
        padding: 20px;
        width: 90%;
        max-width: 360px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      }
      
      .gesture-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .gesture-modal-header h3 {
        margin: 0;
        font-size: 18px;
      }
      
      .gesture-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      
      .gesture-modal-body label {
        display: block;
        font-weight: 600;
        margin-bottom: 4px;
        margin-top: 12px;
      }
      
      .gesture-modal-body label:first-child {
        margin-top: 0;
      }
      
      .gesture-form-input,
      .gesture-form-select {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 16px;
        box-sizing: border-box;
      }
      
      .gesture-modal-actions {
        display: flex;
        gap: 12px;
        margin-top: 20px;
      }
      
      .gesture-delete-btn {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 8px;
        background: #ffebee;
        color: #c62828;
        font-weight: 600;
        cursor: pointer;
      }
      
      .gesture-save-btn {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 8px;
        background: #1976d2;
        color: white;
        font-weight: 600;
        cursor: pointer;
      }
    `;
  },

  /**
   * Initialize the modal - inject into DOM
   */
  init() {
    if (document.getElementById('gestureEditModal')) return;
    
    const container = document.createElement('div');
    container.innerHTML = this.getTemplate();
    document.body.appendChild(container.firstElementChild);
    
    const style = document.createElement('style');
    style.textContent = this.getStyles();
    document.head.appendChild(style);
    
    this.attachListeners();
  },

  /**
   * Attach event listeners
   */
  attachListeners() {
    const modal = document.getElementById('gestureEditModal');
    const closeBtn = document.getElementById('closeGestureModal');
    const saveBtn = document.getElementById('modalSaveBtn');
    const deleteBtn = document.getElementById('modalDeleteBtn');
    
    closeBtn?.addEventListener('click', () => this.close());
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });
    
    saveBtn?.addEventListener('click', () => {
      if (this.onSave) {
        const data = this.getFormData();
        this.onSave(this.currentEditIndex, data);
      }
      this.close();
    });
    
    deleteBtn?.addEventListener('click', () => {
      if (this.onDelete) {
        this.onDelete(this.currentEditIndex);
      }
      this.close();
    });
  },

  /**
   * Open the modal for editing a set
   */
  open(index, setData) {
    this.init();
    this.currentEditIndex = index;
    this.isOpen = true;
    
    const modal = document.getElementById('gestureEditModal');
    if (!modal) return;
    
    if (setData) {
      const match = setData.match(/(\d+)\s*x\s*(\d+)/i);
      if (match) {
        document.getElementById('modalReps').value = parseInt(match[1]) || 4;
        document.getElementById('modalDistance').value = parseInt(match[2]) || 100;
      }
      
      const strokeSelect = document.getElementById('modalStroke');
      const strokeLower = setData.toLowerCase();
      if (strokeLower.includes('back')) strokeSelect.value = 'backstroke';
      else if (strokeLower.includes('breast')) strokeSelect.value = 'breaststroke';
      else if (strokeLower.includes('fly') || strokeLower.includes('butter')) strokeSelect.value = 'butterfly';
      else if (strokeLower.includes('im')) strokeSelect.value = 'IM';
      else if (strokeLower.includes('choice')) strokeSelect.value = 'choice';
      else strokeSelect.value = 'freestyle';
    }
    
    modal.style.display = 'flex';
  },

  /**
   * Close the modal
   */
  close() {
    this.isOpen = false;
    this.currentEditIndex = -1;
    const modal = document.getElementById('gestureEditModal');
    if (modal) modal.style.display = 'none';
  },

  /**
   * Get form data
   */
  getFormData() {
    return {
      distance: parseInt(document.getElementById('modalDistance').value) || 100,
      reps: parseInt(document.getElementById('modalReps').value) || 4,
      stroke: document.getElementById('modalStroke').value,
      effort: document.getElementById('modalEffort')?.value || 'moderate'
    };
  },

  // Callback hooks
  onSave: null,
  onDelete: null
};

module.exports = { EditModal };
