// BLOCK INTERACTIVE-EDITOR-RESET START

// === INTERACTIVE SET EDITOR (STANDALONE UI TEST) ===

const interactiveEditorContainer = document.createElement('div');
interactiveEditorContainer.id = 'interactive-editor';
interactiveEditorContainer.style.display = 'flex';
interactiveEditorContainer.style.flexDirection = 'column';
interactiveEditorContainer.style.gap = '10px';
interactiveEditorContainer.style.position = 'fixed';
interactiveEditorContainer.style.top = '0';
interactiveEditorContainer.style.left = '0';
interactiveEditorContainer.style.zIndex = '9999';
interactiveEditorContainer.style.background = 'yellow';
interactiveEditorContainer.style.padding = '10px';
interactiveEditorContainer.style.border = '2px solid red';
document.body.appendChild(interactiveEditorContainer);

let interactiveSets = [
  { id: 1, text: '4x100 FR Moderate' },
  { id: 2, text: '3x200 IM Hard' },
  { id: 3, text: '6x50 Kick Easy' }
];

function renderInteractiveSets() {
  interactiveEditorContainer.innerHTML = '';

  interactiveSets.forEach((set, index) => {
    const card = document.createElement('div');
    card.textContent = set.text;
    card.dataset.index = index;
    card.style.padding = '12px';
    card.style.background = 'white';
    card.style.border = '1px solid #333';
    card.style.borderRadius = '6px';
    card.style.cursor = 'grab';
    card.style.userSelect = 'none';

    // Click to edit
    card.addEventListener('click', () => {
      alert('Edit: ' + set.text);
    });

    // Swipe to delete
    let startX = null;
    card.addEventListener('pointerdown', e => {
      startX = e.clientX;
    });
    card.addEventListener('pointerup', e => {
      if (startX !== null && e.clientX - startX > 120) {
        interactiveSets.splice(index, 1);
        renderInteractiveSets();
      }
      startX = null;
    });

    interactiveEditorContainer.appendChild(card);
  });
}

renderInteractiveSets();

// BLOCK INTERACTIVE-EDITOR-RESET END
