# Testcheckliste

Hake ab, was du geprüft hast – die Häkchen bleiben auf diesem Gerät gespeichert (pro App-Version). Bei einem Fehler: Nummer notieren (z. B. **T14**), kurz beschreiben, was passiert ist, und mir schicken.

Empfehlung: Alles einmal am **Windows-PC** und die mit 📱 markierten Punkte zusätzlich am **Android-Handy** durchgehen.

## A · Installation & Start

- [ ] **T01** Die Seite öffnet sich über die GitHub-Pages-Adresse ohne Fehlermeldung, oben steht „Chronist“.
- [ ] **T02** 📱 Die App lässt sich installieren (Chrome-Menü → App installieren) und startet danach als eigenes Fenster/Symbol.
- [ ] **T03** Unten (Startseite) steht die Versionsnummer 0.2.1, und unter Einstellungen → App steht dieselbe.
- [ ] **T04** 📱 Das Layout passt auf das Handy: kein seitliches Verrutschen, Schaltflächen gut antippbar.
- [ ] **T05** Ohne API-Key erscheint auf der Startseite der Hinweis „Für die Entwicklung … fehlt noch dein API-Key“.

## B · Einstellungen & Claude-Verbindung

- [ ] **T06** API-Key eintragen, Feld verlassen, Seite neu laden: Der Key ist noch da.
- [ ] **T07** „Key anzeigen“ blendet den Key ein und wieder aus.
- [ ] **T08** „Verbindung testen“ zeigt ✔ „Verbindung funktioniert“.
- [ ] **T09** Mit absichtlich falschem Key meldet der Test eine verständliche Fehlermeldung (401).
- [ ] **T10** Der Token-Zähler zählt nach dem Test hoch; „Zähler zurücksetzen“ setzt ihn auf 0.

## C · Werkstatt: Chat mit Claude

- [ ] **T11** „+ Neues Abenteuer“: Titel, Vorbild und Spielerzahl eingeben → Werkstatt öffnet sich im Chat-Tab.
- [ ] **T12** Ein Klick auf „🚀 Idee entwickeln“ füllt das Eingabefeld; Senden startet die Antwort, der Text erscheint nach und nach.
- [ ] **T13** Während der Antwort ist der „■“-Knopf sichtbar; Klick bricht ab und vermerkt „(abgebrochen)“.
- [ ] **T14** 📱 Auf dem Handy erzeugt Enter einen Zeilenumbruch, der Pfeil-Knopf sendet.
- [ ] **T15** Antworten sind gut lesbar (Absätze, Listen, Fettschrift) und laufen nicht aus dem Bildschirm.
- [ ] **T16** Nach einigen Nachrichten: Claude speichert etwas (Chip „✔ Abschnitt … gespeichert“ unter der Antwort).
- [ ] **T17** Seite neu laden: Der Chatverlauf ist noch da.
- [ ] **T18** Der Fortschrittsbalken oben wächst, wenn Konzept, Welt, Regelwerk usw. gefüllt werden.

## D · Werkstatt: Inhalte

- [ ] **T19** Tab „📚 Abschnitte“: Von Claude geschriebene Abschnitte sind sichtbar; „GM-Geheimnisse“ ist als „🔒 nur GM“ markiert.
- [ ] **T20** Einen Abschnitt von Hand bearbeiten und speichern; nach Neuladen ist die Änderung da.
- [ ] **T21** Tab „⚙️ Regelwerk“: Nach „Regelwerk entwerfen“ erscheinen Würfelmechanik, Grundwerte, Vorräte.
- [ ] **T22** „Als JSON bearbeiten“: ein Wort ändern → speichern → Änderung sichtbar. Kaputtes JSON liefert eine Fehlermeldung statt Datenverlust.
- [ ] **T23** Tab „🎬 Szenen“: „+ Szene hinzufügen“ legt eine Szene an und öffnet sie zum Bearbeiten.
- [ ] **T24** Szene bearbeiten, speichern; mit ↑/↓ verschieben; löschen (mit Rückfrage).
- [ ] **T25** Tabs „NSCs“ und „Orte“ verhalten sich genauso; GM-Felder sind mit 🔒 markiert.
- [ ] **T26** Von Claude angelegte Szenen/NSCs/Orte erscheinen in den Tabs (Claude bitten: „Lege 2 Szenen und 2 NSCs an“).
- [ ] **T27** Tab „⋯ Mehr“: Titel ändern → oben in der Kopfzeile steht der neue Titel.
- [ ] **T28** Export „Als Textdokument (.md)“ lädt eine lesbare Datei herunter.

## E · Spielleiter-Modus

