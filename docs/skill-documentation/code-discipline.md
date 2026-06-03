# Bauplan: code-discipline

## Zweck

Disziplin-Gate für jeden Implementierungsauftrag. Verhindert typische Regressionen: versehentliches Entfernen von UI-Elementen, unterbrochenes Event-Wiring, Rücksetzen von funktionierendem Code wegen veralteter Spezifikation, unbeabsichtigte Seiteneffekte in benachbarten Komponenten, Styles, Services und Aufrufern.

## Trigger

Vor jeder Dateiänderung im Rahmen eines Implementierungsauftrags. Besonders relevant bei: UI-Komponenten, CSS/Styling, Event-Handlern, Service-Methoden, geteilter Logik, Dateien in der Nähe bestehenden Verhaltens.

## Verhältnis zu anderen Skills

- Läuft nach `planungsleitplanken` (Plan existiert bereits)
- Läuft vor der eigentlichen Code-Änderung
- Ergänzt `agents.md` §4.2 (keine spekulativen Änderungen) und §4.4 (Test-Nachführung)

## Hinweis zur Allgemeinheit

Dieser Skill ist projekt-unabhängig formuliert. Er kann ohne Anpassung in anderen Repositories eingesetzt werden. Projektspezifische Ergänzungen stehen im Abschnitt „Projektspezifische Preservation Checklist".

---

## Prinzip 1: Zuerst lesen, dann ändern

Vor jeder Dateiänderung die relevanten Teile des bestehenden Codes lesen:

- Die ganze Komponente oder das Modul verstehen wie es heute funktioniert
- Alle UI-Elemente identifizieren: Buttons, Inputs, Icons, Event-Handler, conditional Renders
- Bei CSS/Style-Änderungen: welche anderen Komponenten teilen dieselben Klassen, Stylesheets oder Parent-Selektoren
- Bei Service- oder Logik-Änderungen: welche anderen Aufrufer hängen von der geänderten Funktion ab

Erst wenn ein vollständiges Bild des aktuellen Zustands vorliegt, beginnen.

## Prinzip 2: Code ist die Wahrheit

Wenn eine Hintergrund-Spezifikation und der bestehende Code sich widersprechen, gilt der Code als aktuelle Wahrheit — außer der Auftrag sagt ausdrücklich etwas anderes.

- Funktionierenden, absichtlichen Code nicht zurücksetzen weil ein Spec-Dokument etwas anderes beschreibt
- Diskrepanz zwischen Spec und Code als Beobachtung melden — nicht still „fixen"
- Nur wenn der Auftrag explizit verlangt, Code an eine Spec anzupassen, ist die Spec für diese Aufgabe maßgeblich

Im Zweifel: funktionierenden Code in Ruhe lassen.

## Prinzip 3: Auswirkungen vor dem Start durchdenken

Vor der Implementierung durchdenken was die Änderung betreffen könnte:

- Welche anderen Dateien werden direkt oder indirekt betroffen?
- Trifft die CSS-Änderung eine geteilte Klasse und könnte Layout, Overflow oder Z-Index anderswo verschieben?
- Betrifft die Funktionsänderung andere Aufrufer oder deren Annahmen über Rückgabewerte und Seiteneffekte?
- Ist die Komponente in andere Komponenten eingebettet, die von ihrer Struktur abhängen?

Komplexe Auswirkungen kurz dokumentieren. Das Denken immer tun — vor der ersten Änderung.

## Prinzip 4: Nur ändern was der Auftrag verlangt

- Keinen benachbarten Code refactorn der nur anders sauberer wäre
- Nichts umbenennen das nicht kaputt ist
- Keine Dateien außerhalb des Auftrags reorganisieren
- Wenn eine Nebenänderung für die Aufgabe nötig ist: explizit benennen was und warum

Jede Out-of-Scope-Änderung kann etwas Ungefordertes kaputtmachen und macht den Diff schwerer reviewbar.

## Prinzip 5: Preservation Checklist vor dem Abschluss

### UI-Änderungen
- [ ] Alle Buttons, Inputs und interaktiven Elemente die vorher existierten sind noch vorhanden und funktional
- [ ] Alle Event-Handler sind noch korrekt verdrahtet
- [ ] Das Layout funktioniert ohne unbeabsichtigten Overflow oder überlappende Komponenten
- [ ] Die Style-Änderung bleibt auf den beabsichtigten Scope begrenzt

### Logik- oder Service-Änderungen
- [ ] Alle bestehenden Aufrufer der geänderten Funktion arbeiten noch korrekt mit der neuen Signatur oder dem neuen Verhalten
- [ ] Alle bisher gültigen Zustände werden noch korrekt behandelt
- [ ] Nichts entfernt das ein anderer Teil des Systems noch braucht

### Allgemein
- [ ] Keine Änderung außerhalb des explizit geforderten Scopes — falls doch: ist sie notwendig und benannt?
- [ ] Kein absichtlicher Code entfernt oder ersetzt der fehlen könnte?

Bei Befund: sofort korrigieren, außer der Auftrag erlaubt ausdrücklich das Offenlassen.

## Projektspezifische Preservation Checklist

Zusätzliche Prüfpunkte für dieses Repository:

### React / TanStack Query
- [ ] Datenabruf läuft über TanStack Query Hooks — kein `useState` + `useEffect` für Server-State eingeführt
- [ ] Mutations invalidieren über `invalidation.ts` — kein direktes `queryClient.invalidateQueries` in Hooks
- [ ] Fehler werden über `toQueryError()` weitergereicht — kein rohes `error`-Objekt an Komponenten
- [ ] Keine Business-Logik in Komponenten eingeführt

### UI-Komponenten
- [ ] Keine eigenen Card- oder Modal-Strukturen eingeführt — ausschließlich `ItemCard`, `FormModal`, `ItemRow`
- [ ] Keine neuen deutschen Labels inline — ausschließlich Imports aus `domainLabels.ts`
- [ ] Keine neuen Tailwind-Klassen die es in der App noch nicht gibt

### API und Berechtigungen
- [ ] Neue oder geänderte Routen haben eine Berechtigungsentscheidung
- [ ] Frontend-Gating ergänzt API-Guard — ersetzt ihn nicht

### Tests
- [ ] Bestehende Tests die die geänderten Stellen abdecken wurden nachgeführt (→ `agents.md` §4.4)

## Zusammenfassung

| Prinzip | Kurzregel |
|---|---|
| Zuerst lesen | Verstehen was existiert bevor etwas geändert wird |
| Code ist Wahrheit | Funktionierender Code schlägt veraltete Spezifikation |
| Auswirkungen durchdenken | Seiteneffekte vor der ersten Änderung durchdenken |
| Minimaler Scope | Nur ändern was der Auftrag verlangt |
| Preservation Check | Prüfen ob bestehendes Verhalten erhalten blieb |

## Implementierungshinweise für den Skill-Bau

- Skill existiert bereits als OpenAI-Codex-Skill unter `skills/codex-code-discipline/` mit `agents/openai.yaml`
- Für Claude: Claude-Skill unter `.claude/skills/code-discipline/` anlegen
- Original ist auf Englisch — Skill-Bau kann Englisch beibehalten (allgemeiner Skill) oder auf Deutsch übersetzen
- Projektspezifische Preservation Checklist aus diesem Bauplan in den Skill übernehmen
- Trigger depersonalisieren: „Codex" → „der Agent"
