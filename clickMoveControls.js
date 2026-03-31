/**
 * clickMoveControls.js
 * 
 * Adds click-to-move (desktop) and touch-to-move (mobile) controls for the game.
 * 
 * BEHAVIOR:
 * - On desktop: Click and drag on the canvas to move the fish toward the cursor.
 * - On mobile: Touch and drag on the canvas to move the fish toward your finger.
 * 
 * IMPLEMENTATION:
 * - Detects click/touch position and compares it to fish position.
 * - Dispatches keyboard events (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
 *   to integrate with existing game input handler.
 * - Does NOT modify movement logic; only adds input simulation layer.
 * 
 * Keyboard input object expected:
 * - input.up, input.down, input.left, input.right (boolean flags)
 * - Handled by existing game.js keydown/keyup listeners
 */

(function initClickMoveControls() {
  // ============================================================================
  // STATE TRACKING
  // ============================================================================

  let isMoving = false; // Whether click/touch is currently active
  let targetX = 0;
  let targetY = 0;

  // Track which directions are currently active to avoid duplicate key events
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
   * Calculate direction from fish position to target position
   * Returns normalized direction (x, y from -1 to 1) and distance
   */
  function calculateDirection(fishPos, targetPos) {
    const dx = targetPos.x - fishPos.x;
    const dy = targetPos.y - fishPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If fish is very close to target, consider it reached
    if (distance < 10) {
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
   * Update keyboard input based on direction
   * Uses threshold to determine which keys to press
   */
  function updateKeyboardInput(direction) {
    const THRESHOLD = 0.3; // Sensitivity threshold (0-1 scale)
    // Lower threshold = more responsive, more directions activate at once

    // Determine which directions should be active based on normalized direction
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
   * Stop all movement (release all keys)
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
   * Convert mouse/touch coordinates to canvas coordinates
   */
  function getPointerCanvasCoords(clientX, clientY) {
    const canvasInfo = getCanvasInfo();
    if (!canvasInfo) return null;

    const x = clientX - canvasInfo.rect.left;
    const y = clientY - canvasInfo.rect.top;

    // Clamp to canvas bounds
    return {
      x: Math.max(0, Math.min(x, canvasInfo.element.width)),
      y: Math.max(0, Math.min(y, canvasInfo.element.height)),
    };
  }

  /**
   * Animation loop: continuously update movement toward target
   * This runs even if user doesn't move pointer, ensures smooth motion
   */
  function updateMovement() {
    if (!isMoving) return;

    const playerPos = getPlayerPosition();
    if (!playerPos) return;

    const direction = calculateDirection(playerPos, { x: targetX, y: targetY });

    // If reached target, stop movement
    if (direction.distance < 10) {
      stopAllMovement();
      isMoving = false;
      return;
    }

    updateKeyboardInput(direction);
  }

  // ============================================================================
  // MOUSE EVENT HANDLERS
  // ============================================================================

  function handleMouseDown(e) {
    // Only respond to primary button (left click)
    if (e.button !== 0) return;

    const canvasInfo = getCanvasInfo();
    if (!canvasInfo) return;

    isMoving = true;

    const coords = getPointerCanvasCoords(e.clientX, e.clientY);
    if (coords) {
      targetX = coords.x;
      targetY = coords.y;
    }
  }

  function handleMouseMove(e) {
    if (!isMoving) return;

    const coords = getPointerCanvasCoords(e.clientX, e.clientY);
    if (coords) {
      targetX = coords.x;
      targetY = coords.y;
    }
  }

  function handleMouseUp(e) {
    // Stop movement when mouse button released
    isMoving = false;
    stopAllMovement();
    targetX = 0;
    targetY = 0;
  }

  /**
   * Stop movement if mouse leaves the canvas
   */
  function handleMouseLeave(e) {
    if (isMoving) {
      isMoving = false;
      stopAllMovement();
      targetX = 0;
      targetY = 0;
    }
  }

  // ============================================================================
  // TOUCH EVENT HANDLERS (for mobile)
  // ============================================================================

  function handleTouchStart(e) {
    // Prevent page scrolling while interacting with canvas
    e.preventDefault();

    if (e.touches.length === 0) return;
    
    isMoving = true;

    const coords = getPointerCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
    if (coords) {
      targetX = coords.x;
      targetY = coords.y;
    }
  }

  function handleTouchMove(e) {
    if (!isMoving || e.touches.length === 0) return;

    // Prevent page scrolling
    e.preventDefault();

    const coords = getPointerCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
    if (coords) {
      targetX = coords.x;
      targetY = coords.y;
    }
  }

  function handleTouchEnd(e) {
    // Prevent page scrolling
    e.preventDefault();

    // Stop movement when touch ends
    isMoving = false;
    stopAllMovement();
    targetX = 0;
    targetY = 0;
  }

  function handleTouchCancel(e) {
    // Prevent page scrolling
    e.preventDefault();

    // Stop movement if touch is cancelled
    isMoving = false;
    stopAllMovement();
    targetX = 0;
    targetY = 0;
  }

  // ============================================================================
  // ANIMATION LOOP
  // ============================================================================

  /**
   * Main update loop: processes movement every frame
   */
  function update() {
    updateMovement();
    requestAnimationFrame(update);
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function initialize() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
      console.warn('clickMoveControls: gameCanvas not found');
      return;
    }

    // Prevent scrolling while touching canvas
    canvas.style.touchAction = 'none';

    // ========== MOUSE EVENT LISTENERS ==========
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // ========== TOUCH EVENT LISTENERS ==========
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    // Start animation loop
    update();

    console.log('clickMoveControls: Click-to-move and touch-to-move initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
