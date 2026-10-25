# Versionsverlauf

Jede Änderung an der App wird hier festgehalten. Die aktuelle Version steht unten auf der Startseite und unter Einstellungen → App.

## [0.8.0] – 2026-10-25 · Töne und Effekte

### Neu
- **Töne und Effekte:** Im Tab „📱 Tablets“ gibt es den Bereich „🔊 Töne und Effekte“. Neun Effekte (Schwerthieb, Treffer, Heilung, Zauber, Alarm, Gong, Erfolg, Niedergeschlagen, Würfeln) spielen einen Klang und blenden kurz einen farbigen Bildschirm-Blitz ein. Empfänger: alle Tablets samt Spielbrett, nur das Spielbrett oder ein einzelner Spieler. Optional mit großem Text auf dem Bildschirm („Hinterhalt!“).
- **Automatisch am Spieler-Tablet:** Sinken die Lebenspunkte (oder ein anderer Vorrat), gibt es Treffer-Klang und roten Blitz; steigen sie, Heil-Klang und grünen Blitz; bei 0 den Niedergeschlagen-Effekt. Beim Würfeln rasselt der Würfel.
- Alle Klänge werden im Gerät erzeugt (keine Audiodateien, keine Downloads, funktioniert offline).
- Knopf „🔊 Töne aktivieren“ unten rechts am Tablet und am Spielbrett (Browser verlangen eine Berührung, bevor Ton erlaubt ist). Danach lässt sich der Ton dort mit demselben Knopf stumm schalten.
- Ein alter Effekt wird beim Öffnen oder Neuladen einer Seite nicht erneut abgespielt. „Tablets abschalten“ löscht den Effekt ebenfalls aus Firebase.

### Hinweise
- Neue Datei js/fx.js. Es sind keine neuen Firestore-Regeln nötig (die Regeln aus Anleitung C2 genügen).

## [0.7.0] – 2026-10-25 · Nebel des Krieges

### Neu
- **Nebel des Krieges auf dem Spielbrett:** Für jede Karte lässt sich ein Raster aktivieren (8×6, 12×8, 16×12 oder 24×16 Felder). Auf dem Spielbrett ist die Karte dann schwarz verdeckt; der Spielleiter deckt Felder auf, indem er in der Vorschau tippt oder darüber wischt (nochmal tippen verdeckt wieder). „Alles aufdecken“ und „Alles verdecken“ gibt es auch.
- Das Spielbrett aktualisiert nur den Nebel, das Bild wird dabei nicht neu geladen (kein Flackern). Der Nebel bleibt je Karte erhalten: Wird sie später erneut gezeigt, ist alles noch aufgedeckt, wie es war. Er wird mit der Sitzung gespeichert.
- Der Nebel ist wirklich blickdicht: Die Spieler sehen verdeckte Bereiche nicht, auch nicht abgedunkelt. (Hinweis: Das Bild selbst liegt in Firebase; verdeckt wird nur die Anzeige auf dem Tablet.)

### Bekannte Einschränkungen
- Ein Raster pro Karte, keine freien Formen oder Lichtkegel.
- Bei Änderung der Rastergröße beginnt der Nebel dieser Karte von vorn (alles verdeckt).

## [0.6.0] – 2026-10-25 · Spieler-Tablets werden interaktiv

### Neu
- **Würfeln am Tablet:** Hauptwurf des Regelwerks, W4 bis W100 und eigene Ausdrücke (z. B. 2W6+1). Das Ergebnis steht groß auf dem Tablet und erscheint mit Namen im Protokoll des Spielleiters. Pro Sitzung abschaltbar („Spieler dürfen am Tablet würfeln“).
- **Wurf anfordern:** Bei einer Würfel-Bedingung einer Szene gibt es „📱 Am Tablet würfeln lassen“. Der gewählte Spieler sieht die Aufforderung, würfelt mit einem Tipp, und das Ergebnis wird automatisch der Bedingung zugeordnet (Szene wird frei oder bleibt gesperrt).
- **Vorräte am Tablet ändern:** Auf Wunsch (Haken „Spieler dürfen ihre Vorräte selbst ändern“, standardmäßig aus) zeigen die Balken − / +. Änderungen erscheinen beim Spielleiter und im Protokoll.
- **Charaktererschaffung am Tablet:** Der Spielleiter erlaubt sie pro Spieler („✏️ Erschaffung erlauben“). Der Spieler vergibt Name, Grundwerte (mit Punktepool und Min/Max aus dem Regelwerk), Fertigkeiten/Ausrüstung und Hintergrund und reicht den Entwurf ein. Der Spielleiter sieht ihn und kann **übernehmen** oder mit Anmerkung **zurückgeben** (der Entwurf bleibt zum Überarbeiten erhalten). Der Hintergrund erscheint danach auf dem Bogen.
- Regelwerke können `creation` enthalten (`points`, `note`); Claude kennt das Feld und legt es beim Regelwerk an, wenn es passt.
- Das Tablet bleibt bei schnellen Tipps auf − / + stabil (kein Zurückspringen).

