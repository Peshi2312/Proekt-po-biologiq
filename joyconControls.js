/**
 * Inline Joycon Controls
 * Handles touch/mouse events on the D-pad buttons below the game canvas.
 * Dispatches ArrowUp/Down/Left/Right keyboard events to control the fish.
 */
(function () {
  function fireKey(key, isDown) {
    const codes = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 };
    window.dispatchEvent(
      new KeyboardEvent(isDown ? "keydown" : "keyup", {
        key,
        code: key,
        keyCode: codes[key],
        which: codes[key],
        bubbles: true,
        cancelable: true,
      })
    );
  }

  // Track which keys are currently held so rapid re-fires don't stack
  const held = new Set();

  function press(key) {
    if (!held.has(key)) {
      held.add(key);
      fireKey(key, true);
    }
  }

  function release(key) {
    if (held.has(key)) {
      held.delete(key);
      fireKey(key, false);
    }
  }

  function releaseAll() {
    held.forEach((key) => fireKey(key, false));
    held.clear();
  }

  function isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  function bindBtn(btn) {
    const key = btn.dataset.key;
    if (!key) return; // action buttons (ABXY) are decorative

    function onStart(e) {
      e.preventDefault();
      btn.classList.add("pressed");
      press(key);
    }

    function onMove(e) {
      // Prevent scroll from cancelling the button press
      e.preventDefault();
    }

    function onEnd(e) {
      e.preventDefault();
      btn.classList.remove("pressed");
      release(key);
    }

    btn.addEventListener("touchstart", onStart, { passive: false });
    btn.addEventListener("touchmove",  onMove,  { passive: false });
    btn.addEventListener("touchend",   onEnd,   { passive: false });
    btn.addEventListener("touchcancel", onEnd,  { passive: false });

    // Mouse fallback for desktop testing
    btn.addEventListener("mousedown",  onStart);
    btn.addEventListener("mouseup",    onEnd);
    btn.addEventListener("mouseleave", onEnd);
  }

  function init() {
    const strip = document.getElementById("joyconControls");
    if (!strip) return;

    // Force-show on touch devices — don't rely solely on the CSS media query,
    // which can miss phones with unusual viewport widths or zoom levels.
    if (isTouchDevice()) {
      strip.style.display = "flex";
    }

    // Prevent the whole strip from scrolling the page while the player
    // is using the controls (critical for real phones).
    strip.addEventListener("touchmove", function (e) {
      e.preventDefault();
    }, { passive: false });

    strip.querySelectorAll(".dpad-btn").forEach(bindBtn);

    // Release all keys if touch lifts anywhere on the strip
    strip.addEventListener("touchend",    releaseAll, { passive: true });
    strip.addEventListener("touchcancel", releaseAll, { passive: true });
  }

  // The script is loaded at the bottom of <body>, so the DOM is already
  // parsed — but DOMContentLoaded may have already fired on some browsers.
  // Guard against both cases.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
