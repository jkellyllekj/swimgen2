/**
 * Drag and Drop Manager Module
 * 
 * Ghost Card pattern: On long-press drag, clone the card as a floating
 * .dragging-clone that follows the finger, while the original becomes a
 * .ghost-card placeholder. On drop, calculate new index via elementFromPoint,
 * update array, remove clone, and re-render.
 * 
 * Includes:
 * - Card gesture setup (touch/pointer event handlers)
 * - Swipe left/right for defer/delete
 * - Double-tap to edit
 * - Ghost Card drag-and-drop reordering with real-time gap shifting
 * - S24 Scroll-Lock: e.preventDefault() on touchmove during drag
 * - Omni-directional: deltaX controls swipe icons on clone, deltaY controls reorder
 * - Icon layering: swipe classes go on dragClone, clone becomes translucent
 * - Slow-drag committed: any newIndex != draggedIndex commits the move
 * 
 * Note: setupCardGestures calls external functions (openGestureEditModal, 
 * deleteWorkoutSet, moveSetToBottom, finalSync) that remain in index.js
 */

const CARD_GESTURE_SETUP = `
      function setupCardGestures(card, index) {
        let startX = 0, startY = 0;
        let currentX = 0, currentY = 0;
        let isSwiping = false;
        let isPointerDown = false;
        let tapCount = 0;
        let tapTimer = null;
        
        let pressTimer = null;
        let isLongPressDragging = false;
        let dragClone = null;
        let cloneOffsetX = 0;
        let cloneOffsetY = 0;
        let originalDragIndex = -1;

        function startPressTimer() {
          pressTimer = setTimeout(() => {
            isLongPressDragging = true;
            isSwiping = false;
            originalDragIndex = parseInt(card.getAttribute('data-index'));
            
            const rect = card.getBoundingClientRect();
            cloneOffsetX = currentX - rect.left;
            cloneOffsetY = currentY - rect.top;
            
            dragClone = card.cloneNode(true);
            dragClone.classList.add('dragging-clone');
            dragClone.style.width = rect.width + 'px';
            dragClone.style.left = (currentX - cloneOffsetX) + 'px';
            dragClone.style.top = (currentY - cloneOffsetY) + 'px';
            document.body.appendChild(dragClone);
            
            card.classList.add('ghost-card');
            card.style.touchAction = 'none';
            
            if (navigator.vibrate) navigator.vibrate(30);
          }, 300);
        }

        function cancelPressTimer() {
          if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
          }
          if (!isLongPressDragging) {
            card.style.touchAction = '';
          }
        }

        function handleTouchMove(e) {
          if (!isLongPressDragging) return;
          if (e.cancelable) e.preventDefault();
        }
        
        card.addEventListener('touchmove', handleTouchMove, { passive: false });
        
        card.addEventListener('pointerdown', function(e) {
          if (typeof checkLock === 'function' && checkLock()) return;
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
            if (!isNaN(currentIndex)) {
              openGestureEditModal(currentIndex);
            }
            e.preventDefault();
          }
        });

        card.addEventListener('pointermove', function(e) {
          if (!isPointerDown) return;
          currentX = e.clientX;
          currentY = e.clientY;
          const deltaX = currentX - startX;
          const deltaY = currentY - startY;
          
          if (isLongPressDragging) {
            e.preventDefault();
            
            if (dragClone) {
              dragClone.style.left = (currentX - cloneOffsetX) + 'px';
              dragClone.style.top = (currentY - cloneOffsetY) + 'px';
              
              if (Math.abs(deltaX) > 20) {
                dragClone.style.opacity = '0.7';
                dragClone.classList.remove('swiping-right', 'swiping-left');
                if (deltaX > 20) dragClone.classList.add('swiping-right');
                else if (deltaX < -20) dragClone.classList.add('swiping-left');
              } else {
                dragClone.style.opacity = '1';
                dragClone.classList.remove('swiping-right', 'swiping-left');
              }
            }
            
            const autoScrollMargin = 100;
            const viewportHeight = window.innerHeight;
            if (currentY > viewportHeight - autoScrollMargin) {
              window.scrollBy({ top: 30, behavior: 'instant' });
            } else if (currentY < autoScrollMargin && window.scrollY > 0) {
              window.scrollBy({ top: -30, behavior: 'instant' });
            }
            
            if (Math.abs(deltaY) > 10) {
              shiftCardsForGap(card, currentX, currentY);
            }
            
            return;
          }
          
          if (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15) {
            cancelPressTimer();
          }

          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            isSwiping = true;
            e.preventDefault();
            const limitedDelta = Math.max(-100, Math.min(100, deltaX));
            card.style.transform = 'translateX(' + limitedDelta + 'px)';
            card.classList.remove('swiping-right', 'swiping-left');
            if (deltaX > 50) card.classList.add('swiping-right');
            else if (deltaX < -50) card.classList.add('swiping-left');
          }
        });

        card.addEventListener('pointerup', function(e) {
          cancelPressTimer();
          if (!isPointerDown) return;
          isPointerDown = false;
          
          if (isLongPressDragging) {
            isLongPressDragging = false;
            
            const dragOffsetX = currentX - startX;
            const idx = originalDragIndex;
            
            clearCardShifts();
            cleanupGhostDrag(card);
            
            if (Math.abs(dragOffsetX) > 60 && !isNaN(idx)) {
              if (dragOffsetX > 0) deleteWorkoutSet(idx);
              else moveSetToBottom(idx);
            } else {
              handleGhostDrop(card, currentX, currentY, idx);
            }
            originalDragIndex = -1;
            return;
          }
          
          const deltaX = currentX - startX;
          card.style.transform = '';
          card.classList.remove('swiping-right', 'swiping-left');

          if (isSwiping) {
            const currentIndex = parseInt(card.getAttribute('data-index'));
            if (!isNaN(currentIndex) && Math.abs(deltaX) > 60) {
              if (deltaX > 0) deleteWorkoutSet(currentIndex);
              else moveSetToBottom(currentIndex);
            }
          }
          isSwiping = false;
        });
        
        card.addEventListener('pointercancel', function(e) {
          cancelPressTimer();
          isPointerDown = false;
          
          if (!isLongPressDragging) return;
          
          isLongPressDragging = false;
          
          const idx = originalDragIndex;
          clearCardShifts();
          cleanupGhostDrag(card);
          if (lastShiftTargetIndex !== -1 && lastShiftTargetIndex !== idx && !isNaN(idx) && currentWorkoutArray && currentWorkoutArray.length > idx) {
            const newIndex = lastShiftTargetIndex > idx ? lastShiftTargetIndex - 1 : lastShiftTargetIndex;
            const [removed] = currentWorkoutArray.splice(idx, 1);
            currentWorkoutArray.splice(newIndex, 0, removed);
            if (typeof finalSync === 'function') finalSync();
            else rerenderWorkoutFromArray();
          }
          originalDragIndex = -1;
        });
      }
`;

