/**
 * Drag and Drop Manager Module
 * 
 * Live-Reorder pattern: On long-press drag, the card stays in place
 * while we track finger position and reorder the DOM in real-time.
 * Uses strict Scroll-Lock via e.preventDefault() on touchmove to
 * prevent Samsung S24 (and similar high-sensitivity) pop-back issues.
 * 
 * Includes:
 * - Card gesture setup (touch/pointer event handlers)
 * - Swipe left/right for defer/delete
 * - Double-tap to edit
 * - Live-Reorder drag-and-drop with scroll-lock
 * 
 * Note: setupCardGestures calls external functions (openGestureEditModal, 
 * deleteWorkoutSet, moveSetToBottom, rerenderWorkoutFromArray) that remain in index.js
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

        function startPressTimer() {
          pressTimer = setTimeout(() => {
            isLongPressDragging = true;
            isSwiping = false;
            
            card.classList.add('live-drag-active');
            card.style.zIndex = '9999';
            card.style.touchAction = 'none';
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
            lockScroll();
            
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

        let docTouchHandler = null;
        
        function lockScroll() {
          if (docTouchHandler) return;
          docTouchHandler = function(e) { e.preventDefault(); };
          document.addEventListener('touchmove', docTouchHandler, { passive: false });
        }
        
        function unlockScroll() {
          if (docTouchHandler) {
            document.removeEventListener('touchmove', docTouchHandler);
            docTouchHandler = null;
          }
        }
        
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
            
            liveReorderCheck(card, currentY);
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
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
            
            unlockScroll();
            
            const dragOffsetX = currentX - startX;
            const dragOffsetY = currentY - startY;
            
            const isHorizontalSwipe = Math.abs(dragOffsetX) > 80 && Math.abs(dragOffsetX) > Math.abs(dragOffsetY) * 1.5;
            
            if (isHorizontalSwipe) {
              cleanupLiveDrag(card);
              const currentIndex = parseInt(card.getAttribute('data-index'));
              if (!isNaN(currentIndex)) {
                if (dragOffsetX > 0) {
                  deleteWorkoutSet(currentIndex);
                } else {
                  moveSetToBottom(currentIndex);
                }
              }
            } else {
              cleanupLiveDrag(card);
              rerenderWorkoutFromArray();
            }
            return;
          }
          
          const deltaX = currentX - startX;
          card.style.transform = '';
          card.classList.remove('swiping-right', 'swiping-left');

          if (isSwiping) {
            const currentIndex = parseInt(card.getAttribute('data-index'));
            if (!isNaN(currentIndex)) {
              if (deltaX > 100) {
                deleteWorkoutSet(currentIndex);
              } else if (deltaX < -100) {
                moveSetToBottom(currentIndex);
              }
            }
          }
          isSwiping = false;
        });
        
        card.addEventListener('pointercancel', function(e) {
          cancelPressTimer();
          isPointerDown = false;
          
          if (!isLongPressDragging) return;
          
          isLongPressDragging = false;
          unlockScroll();
          document.body.style.overflow = '';
          document.body.style.touchAction = '';
          cleanupLiveDrag(card);
        });
      }
`;

const DRAG_DROP_STATE = `
      let lastReorderIndex = -1;
`;

const DRAG_DROP_FUNCTIONS = `
      function cleanupLiveDrag(card) {
        card.classList.remove('live-drag-active');
        card.style.zIndex = '';
        card.style.touchAction = '';
        card.style.transform = '';
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        lastReorderIndex = -1;
      }
      
      function liveReorderCheck(draggedCard, fingerY) {
        const container = draggedCard.parentNode;
        if (!container) return;
        
        const cards = Array.from(container.querySelectorAll('[data-effort][data-index]'));
        const draggedPos = cards.indexOf(draggedCard);
        if (draggedPos === -1) return;
        
        const otherCards = cards.filter(c => c !== draggedCard);
        let insertPos = otherCards.length;
        for (let i = 0; i < otherCards.length; i++) {
          const rect = otherCards[i].getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (fingerY < midY) {
            insertPos = i;
            break;
          }
        }
        
        const newArrayIndex = insertPos;
        
        if (newArrayIndex === lastReorderIndex) return;
        lastReorderIndex = newArrayIndex;
        
        if (!currentWorkoutArray || draggedPos >= currentWorkoutArray.length) return;
        
        const [removed] = currentWorkoutArray.splice(draggedPos, 1);
        const clampedIndex = Math.min(newArrayIndex, currentWorkoutArray.length);
        currentWorkoutArray.splice(clampedIndex, 0, removed);
        
        if (insertPos < otherCards.length) {
          container.insertBefore(draggedCard, otherCards[insertPos]);
        } else {
          container.appendChild(draggedCard);
        }
        
        const updatedCards = Array.from(container.querySelectorAll('[data-effort][data-index]'));
        updatedCards.forEach((c, i) => {
          c.setAttribute('data-index', i);
        });
      }
`;

const DRAG_DROP_JS = CARD_GESTURE_SETUP + DRAG_DROP_STATE + DRAG_DROP_FUNCTIONS;

module.exports = {
  CARD_GESTURE_SETUP,
  DRAG_DROP_STATE,
  DRAG_DROP_FUNCTIONS,
  DRAG_DROP_JS
};