### Behoben
- Auf dem Tablet konnte an einzelnen Stellen das Wort „null“ erscheinen. Behoben.

### Bekannte Einschränkungen
- Würfe und Vorratsänderungen vom Tablet kommen nur an, wenn der Spielleiter-Rechner die Sitzung geöffnet hat (er verarbeitet sie).
- Die Charaktererschaffung kennt keine Klassen/Auswahllisten, nur Name, Werte mit Punktepool und Freitext.
- Töne und Effekte, Nebel des Krieges folgen in den nächsten Versionen.

## [0.5.0] – 2026-10-25 · Spielbrett-Tablet

### Neu
- **Spielbrett für die Tischmitte (zuschaltbar):** Ein Tablet zeigt nur, was der Spielleiter ausdrücklich freigibt: eine **Karte**, einen großen **Kurztext** oder ein **Wartebild**. Vollbild-Knopf, Antippen vergrößert die Karte, der Bildschirm bleibt wach.
- **Neuer Spielleiter-Tab „🗺️ Spielbrett“:** Link für das Tablet, alle Karten der Szenen (aktuelle Szene zuerst) mit Vorschau und **▶ Zeigen**, **⬛ Leeren**, **💬 Text zeigen**. Optional zeigt die App bei Szenenwechsel automatisch die erste Karte der neuen Szene.
- Karten werden für die Anzeige automatisch verkleinert (unter 1 MB) und nur bei Bedarf einmalig übertragen. „Tablets abschalten“ löscht Karten und Spielbrett wieder aus Firebase.
- Verständlicher Hinweis, wenn Firestore wegen veralteter Regeln ablehnt.

### Geändert / wichtig
- **Die Firestore-Regeln müssen einmalig aktualisiert werden** (Admin-Anleitung C2, Schritt 3): Sie decken jetzt auch das Spielbrett ab. Ohne Aktualisierung zeigen Spielbrett-Funktionen „Firestore lehnt den Zugriff ab“. Die Spieler-Tablets sind davon nicht betroffen.

### Bekannte Einschränkungen
- Zoomen/Verschieben am Spielbrett nutzt die normale Fingergeste des Browsers (kein eigener „Nebel des Krieges“, keine Markierungen).
- Das Spielbrett zeigt immer genau eine Karte. Mehrere Karten gleichzeitig sind nicht vorgesehen.

## [0.4.0] – 2026-10-25 · Phase 2: Spieler-Tablets

### Neu
- **Spieler-Tablets (zuschaltbar):** Jeder Spieler sieht auf seinem Tablet live den eigenen Charakterbogen: Name, Charakter, Grundwerte, Vorräte als Balken, Zustände, Fertigkeiten/Ausrüstung, eigene Gegenstände und Gruppen-Gegenstände. Große, gut lesbare Darstellung; der Bildschirm bleibt wach.
- **Zuordnung Tablet ↔ Spieler:** über einen gemeinsamen Auswahl-Link (Tablet tippt den eigenen Namen an) oder einen persönlichen Link pro Spieler. Das Tablet merkt sich die Zuordnung. Der Spielleiter sieht, welcher Spieler ein Tablet hat, und kann Tablets freigeben; Tablets können sich auch selbst lösen.
- **Neuer Spielleiter-Tab „📱 Tablets“** zum Zuschalten, Verteilen der Links und Abschalten (löscht alle Daten dieser Sitzung aus Firebase).
- **Spieler-Tab erweitert:** Eingabefelder für die Grundwerte des Regelwerks und ein Feld „Fertigkeiten/Ausrüstung“ (für Spieler sichtbar). Das Notizfeld ist klar als „nur für dich“ gekennzeichnet.
- **Spielernotizen:** Spieler können auf dem Tablet eigene Notizen schreiben; sie kommen automatisch zum Spielleiter.
- **Einstellungen → „📱 Live-Verbindung (Firebase)“:** Konfiguration einfügen und Verbindung testen. Schritt-für-Schritt-Anleitung in der Admin-Anleitung (Abschnitt C2).
- **Datenschutz-Prinzip:** Nach Firebase gelangt ausschließlich eine feste Auswahl von Spielerdaten. GM-Notizen, Geheimnisse, Szenen, Regeln des Spielleiters und Protokoll werden nie übertragen. Der Raum ist durch einen zufälligen 12-stelligen Code geschützt.

