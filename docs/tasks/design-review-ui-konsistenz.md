# Design-Review: UI-Inkonsistenzen, Stile und Bedienbarkeit

**Erstellt:** 2026-05-21
**Typ:** Beratung / Analyse
**Betroffener Bereich:** `apps/web/src` – sämtliche Seiten, Komponenten, Layouts

---

## Ausgangslage

Diese Analyse betrachtet die App aus der Perspektive eines Anwenders. Ziel ist es, sichtbare Design-Schwächen zu finden: inkonsistente Darstellungen, fehlerhafte oder fehlende Stile, unpassende Abstände, schlecht positionierte Steuerelemente und Bedienprobleme. Es handelt sich um eine **reine Bestandsaufnahme mit Lösungsvorschlägen** – kein Code wird in dieser Aufgabe verändert.

Die Analyse ist nach Bereich gegliedert. Jeder Abschnitt enthält **Befund** und **Lösungsvorschlag**.

---

## 1. Layout & Navigation

### 1.1 Sidebar – ExternalLink-Button nur bei Hauptnavigation

**Befund:**
Die fünf Hauptnavigationspunkte (Projekte, Tickets, Features, Wiki, Kalender) zeigen beim Hovern einen kleinen „In neuem Tab öffnen"-Button. Die Einstellungs-Links (Präferenzen, Kataloge, Tags, Sicherung) und die Admin-Links (Benutzer, Rollen) haben diesen Button nicht – obwohl das technisch kein Hindernis wäre. Der Unterschied ist für den Anwender nicht nachvollziehbar.

**Lösungsvorschlag:**
ExternalLink-Button einheitlich für alle Navigationspunkte anbieten, oder für alle weglassen. Wahrscheinlich bietet sich „für alle" an, da der Nutzen für Einstellungsseiten vorhanden ist (z. B. Kataloge in eigenem Tab öffnen, während man im Hauptfenster arbeitet).

---

### 1.2 Sidebar – Badge „LOKAL" ohne klare Aussage

**Befund:**
Unter dem Logo steht in Großbuchstaben „LOKAL". Das wirkt wie ein Umgebungs-Indikator (Produktion / Staging / Lokal), kommuniziert aber keinen Mehrwert für den Alltag. Ein Anwender, der mit dieser App täglich arbeitet, wird dieses Badge als visuelles Rauschen wahrnehmen. Zudem ist es der einzige englische Begriff in der gesamten Seitenleiste.

**Lösungsvorschlag:**
Wenn der Hinweis auf die lokale Instanz wichtig ist, sollte er verständlicher formuliert werden: z. B. „Lokal" (deutsch, kein Uppercase) oder ein Tooltip-Icon. Wenn er keinen Mehrwert hat, kann er entfernt werden. Das Wort „LOKAL" in Tracking-Wide Uppercase wirkt wie ein Status-Tag, den der User aber nicht verändern kann.

---

### 1.3 TopBar – Suche öffnet beim Klick auf Container-Div statt auf Input

**Befund:**
Das Such-Feld in der TopBar ist in einem `div` mit `onClick`-Handler verpackt, der den globalen Suchdialog öffnet. Gleichzeitig reagiert das `SearchInput` intern auch auf Änderungen und öffnet den Dialog. Das führt zu einem Doppel-Trigger: Der Anwender klickt irgendwo in das Suchfeld-Areal, der Dialog öffnet sich sofort – bevor er irgendetwas tippt. Das Feld im Header ist damit kein echtes Eingabefeld sondern ein getarnter Button, was die Erwartungshaltung bricht.

**Lösungsvorschlag:**
Das Such-Feld konsequent als Button oder `role="button"`-Element gestalten, das visuell klar als Auslöser für den Suchdialog erkennbar ist (z. B. mit einem leichten Rahmen, Cursor `pointer` und ggf. dem Shortcut-Hinweis `Ctrl+K` prominent). Kein Fake-Input, der so tut, als sei er editierbar, es aber nicht ist.

---

### 1.4 TopBar – Mobile Navigation unvollständig

**Befund:**
Auf mobilen Geräten zeigt die TopBar nur drei Icon-Buttons: KI-Agent, Projekte, Kalender. Die restlichen Hauptnavigationspunkte – Tickets, Features, Wiki – sind mobil nicht erreichbar, da die Sidebar mit `md:hidden/md:block` auf kleinen Bildschirmen ausgeblendet wird. Ein Hamburger-Menü oder eine mobile Drawer-Navigation fehlt komplett.

