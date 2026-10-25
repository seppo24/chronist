# Anleitung für den Admin

Diese Anleitung führt dich Schritt für Schritt durch Einrichtung, Bedienung und Pflege. Du musst nichts programmieren.

## 1 · Das Wichtigste in Kürze

- Die App („Chronist“) ist eine Webseite, die auf **GitHub Pages** liegt und sich auf Windows und Android (Chrome) wie eine App installieren lässt.
- **Claude** hilft dir, ein Abenteuer samt eigenem Regelwerk zu entwickeln, und begleitet dich später als Assistent am Spieltisch.
- **Dropbox** sichert deine Abenteuer und gleicht sie zwischen deinen Geräten ab. Ohne Dropbox läuft alles trotzdem, die Daten bleiben dann nur auf dem jeweiligen Gerät.
- Zugangsdaten (Claude-Key, Dropbox-Verbindung) werden **nur im Browser des jeweiligen Geräts** gespeichert, nie auf GitHub.

## 2 · Einmalige Einrichtung

Plane dafür etwa 30 Minuten ein. Die Reihenfolge ist wichtig.

### A) App auf GitHub Pages veröffentlichen

1. Auf **github.com** einloggen → oben rechts **+** → **New repository**.
2. Name z. B. `chronist`. Sichtbarkeit **Public** (bei kostenlosen Konten braucht GitHub Pages ein öffentliches Repository). **Create repository**.
3. ZIP-Datei der App auf dem PC **entpacken**.
4. Im neuen Repository: **Add file → Upload files**. Den **gesamten Inhalt** des entpackten Ordners (index.html, sw.js, Ordner `css`, `js`, `icons`, alle .md-Dateien …) ins Browserfenster ziehen. Wichtig: Die Ordner müssen als Ordner erhalten bleiben, `index.html` liegt ganz oben im Repository, nicht in einem Unterordner.
5. Unten **Commit changes** klicken.
6. **Settings** (Zahnrad des Repositorys) → links **Pages** → bei „Source“ **Deploy from a branch** → Branch **main**, Ordner **/ (root)** → **Save**.
7. Nach ein bis zwei Minuten steht oben auf der Pages-Seite die Adresse, meist `https://DEINNAME.github.io/chronist/`. Diese Adresse öffnen – die App erscheint.

Da das Repository öffentlich ist: Es enthält **keine Geheimnisse**. Deine Abenteuer und Schlüssel liegen nie dort.

### B) Claude-Zugang (API-Key)

Das Claude-Abo reicht dafür nicht, die App nutzt den API-Zugang von Anthropic (Abrechnung nach Verbrauch).

1. Auf **console.anthropic.com** anmelden und unter **Billing** Guthaben aufladen.
2. Unter **Limits** ein **monatliches Ausgabenlimit** setzen (z. B. wenige Euro), damit nichts aus dem Ruder läuft.
3. Unter **API Keys** → **Create Key**. Den Key (beginnt mit `sk-ant-`) kopieren; er wird nur einmal angezeigt.
4. In der App: **⚙️ Einstellungen → Claude → API-Key** einfügen → **Verbindung testen**. Es muss ✔ erscheinen.

Gut zu wissen:
- Der Key liegt im Browser dieses Geräts. Auf dem zweiten Gerät musst du ihn nochmal eingeben. Auf fremden oder gemeinsam genutzten Geräten nicht verwenden.
- Der Verbrauch hängt von der Länge des Abenteuers und dem Modell ab. Die App zeigt unter Einstellungen einen Token-Zähler und im Chat die Tokens der letzten Anfrage. Der Abenteuerstand wird zwischengespeichert, das spart bei längeren Chats Kosten.
- Standardmodell ist **Sonnet 5.5** (guter Mittelweg). **Haiku** ist günstiger, **Opus/Fable** stärker, aber teurer. Wechsel jederzeit in den Einstellungen.

### C) Dropbox verbinden (optional, empfohlen)