- [ ] **T29** Startseite → „▶ Spielen“ legt eine Sitzung an und öffnet den Spielleiter-Modus.
- [ ] **T30** Tab „🎬 Szene“: Szene wählbar (Auswahlliste, ◀ ▶); Vorlesetext (gold) und GM-Notizen (rötlich, 🔒) sind getrennt.
- [ ] **T31** „Kopieren“ beim Vorlesetext legt den Text in die Zwischenablage.
- [ ] **T32** „Als erledigt markieren“ setzt ein ✔; „Alle Szenen“ zeigt den Stand.
- [ ] **T33** Antippbare Chips (NSCs/Ort) öffnen ein Fenster mit Details.
- [ ] **T34** Tab „🎲 Würfel“: W6 antippen → große Zahl und Einzelwurf erscheinen; Verlauf füllt sich.
- [ ] **T35** Ausdruck „2W6+3“ und „4d6kh3“ eingeben → plausible Ergebnisse (nicht über/unter dem Möglichen).
- [ ] **T36** Der „Hauptwurf des Regelwerks“-Knopf erscheint, wenn das Regelwerk einen Standardwurf hat.
- [ ] **T37** Tab „👥 Spieler“: Namen ändern, „+ Spieler“, „Entfernen“ funktionieren.
- [ ] **T38** Vorräte (z. B. Lebenspunkte) lassen sich mit − / + ändern, stoppen bei 0 und beim Maximum; „⚙“ ändert das Maximum.
- [ ] **T39** „Alle Vorräte auffüllen“ setzt alle auf das Maximum.
- [ ] **T40** Tab „🗺️ NSCs & Orte“: Suche findet Einträge, Details klappen auf.
- [ ] **T41** Tab „📜 Regeln“ zeigt das Regelwerk lesbar.
- [ ] **T42** Tab „📝 Protokoll“: Notiz hinzufügen, löschen; Szenenwechsel erscheinen automatisch.
- [ ] **T43** Tab „🤖 Assistent“: Frage stellen (z. B. „Beschreibe die aktuelle Szene“) → Antwort passt zum Abenteuer.
- [ ] **T44** Assistent: „Spontaner NSC“ legt einen NSC an (danach in „NSCs & Orte“ sichtbar).
- [ ] **T45** „Sitzung beenden“ → Sitzung wird als beendet geführt und lässt sich wieder aufnehmen.
- [ ] **T46** Sitzung neu laden (F5): Spielstand (Szene, Vorräte, Protokoll) ist erhalten.

## F · Dropbox

- [ ] **T47** Dropbox App Key eintragen, „Mit Dropbox verbinden“ → Dropbox-Seite öffnet sich, nach „Zulassen“ zurück in der App mit Meldung „Dropbox ist verbunden“.
- [ ] **T48** Im Dropbox-Ordner `Apps/<dein App-Name>` erscheinen Ordner `adventures` (und `sessions`) mit .json-Dateien.
- [ ] **T49** Eine Änderung am Abenteuer → nach wenigen Sekunden zeigt das Wolkensymbol ✔ und die Datei in Dropbox ist aktualisiert.
- [ ] **T50** 📱 Auf dem Handy denselben Ablauf (Key + App Key eingeben, verbinden): Das Abenteuer vom PC taucht nach „Jetzt synchronisieren“ auf.
- [ ] **T51** Änderung am Handy → „Jetzt synchronisieren“ am PC → Änderung ist da.
- [ ] **T52** Abenteuer am PC löschen, auf dem Handy synchronisieren: Es verschwindet auch dort.
- [ ] **T53** „Trennen“ entfernt die Verbindung; lokale Daten bleiben.

## G · Offline, Updates, Sicherung

- [ ] **T54** Flugmodus an, App neu starten: Die App öffnet sich, Abenteuer sind sichtbar. (Chat/Sync melden verständliche Fehler.)
- [ ] **T55** Sicherung exportieren, danach „Lokale Daten löschen“, Sicherung importieren: Alles ist wieder da.
- [ ] **T56** „Update erzwingen (Cache leeren)“ lädt die App neu, ohne Datenverlust.
- [ ] **T57** Hilfe (❓) zeigt Anleitung, diese Checkliste und den Versionsverlauf.

## H · Handlung als Flowchart & Karten (neu in 0.2.0)

Vorbereitung: Ein Abenteuer mit mindestens 5 Szenen. Am schnellsten per Chat: „Lege diese Szenen an: Stadt, Kirche, Taverne, Schmied, Wald. Verbinde die Stadt mit Kirche, Taverne und Schmied. Alle drei führen weiter zum Wald, der erst frei wird, wenn alle drei besucht wurden.“

