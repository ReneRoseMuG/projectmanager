---
name: code-discipline
description: >
  Disziplin-Gate vor jedem Implementierungsauftrag. Verwenden bevor Dateien bearbeitet
  werden — besonders bei UI-Komponenten, CSS, Event-Handlern, Service-Methoden,
  geteilter Logik und Dateien in der Nähe bestehenden Verhaltens. Verhindert
  versehentliches Entfernen von UI-Elementen, unterbrochenes Event-Wiring und
  unbeabsichtigte Seiteneffekte in benachbarten Komponenten.
---

# Code-Disziplin

## Prinzip 1: Zuerst lesen, dann ändern

Vor jeder Dateiänderung:
- Bei Code-Bezug zuerst Graphify (`graphify query/path/explain`), dann gezielt lesen
- Ganze Komponente oder Modul verstehen wie es heute funktioniert
- Alle UI-Elemente identifizieren: Buttons, Inputs, Icons, Event-Handler, conditional Renders
- Bei CSS: welche anderen Komponenten teilen dieselben Klassen oder Parent-Selektoren
- Bei Service-/Logik-Änderungen: welche Aufrufer hängen von der geänderten Funktion ab

## Prinzip 2: Code ist die Wahrheit

Wenn Spezifikation und bestehender Code sich widersprechen → Code gilt als aktuelle Wahrheit, außer der Auftrag sagt ausdrücklich etwas anderes.
- Funktionierenden Code nicht zurücksetzen weil ein Spec-Dokument etwas anderes beschreibt
- Diskrepanz als Beobachtung melden — nicht still „fixen"

## Prinzip 3: Auswirkungen durchdenken

Vor der ersten Änderung:
- Welche anderen Dateien werden direkt oder indirekt betroffen?
- Trifft die CSS-Änderung eine geteilte Klasse?
- Betrifft die Funktionsänderung andere Aufrufer?
- Ist die Komponente in andere eingebettet die von ihrer Struktur abhängen?

## Prinzip 4: Nur ändern was der Auftrag verlangt

- Keinen benachbarten Code refactorn der nur anders sauberer wäre
- Nichts umbenennen das nicht kaputt ist
- Keine Dateien außerhalb des Auftrags reorganisieren
- Nötige Nebenänderungen explizit benennen
- In einer Test- oder Fix-Session keinen über den Auftrag hinausgehenden Produktivcode ändern

## Prinzip 5: Preservation Checklist vor dem Abschluss

### UI
- [ ] Alle Buttons, Inputs, interaktive Elemente noch vorhanden und funktional
- [ ] Alle Event-Handler noch korrekt verdrahtet
- [ ] Layout ohne unbeabsichtigten Overflow oder Überlappung
- [ ] Style-Änderung auf beabsichtigten Scope begrenzt

### Logik / Service
- [ ] Alle Aufrufer der geänderten Funktion arbeiten noch korrekt
- [ ] Alle bisher gültigen Zustände noch korrekt behandelt
- [ ] Nichts entfernt das ein anderer Teil noch braucht

### Projektspezifisch
- [ ] Datenabruf über TanStack Query — kein `useState` + `useEffect` für Server-State
- [ ] Mutations invalidieren über `invalidation.ts` — kein direktes `queryClient.invalidateQueries`
- [ ] Keine eigenen Card-/Modal-Strukturen — ausschließlich `ItemCard`, `FormModal`, `ItemRow`
- [ ] Keine deutschen Labels inline — ausschließlich Imports aus `domainLabels.ts`
- [ ] Neue/geänderte Routen haben eine Berechtigungsentscheidung
- [ ] Bestehende Tests die die geänderten Stellen abdecken wurden nachgeführt (agents.md §4.4)

Bei Befund: sofort korrigieren, außer der Auftrag erlaubt ausdrücklich das Offenlassen.

Bauplan: `docs/skill-documentation/code-discipline.md`
Quelle (Ebene 1): Skill Library `core/code-discipline.md` — dort zuerst ändern, dann hier nachziehen.
