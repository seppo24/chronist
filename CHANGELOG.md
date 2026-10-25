# Versionsverlauf

Jede Änderung an der App wird hier festgehalten. Die aktuelle Version steht unten auf der Startseite und unter Einstellungen → App.

## [0.2.0] – 2026-10-25 · Handlung als Flowchart & Karten

### Neu
- **Werkstatt, Tab „🔀 Handlung“:** Die Geschichte als Flowchart. Jede Szene ist ein Knoten, Pfeile sind die Wege dazwischen (mit optionaler Beschriftung). Knoten lassen sich verschieben, neue Folgeknoten anlegen, Wege hinzufügen/entfernen, automatisch anordnen, zoomen. Zusätzlich eine Listenansicht für das Handy.
- **Bedingungen:** Wenn mehrere Wege auf einen Knoten zeigen, legst du fest, wann er frei wird: sobald *einer* der Vorgänger besucht ist, erst wenn *alle* besucht sind (Beispiel: Wald erst nach Kirche, Taverne und Schmied), oder mindestens *n*.
- **Karten & Bilder pro Knoten:** Bilder hochladen (werden auf max. 2000 px verkleinert und als JPEG gespeichert), umbenennen, löschen, vergrößert ansehen. Sie liegen lokal und – bei Dropbox-Verbindung – als echte `.jpg`-Dateien im Ordner `images` des App-Ordners.
- **Claude baut den Ablauf mit:** neue Werkzeuge zum Verbinden von Szenen, Trennen und Festlegen der Freischaltregel. Der Abenteuerstand, den Claude bei jeder Anfrage sieht, enthält jetzt Wege, Bedingungen und Kartenhinweise.
- **Spielleiter-Modus, Tab „🔀 Weg“:** Flowchart mit Spielstand: ▶ aktuell, ✔ besucht, frei, 🔒 gesperrt (z. B. „1/3“). Knoten antippen zeigt Details, fehlende Orte und Karten; „Hierhin wechseln“ und „Freischalten (Spielleiter-Entscheid)“.
- **Spielleiter-Modus, Tab „Szene“:** neuer Kasten „Wie geht es weiter?“ mit den möglichen Wegen und ihrem Sperrstatus, Karten der Szene, gesperrte Szenen sind in der Liste markiert. Gesperrte Szenen lassen sich nur nach Rückfrage betreten.
- Der GM-Assistent weiß, welche Szenen besucht sind und welche als Nächstes möglich sind.
- Export als Textdokument enthält Wege, Bedingungen und Kartennamen. Der Fortschritt zählt jetzt auch „Handlungsfluss“.

### Geändert
- Sitzungen merken sich besuchte und freigeschaltete Szenen. Ältere Sitzungen werden automatisch angepasst. Abenteuer ohne eingezeichnete Wege verhalten sich wie zuvor (alle Szenen frei).
- Das Flowchart-Diagramm passt sich der Bildschirmbreite an, wird aber nie kleiner als lesbar (breite Diagramme scrollen seitlich).

### Bekannte Einschränkungen
- Die Sicherung (Export als Datei) enthält noch keine Bilder; sie liegen in Dropbox. Wer ohne Dropbox arbeitet, sollte Karten zusätzlich selbst aufbewahren.
- Bedingungen gibt es bisher nur nach dem Muster „Orte besucht“. Gegenstände, Würfelergebnisse oder Entscheidungen als Bedingung sind für später vorgemerkt.
- Noch keine Spieler-Tablets und kein Spielbrett (Phase 2).

## [0.1.0] – 2026-10-25 · Erster Entwurf (Phase 1)

### Neu
- **Werkstatt (Abenteuer entwickeln):** Chat mit Claude, der Schritt für Schritt führt (Idee → Welt → Regelwerk → Charaktererschaffung → Handlung → Szenen/NSCs/Orte → Spielbereit-Check).
- Claude legt Ergebnisse selbst in den passenden Bereichen ab: Textabschnitte, strukturiertes **eigenes Regelwerk pro Abenteuer**, Szenen, NSCs, Orte.
- Alles ist auch von Hand bearbeitbar (Abschnitte, Regelwerk als JSON, Szenen/NSCs/Orte inkl. Sortierung und Löschen).
- Fortschrittsbalken je Abenteuer, Status (Entwurf / In Arbeit / Spielbereit), Export als Textdokument (.md) und Rohdaten (.json).
- **Spielleiter-Modus:** Szenenführung mit Vorlesetext und GM-Notizen, Würfel (W4–W100, Ausdrücke wie 2W6+3, 4d6kh3, Hauptwurf des Regelwerks), Spielerverwaltung mit Zählern für Vorräte (z. B. Lebenspunkte), Nachschlagen von NSCs und Orten, Regelübersicht, Sitzungsprotokoll, GM-Assistent (Claude) mit Kenntnis von Abenteuer und aktuellem Spielstand.
- Spielerzahl variabel (Standard 5 Spieler + Spielleitung).
- **Speicherung:** lokal im Browser (IndexedDB) und optional **Dropbox-Sync** (App-Ordner, Anmeldung per OAuth/PKCE, Löschvermerke, neuere Fassung gewinnt).
- **Installierbar** als App auf Windows (Chrome) und Android (Chrome); startet auch offline (ohne Claude/Dropbox).
- Einstellungen: Claude-API-Key (nur lokal), Modellwahl, Verbindungstest, Token-Zähler, Dropbox-Verbindung, Sicherung exportieren/importieren, Cache leeren.
- Hilfe in der App: Anleitung, **interaktive Testcheckliste** (Häkchen werden gespeichert), Versionsverlauf.

### Bekannte Einschränkungen
- Noch keine Spieler-Tablets und kein Spielbrett (kommen in Phase 2).
- Sync ist ein Abgleich im Abstand weniger Sekunden, keine Echtzeit.
- Wird dieselbe Sitzung gleichzeitig auf zwei Geräten bearbeitet, gewinnt die zuletzt gespeicherte Fassung.

## Geplant

### Phase 2 – Spieler-Tablets & Spielbrett (Firebase für Live-Daten)
- Spieler-Ansicht: Charakterbogen pro Tablet, Zuordnung Tablet ↔ Spieler (Code/QR).
- Spielbrett-Ansicht für das Tablet in der Tischmitte: die Karten der aktuellen Szene (aus den Bildern der Knoten), vom Spielleiter gesteuert; GM-Inhalte bleiben unsichtbar.
- Charaktererschaffung am Tablet.
- Dropbox bleibt Ablage für Karten/Bilder und Backup.