- [ ] **T58** Claude legt Szenen, Wege und die Regel an (grüne Chips „Weg … angelegt“ und „Freischaltung …“ unter der Antwort).
- [ ] **T59** Tab „🔀 Handlung“: Das Diagramm zeigt die Knoten von oben nach unten (Stadt oben, die drei Orte in einer Reihe, Wald unten) mit Pfeilen.
- [ ] **T60** Am Wald steht das Abzeichen „⛓ alle 3“.
- [ ] **T61** Einen Knoten antippen: Unten erscheint sein Bereich (Name, Wege, Freischaltung, Karten).
- [ ] **T62** Einen Knoten mit Finger/Maus verschieben; nach Neuladen der Seite bleibt er dort.
- [ ] **T63** „＋ Neuer Folgeknoten“ legt einen verbundenen Knoten an; „×“ am Weg entfernt die Verbindung.
- [ ] **T64** Einen Weg über die Auswahl „Neuen Weg hinzufügen“ anlegen, auch mit Beschriftung (erscheint am Pfeil).
- [ ] **T65** Freischaltregel am Wald umstellen („alle“, „mindestens 2“, „einer“): Das Abzeichen am Knoten ändert sich passend.
- [ ] **T66** 📱 Auf dem Handy ist das Diagramm lesbar und lässt sich seitlich verschieben; Zoom −/+ und „Einpassen“ funktionieren; die Seite selbst verrutscht nicht.
- [ ] **T67** 📱 „☰ Listenansicht“ zeigt alle Knoten als Liste mit Bearbeitung; „🔀 Diagramm“ wechselt zurück.
- [ ] **T68** „🧭 Anordnen“ ordnet alle Knoten neu an (nach Rückfrage).
- [ ] **T69** Karte hinzufügen: „＋ Karte / Bild hinzufügen“ → Foto/Bild vom Gerät wählen → Vorschau erscheint, am Knoten steht „🗺️“.
- [ ] **T70** 📱 Auf dem Handy lässt sich ein Foto direkt aufnehmen oder aus der Galerie wählen.
- [ ] **T71** Bild antippen öffnet die große Ansicht; Bild umbenennen und löschen funktionieren.
- [ ] **T72** Im Tab „🎬 Szenen“ erscheint dieselbe Karte an der Szene.
- [ ] **T73** Startseite → „▶ Spielen“ (oder Mehr → Neue Sitzung): Tab „🎬 Szene“ zeigt in der Stadt den Kasten „➡️ Wie geht es weiter?“ mit Kirche, Taverne, Schmied (frei) – und der Weg-Beschriftung.
- [ ] **T74** Tab „🔀 Weg“: Stadt ist ▶ aktuell, die drei Orte sind frei, der Wald ist 🔒 gesperrt („0/3“).
- [ ] **T75** Wald antippen → „Hierhin wechseln“: Es erscheint die Rückfrage „noch gesperrt“. „Abbrechen“ lässt alles unverändert.
- [ ] **T76** Nacheinander Kirche, Taverne, Schmied betreten („Hierhin wechseln“): Besuchte Orte werden grün mit ✔, die Zähler am Wald steigen (1/3, 2/3).
- [ ] **T77** Nach dem dritten Ort ist der Wald frei und lässt sich ohne Rückfrage betreten.
- [ ] **T78** Im Wald erscheint die hinterlegte Karte in der Szene, und „Wie geht es weiter?“ nennt die nächsten Wege.
- [ ] **T79** „🔓 Freischalten (Spielleiter-Entscheid)“ öffnet einen gesperrten Knoten, ohne dass die Bedingung erfüllt ist. Er ist als „vom Spielleiter freigegeben“ gekennzeichnet.
- [ ] **T80** Das Protokoll enthält die Szenenwechsel in der richtigen Reihenfolge.
- [ ] **T81** GM-Assistent: „Wie geht es weiter?“ → Antwort passt zu den besuchten und möglichen Szenen.
- [ ] **T82** Mit Dropbox: Nach dem Hochladen einer Karte erscheint unter `Apps/<App-Name>/images/` eine .jpg-Datei, die sich in Dropbox ansehen lässt.
- [ ] **T83** 📱 Auf dem zweiten Gerät („Jetzt synchronisieren“) erscheinen Flowchart und Karte.
- [ ] **T84** Bild löschen: Es verschwindet auch in Dropbox und auf dem anderen Gerät.
- [ ] **T85** Ein altes Abenteuer aus Version 0.1.0 (ohne Wege) funktioniert weiter, alle Szenen sind frei.

## I · Gefühl & Auffälligkeiten

- [ ] **T86** Antwortzeiten sind angenehm (Start der Claude-Antwort in wenigen Sekunden, Diagramm reagiert flüssig).
- [ ] **T87** Kein Text ist abgeschnitten oder unlesbar (Handy hochkant und quer, PC-Fenster schmal und breit).
- [ ] **T88** Notizen für mich: Was hat gefehlt oder gestört?