1. Auf **dropbox.com/developers/apps** mit deinem Dropbox-Konto einloggen → **Create app**.
2. **Scoped access** wählen → **App folder** wählen → einen eindeutigen Namen vergeben (z. B. `chronist-DEINNAME`) → **Create app**.
3. Reiter **Permissions**: diese drei Häkchen setzen: `files.metadata.read`, `files.content.read`, `files.content.write` → unten **Submit**. (Ohne diesen Schritt schlägt die Anmeldung fehl.)
4. Reiter **Settings**: bei **Redirect URIs** die Adresse deiner App eintragen – **genau** so, wie sie in der App unter **Einstellungen → Dropbox → Redirect-URI** steht (mit Kopieren-Knopf), danach **Add**. Hinweis: Die Adresse endet mit `/`.
5. Auf derselben Seite den **App key** kopieren.
6. In der App: **Einstellungen → Dropbox → App Key** einfügen → **Mit Dropbox verbinden** → bei Dropbox **Zulassen**. Du landest wieder in der App mit der Meldung „Dropbox ist verbunden“.
7. Deine Daten liegen jetzt in Dropbox unter `Apps/<dein App-Name>/` (Ordner `adventures`, `sessions`, `images` mit deinen Karten als normale .jpg-Dateien und `deleted`). Bitte dort nichts von Hand ändern.

Auf jedem weiteren Gerät: App-Key eintragen und „Mit Dropbox verbinden“ (mit demselben Dropbox-Konto). Danach **Jetzt synchronisieren**.

### D) Als App installieren
- **Meldung „bereits installiert“ / „Jetzt öffnen“ → Fehler:** Erst auf Version 0.2.1 oder neuer aktualisieren und die Seite einmal neu laden (ggf. Cache leeren). Hilft das nicht: Chrome-Menü ⋮ → „Zum Startbildschirm hinzufügen“ → „Verknüpfung erstellen“. Unter `chrome://webapks` siehst du, welche Apps Chrome als installiert kennt. Vorsicht: „Websitedaten löschen“ gilt für das ganze `seppo24.github.io` und betrifft auch andere Apps dort.

- **Android (Chrome):** Seite öffnen → Menü **⋮** → **App installieren** (oder „Zum Startbildschirm hinzufügen“).
- **Windows (Chrome):** Seite öffnen → in der Adressleiste das Installationssymbol (Monitor mit Pfeil) anklicken, oder Menü **⋮** → **Speichern und teilen** → **Seite als App installieren**.

Danach startet die App wie ein normales Programm im eigenen Fenster.

## 3 · Bedienung

### Startseite
- **+ Neues Abenteuer:** Titel, Vorbild/Setting und Spielerzahl angeben. Beim Vorbild reicht das *Gefühl* („Zauberschule mit Internat-Flair“). Claude erfindet eigene Namen und Regeln.
- Karten zeigen Fortschritt und Status. **🛠 Werkstatt** öffnet die Entwicklung, **▶ Spielen** startet bzw. setzt eine Sitzung fort.

### Werkstatt (Abenteuer entwickeln)
Tabs oben:
- **💬 Chat:** Hier arbeitest du mit Claude. Die Knöpfe unter dem Chat sind Vorschläge für den jeweils nächsten Schritt. Reihenfolge: Idee → Welt → Regelwerk → Charaktererschaffung → Handlung → Szenen/NSCs/Orte → Spielbereit-Check. Du kannst jederzeit eigene Wünsche schreiben („Mach das düsterer“, „Nur 3 Grundwerte“). Wenn du zustimmst, speichert Claude das Ergebnis selbst; unter der Antwort erscheint ein Chip „✔ … gespeichert“.
- **🔀 Handlung:** Die Geschichte als Flowchart (siehe Abschnitt 3a).
- **📚 Abschnitte:** Alle Textbausteine (Konzept, Welt, Regelwerk-Text, Charaktererschaffung, Handlung, GM-Geheimnisse, Zufallstabellen, Handouts). Von Hand bearbeitbar.
- **⚙️ Regelwerk:** Das strukturierte Regelwerk (Würfelmechanik, Grundwerte, Vorräte wie Lebenspunkte, Zustände). Daraus entstehen später die Zähler im Spielleiter-Modus und die Charakterbögen der Tablets (Phase 2). Für Fortgeschrittene als JSON bearbeitbar.
- **🎬 Szenen, 🧑‍🤝‍🧑 NSCs, 📍 Orte:** Listen mit Karten. Szenen erscheinen im Spiel in dieser Reihenfolge (mit ↑/↓ änderbar). Felder mit 🔒 sind nur für dich als Spielleiter.
- **⋯ Mehr:** Titel, Setting, Spielerzahl, Status (Entwurf → In Arbeit → Spielbereit), Notizen, Sitzung starten, Export (Textdokument zum Ausdrucken, Rohdaten), Löschen.

