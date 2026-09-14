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

- Scegli un cuoco nel pannello **Brigata di cucina** (o tasti `1`–`4`), poi tocca una piastrella libera per piazzarlo. `Esc` o tasto destro annullano.
- Tocca una postazione per **potenziarla** (3 livelli) o **venderla** (rimborso 60%).
- **Fai entrare i clienti** (o `Spazio`) avvia l'ondata. 10 ondate; l'ultima ha il boss.
- Ogni nemico che arriva in **SALA** toglie clienti soddisfatti (vite). A zero, la trattoria chiude.
- `⏩` cambia velocità 1×/2×, `⏸` mette in pausa.

## Brigata

| Cuoco | Costo | Ruolo |
|---|---|---|
| 🍕 Pizzaiolo | 60 | Equilibrato, bersaglio singolo |
| 👵 Nonna | 80 | Danno ad area, corta gittata |
| 🍦 Gelataio | 75 | Poco danno, rallenta i nemici |
| 🍷 Sommelier | 100 | Lunga gittata, colpo lento e pesante |

## Struttura

```
index.html            layout e pannelli
css/style.css         stile, responsive (colonna unica sotto 860px)
js/config.js          TUTTI i numeri: mappa, torri, nemici, ondate
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

Prototipo v0.1: 1 mappa, 4 torri con 3 livelli, 4 nemici (1 boss), 10 ondate, vittoria/sconfitta.

Da fare / aperto:
- Bilanciamento: in simulazione automatica il gioco è vincibile con strategie diverse, ma "solo pizzaioli" è la più forte; da rivedere dopo prove reali.
- Più mappe e selezione livello, salvataggio progressi (localStorage).
- Suoni ed effetti.
- Sprite disegnati al posto delle emoji (le emoji dipendono dal sistema operativo).
- Torri extra a tema (es. Barista con caffè che "sveglia", Carabiniere, Nonno con la grappa).