**Lösungsvorschlag:**
Entweder ein Drawer/Hamburger-Menü für die vollständige Navigation auf Mobile ergänzen, oder – bei klarer Desktop-only-Ausrichtung – das Layout deutlich als Desktop-Anwendung kennzeichnen und die mobile Darstellung mit einem freundlichen Hinweis abfangen (aktuell funktioniert sie ohne Hinweis, aber mit reduzierten Features).

---

### 1.5 TopBar – API-Badge mit englischen Statusbegriffen

**Befund:**
Das API-Status-Badge zeigt „API online", „API offline" oder „API slow". Alle anderen Texte in der App sind auf Deutsch. Dieser Badge ist der einzige englischsprachige UI-Text im eigentlichen Interface (Login-Seite ausgenommen).

**Lösungsvorschlag:**
Statusbegriffe übersetzen: „online" → „erreichbar", „offline" → „nicht erreichbar", „slow" → „langsam" – oder zumindest auf das Wort „API" reduzieren und die Zustände mit Farbe und Icon statt Text kommunizieren.

---

## 2. Seitenstruktur & Seiten-Header

Die Listenansichten haben keine einheitliche Header-Struktur. Das fällt dem Anwender zwar nicht sofort auf, erzeugt aber ein Gefühl von Inkohärenz, wenn er zwischen Seiten wechselt.

| Seite | H1 | Untertitel | Primäraktion im Header |
|---|---|---|---|
| Projekte | ✅ `font-semibold` | Anzahl Einträge | ❌ (Button nur im Board) |
| Tickets | ✅ `font-semibold` | Anzahl Einträge | ❌ (Button nur im Board) |
| Features | ✅ `font-semibold` | Statischer Text | ❌ (Button nur im Board) |
| Kalender | ✅ `font-semibold` | Anzahl Termine | ✅ „Neuer Termin" |
| Wiki | ✅ `font-semibold` | Statischer Text | ✅ „Neue Seite" |
| Präferenzen | ✅ `font-bold` | Anzahl Einstellungen | ❌ |

**Befunde:**

1. **H1-Gewicht inkonsistent:** Alle Listenseiten nutzen `font-semibold`, die Präferenzseite nutzt `font-bold`. Kein erkennbarer Grund für die Ausnahme.

2. **Primäraktion mal im Header, mal im Board:** Kalender und Wiki platzieren den Primär-Button oben rechts im Header. Bei Projekten, Tickets und Features befindet sich der `+`-Button tief im Board-Toolbar-Bereich. Anwender suchen die Aktion an unterschiedlichen Stellen.

3. **Untertitel mal Anzahl, mal statischer Text:** Bei Features steht dauerhaft „Fachliche Features und Use Cases" – dieser Satz teilt keine aktuelle Information mit. Bei Projekten/Tickets/Kalender steht die aktuelle Anzahl.

4. **Präferenzseite mit Icon im Header:** Nur die Einstellungsseite zeigt einen Icon-Block vor dem Titel. Alle anderen Seiten haben das nicht.

**Lösungsvorschlag:**
Eine verbindliche Header-Struktur definieren und überall anwenden:
- `h1 font-semibold` einheitlich (kein `bold`)
- Untertitel = aktuelle Anzahl der Einträge
- Primäraktion immer im Header oben rechts, nicht versteckt im Board
- Kein Icon vor dem Seitentitel (oder überall ein Icon – aber nicht sporadisch)

---

## 3. FormModal & Detailseiten (Projekte, Tickets, Features …)

### 3.1 Tab-Leiste mit 10 Reitern im Projekt

**Befund:**
Das Projektsformular zeigt bis zu 10 Tabs: Details, Meilensteine, Features, Aufgaben, Tickets, Kommentare, Notizen, Dateien, Backlog, Import. Selbst auf einem großen Bildschirm erfordern diese 10 Reiter horizontales Scrollen. Der Tab „Import" wird selten gebraucht, nimmt aber permanent Platz weg.

**Lösungsvorschlag:**
Selten benötigte Tabs (Import) in ein Kontext-Menü oder einen „Mehr"-Tab auslagern. Alternativ können häufig leere Tabs (Kommentare: 0, Notizen: 0) eine dezentere visuelle Behandlung erhalten.

---

### 3.2 Tab-Zähler: 0 nicht von leer unterscheidbar

**Befund:**
Die Tab-Zähler-Badges zeigen `0` an (z. B. bei Meilensteinen, Kommentaren). Eine `0` sieht genauso aus wie ein Tab mit Inhalt – nur mit kleiner Zahl. Der Anwender erkennt nicht sofort, ob ein Tab überhaupt Inhalt hat.