Tipps:
- Lass Claude nicht alles auf einmal schreiben. Kleine Schritte (erst Regelkern, dann Details) ergeben bessere Ergebnisse und brauchen weniger Verbrauch.
- Vor dem ersten Spielabend den **✅ Spielbereit-Check** laufen lassen.
- Der Chat merkt sich nur die letzten Nachrichten, der **Abenteuerstand** wird aber bei jeder Anfrage vollständig mitgeschickt. Wichtiges gehört deshalb in die Abschnitte, nicht nur in den Chat.

### 3a · Handlung als Flowchart und Karten (neu in 0.2.0)

Im Werkstatt-Tab **🔀 Handlung** siehst du die Geschichte als Diagramm. Jeder Kasten ist ein **Knoten** (eine Szene, also ein Ort oder Ereignis), jeder Pfeil ein **Weg**.

**Beispiel aus deiner Idee:** Die Spieler kommen in die Stadt. Von dort gehen drei Wege ab: Kirche, Taverne, Schmied. Der Wald ist erst frei, wenn alle drei besucht wurden.
1. Am schnellsten lässt du Claude das aufbauen: „Lege die Szenen Stadt, Kirche, Taverne, Schmied und Wald an. Verbinde die Stadt mit den drei Orten, alle drei führen zum Wald. Der Wald wird erst frei, wenn alle drei besucht wurden.“ Claude zeichnet die Pfeile und stellt die Regel ein. Du siehst es danach im Diagramm.
2. Oder von Hand: **＋ Knoten**, dann den Knoten antippen. Unten erscheint sein Bereich:
   - **Von hier aus geht es weiter zu:** vorhandene Wege (mit × entfernen). Darunter einen neuen Weg wählen und optional beschriften, oder **＋ Neuer Folgeknoten** (legt gleich einen verbundenen Knoten an).
   - **Wann wird dieser Knoten frei?** Nur relevant, wenn mehrere Pfeile auf ihn zeigen: *sobald einer besucht ist*, *erst wenn alle besucht sind* oder *mindestens n*. Am Knoten erscheint dann ein Abzeichen wie „⛓ alle 3“.
   - **Karten & Bilder:** **＋ Karte / Bild hinzufügen** wählt ein Bild vom Gerät (auf dem Handy auch direkt per Kamera). Es wird verkleinert (max. 2000 Pixel) und als JPEG gespeichert. Tippen öffnet die große Ansicht, ✏️ benennt um, 🗑 löscht.
3. **Verschieben** per Finger oder Maus. **🧭 Anordnen** sortiert alles neu von oben nach unten. **− / + / ⤢** zoomen. **☰ Listenansicht** zeigt statt des Diagramms alle Knoten als Liste, praktisch auf dem Handy.
4. Details wie Vorlesetext und GM-Notizen pflegst du weiter im Tab **🎬 Szenen** oder lässt sie von Claude schreiben.

Gut zu wissen:
- Ein Knoten ohne eingehenden Pfeil ist ein Startpunkt und von Anfang an frei. Abenteuer ganz ohne Wege verhalten sich wie früher: Alle Szenen sind frei wählbar.
- „Besucht“ heißt: Die Szene war im Spiel mindestens einmal die aktuelle Szene.
- Karten liegen auf dem Gerät und, falls Dropbox verbunden ist, in `Apps/<App-Name>/images/`. Auf einem zweiten Gerät erscheinen sie nach dem nächsten Abgleich (☁ antippen). Die **Sicherung als Datei enthält noch keine Bilder**.
- Die Spieler-Tablets und das Spielbrett (Phase 2) werden diese Karten später anzeigen.

