# Testcheckliste

Hake ab, was du geprüft hast – die Häkchen bleiben auf diesem Gerät gespeichert (pro App-Version). Bei einem Fehler: Nummer notieren (z. B. **T14**), kurz beschreiben, was passiert ist, und mir schicken.

Empfehlung: Alles einmal am **Windows-PC** und die mit 📱 markierten Punkte zusätzlich am **Android-Handy** durchgehen.

## A · Installation & Start

- [ ] **T01** Die Seite öffnet sich über die GitHub-Pages-Adresse ohne Fehlermeldung, oben steht „Chronist“.
- [ ] **T02** 📱 Die App lässt sich installieren (Chrome-Menü → App installieren) und startet danach als eigenes Fenster/Symbol.
- [ ] **T03** Unten (Startseite) steht die Versionsnummer 0.4.0, und unter Einstellungen → App steht dieselbe.
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

## J · Bedingungen mit Gegenständen und Würfen (neu in 0.3.0)

Vorbereitung: Abenteuer mit Dorf → Kirche → Krypta und Dorf → Turm. Per Chat: „Die Kirche gibt der Gruppe beim Betreten einen Rostigen Schlüssel. Die Krypta verlangt diesen Schlüssel. Der Turm verlangt eine Probe Schloss knacken mit 1W20, mindestens 12.“

- [ ] **T89** Claude legt Vergabe und Bedingungen an (Chips „… verlangt Gegenstand …“, „… vergibt …“).
- [ ] **T90** Tab „🔀 Handlung“: Krypta und Turm zeigen „⛓ 🔑1“. Knoten antippen: Im Bereich „🔑 Zusätzliche Bedingungen“ stehen die Bedingungen.
- [ ] **T91** Von Hand eine Bedingung hinzufügen (Gegenstand und Wurf) und mit × wieder entfernen. Ein Unsinn-Würfelausdruck wird abgelehnt.
- [ ] **T92** „🎁 Gegenstände, die die Gruppe hier erhält“: hinzufügen und entfernen. Beim Tippen schlägt die App bekannte Namen vor.
- [ ] **T93** Sitzung starten: In „Wie geht es weiter?“ ist der Turm gesperrt und nennt die Probe. Die Krypta ist von Dorf nicht erreichbar.
- [ ] **T94** „🎲 Würfeln“ bei der Probe: Ergebnis wird angezeigt. Ab 12 ist der Turm frei, darunter bleibt er gesperrt („✘ misslungen“); nochmal würfeln geht.
- [ ] **T95** Ein Ergebnis von Hand eintragen („Wert“ + „Eintragen“) wirkt genauso und ist mit „eingetragen“ gekennzeichnet. „Zurücksetzen“ nimmt es zurück.
- [ ] **T96** Die Würfe stehen im Protokoll.
- [ ] **T97** Kirche zum ersten Mal betreten: Hinweis „Erhalten: Rostiger Schlüssel“, Gegenstand liegt im Tab „🎒 Inventar“. Erneutes Betreten vergibt ihn nicht noch einmal.
- [ ] **T98** Mit Schlüssel im Inventar ist die Krypta frei. Entfernst du den Schlüssel (🗑), ist sie wieder gesperrt.
- [ ] **T99** Tab „🎒 Inventar“: Gegenstand hinzufügen, einem Spieler zuordnen, entfernen.
- [ ] **T100** Tab „🔀 Weg“: gesperrte Szene antippen → Bedingungen mit Status; „＋ Ins Inventar“ legt den fehlenden Gegenstand an und öffnet die Szene.
- [ ] **T101** „🔓 Freischalten“ öffnet die Szene trotz fehlender Bedingungen.
- [ ] **T102** GM-Assistent: „Was braucht die Gruppe für die Krypta?“ → Antwort nennt den Schlüssel und das Inventar.
- [ ] **T103** 📱 Handy: Bedingungszeilen mit Würfeln-/Eintragen-Knöpfen sind bedienbar, nichts ragt über den Rand.
- [ ] **T104** Mit Dropbox: Inventar und Würfe erscheinen nach „Jetzt synchronisieren“ auf dem zweiten Gerät.

