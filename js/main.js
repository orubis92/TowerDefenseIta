/* ==========================================================
   Avvio: game loop + PWA
   ========================================================== */
(function () {
  const canvas = document.getElementById("game");
  const game = new Game();
  canvas.width = game.width;
  canvas.height = game.height;
  const renderer = new Renderer(canvas, game);
  const ui = new UI(game, canvas);

  /* Adatta la mappa allo spazio disponibile: mai più larga della colonna,
     mai più alta di quel che resta sotto la barra in alto. */
  const wrap = document.getElementById("canvas-wrap");
  const frameEl = document.querySelector(".canvas-frame");
  function fitCanvas() {
    if (document.getElementById("main").classList.contains("hidden")) return;
    const topbar = document.getElementById("topbar").getBoundingClientRect().height;
    const under = document.querySelector(".under-canvas");
    const underH = under && getComputedStyle(under).display !== "none" ? under.getBoundingClientRect().height + 10 : 0;
    const landscapePhone = window.matchMedia("(max-height: 520px) and (orientation: landscape)").matches;
    const availW = wrap.clientWidth - 12;
    const availH = Math.max(160, window.innerHeight - topbar - underH - (landscapePhone ? 16 : 40));
    let w = Math.min(availW, 960), h = w * 480 / 768;
    if (h > availH) { h = availH; w = h * 768 / 480; }
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    frameEl.style.width = (w + 12) + "px";
  }
  window.addEventListener("resize", fitCanvas);
  window.addEventListener("orientationchange", () => setTimeout(fitCanvas, 150));
  game.on("map-loaded", () => setTimeout(fitCanvas, 0));
  new MutationObserver(fitCanvas).observe(document.getElementById("main"), { attributes: true, attributeFilter: ["class"] });
  fitCanvas();

  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1; // evita salti dopo un tab in background
    game.update(dt);
    renderer.draw(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // aggiorna i pulsanti del negozio quando cambia l'oro (evento "change"
  // scatta già a ogni uccisione, ma un refresh periodico copre gli altri casi)
  setInterval(() => ui.refresh(), 500);

  // Service worker (solo su http/https: da file:// non è disponibile)
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(err => console.warn("SW non registrato:", err));
    });
  }

  // musica: metti in pausa quando la scheda non è visibile
  document.addEventListener("visibilitychange", () => {
    if (!ui.audio || !ui.audio.ctx) return;
    if (document.hidden) ui.audio.ctx.suspend(); else ui.audio.ctx.resume();
  });

  // esposto per debug dalla console
  window.__game = game;
})();
