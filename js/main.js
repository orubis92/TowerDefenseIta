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

  ui.showOverlay(
    "Trattoria Defense",
    "I clienti sgraditi stanno entrando: ananas sulla pizza, ketchup sulla pasta, cappuccini dopo pranzo…\nSchiera la brigata di cucina e non farli arrivare in sala!",
    "Inizia il servizio"
  );

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

  // esposto per debug dalla console
  window.__game = game;
})();
