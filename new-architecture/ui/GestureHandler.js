/**
 * New Architecture - GestureHandler Component
 * ============================================
 * Extracted from legacy index.js setupGestureEditing function.
 * Handles swipe, tap, and drag gestures on workout cards.
 */

const GestureHandler = {
  currentWorkoutArray: [],
  lastDropTarget: null,
  lastHighlightedIndex: -1,

  /**
   * Initialize gesture handling for workout cards
   * @param {Array} workoutData - Array of section objects
   */
  setup(workoutData) {
    this.currentWorkoutArray = workoutData.map((section, idx) => ({
      label: section.label || `Set ${idx + 1}`,
      bodies: section.bodies || [section.body],
      bodyText: section.body || (section.bodies || []).join('\n'),
      sectionIndex: idx
    }));

    setTimeout(() => {
      const cards = document.querySelectorAll('[data-effort]');
      cards.forEach((card, index) => {
        if (card.dataset.gestureSetup === 'true') return;
        this.addSwipeHints(card);
        this.attachGestureListeners(card, index);
        card.dataset.gestureSetup = 'true';
      });
    }, 150);
  },

  /**
   * Add swipe hint elements to card
   */
  addSwipeHints(card) {
    if (card.querySelector('.swipe-hint')) return;
    
    const deleteHint = document.createElement('div');
    deleteHint.className = 'swipe-hint swipe-hint-delete';
    deleteHint.textContent = '🗑️';
    
    const deferHint = document.createElement('div');
    deferHint.className = 'swipe-hint swipe-hint-defer';
    deferHint.textContent = '↩️';
    
    card.appendChild(deleteHint);
    card.appendChild(deferHint);
  },

  /**
   * Attach gesture event listeners to a card
   */
  attachGestureListeners(card, index) {
    let startX = 0, startY = 0;
    let currentX = 0, currentY = 0;
    let isSwiping = false;
    let isPointerDown = false;
    let tapCount = 0;
    let tapTimer = null;
    let pressTimer = null;
    let isLongPressDragging = false;
    let dragStartY = 0;
    let dragStartX = 0;

    const startPressTimer = () => {
      pressTimer = setTimeout(() => {
        isLongPressDragging = true;
        isSwiping = false;
        card.classList.add('dragging');
        card.style.opacity = '0.85';
        card.style.transform = 'scale(1.03)';
        card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
        card.style.zIndex = '1000';
        card.style.position = 'relative';
        card.style.touchAction = 'none';
        document.body.style.overflow = 'hidden';
        dragStartY = currentY;
        dragStartX = currentX;
      }, 300);
    };

    const cancelPressTimer = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      if (!isLongPressDragging) {
        card.style.touchAction = '';
      }
    };

    const preventScroll = (e) => {
      if (isLongPressDragging) e.preventDefault();
    };

    card.addEventListener('touchmove', preventScroll, { passive: false });

    card.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      startY = e.clientY;
      currentX = e.clientX;
      currentY = e.clientY;
      isPointerDown = true;
      card.setPointerCapture(e.pointerId);
      startPressTimer();

      tapCount++;
      if (tapCount === 1) {
        tapTimer = setTimeout(() => { tapCount = 0; }, 300);
      } else if (tapCount === 2) {
        clearTimeout(tapTimer);
        cancelPressTimer();
        tapCount = 0;
        const currentIndex = parseInt(card.getAttribute('data-index'));
        if (!isNaN(currentIndex) && this.onDoubleTap) {
          this.onDoubleTap(currentIndex);
        }
        e.preventDefault();
      }
    });

    card.addEventListener('pointermove', (e) => {
      if (!isPointerDown) return;
      currentX = e.clientX;
      currentY = e.clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      if (!isLongPressDragging && Math.abs(deltaY) > 25 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        cancelPressTimer();
        isLongPressDragging = true;
        dragStartY = startY;
        dragStartX = startX;
        card.classList.add('dragging');
        card.style.transition = 'none';
        card.style.zIndex = '1000';
        card.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
        card.style.touchAction = 'none';
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        e.preventDefault();
        return;
      }

      if (isLongPressDragging) {
        e.preventDefault();
        const dragOffsetY = currentY - dragStartY;
        const dragOffsetX = currentX - dragStartX;
        card.style.transform = `translate(${dragOffsetX}px, ${dragOffsetY}px) scale(1.03)`;
        
        card.classList.remove('swiping-right', 'swiping-left');
        if (dragOffsetX > 60) card.classList.add('swiping-right');
        else if (dragOffsetX < -60) card.classList.add('swiping-left');
        return;
      }

      if (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15) {
        cancelPressTimer();
      }

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isSwiping = true;
        e.preventDefault();
        const limitedDelta = Math.max(-100, Math.min(100, deltaX));
        card.style.transform = `translateX(${limitedDelta}px)`;
        card.classList.remove('swiping-right', 'swiping-left');
        if (deltaX > 50) card.classList.add('swiping-right');
        else if (deltaX < -50) card.classList.add('swiping-left');
      }
    });

    card.addEventListener('pointerup', (e) => {
      cancelPressTimer();
      if (!isPointerDown) return;
      isPointerDown = false;

      if (isLongPressDragging) {
        isLongPressDragging = false;
        const dragOffsetX = currentX - dragStartX;
        const dragOffsetY = currentY - dragStartY;
        const isHorizontalSwipe = Math.abs(dragOffsetX) > 80 && Math.abs(dragOffsetX) > Math.abs(dragOffsetY) * 1.5;

        if (isHorizontalSwipe) {
          card.classList.remove('swiping-right', 'swiping-left');
          this.resetDragStyles(card);
          const currentIndex = parseInt(card.getAttribute('data-index'));
          if (!isNaN(currentIndex)) {
            if (dragOffsetX > 0 && this.onDelete) {
              this.onDelete(currentIndex);
            } else if (this.onMoveToBottom) {
              this.onMoveToBottom(currentIndex);
            }
          }
        } else {
          this.resetDragStyles(card);
        }
        return;
      }

      const deltaX = currentX - startX;
      card.style.transform = '';
      card.classList.remove('swiping-right', 'swiping-left');

      if (isSwiping) {
        const currentIndex = parseInt(card.getAttribute('data-index'));
        if (!isNaN(currentIndex)) {
          if (deltaX > 100 && this.onDelete) {
            this.onDelete(currentIndex);
          } else if (deltaX < -100 && this.onMoveToBottom) {
            this.onMoveToBottom(currentIndex);
          }
        }
      }
      isSwiping = false;
    });

    card.addEventListener('pointercancel', () => {
      cancelPressTimer();
      isPointerDown = false;
      if (isLongPressDragging) {
        isLongPressDragging = false;
        setTimeout(() => this.resetDragStyles(card), 50);
      }
    });
  },

  /**
   * Reset drag styles on a card
   */
  resetDragStyles(card) {
    card.classList.remove('dragging');
    card.style.opacity = '';
    card.style.transform = '';
    card.style.boxShadow = '';
    card.style.zIndex = '';
    card.style.position = '';
    card.style.touchAction = '';
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    this.lastDropTarget = null;
    this.lastHighlightedIndex = -1;
    
    document.querySelectorAll('.drop-above, .drop-below').forEach(c => {
      c.classList.remove('drop-above', 'drop-below');
    });
  },

  // Callback hooks - set these to integrate with your app
  onDoubleTap: null,
  onDelete: null,
  onMoveToBottom: null,
  onReorder: null
};

module.exports = { GestureHandler };
