/**
 * Drag and Drop Manager Module
 * 
 * This module contains all drag-and-drop related logic for workout set cards.
 * Extracted from index.js for better maintainability.
 * 
 * Includes:
 * - Card gesture setup (touch/pointer event handlers)
 * - State variables for tracking drag operations
 * - Drop zone highlighting functions
 * - Drag/drop handlers with smooth animations
 * - DOM reordering logic
 * 
 * Note: setupCardGestures calls external functions (openGestureEditModal, 
 * deleteWorkoutSet, moveSetToBottom) that remain in index.js
 */

const CARD_GESTURE_SETUP = `
      function setupCardGestures(card, index) {
        let startX = 0, startY = 0;
        let currentX = 0, currentY = 0;
        let isSwiping = false;
        let isPointerDown = false;
        let tapCount = 0;
        let tapTimer = null;
        
        // Long-press drag variables
        let pressTimer = null;
        let isLongPressDragging = false;
        let dragStartY = 0;
        let dragStartX = 0;
        let dragPlaceholder = null;

        function startPressTimer() {
          pressTimer = setTimeout(() => {
            isLongPressDragging = true;
            isSwiping = false; // Cancel any swipe
            card.classList.add('dragging');
            card.style.opacity = '0.85';
            card.style.transform = 'scale(1.03)';
            card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
            card.style.zIndex = '1000';
            card.style.position = 'relative';
            card.style.touchAction = 'none'; // Prevent page scroll on mobile
            document.body.style.overflow = 'hidden'; // Lock body scroll
            dragStartY = currentY;
            dragStartX = currentX; // Track X position for horizontal swipe detection during drag
            
            // Create placeholder for drop zone visualization
            dragPlaceholder = document.createElement('div');
            dragPlaceholder.className = 'drag-placeholder';
            dragPlaceholder.style.height = card.offsetHeight + 'px';
            dragPlaceholder.style.display = 'none';
          }, 300);
        }

        function cancelPressTimer() {
          if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
          }
          // Reset touch action if not in drag mode
          if (!isLongPressDragging) {
            card.style.touchAction = '';
          }
        }

        // Touch move handler to prevent page scroll during drag
        function preventScroll(e) {
          if (isLongPressDragging) {
            e.preventDefault();
            document.body.style.overflow = 'hidden';
          }
        }
        
        card.addEventListener('touchmove', preventScroll, { passive: false });
        
        card.addEventListener('pointerdown', function(e) {
          if (typeof checkLock === 'function' && checkLock()) return;
          startX = e.clientX;
          startY = e.clientY;
          currentX = e.clientX;
          currentY = e.clientY;
          isPointerDown = true;
          card.setPointerCapture(e.pointerId);
          
          // Start long-press timer
          startPressTimer();

          tapCount++;
          if (tapCount === 1) {
            tapTimer = setTimeout(() => { tapCount = 0; }, 300);
          } else if (tapCount === 2) {
            clearTimeout(tapTimer);
            cancelPressTimer();
            tapCount = 0;
            // Use data-index for accurate index after delete/move operations
            const currentIndex = parseInt(card.getAttribute('data-index'));
            console.log('Double-tap on set with data-index:', currentIndex);
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
          
          // Detect vertical drag start even without long-press (25px threshold for reliability)
          if (!isLongPressDragging && Math.abs(deltaY) > 25 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
            // Clear long-press timer since we're starting drag
            cancelPressTimer();
            
            // Start drag mode
            isLongPressDragging = true;
            dragStartY = startY;
            dragStartX = startX;
            
            // Set up drag visuals
            card.classList.add('dragging');
            card.style.transition = 'none';
            card.style.zIndex = '1000';
            card.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
            card.style.touchAction = 'none';
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
            
            e.preventDefault();
            return; // Let next move event handle the actual drag
          }
          
          // Handle long-press dragging - allow diagonal movement (both X and Y)
          if (isLongPressDragging) {
            e.preventDefault();
            const dragOffsetY = currentY - dragStartY;
            const dragOffsetX = currentX - dragStartX;
            
            // Allow diagonal movement: translate both X and Y
            card.style.transform = 'translate(' + dragOffsetX + 'px, ' + dragOffsetY + 'px) scale(1.03)';
            
            // Auto-scroll when dragging near screen edges
            const autoScrollMargin = 100;
            const viewportHeight = window.innerHeight;
            const cardRect = card.getBoundingClientRect();
            
            if (cardRect.bottom > viewportHeight - autoScrollMargin) {
              window.scrollBy({ top: 30, behavior: 'instant' });
            } else if (cardRect.top < autoScrollMargin && window.scrollY > 0) {
              window.scrollBy({ top: -30, behavior: 'instant' });
            }
            
            // Show visual feedback for horizontal swipe during drag
            card.classList.remove('swiping-right', 'swiping-left');
            if (dragOffsetX > 60) card.classList.add('swiping-right');
            else if (dragOffsetX < -60) card.classList.add('swiping-left');
            
            // Highlight potential drop positions (gap animation) with smooth transition
            highlightDropZoneSmooth(card, currentY);
            return;
          }
          
          // If moving too much before long-press triggers, cancel it (increased threshold)
          if (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15) {
            cancelPressTimer();
          }

          // Handle horizontal swiping (existing logic) - only if not in long-press mode
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
          
          // Handle long-press drag drop - decide swipe vs drop at the END
          if (isLongPressDragging) {
            isLongPressDragging = false;
            document.body.style.overflow = '';
            
            const dragOffsetX = currentX - dragStartX;
            const dragOffsetY = currentY - dragStartY;
            
            // Decide: is this a horizontal swipe or a drag-drop?
            const isHorizontalSwipe = Math.abs(dragOffsetX) > 80 && Math.abs(dragOffsetX) > Math.abs(dragOffsetY) * 1.5;
            
            if (isHorizontalSwipe) {
              // Horizontal swipe detected - trigger delete/defer
              card.classList.remove('swiping-right', 'swiping-left');
              resetDragStyles(card);
              
              // Clear gap animations on other cards
              document.querySelectorAll('[data-effort][data-index]').forEach(c => {
                c.style.transform = '';
                c.style.transition = 'transform 0.2s ease-out';
              });
              
              const currentIndex = parseInt(card.getAttribute('data-index'));
              if (!isNaN(currentIndex)) {
                if (dragOffsetX > 0) {
                  deleteWorkoutSet(currentIndex);
                } else {
                  moveSetToBottom(currentIndex);
                }
              }
            } else {
              // This is a drag-drop operation
              handleDragDropSmooth(card, currentY);
            }
            return;
          }
          
          const deltaX = currentX - startX;
          card.style.transform = '';
          card.classList.remove('swiping-right', 'swiping-left');

          if (isSwiping) {
            // Use data-index for accurate index after delete/move operations
            const currentIndex = parseInt(card.getAttribute('data-index'));
            if (!isNaN(currentIndex)) {
              if (deltaX > 100) {
                // Delete immediately without confirmation for smoother UX
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
          
          // Only handle if we're actively dragging
          if (!isLongPressDragging) return;
          
          // Log and preserve drag state - let pointerup handle cleanup
          console.log('Pointer canceled during drag, preserving state');
          
          // Delay reset to allow any in-progress drop to complete
          isLongPressDragging = false;
          document.body.style.overflow = '';
          setTimeout(() => {
            resetDragStyles(card);
          }, 50);
        });
      }
`;

