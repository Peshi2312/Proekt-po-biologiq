/**
 * Inline Joystick Controls
 * Renders a draggable joystick below the game canvas on touch devices.
 * Dispatches ArrowUp/Down/Left/Right keyboard events to move the fish.
 */
(function () {
  const DEAD_ZONE = 12; // px — ignore tiny movements at centre

  function fireKey(key, isDown) {
    const codes = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 };
    window.dispatchEvent(
      new KeyboardEvent(isDown ? "keydown" : "keyup", {
        key, code: key,
        keyCode: codes[key], which: codes[key],
        bubbles: true, cancelable: true,
      })
    );
  }

  // Track active keys so we only fire events on state changes
  const held = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

  function setKey(key, active) {
    if (held[key] !== active) {
      held[key] = active;
      fireKey(key, active);
    }
  }

  function releaseAll() {
    Object.keys(held).forEach((k) => setKey(k, false));
  }

  // 8-directional: angle 0° = up, 90° = right, 180°/-180° = down, -90° = left
  function applyDirection(offsetX, offsetY) {
    const dist = Math.hypot(offsetX, offsetY);
    if (dist < DEAD_ZONE) {
      releaseAll();
      return;
    }
    const angle = Math.atan2(offsetX, -offsetY) * (180 / Math.PI);
    setKey("ArrowUp",    angle > -112.5 && angle <=  67.5);
    setKey("ArrowRight", angle >   22.5 && angle <= 157.5);
    setKey("ArrowDown",  angle >  112.5 || angle <= -112.5);
    setKey("ArrowLeft",  angle > -157.5 && angle <=  -22.5);
  }

  function isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  function moveThumb(base, thumb, offsetX, offsetY) {
    const maxR  = (base.offsetWidth - thumb.offsetWidth) / 2;
    const dist  = Math.hypot(offsetX, offsetY);
    const ratio = dist > maxR ? maxR / dist : 1;
    const cx    = offsetX * ratio;
    const cy    = offsetY * ratio;
    thumb.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`;
    applyDirection(cx, cy);
  }

  function init() {
    const wrap  = document.getElementById("joystickWrap");
    const base  = document.getElementById("joystickBase");
    const thumb = document.getElementById("joystickThumb");
    if (!wrap || !base || !thumb) return;

    // Force-show on touch devices regardless of CSS media query width edge cases
    if (isTouchDevice()) {
      wrap.style.display = "flex";
    }

    // Prevent page scroll while using the joystick
    wrap.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

    function getOffset(touch) {
      const rect = base.getBoundingClientRect();
      return {
        x: touch.clientX - rect.left  - rect.width  / 2,
        y: touch.clientY - rect.top   - rect.height / 2,
      };
    }

    base.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const { x, y } = getOffset(e.touches[0]);
      moveThumb(base, thumb, x, y);
    }, { passive: false });

    base.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const { x, y } = getOffset(e.touches[0]);
      moveThumb(base, thumb, x, y);
    }, { passive: false });

    function onEnd(e) {
      e.preventDefault();
      thumb.style.transform = "translate(-50%, -50%)";
      releaseAll();
    }

    base.addEventListener("touchend",    onEnd, { passive: false });
    base.addEventListener("touchcancel", onEnd, { passive: false });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