### Spielleiter-Modus (Spielabend)
Tabs oben:
- **🎬 Szene:** aktuelle Szene mit Vorlesetext (goldener Kasten, mit Kopieren-Knopf) und GM-Notizen (rötlich, nur für dich). Mit ◀ ▶ oder der Liste (oder über „Wie geht es weiter?“) die Szene wechseln; „Als erledigt markieren“ hakt ab. Antippbare Chips öffnen NSCs/Orte der Szene. Der Kasten **➡️ Wie geht es weiter?** zeigt die möglichen Wege aus dem Flowchart; gesperrte sind mit 🔒 und dem Stand („1/3 Vorgänger besucht“) markiert. Karten der Szene erscheinen darunter.
- **🔀 Weg:** Das Flowchart mit Spielstand: ▶ aktuell (gold), ✔ besucht (grün), frei (violett umrandet), 🔒 gesperrt (gestrichelt, mit Zähler). Knoten antippen zeigt Details, fehlende Orte und Karten. **▶ Hierhin wechseln** wechselt die Szene; bei gesperrten Szenen fragt die App vorher nach (du kannst trotzdem wechseln). **🔓 Freischalten** öffnet einen gesperrten Knoten dauerhaft für diese Sitzung, ohne dort hinzuwechseln.
- **🎲 Würfel:** W4 bis W100, eigene Ausdrücke (`2W6+3`, `d20`, `4d6kh3` = die drei höchsten von vier W6, `2d20kl1` = der niedrigere von zwei W20). Der „Hauptwurf des Regelwerks“-Knopf nutzt den Standardwurf deines Regelwerks.
- **👥 Spieler:** Spieler anlegen/umbenennen, Zähler für Vorräte (− / +), Zustände, Notizen. „Alle Vorräte auffüllen“ für Rasten. Die Zahl der Spieler ist frei änderbar.
- **🗺️ NSCs & Orte:** durchsuchbares Nachschlagewerk.
- **📜 Regeln:** Regelübersicht zum Nachsehen am Tisch.
- **📝 Protokoll:** Notizen; Szenenwechsel werden automatisch eingetragen. Exportierbar. Hier kannst du die Sitzung auch beenden.
- **🤖 Assistent:** Claude kennt Abenteuer, Regeln und aktuellen Spielstand. Gut für Vorlesetexte, Regelentscheidungen, spontane NSCs und Wendungen. Erfundene NSCs/Orte werden im Abenteuer gespeichert.

Alles wird laufend automatisch gespeichert (auf dem Gerät, und bei Dropbox-Verbindung auch dort).

## 4 · Updates einspielen

1. Ich schicke dir eine neue ZIP-Datei. Entpacken.
2. Im GitHub-Repository **Add file → Upload files** und den kompletten Inhalt hochladen (bestehende Dateien werden ersetzt) → **Commit changes**.
3. Nach ein bis zwei Minuten ist die neue Version online. Beim nächsten Öffnen der App wird sie automatisch geladen (ggf. die App einmal komplett schließen und neu öffnen).
4. Prüfen: **Einstellungen → App** zeigt die neue Versionsnummer. Bleibt die alte stehen: **Update erzwingen (Cache leeren)**.
5. Was sich geändert hat, steht unter **❓ Hilfe → Versionsverlauf**. Danach die **Testcheckliste** durchgehen.

Deine Abenteuer bleiben bei Updates erhalten (sie liegen nicht in den Programmdateien).

## 5 · Sicherung und Datenschutz

- **Sicherung:** Einstellungen → Daten → *Sicherung exportieren* erzeugt eine Datei mit allen Abenteuern und Sitzungen. Vor größeren Updates sinnvoll. **Bilder/Karten sind darin noch nicht enthalten**; sie sichert Dropbox (Ordner `images`). Mit Dropbox hast du zusätzlich eine laufende Kopie aller Daten.
- **Wo liegt was?** Programm: GitHub (öffentlich). Abenteuer/Sitzungen/Karten: Browser deines Geräts und – falls verbunden – dein Dropbox-App-Ordner. Claude-Key: nur im Browser des Geräts.
- **Was geht an Claude?** Bei jeder Chat-Anfrage der Inhalt des Abenteuers (Texte, Regeln, Szenen, Wege) und der Chatverlauf (an Anthropic über deinen Key). Bilder werden nicht an Claude gesendet, nur ihre Namen. Schreib keine Geheimnisse hinein, die du nicht weitergeben willst.
- **Gerät verloren/verkauft?** In der Anthropic Console den Key löschen und neu erstellen; in Dropbox unter Einstellungen → Sicherheit → Verbundene Apps den Zugriff widerrufen.

