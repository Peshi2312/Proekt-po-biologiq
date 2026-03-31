/**
 * clickMoveControls.js
 * Adds click-to-move (desktop) and touch-to-move (mobile) controls to the game.
 * 
 * The player can click or touch anywhere on the canvas to make the fish move toward that position.
 * Movement continues while the pointer is held, and stops when released or target is reached.
 * 
 * IMPORTANT: This system only dispatches keyboard events. It does NOT modify game logic.
 */

(function initClickMoveControls() {
  // Wait for canvas and player to be initialized
  setTimeout(function setupClickMoveControls() {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) return;

    // Configuration
    const STOP_DISTANCE_THRESHOLD = 30; // pixels - distance at which to stop moving
    const CHECK_INTERVAL = 50; // ms - how often to update direction

    // State
    let isPointerDown = false;
    let targetX = null;
    let targetY = null;
    let updateIntervalId = null;

    /**
     * Get canvas-relative coordinates from a pointer event
     */
    function getCanvasCoords(event) {
      const rect = canvas.getBoundingClientRect();
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    }

    /**
     * Dispatch a keyboard event to simulate arrow key press
     */
    function dispatchKeyboardEvent(key, type = "keydown") {
      const event = new KeyboardEvent(type, {
        key: key,
        code: `Arrow${key.replace("Arrow", "")}`,
        keyCode: {
          ArrowUp: 38,
          ArrowDown: 40,
          ArrowLeft: 37,
          ArrowRight: 39,
        }[key],
        which: {
          ArrowUp: 38,
          ArrowDown: 40,
          ArrowLeft: 37,
          ArrowRight: 39,
        }[key],
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);
    }

    /**
     * Stop all movement by firing keyup events for all arrow keys
     */
    function stopAllMovement() {
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].forEach((key) => {
        dispatchKeyboardEvent(key, "keyup");
      });
    }

    /**
     * Update movement direction based on player and target positions
     */
    function updateMovementDirection() {
      // Access global player object (set by game.js)
      if (typeof player === "undefined") return;

      const playerX = player.pos.x;
      const playerY = player.pos.y;
      const distanceToTarget = Math.hypot(
        targetX - playerX,
        targetY - playerY
      );

      // Stop if close enough to target
      if (distanceToTarget < STOP_DISTANCE_THRESHOLD) {
        stopAllMovement();
        isPointerDown = false;
        targetX = null;
        targetY = null;
        clearInterval(updateIntervalId);
        return;
      }

      // Determine direction(s) needed
      const dX = targetX - playerX;
      const dY = targetY - playerY;

      // Calculate angle to target
      const angle = Math.atan2(dY, dX);

      // Define 8 zones: each 45 degrees
      // Zone 0: right (0°), Zone 1: down-right (45°), Zone 2: down (90°), etc.
      const zone = Math.round(angle / (Math.PI / 4)) & 7; // & 7 wraps around 0-7

      // Stop all keys first
      stopAllMovement();

      // Dispatch appropriate keys based on zone
      // Using more relaxed diagonals for smooth 8-directional movement
      switch (zone) {
        case 0: // Right (0°)
          dispatchKeyboardEvent("ArrowRight", "keydown");
          break;
        case 1: // Down-Right (45°)
          dispatchKeyboardEvent("ArrowRight", "keydown");
          dispatchKeyboardEvent("ArrowDown", "keydown");
          break;
        case 2: // Down (90°)
          dispatchKeyboardEvent("ArrowDown", "keydown");
          break;
        case 3: // Down-Left (135°)
          dispatchKeyboardEvent("ArrowLeft", "keydown");
          dispatchKeyboardEvent("ArrowDown", "keydown");
          break;
        case 4: // Left (180°)
          dispatchKeyboardEvent("ArrowLeft", "keydown");
          break;
        case 5: // Up-Left (-135°)
          dispatchKeyboardEvent("ArrowLeft", "keydown");
          dispatchKeyboardEvent("ArrowUp", "keydown");
          break;
        case 6: // Up (-90°)
          dispatchKeyboardEvent("ArrowUp", "keydown");
          break;
        case 7: // Up-Right (-45°)
          dispatchKeyboardEvent("ArrowRight", "keydown");
          dispatchKeyboardEvent("ArrowUp", "keydown");
          break;
      }
    }

    /**
     * Mouse down - set target and start movement update loop
     */
    function handleMouseDown(e) {
      if (e.button !== 0) return; // Only left button
      isPointerDown = true;
      const coords = getCanvasCoords(e);
      targetX = coords.x;
      targetY = coords.y;

      // Start checking direction periodically
      clearInterval(updateIntervalId);
      updateMovementDirection(); // First update immediately
      updateIntervalId = setInterval(updateMovementDirection, CHECK_INTERVAL);
    }

    /**
     * Mouse move - update target while button is held
     */
    function handleMouseMove(e) {
      if (!isPointerDown) return;
      const coords = getCanvasCoords(e);
      targetX = coords.x;
      targetY = coords.y;
    }

    /**
     * Mouse up - stop movement
     */
    function handleMouseUp(e) {
      if (!isPointerDown) return;
      isPointerDown = false;
      stopAllMovement();
      clearInterval(updateIntervalId);
      targetX = null;
      targetY = null;
    }

    /**
     * Touch start - set target and start movement update loop
     */
    function handleTouchStart(e) {
      if (e.touches.length === 0) return;
      isPointerDown = true;
      const coords = getCanvasCoords(e);
      targetX = coords.x;
      targetY = coords.y;

      // Prevent page scrolling during touch
      e.preventDefault();

      // Start checking direction periodically
      clearInterval(updateIntervalId);
      updateMovementDirection(); // First update immediately
      updateIntervalId = setInterval(updateMovementDirection, CHECK_INTERVAL);
    }

    /**
     * Touch move - update target while touching
     */
    function handleTouchMove(e) {
      if (!isPointerDown || e.touches.length === 0) return;
      const coords = getCanvasCoords(e);
      targetX = coords.x;
      targetY = coords.y;

      // Prevent page scrolling during touch
      e.preventDefault();
    }

    /**
     * Touch end - stop movement
     */
    function handleTouchEnd(e) {
      if (!isPointerDown) return;
      isPointerDown = false;
      stopAllMovement();
      clearInterval(updateIntervalId);
      targetX = null;
      targetY = null;
    }

    // Attach event listeners to canvas
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp); // Global to catch releases outside canvas

    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchmove", handleTouchMove);
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("touchcancel", handleTouchEnd);

    // Prevent scrolling while interacting with canvas on touch devices
    canvas.style.touchAction = "none";
  }, 100); // Small delay to ensure canvas and player are initialized
})();