const DRAG_DROP_STATE = `
      // ===== DRAG & DROP STATE VARIABLES =====
      // Track last stable drop target to prevent flickering
      let lastDropTarget = null;
      
      // Track current drop state to prevent unnecessary updates
      let lastHighlightedIndex = -1;
      let highlightRAFPending = false;
`;

const DRAG_DROP_FUNCTIONS = `
      // ===== DRAG & DROP HELPER FUNCTIONS =====
      
      // Highlight drop zone during drag - shows a line/gap where card will be inserted
      function highlightDropZone(draggedCard, currentY) {
        const cards = Array.from(document.querySelectorAll('[data-effort][data-index]'));
        const draggedIndex = parseInt(draggedCard.getAttribute('data-index'));
        const bufferZone = 10; // 10px buffer to prevent flickering at boundaries
        
        // Find where the drop line should appear
        let newDropTarget = null;
        let newDropPosition = null;
        
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (c === draggedCard) continue;
          
          const rect = c.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const cardIndex = parseInt(c.getAttribute('data-index'));
          
          // Add buffer zone to prevent flickering at boundary
          if (currentY < midY - bufferZone) {
            // Clearly above midpoint - show line above this card
            if (cardIndex !== draggedIndex + 1) {
              newDropTarget = c;
              newDropPosition = 'above';
            }
            break;
          } else if (Math.abs(currentY - midY) <= bufferZone && lastDropTarget === c) {
            // Within buffer zone and same target - keep current highlight
            newDropTarget = c;
            newDropPosition = c.classList.contains('drop-above') ? 'above' : 
                             c.classList.contains('drop-below') ? 'below' : null;
            break;
          }
        }
        
        // If no target found above, check if below all cards
        if (!newDropTarget) {
          const lastCard = cards.filter(c => c !== draggedCard).pop();
          if (lastCard) {
            const lastRect = lastCard.getBoundingClientRect();
            const lastMidY = lastRect.top + lastRect.height / 2;
            const lastIndex = parseInt(lastCard.getAttribute('data-index'));
            
            if (currentY > lastMidY + bufferZone) {
              // Clearly below last card
              if (lastIndex !== draggedIndex - 1) {
                newDropTarget = lastCard;
                newDropPosition = 'below';
              }
            } else if (Math.abs(currentY - lastMidY) <= bufferZone && lastDropTarget === lastCard) {
              // Within buffer zone - keep current
              newDropTarget = lastCard;
              newDropPosition = lastCard.classList.contains('drop-below') ? 'below' : 
                               lastCard.classList.contains('drop-above') ? 'above' : null;
            }
          }
        }
        
        // Update highlights only if target changed
        if (newDropTarget !== lastDropTarget || newDropPosition) {
          cards.forEach(c => c.classList.remove('drop-above', 'drop-below'));
          
          if (newDropTarget && newDropPosition) {
            newDropTarget.classList.add('drop-' + newDropPosition);
          }
        }
        
        lastDropTarget = newDropTarget;
      }
      
      // Reset drag styles
      function resetDragStyles(card) {
        card.classList.remove('dragging');
        card.style.opacity = '';
        card.style.transform = '';
        card.style.boxShadow = '';
        card.style.zIndex = '';
        card.style.position = '';
        card.style.touchAction = ''; // Re-enable touch scrolling
        document.body.style.overflow = ''; // Unlock body scroll
        document.body.style.touchAction = ''; // Re-enable body touch
        lastDropTarget = null; // Reset drop target tracking
        lastHighlightedIndex = -1; // Reset highlight tracking
        
        // Remove all drop highlights and clear transforms
        document.querySelectorAll('.drop-above, .drop-below').forEach(c => {
          c.classList.remove('drop-above', 'drop-below');
        });
        document.querySelectorAll('[data-effort][data-index]').forEach(c => {
          if (c !== card) {
            c.style.transform = '';
          }
        });
      }
      
      // Highlight drop zone with smooth gap animation
      function highlightDropZoneSmooth(draggedCard, currentY) {
        const cards = Array.from(document.querySelectorAll('[data-effort][data-index]'));
        const draggedIndex = parseInt(draggedCard.getAttribute('data-index'));
        const bufferZone = 15; // Buffer to prevent flickering
        
        // Find the target drop position
        let targetIndex = -1;
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (c === draggedCard) continue;
          
          const rect = c.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const cardIndex = parseInt(c.getAttribute('data-index'));
          
          // Use buffer zone to prevent flickering at boundaries
          if (currentY < midY - bufferZone) {
            targetIndex = cardIndex;
            break;
          } else if (Math.abs(currentY - midY) <= bufferZone && lastHighlightedIndex === cardIndex) {
            // Within buffer zone and same target - keep current
            targetIndex = lastHighlightedIndex;
            break;
          }
        }
        
        // Only update if target changed (prevents constant re-renders)
        if (targetIndex === lastHighlightedIndex) {
          return;
        }
        
        lastHighlightedIndex = targetIndex;
        
        // Skip if RAF already pending
        if (highlightRAFPending) return;
        highlightRAFPending = true;
        
        // Apply transforms in next frame to minimize disruption to dragged card
        requestAnimationFrame(() => {
          highlightRAFPending = false;
          
          // Apply transforms based on target
          cards.forEach(c => {
            if (c === draggedCard) return;
            
            const cardIndex = parseInt(c.getAttribute('data-index'));
            c.style.transition = 'transform 0.15s ease-out';
          
          if (targetIndex !== -1 && cardIndex >= targetIndex && cardIndex !== draggedIndex) {
            // Cards at or below drop point shift down
            c.style.transform = 'translateY(40px)';
            if (cardIndex === targetIndex) {
              c.classList.add('drop-above');
            }
          } else {
            // Cards above drop point - no shift
            c.style.transform = '';
            c.classList.remove('drop-above', 'drop-below');
          }
        });
        }); // End requestAnimationFrame
      }
      
      // Handle drop with smooth animation
      function handleDragDropSmooth(draggedCard, dropY) {
        const cards = Array.from(document.querySelectorAll('[data-effort][data-index]'));
        const draggedIndex = parseInt(draggedCard.getAttribute('data-index'));
        let insertBeforeIndex = -1;
        
        // Find which card to insert before based on Y position
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
        
        // Calculate effective new position
        let newIndex;
        if (insertBeforeIndex === -1) {
          newIndex = cards.length - 1;
        } else if (insertBeforeIndex > draggedIndex) {
          newIndex = insertBeforeIndex - 1;
        } else {
          newIndex = insertBeforeIndex;
        }
        
        const willDrop = newIndex !== draggedIndex;
        console.log('handleDragDropSmooth: draggedIndex=' + draggedIndex + ', newIndex=' + newIndex + ', willDrop=' + willDrop);
        
        // Clear drop highlights
        cards.forEach(c => {
          c.classList.remove('drop-above', 'drop-below');
        });
        
        if (willDrop) {
          // We're dropping to a new position
          // Store the dragged card's current visual position
          const draggedRect = draggedCard.getBoundingClientRect();
          
          // Prevent dragged card from interfering during reorder
          draggedCard.style.pointerEvents = 'none';
          draggedCard.style.zIndex = '1000';
          
          // Do DOM reorder immediately (this moves the card in the DOM)
          reorderWorkoutSet(draggedIndex, newIndex);
          
          // Force layout recalc to get new position
          void draggedCard.offsetHeight;
          
          // Get the new position after reorder
          const newRect = draggedCard.getBoundingClientRect();
          
          // Calculate offset from current visual position to new DOM position
          const deltaX = draggedRect.left - newRect.left;
          const deltaY = draggedRect.top - newRect.top;
          
          // Position card at its old visual location (where user dropped it)
          draggedCard.style.transition = 'none';
          draggedCard.style.transform = 'translate(' + deltaX + 'px, ' + deltaY + 'px)';
          
          // Force reflow
          void draggedCard.offsetHeight;
          
          // Animate other cards to their new positions
          cards.forEach(c => {
            if (c !== draggedCard) {
              c.style.transition = 'transform 0.2s ease-out';
              c.style.transform = '';
            }
          });
          
          // Animate dragged card from old position to new position
          draggedCard.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s, opacity 0.2s';
          draggedCard.style.transform = '';
          draggedCard.style.boxShadow = '';
          draggedCard.style.opacity = '';
          
          // Clean up after animation
          setTimeout(() => {
            draggedCard.style.pointerEvents = '';
            draggedCard.style.zIndex = '';
            resetDragStyles(draggedCard);
            cards.forEach(c => {
              c.style.transition = '';
            });
          }, 200);
          
        } else {
          // Not dropping to new position - animate back to original
          draggedCard.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.3, 1.1), opacity 0.2s, box-shadow 0.2s';
          draggedCard.style.transform = '';
          draggedCard.style.opacity = '';
          draggedCard.style.boxShadow = '';
          
          // Animate all other cards back to position
          cards.forEach(c => {
            if (c !== draggedCard) {
              c.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.3, 1.1)';
              c.style.transform = '';
            }
          });
          
          // Clean up after animation
          setTimeout(() => {
            resetDragStyles(draggedCard);
            cards.forEach(c => {
              c.style.transition = '';
            });
          }, 200);
        }
      }
      
      // Handle drop after long-press drag
      function handleDragDrop(draggedCard, dropY) {
        const cards = Array.from(document.querySelectorAll('[data-effort][data-index]'));
        const draggedIndex = parseInt(draggedCard.getAttribute('data-index'));
        let insertBeforeIndex = -1; // -1 means insert at end
        
        // Find which card to insert before based on Y position
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
        
        // Calculate effective new position
        let newIndex;
        if (insertBeforeIndex === -1) {
          newIndex = cards.length - 1; // Moving to end
        } else if (insertBeforeIndex > draggedIndex) {
          newIndex = insertBeforeIndex - 1; // Account for removal
        } else {
          newIndex = insertBeforeIndex;
        }
        
        // Clear drop highlights first
        document.querySelectorAll('.drop-above, .drop-below').forEach(c => {
          c.classList.remove('drop-above', 'drop-below');
        });
        
        console.log('Drop: draggedIndex=' + draggedIndex + ', newIndex=' + newIndex, ', insertBeforeIndex=' + insertBeforeIndex);
        if (newIndex !== draggedIndex) {
          // Store the dragged card's current visual position
          const draggedRect = draggedCard.getBoundingClientRect();
          
          // Prevent dragged card from interfering during reorder
          draggedCard.style.pointerEvents = 'none';
          draggedCard.style.zIndex = '1000';
          
          // Do DOM reorder immediately
          reorderWorkoutSet(draggedIndex, newIndex);
          
          // Force layout recalc
          void draggedCard.offsetHeight;
          
          // Get the new position after reorder
          const newRect = draggedCard.getBoundingClientRect();
          
          // Calculate offset from current visual position to new DOM position
          const deltaX = draggedRect.left - newRect.left;
          const deltaY = draggedRect.top - newRect.top;
          
          // Position card at its old visual location
          draggedCard.style.transition = 'none';
          draggedCard.style.transform = 'translate(' + deltaX + 'px, ' + deltaY + 'px)';
          
          // Force reflow
          void draggedCard.offsetHeight;
          
          // Animate other cards
          cards.forEach(c => {
            if (c !== draggedCard) {
              c.style.transition = 'transform 0.2s ease-out';
              c.style.transform = '';
            }
          });
          
          // Animate dragged card from old position to new position
          draggedCard.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s, opacity 0.2s';
          draggedCard.style.transform = '';
          draggedCard.style.boxShadow = '';
          draggedCard.style.opacity = '';
          
          // Clean up after animation
          setTimeout(() => {
            draggedCard.style.pointerEvents = '';
            draggedCard.style.zIndex = '';
            resetDragStyles(draggedCard);
            cards.forEach(c => {
              c.style.transition = '';
            });
          }, 200);
        } else {
          console.log('Not reordering: same position');
          resetDragStyles(draggedCard);
        }
      }
      
      // Reorder a workout set from one index to another
      function reorderWorkoutSet(fromIndex, toIndex) {
        console.log('reorderWorkoutSet called: from=' + fromIndex + ' to=' + toIndex);
        const container = document.getElementById('cards');
        if (!container) {
          console.log('No container found');
          return;
        }
        
        const cards = Array.from(container.querySelectorAll('[data-effort][data-index]'));
        console.log('Found ' + cards.length + ' cards');
        const draggedCard = cards[fromIndex];
        if (!draggedCard) {
          console.log('No card at fromIndex ' + fromIndex);
          return;
        }
        
        // Update currentWorkoutArray
        if (currentWorkoutArray && currentWorkoutArray.length > fromIndex) {
          const [removed] = currentWorkoutArray.splice(fromIndex, 1);
          currentWorkoutArray.splice(toIndex, 0, removed);
        }
        
        // Reorder DOM: remove the card first
        draggedCard.remove();
        
        // Get remaining cards after removal
        const remainingCards = Array.from(container.querySelectorAll('[data-effort][data-index]'));
        
        if (toIndex >= remainingCards.length) {
          // Insert at end
          const lastCard = remainingCards[remainingCards.length - 1];
          if (lastCard) {
            lastCard.after(draggedCard);
          } else {
            container.appendChild(draggedCard);
          }
        } else {
          // Insert before the card at toIndex position
          const targetCard = remainingCards[toIndex];
          if (targetCard) {
            targetCard.before(draggedCard);
          }
        }
        
        // Renumber all data-index attributes
        const finalCards = container.querySelectorAll('[data-effort][data-index]');
        finalCards.forEach((c, i) => {
          c.setAttribute('data-index', i);
        });
        
        // Update totals
        updateMathTotals();
        
        console.log('Reordered set from', fromIndex, 'to', toIndex);
      }
`;

const DRAG_DROP_JS = CARD_GESTURE_SETUP + DRAG_DROP_STATE + DRAG_DROP_FUNCTIONS;

module.exports = {
  CARD_GESTURE_SETUP,
  DRAG_DROP_STATE,
  DRAG_DROP_FUNCTIONS,
  DRAG_DROP_JS
};
