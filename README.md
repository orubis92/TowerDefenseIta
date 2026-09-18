# Trattoria Defense 🍕

Tower defense in stile italiano, a tema cucina e in tono comico: difendi la trattoria dai "piatti sgraditi" (ananas sulla pizza, ketchup sulla pasta, cappuccino dopo pranzo, carbonara con la panna) schierando la brigata di cucina.

**Stack:** HTML5 Canvas + JavaScript vanilla, nessun build tool, PWA installabile e giocabile offline.

## Avvio

Basta aprire `index.html` nel browser. Per il service worker (offline/installazione) serve un server http, ad esempio:

```
python -m http.server 8080
```

e poi aprire `http://localhost:8080`.

## Come si gioca

- Dal **menu** scegli il locale (3 mappe con difficoltà crescente). Stelle e record si salvano nel browser.
- Scegli un cuoco nel pannello **Brigata di cucina** (o tasti `1`–`7`), poi tocca una piastrella libera per piazzarlo. `Esc` o tasto destro annullano.
- Tocca una postazione per **potenziarla** (3 livelli) o **venderla** (rimborso 60%).
- **Fai entrare i clienti** (o `Spazio`) avvia l'ondata. 10 ondate; l'ultima ha il boss del locale.
- **Abilità speciali** (`Q` `W` `E`) con ricarica: *Mamma mia!* blocca tutti i nemici, *Espresso* raddoppia la cadenza delle torri, *Olio bollente* danneggia un'area a scelta e lascia una pozza di fuoco.
- Ogni nemico che arriva in **SALA** toglie clienti soddisfatti (vite). A zero, la trattoria chiude.
- Dopo l'ondata 10 puoi continuare in **modalità infinita**: ondate generate sempre più dure, boss ogni 5, record di ondata e punteggio per locale.
- `⏩` cambia velocità 1×/2×/3×, `⏱` avvia da solo l'ondata successiva dopo 4 s, `⏸` mette in pausa, `☰` torna al menu. `🔊` e `🎵` accendono/spengono effetti e musica (preferenze salvate).

## Brigata

| Cuoco | Costo | Ruolo |
|---|---|---|
| 🍕 Pizzaiolo | 60 | Equilibrato, bersaglio singolo |
| 👵 Nonna | 80 | Danno ad area, corta gittata |
| 🍦 Gelataio | 75 | Poco danno, rallenta i nemici |
| 🍷 Sommelier | 100 | Lunga gittata, colpo lento e pesante |
| ☕ Barista | 90 | Raffica di colpi leggeri |
| 👮 Carabiniere | 110 | Ferma il bersaglio per qualche secondo |
| 👴 Nonno | 120 | Grappa in fiamme: pozza di fuoco sul percorso |

## Clienti sgraditi

🍍 Ananas (base) · 🥫 Ketchup (veloce) · ☕ Cappuccino (corazzato) · 🎒 Turista con lo zaino (tank) · 🤳 Influencer (si teletrasporta in avanti) · Boss: 🍝 Carbonara con la panna, 🍍 Ananas Gigante (alla morte si divide in 6 ananas).

## Struttura

```
index.html            layout e pannelli
css/style.css         stile, responsive (colonna unica sotto 860px)
js/config.js          TUTTI i numeri: mappe, torri, abilità, nemici, ondate, generatore infinito
js/sprites.js         personaggi e proiettili disegnati a codice (canvas), stessi su ogni sistema
js/audio.js           effetti e musica sintetizzati con Web Audio (nessun file audio)
js/entities.js        Enemy, Tower, Projectile, Effect, FloatingText
js/game.js            stato, ondate, azioni del giocatore, update loop
js/render.js          disegno su canvas (sfondo pre-renderizzato)
js/ui.js              negozio, pannello selezione, overlay, input
js/main.js            avvio, game loop, registrazione service worker
sw.js                 cache offline
manifest.webmanifest  PWA
```

Per cambiare il bilanciamento o aggiungere torri/nemici/ondate si tocca solo `js/config.js`. Una nuova mappa è un array di waypoint in coordinate di cella.

## Stato e prossimi passi

v0.5: sprite vettoriali per cuochi, nemici e proiettili (niente più emoji nel gioco). v0.4: 3 mappe con menu e salvataggio (stelle, record), 7 torri × 3 livelli, 7 nemici (2 boss), 3 abilità speciali, 10 ondate + modalità infinita, punteggio, audio sintetizzato (effetti + tarantella di sottofondo), velocità 3×, ondate automatiche.

Da fare / aperto:
- Bilanciamento con prove reali (in simulazione tutte le mappe sono vincibili; in modalità infinita una difesa "statica" cede verso l'ondata 15).
- Cache del service worker: alzare la versione in `sw.js` a ogni rilascio.
