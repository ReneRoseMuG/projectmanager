# Aufgabe: Responsive Density System für Screen Sizes

## Ausgangslage

Die App wirkt auf einem Büro-Bildschirm mit 1920x1080 deutlich zu groß. Im konkreten Screenshot ist zusätzlich ein Browser-Zoom von 160 % aktiv. Dadurch ist die effektiv nutzbare Fläche stark reduziert: Auf der Projektseite ist kaum eine vollständige Projekt-Kachel sichtbar, die Sidebar ist sehr breit, Suchfelder und Filter nehmen viel Raum ein und das Board zeigt nur einen kleinen Ausschnitt.

Zu Hause steht ein größerer Bildschirm mit etwa 3500x1900 zur Verfügung. Dort darf die App weiterhin großzügiger wirken. Ziel ist deshalb keine feste Verkleinerung der gesamten Oberfläche, sondern eine automatische Anpassung an die tatsächlich verfügbare Arbeitsfläche.

## Ziel

Die App soll ein zentrales Responsive-Density-System erhalten, das Schriftgrößen, Icon-Größen, Abstände, Höhen, Sidebar-Breite, Kartenmaße und Board-Spalten abhängig vom verfügbaren Viewport automatisch anpasst.

Die App soll bei kleineren effektiven Viewports kompakter werden und bei großen Viewports komfortabel bleiben. Die Anpassung soll zentral steuerbar sein und nicht durch verstreute Einzelkorrekturen in vielen Komponenten entstehen.

## Vorgeschlagene Lösung

Ein zentrales Dichte-System mit drei Stufen wird eingeführt:

| Stufe | Einsatzfall | Wirkung |
|---|---|---|
| `compact` | 1920x1080, kleine Viewports oder hoher Browser-Zoom | kleinere Abstände, niedrigere Controls, schmalere Sidebar, kleinere Icons, kompaktere Cards |
| `default` | normale Desktop-Nutzung | aktuelles Grundverhalten, aber über Tokens gesteuert |
| `comfortable` | große Monitore wie ca. 3500x1900 | großzügigere Abstände und größere Arbeitsflächen |

Die Stufe soll automatisch über Viewport-Breite und Viewport-Höhe bestimmt werden. Wichtig ist die tatsächlich verfügbare Browser-Fläche, nicht die theoretische Monitorauflösung.

## Umsetzungsumfang

### 1. Zentrale UI-Density-Tokens

Es sollen globale CSS-Variablen oder bestehende Design-Tokens ergänzt werden, zum Beispiel:

- `--app-sidebar-width`
- `--app-topbar-height`
- `--app-page-padding`
- `--app-control-height`
- `--app-icon-size`
- `--app-card-min-width`
- `--app-board-column-width`
- `--app-gap`
- `--app-font-size-base`
- `--app-font-size-sm`
- `--app-font-size-lg`

Komponenten sollen diese Tokens nutzen, statt feste Größen lokal zu definieren.

### 2. Automatische Density-Erkennung

Die App soll beim Start und bei Größenänderungen erkennen, welche Dichte sinnvoll ist. Die Erkennung kann über CSS Media Queries, Container Queries oder eine kleine React-/DOM-nahe Initialisierung erfolgen.

Beispielhafte Regel:

- `compact`, wenn die Viewport-Höhe unter ca. 900 px liegt oder die Breite unter ca. 1400 px liegt
- `default`, wenn ausreichend Platz vorhanden ist
- `comfortable`, wenn Breite und Höhe deutlich größer sind

Die konkreten Grenzwerte sollen während der Umsetzung anhand der bestehenden Layouts geprüft werden.

### 3. Sidebar und Topbar verdichten

Für `compact` sollen insbesondere folgende Bereiche kleiner werden:

- Sidebar-Breite
- Logo-/Branding-Bereich
- Navigations-Item-Höhen
- Icon-Größen in der Navigation
- Topbar-Höhe
- Globales Suchfeld
- API-Status-Anzeige