const DRAG_DROP_STATE = `
      let lastHighlightedDropIndex = -1;
      let lastShiftTargetIndex = -1;
`;

const DRAG_DROP_FUNCTIONS = `
      function clearCardShifts() {
        document.querySelectorAll('[data-effort][data-drag-shifted]').forEach(c => {
          c.style.transform = '';
          c.removeAttribute('data-drag-shifted');
        });
        lastShiftTargetIndex = -1;
      }

      function shiftCardsForGap(draggedCard, x, y) {
        const cards = Array.from(document.querySelectorAll('[data-effort][data-index]'));
        const draggedIndex = parseInt(draggedCard.getAttribute('data-index'));
        
        let targetIndex = cards.length;
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (c === draggedCard) continue;
          const rect = c.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (y < midY) {
            targetIndex = parseInt(c.getAttribute('data-index'));
            break;
          }
        }
        
        if (targetIndex === lastShiftTargetIndex) return;
        lastShiftTargetIndex = targetIndex;
        
        const gapSize = 50;
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          const ci = parseInt(c.getAttribute('data-index'));
          if (c === draggedCard) continue;
          
          if (draggedIndex < targetIndex && ci > draggedIndex && ci < targetIndex) {
            c.style.transform = 'translateY(-' + gapSize + 'px)';
            c.setAttribute('data-drag-shifted', '1');
          } else if (draggedIndex > targetIndex && ci >= targetIndex && ci < draggedIndex) {
            c.style.transform = 'translateY(' + gapSize + 'px)';
            c.setAttribute('data-drag-shifted', '1');
          } else {
            c.style.transform = '';
            c.removeAttribute('data-drag-shifted');
          }
        }
      }

      function cleanupGhostDrag(originalCard) {
        const clone = document.querySelector('.dragging-clone');
        if (clone) clone.remove();
        originalCard.classList.remove('ghost-card');
        originalCard.classList.remove('swiping-right', 'swiping-left');
        originalCard.style.touchAction = '';
        originalCard.style.transform = '';
        
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        
        document.querySelectorAll('.drop-target').forEach(c => {
          c.classList.remove('drop-target');
        });
        lastHighlightedDropIndex = -1;
      }
      
      function handleGhostDrop(draggedCard, dropX, dropY, originalIndex) {
        const cards = Array.from(document.querySelectorAll('[data-effort][data-index]'));
        const draggedIndex = (typeof originalIndex === 'number' && originalIndex >= 0) ? originalIndex : parseInt(draggedCard.getAttribute('data-index'));
        let insertBeforeIndex = -1;
        
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (c === draggedCard) continue;
          
          const rect = c.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          
          if (dropY < midY) {
            insertBeforeIndex = i;
            break;
          }
        }
        
        let newIndex;
        if (insertBeforeIndex === -1) {
          newIndex = cards.length - 1;
        } else if (insertBeforeIndex > draggedIndex) {
          newIndex = insertBeforeIndex - 1;
        } else {
          newIndex = insertBeforeIndex;
        }
        
        if (newIndex !== draggedIndex && currentWorkoutArray && currentWorkoutArray.length > draggedIndex) {
          const [removed] = currentWorkoutArray.splice(draggedIndex, 1);
          currentWorkoutArray.splice(newIndex, 0, removed);
          if (typeof finalSync === 'function') finalSync();
          else rerenderWorkoutFromArray();
        }
      }
`;

const DRAG_DROP_JS = CARD_GESTURE_SETUP + DRAG_DROP_STATE + DRAG_DROP_FUNCTIONS;

module.exports = {
  CARD_GESTURE_SETUP,
  DRAG_DROP_STATE,
  DRAG_DROP_FUNCTIONS,
  DRAG_DROP_JS
};
