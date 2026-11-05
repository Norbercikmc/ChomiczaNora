(function () {
  "use strict";

  var d = document;
  var hit = d.getElementById("l");
  var toast = d.createElement("div");
  var toastTimer;
  var keyBuffer = "";
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");

  toast.className = "egg";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  d.body.appendChild(toast);

  function announce(text) {
    toast.textContent = text;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 6000);
  }

  d.addEventListener("keydown", function (event) {
    if (event.key.length !== 1) return;
    keyBuffer = (keyBuffer + event.key.toLowerCase()).slice(-9);
    if (keyBuffer !== "minecraft") return;
    keyBuffer = "";
    announce("Serwer Minecraft: wersja 31");
  });

  if (!hit) return;
  hit.addEventListener("click", function () {
    // Gra ma własną animację i licznik kliknięć.
    if (d.querySelector('script[src*="game.js"]')) return;
    if (reducedMotion && reducedMotion.matches) return;
    hit.classList.remove("is-tapped");
    void hit.offsetWidth;
    hit.classList.add("is-tapped");
  });

  hit.addEventListener("animationend", function (event) {
    if (event.animationName === "halo") hit.classList.remove("is-tapped");
  });
})();
