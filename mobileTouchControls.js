/**
 * mobileTouchControls.js
 * 
 * Adds touch-to-move controls for mobile devices without modifying existing game logic.
 * When a player touches the screen, the fish moves toward that touch position.
 * Touch controls dispatch keyboard events (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
 * to integrate seamlessly with the existing keyboard input handler.
 * 
 * Only activates on touch-capable devices.
 * Keyboard controls on desktop remain fully functional.
 */

(function initMobileTouchControls() {
  // ============================================================================
  // TOUCH DEVICE DETECTION
  // ============================================================================
  
  const isTouchDevice = () => {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  };

  // Only initialize on touch devices
  if (!isTouchDevice()) {
    return;
  }

  // ============================================================================
  // STATE TRACKING
  // ============================================================================

  let isTouching = false;
  let touchX = 0;
  let touchY = 0;
  let lastDirection = { x: 0, y: 0 }; // Track last direction to avoid spam

  // Track which directions are currently active to avoid duplicate events
  const activeDirections = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get canvas element and its bounding rectangle
   */
  function getCanvasInfo() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return null;
    return {
      element: canvas,
      rect: canvas.getBoundingClientRect(),
    };
  }

  /**
   * Get player position from the global scope
   * The player is created in game.js and stored in the global scope
   */
  function getPlayerPosition() {
    // In game.js, player is declared as: let player;
    // We access it via window.player since it's declared in global scope
    if (typeof player !== 'undefined' && player) {
      return { x: player.pos.x, y: player.pos.y };
    }
    return null;
  }

  /**
   * Dispatch a keyboard event to simulate key press
   * @param {string} key - The key to simulate (e.g., 'ArrowUp')
   * @param {string} type - 'keydown' or 'keyup'
   */
  function dispatchKeyEvent(key, type) {
    const event = new KeyboardEvent(type, {
      key: key,
      code: key,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
  }

  /**
   * Calculate direction from fish position to touch position
   * Returns normalized direction and distance
   */
  function calculateDirection(fishPos, touchPos) {
    const dx = touchPos.x - fishPos.x;
    const dy = touchPos.y - fishPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      // Too close, stop moving
      return { x: 0, y: 0, distance };
    }

    // Normalize direction
    return {
      x: dx / distance,
      y: dy / distance,
      distance,
    };
  }

  /**
   * Update keyboard input based on touch direction
   * Uses threshold to determine which keys to press
   */
  function updateKeyboardInput(direction) {
    const THRESHOLD = 0.5; // Directional threshold (0-1 scale)

    // Determine which directions should be active
    const newDirections = {
      up: direction.y < -THRESHOLD,
      down: direction.y > THRESHOLD,
      left: direction.x < -THRESHOLD,
      right: direction.x > THRESHOLD,
    };

    // Dispatch keydown for newly active directions
    if (!activeDirections.up && newDirections.up) {
      dispatchKeyEvent('ArrowUp', 'keydown');
    }
    if (!activeDirections.down && newDirections.down) {
      dispatchKeyEvent('ArrowDown', 'keydown');
    }
    if (!activeDirections.left && newDirections.left) {
      dispatchKeyEvent('ArrowLeft', 'keydown');
    }
    if (!activeDirections.right && newDirections.right) {
      dispatchKeyEvent('ArrowRight', 'keydown');
    }

    // Dispatch keyup for directions that became inactive
    if (activeDirections.up && !newDirections.up) {
      dispatchKeyEvent('ArrowUp', 'keyup');
    }
    if (activeDirections.down && !newDirections.down) {
      dispatchKeyEvent('ArrowDown', 'keyup');
    }
    if (activeDirections.left && !newDirections.left) {
      dispatchKeyEvent('ArrowLeft', 'keyup');
    }
    if (activeDirections.right && !newDirections.right) {
      dispatchKeyEvent('ArrowRight', 'keyup');
    }

    // Update state
    Object.assign(activeDirections, newDirections);
  }

  /**
   * Stop all movement
   */
  function stopAllMovement() {
    if (activeDirections.up) dispatchKeyEvent('ArrowUp', 'keyup');
    if (activeDirections.down) dispatchKeyEvent('ArrowDown', 'keyup');
    if (activeDirections.left) dispatchKeyEvent('ArrowLeft', 'keyup');
    if (activeDirections.right) dispatchKeyEvent('ArrowRight', 'keyup');

    Object.assign(activeDirections, {
      up: false,
      down: false,
      left: false,
      right: false,
    });
  }

  /**
   * Convert touch coordinates to game canvas coordinates
   */
  function getTouchCanvasCoords(touchEvent) {
    const canvasInfo = getCanvasInfo();
    if (!canvasInfo) return null;

    const touch = touchEvent.touches[0];
    if (!touch) return null;

    const x = touch.clientX - canvasInfo.rect.left;
    const y = touch.clientY - canvasInfo.rect.top;

    return { x, y };
  }

  // ============================================================================
  // TOUCH EVENT HANDLERS
  // ============================================================================

  function handleTouchStart(e) {
    e.preventDefault(); // Prevent scrolling
    isTouching = true;

    const coords = getTouchCanvasCoords(e);
    if (coords) {
      touchX = coords.x;
      touchY = coords.y;
    }
  }

  function handleTouchMove(e) {
    if (!isTouching) return;
    e.preventDefault(); // Prevent scrolling

    const coords = getTouchCanvasCoords(e);
    if (!coords) return;

    touchX = coords.x;
    touchY = coords.y;

    // Update player movement based on touch position
    const playerPos = getPlayerPosition();
    if (!playerPos) return;

    const direction = calculateDirection(playerPos, { x: touchX, y: touchY });
    updateKeyboardInput(direction);
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    isTouching = false;

    // Stop all movement when touch ends
    stopAllMovement();

    touchX = 0;
    touchY = 0;
    lastDirection = { x: 0, y: 0 };
  }

  function handleTouchCancel(e) {
    e.preventDefault();
    isTouching = false;
    stopAllMovement();

    touchX = 0;
    touchY = 0;
    lastDirection = { x: 0, y: 0 };
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function initialize() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
      console.warn('mobileTouchControls: gameCanvas not found');
      return;
    }

    // Add touch event listeners
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    console.log('mobileTouchControls: Touch-to-move initialized for mobile devices');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
