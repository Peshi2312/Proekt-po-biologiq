/**
 * Mobile Virtual Joystick
 * Adds an on-screen joystick for touch devices
 * Simulates keyboard input (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
 * Does NOT modify game movement logic
 */

(function() {
  // Detect touch devices
  const isTouchDevice = () => {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  };

  // Only initialize on touch devices
  if (!isTouchDevice()) {
    return;
  }

  // Configuration
  const JOYSTICK_SIZE = 120;
  const THUMB_SIZE = 40;
  const DEAD_ZONE = 15;
  const MIN_SCREEN_WIDTH = 900;

  // State
  let joystickActive = false;
  let currentKeys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
  };

  // Create joystick elements
  function createJoystick() {
    const container = document.createElement('div');
    container.className = 'mobile-joystick-container';
    container.id = 'joystick-container';

    const base = document.createElement('div');
    base.className = 'mobile-joystick-base';
    base.id = 'joystick-base';

    const thumb = document.createElement('div');
    thumb.className = 'mobile-joystick-thumb';
    thumb.id = 'joystick-thumb';

    base.appendChild(thumb);
    container.appendChild(base);
    document.body.appendChild(container);

    return { container, base, thumb };
  }

  /**
   * Dispatch keyboard event
   * @param {string} key - Key name (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
   * @param {boolean} isDown - true for keydown, false for keyup
   */
  function dispatchKeyEvent(key, isDown) {
    const eventType = isDown ? 'keydown' : 'keyup';
    const keyCode = {
      'ArrowUp': 38,
      'ArrowDown': 40,
      'ArrowLeft': 37,
      'ArrowRight': 39
    }[key];

    const event = new KeyboardEvent(eventType, {
      key: key,
      code: key,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true
    });

    document.dispatchEvent(event);
  }

  /**
   * Update keyboard state and dispatch events
   * @param {Object} newKeys - New key state
   */
  function updateKeyState(newKeys) {
    for (const key in currentKeys) {
      if (currentKeys[key] !== newKeys[key]) {
        currentKeys[key] = newKeys[key];
        dispatchKeyEvent(key, newKeys[key]);
      }
    }
  }

  /**
   * Calculate joystick direction from touch position
   * @param {number} offsetX - Offset from joystick center X
   * @param {number} offsetY - Offset from joystick center Y
   * @returns {Object} - Direction keys to press
   */
  function calculateDirection(offsetX, offsetY) {
    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    
    // Apply dead zone
    if (distance < DEAD_ZONE) {
      return {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false
      };
    }

    // Calculate angle (0° = up, 90° = right, 180° = down, 270° = left)
    const angle = Math.atan2(offsetX, -offsetY) * (180 / Math.PI);

    // 8-directional input with 45° zones
    const keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    };

    // Define 8 directions with 45° zones
    if (angle >= -22.5 && angle < 22.5) {
      keys.ArrowUp = true;
    } else if (angle >= 22.5 && angle < 67.5) {
      keys.ArrowUp = true;
      keys.ArrowRight = true;
    } else if (angle >= 67.5 && angle < 112.5) {
      keys.ArrowRight = true;
    } else if (angle >= 112.5 && angle < 157.5) {
      keys.ArrowDown = true;
      keys.ArrowRight = true;
    } else if (angle >= 157.5 || angle < -157.5) {
      keys.ArrowDown = true;
    } else if (angle >= -157.5 && angle < -112.5) {
      keys.ArrowDown = true;
      keys.ArrowLeft = true;
    } else if (angle >= -112.5 && angle < -67.5) {
      keys.ArrowLeft = true;
    } else if (angle >= -67.5 && angle < -22.5) {
      keys.ArrowUp = true;
      keys.ArrowLeft = true;
    }

    return keys;
  }

  /**
   * Update thumb position and movement keys
   * @param {number} offsetX - Offset from joystick center X
   * @param {number} offsetY - Offset from joystick center Y
   * @param {HTMLElement} thumb - Thumb element
   */
  function updateThumbPosition(offsetX, offsetY, thumb) {
    // Constrain thumb within base circle
    const maxDistance = (JOYSTICK_SIZE - THUMB_SIZE) / 2;
    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

    let constrainedX = offsetX;
    let constrainedY = offsetY;

    if (distance > maxDistance) {
      const ratio = maxDistance / distance;
      constrainedX = offsetX * ratio;
      constrainedY = offsetY * ratio;
    }

    // Update thumb visual position
    thumb.style.transform = `translate(calc(-50% + ${constrainedX}px), calc(-50% + ${constrainedY}px))`;

    // Calculate and dispatch direction keys
    const newKeys = calculateDirection(constrainedX, constrainedY);
    updateKeyState(newKeys);
  }

  /**
   * Reset thumb to center and stop all movement
   * @param {HTMLElement} thumb - Thumb element
   */
  function resetThumb(thumb) {
    thumb.style.transform = 'translate(-50%, -50%)';
    updateKeyState({
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    });
  }

  /**
   * Check if joystick should be visible
   */
  function shouldShowJoystick() {
    return window.innerWidth < MIN_SCREEN_WIDTH && isTouchDevice();
  }

  /**
   * Toggle joystick visibility
   * @param {HTMLElement} container - Joystick container
   */
  function updateJoystickVisibility(container) {
    container.style.display = shouldShowJoystick() ? 'block' : 'none';
  }

  // Initialize
  const joystick = createJoystick();
  updateJoystickVisibility(joystick.container);

  // Touch event handlers
  joystick.base.addEventListener('touchstart', function(e) {
    e.preventDefault();
    joystickActive = true;
  });

  joystick.base.addEventListener('touchmove', function(e) {
    e.preventDefault();

    if (!joystickActive) return;

    const touch = e.touches[0];
    const baseRect = joystick.base.getBoundingClientRect();
    const baseCenterX = baseRect.left + baseRect.width / 2;
    const baseCenterY = baseRect.top + baseRect.height / 2;

    const offsetX = touch.clientX - baseCenterX;
    const offsetY = touch.clientY - baseCenterY;

    updateThumbPosition(offsetX, offsetY, joystick.thumb);
  });

  joystick.base.addEventListener('touchend', function(e) {
    e.preventDefault();
    joystickActive = false;
    resetThumb(joystick.thumb);
  });

  joystick.base.addEventListener('touchcancel', function(e) {
    e.preventDefault();
    joystickActive = false;
    resetThumb(joystick.thumb);
  });

  // Handle window resize to show/hide joystick
  window.addEventListener('resize', function() {
    updateJoystickVisibility(joystick.container);
  });

  // Prevent default touch behavior on joystick
  joystick.container.style.touchAction = 'none';
})();
