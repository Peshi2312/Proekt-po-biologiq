/**
 * mobileControls.js
 * 
 * Adds a virtual joystick for touch devices without modifying existing game logic.
 * The joystick dispatches keyboard events (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
 * to integrate seamlessly with the existing keyboard input handler.
 * 
 * Only activates on:
 * - Touch-capable devices
 * - Screen width < 900px (responsive breakpoint)
 */

(function initMobileControls() {
  // ============================================================================
  // TOUCH DEVICE DETECTION
  // ============================================================================
  
  const isTouchDevice = () => {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  };

  const shouldShowJoystick = () => {
    return isTouchDevice() && window.innerWidth < 900;
  };

  // ============================================================================
  // STATE TRACKING
  // ============================================================================

  let isJoystickActive = false;
  let currentTouchId = null;
  let joystickBaseX = 0;
  let joystickBaseY = 0;
  let joystickStickX = 0;
  let joystickStickY = 0;

  // Track which directions are currently active
  const activeDirections = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  // ============================================================================
  // JOYSTICK PARAMETERS
  // ============================================================================

  const JOYSTICK_BASE_RADIUS = 60;
  const JOYSTICK_STICK_RADIUS = 20;
  const JOYSTICK_DEAD_ZONE = 15; // pixels from center before input registers
  const JOYSTICK_POSITION_OFFSET = 30; // pixels from bottom-left corner

  // ============================================================================
  // DOM CREATION & INITIALIZATION
  // ============================================================================

  function createJoystickElements() {
    // Create container
    const container = document.createElement('div');
    container.id = 'mobile-joystick-container';
    container.className = 'mobile-joystick-container';

    // Create base circle (background)
    const base = document.createElement('div');
    base.className = 'mobile-joystick-base';
    base.id = 'mobile-joystick-base';

    // Create stick circle (draggable element)
    const stick = document.createElement('div');
    stick.className = 'mobile-joystick-stick';
    stick.id = 'mobile-joystick-stick';

    base.appendChild(stick);
    container.appendChild(base);

    return { container, base, stick };
  }

  function injectJoystick() {
    if (document.getElementById('mobile-joystick-container')) {
      return; // Already injected
    }

    const { container } = createJoystickElements();
    document.body.appendChild(container);

    const baseElement = document.getElementById('mobile-joystick-base');
    const baseRect = baseElement.getBoundingClientRect();
    joystickBaseX = baseRect.left + baseRect.width / 2;
    joystickBaseY = baseRect.top + baseRect.height / 2;
    joystickStickX = joystickBaseX;
    joystickStickY = joystickBaseY;

    attachJoystickEventListeners();
  }

  // ============================================================================
  // KEYBOARD EVENT DISPATCH
  // ============================================================================

  function dispatchKeyboardEvent(key, isKeyDown) {
    const eventType = isKeyDown ? 'keydown' : 'keyup';
    const event = new KeyboardEvent(eventType, {
      key: key,
      code: key,
      keyCode: getKeyCode(key),
      which: getKeyCode(key),
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
  }

  function getKeyCode(key) {
    const keyCodes = {
      'ArrowUp': 38,
      'ArrowDown': 40,
      'ArrowLeft': 37,
      'ArrowRight': 39,
    };
    return keyCodes[key] || 0;
  }

  function updateDirectionState(direction, isActive) {
    if (activeDirections[direction] === isActive) {
      return; // No change
    }

    activeDirections[direction] = isActive;

    // Map direction to keyboard key
    const directionKeyMap = {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
    };

    const key = directionKeyMap[direction];
    dispatchKeyboardEvent(key, isActive);
  }

  function updateJoystickDirections(stickX, stickY) {
    const dx = stickX - joystickBaseX;
    const dy = stickY - joystickBaseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if we're in the dead zone
    if (distance < JOYSTICK_DEAD_ZONE) {
      updateDirectionState('up', false);
      updateDirectionState('down', false);
      updateDirectionState('left', false);
      updateDirectionState('right', false);
      return;
    }

    // Determine active directions based on angle
    // Divide into 8 zones, with clear primary directions
    const angle = Math.atan2(dy, dx);
    const angleDeg = (angle * 180) / Math.PI;

    // Define directional thresholds (45-degree zones)
    const isUp = angleDeg > -135 && angleDeg < -45;
    const isDown = angleDeg > 45 && angleDeg < 135;
    const isLeft = angleDeg > 135 || angleDeg < -135;
    const isRight = angleDeg > -45 && angleDeg < 45;

    updateDirectionState('up', isUp);
    updateDirectionState('down', isDown);
    updateDirectionState('left', isLeft);
    updateDirectionState('right', isRight);
  }

  // ============================================================================
  // TOUCH EVENT HANDLERS
  // ============================================================================

  function attachJoystickEventListeners() {
    const baseElement = document.getElementById('mobile-joystick-base');
    const stickElement = document.getElementById('mobile-joystick-stick');

    document.addEventListener('touchstart', (e) => {
      // Only handle if not already tracking a touch
      if (isJoystickActive && currentTouchId !== null) {
        return;
      }

      // Check if touch is on the joystick base
      const touch = e.touches[0];
      const baseRect = baseElement.getBoundingClientRect();
      const touchX = touch.clientX;
      const touchY = touch.clientY;

      const distanceFromCenter = Math.sqrt(
        Math.pow(touchX - (baseRect.left + baseRect.width / 2), 2) +
        Math.pow(touchY - (baseRect.top + baseRect.height / 2), 2)
      );

      if (distanceFromCenter <= JOYSTICK_BASE_RADIUS + 20) {
        isJoystickActive = true;
        currentTouchId = touch.identifier;
        e.preventDefault();
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (!isJoystickActive || currentTouchId === null) {
        return;
      }

      let touchFound = false;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === currentTouchId) {
          touchFound = true;
          const touchX = touch.clientX;
          const touchY = touch.clientY;

          // Constrain stick position within the base circle
          const dx = touchX - joystickBaseX;
          const dy = touchY - joystickBaseY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > JOYSTICK_BASE_RADIUS) {
            // Clamp to circle boundary
            const angle = Math.atan2(dy, dx);
            joystickStickX = joystickBaseX + Math.cos(angle) * JOYSTICK_BASE_RADIUS;
            joystickStickY = joystickBaseY + Math.sin(angle) * JOYSTICK_BASE_RADIUS;
          } else {
            joystickStickX = touchX;
            joystickStickY = touchY;
          }

          // Update stick visual position
          const offsetX = joystickStickX - joystickBaseX;
          const offsetY = joystickStickY - joystickBaseY;
          stickElement.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

          // Update direction keypresses
          updateJoystickDirections(joystickStickX, joystickStickY);

          e.preventDefault();
          break;
        }
      }

      if (!touchFound) {
        reset();
      }
    });

    document.addEventListener('touchend', (e) => {
      if (!isJoystickActive || currentTouchId === null) {
        return;
      }

      let touchFound = false;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === currentTouchId) {
          touchFound = true;
          break;
        }
      }

      if (!touchFound) {
        reset();
      }

      e.preventDefault();
    });

    document.addEventListener('touchcancel', (e) => {
      if (isJoystickActive) {
        reset();
      }
      e.preventDefault();
    });
  }

  function reset() {
    isJoystickActive = false;
    currentTouchId = null;

    // Release all direction keys
    updateDirectionState('up', false);
    updateDirectionState('down', false);
    updateDirectionState('left', false);
    updateDirectionState('right', false);

    // Reset stick position to center
    const stickElement = document.getElementById('mobile-joystick-stick');
    if (stickElement) {
      stickElement.style.transform = 'translate(0, 0)';
    }

    joystickStickX = joystickBaseX;
    joystickStickY = joystickBaseY;
  }

  // ============================================================================
  // RESPONSIVE VISIBILITY
  // ============================================================================

  function updateVisibility() {
    const container = document.getElementById('mobile-joystick-container');
    if (!container) return;

    if (shouldShowJoystick()) {
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
      reset();
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function init() {
    if (!isTouchDevice()) {
      return; // Do not inject on non-touch devices
    }

    injectJoystick();
    updateVisibility();

    // Respond to window resize
    window.addEventListener('resize', updateVisibility);
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