Die Navigation muss weiterhin klar lesbar und bedienbar bleiben.

### 4. ListBoardView und Kanban-Board anpassen

Die Board-Darstellung ist der größte Platztreiber. Für kleinere Viewports sollen Board-Spalten und Karten kompakter werden.

Erwartete Anpassungen:

- geringere Mindestbreite der Spalten
- kleinere Spaltenabstände
- kompaktere Spaltenköpfe
- niedrigere Add-Buttons
- kompaktere ItemCards
- horizontaler Scroll bleibt erhalten, wirkt aber weniger platzverschwendend

Optional kann geprüft werden, ob bei sehr kleinen effektiven Viewports automatisch die Listenansicht bevorzugt werden sollte. Das wäre aber nur umzusetzen, wenn es zum bestehenden Bedienkonzept passt.

### 5. Projekt-Karten kompakter gestalten

Projekt-Karten sollen in `compact` mehr Inhalt auf gleicher Fläche zeigen:

- kleinere Icon-Fläche
- reduzierte Innenabstände
- kompaktere Titel- und Meta-Zeilen
- kleinere Pills und Badges
- geringere vertikale Mindesthöhe

Die Karten dürfen dadurch nicht gedrängt oder unruhig wirken.

## Nicht-Ziele

Nicht Teil dieser Aufgabe:

- Kein kompletter UI-Redesign-Auftrag
- Keine Änderung an fachlichen Datenmodellen
- Keine Änderung an API, Datenbank oder Migrationen
- Keine neuen Navigationskonzepte
- Keine manuelle Nutzereinstellung für Density, solange automatische Anpassung genügt
- Keine pauschale Skalierung der gesamten App per CSS `zoom`

## Akzeptanzkriterien

Die Aufgabe gilt als umgesetzt, wenn:

- die App auf 1920x1080 bei normalem Browser-Zoom deutlich kompakter nutzbar ist,
- die Projektseite mindestens eine Projekt-Kachel vollständig und sinnvoll sichtbar darstellen kann,
- Sidebar, Topbar, Filterleiste, Board-Spalten und Projekt-Karten sichtbar verdichtet werden,
- große Bildschirme weiterhin großzügig und nicht zu klein wirken,
- die Anpassung zentral über Tokens oder eine vergleichbare zentrale Struktur erfolgt,
- keine verstreuten Einzel-Hacks in vielen Komponenten entstehen,
- Icons und Schrift nicht unlesbar klein werden,
- bestehende UI-Basiskomponenten weiterverwendet werden,
- keine fachlichen Workflows beschädigt werden.

## Verifikation

Nach der Umsetzung soll mindestens geprüft werden:

- Projektseite bei 1920x1080
- Projektseite bei 1920x1080 mit erhöhtem Browser-Zoom, soweit sinnvoll simulierbar
- Projektseite bei großem Desktop-Viewport
- Tickets-, Features- und Wiki-Ansichten auf offensichtliche Layout-Regressionen
- Board- und Listenansicht der `ListBoardView`

Browser-/E2E-Tests oder Screenshots mit Playwright sind sinnvoll, wenn die vorhandene Testinfrastruktur das zuverlässig unterstützt.

## Kurzfassung zum Herauskopieren

Bitte ein zentrales Responsive-Density-System für die App umsetzen. Die App ist auf 1920x1080, besonders bei effektiv kleiner Browserfläche oder erhöhtem Browser-Zoom, deutlich zu groß. Schriftgrößen, Icons, Abstände, Sidebar, Topbar, Controls, Projekt-Karten und Kanban-Spalten sollen automatisch über zentrale Density-Tokens zwischen `compact`, `default` und `comfortable` skaliert werden. Ziel ist eine kompaktere, weiterhin gut lesbare Darstellung auf Büro-Monitoren und eine großzügige Darstellung auf großen Monitoren. Kein komplettes Redesign, keine API- oder Datenbankänderungen und keine pauschale CSS-`zoom`-Lösung.