### Geändert
- Dropbox bleibt unverändert die Ablage für Abenteuer, Sitzungen und Karten. Firebase ist optional; ohne Konfiguration verhält sich die App wie bisher.

### Bekannte Einschränkungen
- Spieler können nur ihre Notizen ändern. Würfeln, Lebenspunkte abziehen o. Ä. am Tablet sowie Töne/Effekte sind noch nicht umgesetzt (bewusst zurückgestellt).
- Wer den Raumcode/Link kennt, sieht die Bögen dieser Sitzung (kein Konto-Login). Links nur an Mitspieler geben und nach dem Spiel abschalten.
- Das Spielbrett-Tablet (Tischmitte) folgt als nächste Version.

## [0.3.0] – 2026-10-25 · Bedingungen mit Gegenständen und Würfen

### Neu
- **Zusätzliche Bedingungen pro Knoten** (Werkstatt, Tab „🔀 Handlung“, Bereich „🔑 Zusätzliche Bedingungen“): Eine Szene kann verlangen, dass die Gruppe einen **Gegenstand** besitzt (z. B. „Rostiger Schlüssel“) und/oder eine **Probe** gelingt (Würfelausdruck, „mindestens“ oder „höchstens“, Zielwert, z. B. „Schloss knacken: 1W20 mindestens 12“). Alle Bedingungen müssen erfüllt sein, zusätzlich zu den Wegen. Am Knoten steht das Abzeichen „🔑 n“.
- **Gegenstände vergeben:** Pro Knoten lässt sich festlegen, welche Gegenstände die Gruppe beim **ersten Betreten** erhält („🎁 Gegenstände, die die Gruppe hier erhält“). Namen werden beim Eintippen aus bereits bekannten vorgeschlagen; Groß-/Kleinschreibung ist egal.
- **Spielleiter-Modus, neuer Tab „🎒 Inventar“:** Gruppen-Inventar mit Hinzufügen, Entfernen und optionaler Zuordnung zu einem Spieler.
- **Bedingungen im Spiel:** Im Kasten „Wie geht es weiter?“ und im Tab „🔀 Weg“ zeigt jede gesperrte Szene ihre Bedingungen mit Status. Gegenstand fehlt → Knopf „＋ Ins Inventar“. Wurf → „🎲 Würfeln“ (App würfelt und wertet aus) oder Ergebnis von Hand eintragen (am Tisch gewürfelt); „Nochmal würfeln“ und „Zurücksetzen“ sind möglich. Würfe stehen im Protokoll.
- Die Sperrgründe sind genauer: „1 von 3 Vorgängern besucht“, „Gegenstand ‚Schlüssel‘ fehlt“, „Wurf ‚Schloss knacken‘ nicht geschafft (7)“. „🔓 Freischalten“ und „Trotzdem wechseln“ umgehen auch diese Bedingungen.
- **Claude:** neue Werkzeuge `add_scene_requirement`, `clear_scene_requirements` und `grant_items`. Claude kennt Bedingungen, Vergaben und das aktuelle Inventar und achtet darauf, dass verlangte Gegenstände erreichbar sind. Export als Textdokument enthält Bedingungen und Vergaben.

### Geändert
- Ältere Sitzungen und Abenteuer funktionieren unverändert (ohne Bedingungen verhält sich alles wie zuvor).

### Bekannte Einschränkungen
- Ein Wurf gilt für die ganze Gruppe, nicht pro Spieler. Gegenstände werden nur nach Namen verglichen (keine Mengen).
- Sperre aufheben durch Würfeln ist auch nach erfolgreichem Wurf dauerhaft; „Zurücksetzen“ nimmt das Ergebnis zurück.
- Noch keine Spieler-Tablets und kein Spielbrett (Phase 2).

## [0.2.1] – 2026-10-25 · Installation auf Android

### Geändert
- Die App hat jetzt eine eigene, feste App-Kennung (`id` im Manifest). Chrome erkennt sie dadurch unabhängig von anderen Apps unter demselben `github.io`-Konto (z. B. „Mediathek“) und meldet nicht mehr fälschlich „bereits installiert“.

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
