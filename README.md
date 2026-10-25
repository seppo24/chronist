# Chronist – Pen & Paper

Webapp, um Pen-&-Paper-Abenteuer **mit Claude zu entwickeln** (inkl. eigenem Regelwerk pro Abenteuer) und sie anschließend **als Spielleiter durchzuführen**. Läuft als installierbare Web-App (PWA) auf Windows und Android (Chrome), gehostet über GitHub Pages, Daten lokal und optional in Dropbox.

Aktuelle Version: siehe [CHANGELOG.md](CHANGELOG.md) · Einrichtung & Bedienung: [ADMIN-ANLEITUNG.md](ADMIN-ANLEITUNG.md) · Prüfen: [TESTCHECKLISTE.md](TESTCHECKLISTE.md)

## Technik in Kürze

- Reines HTML/CSS/JavaScript (ES-Module), **kein Build-Schritt, kein Node.js nötig**. Einfach die Dateien ins Repository legen.
- Claude-API wird direkt aus dem Browser aufgerufen (Streaming, Werkzeuge/Tool-Use, Prompt-Caching). Der API-Key liegt nur lokal im Browser (`localStorage`).
- Speicher: IndexedDB; optional Dropbox-App-Ordner mit OAuth2-PKCE, Abgleich nach `updatedAt`, Löschvermerke. Bilder liegen als `.jpg` in `images/` (unveränderlich, daher einfacher Abgleich).
- Handlung: Szenen sind Knoten (`links`, `unlock`, `x`/`y`), Sitzungen merken `visited`/`forced`; Claude bekommt Werkzeuge `connect_scenes`, `disconnect_scenes`, `set_unlock_rule`.
- Service Worker: Netzwerk zuerst, Offline-Start aus dem Cache.

## Aufbau

```
index.html            Einstiegsseite
css/style.css         Design
js/app.js             Router, Kopfzeile, Start
js/store.js           lokaler Speicher + Einstellungen
js/claude.js          Claude-API (Streaming)
js/chat.js            Chat-Komponente mit Werkzeug-Schleife
js/adventure.js       Datenmodell, Werkzeuge für Claude, Systemprompts
js/dropbox.js         Dropbox-Anmeldung und -Aufrufe
js/sync.js            Abgleich lokal ↔ Dropbox
js/dice.js            Würfelausdrücke
js/flow.js            Handlungs-Flowchart (Logik, Anordnung, SVG)
js/images.js          Karten/Bilder (Verkleinern, lokale Ablage, Anzeige)
js/live.js            Firebase-Live-Verbindung (nur Spielerdaten) für Tablets
js/views/play.js      Spieler-Tablet (Charakterbogen live)
js/views/board.js     Spielbrett-Tablet (Karte/Text, vom Spielleiter freigegeben)
js/export.js          Regelwerk/Abenteuer als Markdown
js/views/*.js         Bildschirme (Start, Werkstatt, Sitzung, Einstellungen, Hilfe)
sw.js, manifest.webmanifest, icons/   PWA
```

## Bei jedem Update

1. Version in `js/version.js` **und** `CACHE_VERSION` in `sw.js` anheben.
2. Eintrag in `CHANGELOG.md`.
3. `TESTCHECKLISTE.md` und `ADMIN-ANLEITUNG.md` bei Bedarf anpassen.

## Lokal ausprobieren

ES-Module laufen nicht per Doppelklick (`file://`). Mit Python: `python -m http.server 8000` im Projektordner, dann `http://localhost:8000` öffnen. Für Dropbox muss die Adresse als Redirect-URI eingetragen sein.