**Lösungsvorschlag:**
Tabs ohne Inhalt (`count === 0`) entweder ohne Badge anzeigen, oder das Badge in einem sehr dezenten Grauton rendern.

---

### 3.3 Sections für Notizen und Dateien inkonsistent zu anderen Tabs

**Befund:**
Alle Tabs im Projektformular verwenden `<Section title="…">` als Wrapper. Ausnahmen sind der Notizen-Tab und der Dateien-Tab: Hier wird die Überschrift manuell mit Icon + `<SectionHeader>` zusammengebaut, ohne `<Section>` und ohne Divider.

**Lösungsvorschlag:**
Notizen- und Dateien-Tab ebenfalls in `<Section title="…">` einwickeln, oder das Icon-Heading als Teil der `SectionHeader`-Komponente standardisieren.

---

### 3.4 Sticky-Footer und Sticky-TabBar: impliziter Vertrag mit App-Padding

**Befund:**
Im Page-Variant des `FormModal` kompensiert der Footer sein Sticky-Offset mit negativen Margins (`bottom-[-1rem] md:bottom-[-1.5rem]`), die exakt dem `p-4 md:p-6` des `<main>`-Bereichs in `App.tsx` entsprechen. Das ist ein fragiler, unsichtbarer Vertrag.

**Lösungsvorschlag:**
CSS-Variable für das Haupt-Padding definieren und überall darauf verweisen. Oder das Main-Padding auf 0 setzen und in die Seiteninhalte verlegen.

---

### 3.5 Breadcrumb-Navigation nicht klickbar