## 6 · Fehlerbehebung

| Problem | Lösung |
|---|---|
| Seite zeigt 404 | Pages ist noch nicht fertig (1–2 Minuten warten) oder `index.html` liegt nicht ganz oben im Repository. |
| Weiße Seite | Die Dateien wurden ohne Ordner hochgeladen oder es fehlt ein Ordner (`js`, `css`). Erneut komplett hochladen. |
| „Der API-Key wurde abgelehnt (401)“ | Key falsch kopiert (Leerzeichen?) oder gelöscht. Neuen Key erzeugen. |
| „Guthaben aufgebraucht“ | In der Anthropic Console Guthaben aufladen. |
| „Zu viele Anfragen (429)“ | Kurz warten, dann nochmal senden. |
| Modell nicht gefunden (404) | Unter Einstellungen ein anderes Modell wählen. |
| Dropbox: „redirect_uri“-Fehler | Die Adresse in der Dropbox App Console stimmt nicht exakt mit der Redirect-URI aus der App überein (Schrägstrich am Ende, https). |
| Dropbox: Anmeldung klappt, Sync-Fehler 400/403 | Permissions-Haken (Schritt C3) fehlen oder wurden nicht mit **Submit** gespeichert. Danach in der App „Trennen“ und neu verbinden. |
| Änderungen erscheinen nicht auf dem anderen Gerät | Auf beiden Geräten „Jetzt synchronisieren“ (☁ oben). Der Abgleich passiert alle paar Sekunden nach einer Änderung, nicht in Echtzeit. |
| Karte fehlt auf dem zweiten Gerät („noch nicht synchronisiert“) | Auf beiden Geräten ☁ antippen. Bilder kommen beim Abgleich nach den Abenteuern. Dropbox-Freigabe `files.content.write` muss gesetzt sein. |
| Bild lässt sich nicht hinzufügen („kein lesbares Bild“) | Anderes Format wählen (JPG, PNG, WebP funktionieren; HEIC nicht überall). |
| Diagramm ist sehr klein oder wirkt leer | **⤢ Einpassen** antippen oder **🧭 Anordnen**. |
| App zeigt noch alte Version | Einstellungen → „Update erzwingen (Cache leeren)“. |
| Etwas anderes ist kaputt | Notiere die Testnummer aus der Checkliste, beschreibe kurz, was du getan hast, und schick es mir (gerne mit Screenshot). |

Bekannte Eigenheit: Wird dieselbe Sitzung auf zwei Geräten gleichzeitig bearbeitet, gewinnt beim Abgleich die zuletzt gespeicherte Fassung. Am Spieltisch daher nur auf **einem** Gerät als Spielleiter arbeiten.

## 7 · Dateiübersicht (zum Verständnis)

| Datei/Ordner | Zweck |
|---|---|
| `index.html`, `css/`, `js/` | Die App selbst (`js/flow.js` Flowchart-Logik, `js/images.js` Karten) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installierbarkeit und Offline-Start |
| `CHANGELOG.md` | Versionsverlauf |
| `TESTCHECKLISTE.md` | Checkliste zum Prüfen jeder Version |
| `ADMIN-ANLEITUNG.md` | Diese Anleitung |
| `README.md` | Kurzbeschreibung des Projekts |

## 8 · Ausblick (Phase 2)

Geplant sind Spieler-Tablets mit eigenem Charakterbogen (Zuordnung Tablet ↔ Spieler) und ein Spielbrett-Tablet in der Tischmitte (zeigt u. a. die Karten, die du an die Knoten gehängt hast), jeweils zuschaltbar und vom Spielleiter gesteuert. Dafür kommt **Firebase** für die Live-Daten dazu; Dropbox bleibt für Backups und große Dateien. Beim Start von Phase 2 führe ich dich durch die Einrichtung.