## K · Spieler-Tablets (neu in 0.4.0)

Vorbereitung: Firebase einrichten (Admin-Anleitung C2). Du brauchst mindestens ein zweites Gerät (Tablet oder zweites Handy/Browserfenster).

- [ ] **T105** Einstellungen → „📱 Live-Verbindung“: Konfiguration einfügen, speichern. „Verbindung testen“ zeigt „✔ Verbindung funktioniert“. Unsinn einfügen wird abgelehnt.
- [ ] **T106** Vor der Einrichtung zeigt der Tab „📱 Tablets“ einen Hinweis mit Weg zu den Einstellungen.
- [ ] **T107** Tab „👥 Spieler“: Grundwerte, Charakter, Zustände und Fertigkeiten eintragen; das Notizfeld trägt den Hinweis „nur für dich“.
- [ ] **T108** Tab „📱 Tablets“ → „Tablets zuschalten“: Raumcode erscheint, jede Spielerin/jeder Spieler hat eine Zeile.
- [ ] **T109** „🔗 Auswahl-Link kopieren“, auf dem zweiten Gerät öffnen: Liste der Spielernamen erscheint. Keine Menüs/Einstellungen sichtbar.
- [ ] **T110** Eigenen Namen antippen: Der Charakterbogen erscheint mit den eingetragenen Werten, Balken für Vorräte, Zuständen, Fertigkeiten.
- [ ] **T111** Auf dem Spielleiter-Gerät steht bei diesem Spieler „📱 … verbunden“.
- [ ] **T112** Lebenspunkte beim Spielleiter ändern: Nach wenigen Sekunden ändert sich der Balken auf dem Tablet.
- [ ] **T113** Gegenstand im Tab „🎒 Inventar“ einem Spieler zuordnen: Er erscheint auf dem Tablet unter „Gegenstände“. Gruppen-Gegenstände stehen als „👥“.
- [ ] **T114** 🔒 Nirgends auf dem Tablet sind GM-Notizen, Geheimnisse, Szenentexte oder das GM-Notizfeld des Spielers zu sehen.
- [ ] **T115** Auf dem Tablet „Meine Notizen“ schreiben: Sie bleiben beim Neuladen erhalten.
- [ ] **T116** Tablet schließen und neu öffnen (gleicher Link): Es zeigt sofort wieder den eigenen Bogen.
- [ ] **T117** „🔗 Link“ pro Spieler: Der Link öffnet direkt den Bogen dieses Spielers.
- [ ] **T118** „Freigeben“ beim Spielleiter: Das Tablet fragt neu nach dem Namen („Zuordnung wurde aufgehoben“).
- [ ] **T119** „Tablet-Zuordnung lösen“ am Tablet funktioniert.
- [ ] **T120** Mehrere Tablets gleichzeitig mit verschiedenen Spielern: Jedes zeigt nur den eigenen Bogen.
- [ ] **T121** Versuch, einen schon vergebenen Namen zu wählen: Rückfrage „Trotzdem übernehmen?“.
- [ ] **T122** Spieler hinzufügen/entfernen im Spielleiter-Modus: Die Auswahl auf den Tablets passt sich an.
- [ ] **T123** „Tablets abschalten“: Alte Links zeigen „Spielraum nicht gefunden“. In der Firebase-Konsole (Firestore Database → Daten) sind die Einträge unter `rooms` weg.
- [ ] **T124** 📱 Das Tablet bleibt bei längerem Zuschauen wach (Bildschirm geht nicht aus) und ist gut lesbar (Schrift groß genug, auch quer).
- [ ] **T125** Ohne Firebase-Einrichtung läuft die App für den Spielleiter exakt wie vorher (keine Fehlermeldungen).

## I · Gefühl & Auffälligkeiten

- [ ] **T86** Antwortzeiten sind angenehm (Start der Claude-Antwort in wenigen Sekunden, Diagramm reagiert flüssig).
- [ ] **T87** Kein Text ist abgeschnitten oder unlesbar (Handy hochkant und quer, PC-Fenster schmal und breit).
- [ ] **T88** Notizen für mich: Was hat gefehlt oder gestört?