**Befund:**
Der FormModal zeigt im Header eine Breadcrumb (z. B. „Projekte › Neues Projekt"). Breadcrumbs signalisieren üblicherweise klickbare Navigation. Hier sind es statische `<span>`-Texte ohne Reaktion.

**Lösungsvorschlag:**
Entweder Breadcrumbs als echte Links implementieren oder das visuelle Pattern ändern, sodass es nicht wie eine klickbare Navigation aussieht (z. B. Punkt-Separator statt `›`).

---

## 4. Listendarstellung (ListBoardView, Kanban, Cards)

### 4.1 Toolbar-Suche ohne visuellen Platzhalter wenn nicht vorhanden

**Befund:**
Wenn kein Such-Handler übergeben wird, rendert der linke Bereich ein leeres `<span />`. Das drückt die Button-Gruppe unzentriert nach rechts.

**Lösungsvorschlag:**
Wenn kein Suchfeld vorhanden ist, die Button-Gruppe nach rechts rücken lassen (`justify-end`).

---

### 4.2 Primäre Erstell-Aktion ist Icon-only ohne sichtbares Label

**Befund:**
Der `+`-Button in der Toolbar ist ein reiner Icon-Button. `title` und `aria-label` sind gesetzt, aber kein sichtbarer Text erklärt, was erstellt wird.

**Lösungsvorschlag:**
Den Button mit einem kurzen Label versehen: „Neues Projekt", „Neues Ticket", „Neues Feature" etc.

---

### 4.3 Status-Gruppen in der Listenansicht: Leere Gruppen werden ausgeblendet

**Befund:**
In der Board-Ansicht werden alle Status-Spalten angezeigt, auch leere. In der Listen-Ansicht werden leere Gruppen herausgefiltert. Das erzeugt Inkonsistenz beim Moduswechsel.

**Lösungsvorschlag:**
Leere Status-Gruppen in der Listenansicht als kompakte Zeile anzeigen.

---

### 4.4 ItemRow: Doppelklick öffnet – einfacher Klick auf Titel auch

**Befund:**
`ItemRow` öffnet den Eintrag bei `onDoubleClick` auf den Container und bei `onClick` auf den Titel. Einfacher Klick auf andere Bereiche der Zeile macht nichts.

**Lösungsvorschlag:**
Den gesamten Container auf einfachen Klick reagieren lassen. `onDoubleClick` entfernen.

---

### 4.5 ViewToggle – Schaltflächen optisch kleiner als Geschwisterelemente

**Befund:**
`ViewToggle` liegt in einem `border p-1`-Container. Die inneren `h-10 w-10`-Buttons erscheinen optisch kleiner als die direkt danebenstehenden `h-10`-Buttons, weil das Padding den Gesamtrahmen etwas höher macht.

**Lösungsvorschlag:**
Den Container-Rahmen entfernen und die Buttons direkt stylen.

---

## 5. Atomare Komponenten

### 5.1 Pill vs. Badge: zwei Komponenten für dasselbe Konzept

**Befund:**
`Pill` (gefüllt, Großbuchstaben, 11 px) und `Badge` (getönter Rand, normale Schreibweise, 12 px) werden beide als kompakte Labels verwendet. Im `TicketCard` erscheinen beide gleichzeitig: `StatusPill` für Status, `Badge` für Typ. Die visuelle Unterscheidung ist fein aber nicht klar motiviert.

**Lösungsvorschlag:**
Semantik schärfer trennen: Pill für Status (primärer Lifecycle-Zustand), Badge für sekundäre Attribute (Typ, Kategorie). Visuell die Unterschiede verstärken.

---

### 5.2 StatusPill: alle aktiven Zustände sehen gleich aus

**Befund:**
`StatusPill` zeigt alle „offenen" Zustände immer in `bg-fern` (Grün). Das bedeutet: „In Bearbeitung", „In Review" und „Offen" sind alle gleichfarbig. Der Fortschritt ist nicht auf einen Blick erkennbar.

**Lösungsvorschlag:**
Status-Farben per Key-Map differenzieren: Offen → Grün, In Bearbeitung → Orange, In Review → Gelb, Abgeschlossen → Grau.

---

### 5.3 StatusToggle vs. SegmentedControl: zwei Komponenten, ein Aussehen

**Befund:**
Beide Komponenten sehen identisch aus, haben aber unterschiedliche Logik. `StatusToggle` hat `min-h-12`, `SegmentedControl` nicht. Geringe aber reale Höhenabweichung.

**Lösungsvorschlag:**
`SegmentedControl` in `StatusToggle` integrieren und nur eine Komponente pflegen.

---

### 5.4 ColorPicker: „Custom"-Label auf Englisch

**Befund:**
Die freie Farbeingabe ist mit „Custom" beschriftet. Alle anderen Labels sind deutsch.

**Lösungsvorschlag:**
„Eigene Farbe" oder „Benutzerdefiniert".

---

### 5.5 Button – `ghost`-Variante: Hover kaum sichtbar

**Befund:**
`ghost`-Hover hat `hover:bg-line/50` = `rgba(213,222,233,0.5)`. Auf weißem Hintergrund kaum wahrnehmbar.

**Lösungsvorschlag:**
`hover:bg-steel-100` – dezent aber klar sichtbar.

---

## 6. Formulare & Eingaben

### 6.1 Input `h-11` vs. DatePicker `h-10` vs. Select `h-10`

**Befund:**
`Input` ist `h-11` (44 px). `DatePicker` ist `h-10` (40 px). `Select` ist `h-10`. In Formularen, wo diese Elemente nebeneinander stehen (Zeitraum-Section im Projekt, CatalogManager), sind die Steuerelemente vertikal unausgerichtet.

**Lösungsvorschlag:**
`DatePicker` und `Select` auf `h-11` anheben.

---

### 6.2 Projektbeschreibung: `minRows={12}` erzeugt 12 Leerzeilen

**Befund:**
Das Beschreibungsfeld startet mit 12 Zeilen Mindesthöhe. Das wirkt wie ein leeres Dokument, nicht wie ein kompaktes Formularfeld.

**Lösungsvorschlag:**
`minRows` auf 5 reduzieren. Das Feld wächst dynamisch mit dem Inhalt.

---

### 6.3 FormField – Pflichtfeld-Marker nicht konsistent gesetzt

**Befund:**
`StatusToggle`-Felder werden nie mit `required` markiert, obwohl Status immer benötigt wird. Nur Textfelder haben den Stern-Marker.

**Lösungsvorschlag:**
Alle tatsächlich pflichtig befüllten Felder systematisch mit `required` kennzeichnen.

---

## 7. Feature-spezifische Befunde

### 7.1 Wiki – „Root"-Button im Baum

**Befund:**
Im Wiki-Baum gibt es oben rechts einen Button mit dem Label „Root". Das ist ein technischer Begriff, der für Fachanwender nicht selbsterklärend ist.

**Lösungsvorschlag:**
Button umbenennen zu „Neue Seite".

---

### 7.2 Wiki – Breadcrumb ohne aktuelle Seite

**Befund:**
Die `WikiBreadcrumb` zeigt den Pfad zur aktuellen Seite, aber die aktuelle Seite selbst fehlt als letztes Element.

**Lösungsvorschlag:**
Aktuelle Seite als letztes, nicht-klickbares Element im Breadcrumb ergänzen.

---

### 7.3 Kommentare – Platzhalterdaten im produktiven UI

**Befund:**
`CommentThread` zeigt für jeden Kommentar den Autor-Namen als hardcodierten String „Single User" und die Reaktionen als statisches „0 Reaktionen" und einen toten „Antworten"-Link.

**Lösungsvorschlag:**
„Single User" durch echten Autornamen ersetzen. Tote UI-Elemente entfernen.

---

### 7.4 Kalender – Kein visueller Hinweis auf Drag & Drop

**Befund:**
Kalender-Events lassen sich verschieben. Kein Hinweis darauf in der UI. Anwender entdecken diese Funktion nur durch Zufall.

**Lösungsvorschlag:**
`cursor-grab` für Event-Elemente. Optional Hinweistext unter dem Kalender.

---

### 7.5 Einstellungen – JSON-Felder ohne Erklärung deaktiviert

**Befund:**
JSON-Einstellungen zeigen ein deaktiviertes Textfeld ohne Erklärung.

**Lösungsvorschlag:**
`FieldHint` mit Erklärung: „Diese Einstellung kann nur über die Konfigurationsdatei geändert werden."

---

## 8. Login-Seite

### 8.1 `text-muted` ist keine gültige Tailwind-Klasse

**Befund:**
`<p className="mt-1 text-sm text-muted">` – `text-muted` ist nicht in `tailwind.config.ts` definiert. Der Text rendert wahrscheinlich schwarz statt grau.

**Lösungsvorschlag:**
`text-muted` → `text-slate-500`.

---

### 8.2 Login – Kein Autofokus auf E-Mail-Feld

**Befund:**
Beim Laden der Login-Seite liegt der Fokus nicht automatisch auf dem E-Mail-Feld.

**Lösungsvorschlag:**
`autoFocus` auf dem E-Mail-Input setzen.

---

## 9. Priorisierungsmatrix

| # | Befund | Sichtbarkeit | Aufwand |
|---|---|---|---|
| 1.5 | API-Badge auf Englisch | Hoch | Minimal |
| 2.3 | H1-Gewicht Präferenzen inkonsistent | Mittel | Minimal |
| 2.2 | Primäraktion mal im Header, mal im Board | Hoch | Mittel |
| 3.5 | Breadcrumb nicht klickbar | Mittel | Mittel |
| 4.2 | Erstellen-Button Icon-only ohne Label | Mittel | Minimal |
| 4.4 | Row: Doppelklick vs. Einfachklick | Hoch | Gering |
| 5.4 | „Custom" auf Englisch im ColorPicker | Gering | Minimal |
| 5.5 | Ghost-Hover kaum sichtbar | Mittel | Minimal |
| 6.2 | Beschreibungsfeld: 12 Zeilen Mindesthöhe | Hoch | Minimal |
| 7.1 | Wiki „Root"-Button unklar | Hoch | Minimal |
| 7.3 | Kommentare: „Single User" + tote UI-Elemente | Sehr hoch | Mittel |
| 8.1 | `text-muted` ungültige Klasse | Mittel | Minimal |
| 8.2 | Kein Autofokus auf Login | Mittel | Minimal |
| 3.1 | 10 Tabs im Projekt-Formular | Mittel | Mittel |
| 3.2 | Tab-Zähler 0 nicht von leer unterscheidbar | Gering | Gering |
| 1.4 | Mobile Nav unvollständig | Hoch | Hoch |
| 5.2 | StatusPill: alle offenen Status gleich grün | Hoch | Hoch |
| 7.4 | Kalender: kein Drag-Hinweis | Mittel | Gering |

---

## 10. Empfohlene Reihenfolge für Codex-Aufträge

1. **Quick Wins:** `design-quick-wins.md` – API-Badge, text-muted, autoFocus, Custom, Ghost-Hover, minRows, Button-Label, Wiki Root
2. **Header-Konsistenz:** `design-header-konsistenz.md`
3. **Klick-Verhalten:** `design-klick-verhalten.md`
4. **Kommentar-Platzhalter:** `design-kommentar-platzhalter.md`
5. **Tab-Zähler & Breadcrumb:** `design-tabbar-breadcrumb.md`
6. **StatusPill-Farben:** `design-status-pill-farben.md`
7. **Formular-Höhen:** `design-formular-hoehen.md`

---

*Diese Datei dient als Bestandsaufnahme. Für jeden Themenblock existiert ein eigenständiger Codex-Auftrag in `docs/tasks/`.*
