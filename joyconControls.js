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

  function bindBtn(btn) {
    const key = btn.dataset.key;
    if (!key) return; // action buttons have no data-key — they're decorative

    function onStart(e) {
      e.preventDefault();
      btn.classList.add("pressed");
      press(key);
    }

    function onEnd(e) {
      e.preventDefault();
      btn.classList.remove("pressed");
      release(key);
    }

    btn.addEventListener("touchstart", onStart, { passive: false });
    btn.addEventListener("touchend", onEnd, { passive: false });
    btn.addEventListener("touchcancel", onEnd, { passive: false });

    // Mouse fallback (useful when testing on desktop)
    btn.addEventListener("mousedown", onStart);
    btn.addEventListener("mouseup", onEnd);
    btn.addEventListener("mouseleave", onEnd);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const strip = document.getElementById("joyconControls");
    if (!strip) return;

    strip.querySelectorAll(".dpad-btn").forEach(bindBtn);

    // Release all held keys if touch leaves the strip entirely
    strip.addEventListener("touchend", releaseAll, { passive: true });
    strip.addEventListener("touchcancel", releaseAll, { passive: true });
  });
})();